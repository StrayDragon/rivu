use std::collections::{HashMap, VecDeque};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Envelope {
    pub seq: u64,
    pub event: Value,
}

#[derive(Debug, Clone)]
pub struct ReplayResult {
    pub envelopes: Vec<Envelope>,
    pub complete: bool,
    pub available_from_seq: Option<u64>,
    pub available_to_seq: Option<u64>,
}

#[derive(thiserror::Error, Debug)]
pub enum EventStoreError {
    #[error("thread_id must be non-empty")]
    EmptyThreadId,
    #[error("seq must be a positive integer")]
    InvalidSeq,
}

#[derive(Debug)]
pub struct InMemoryRingBufferEventStore {
    capacity_per_thread: usize,
    buffers: Mutex<HashMap<String, VecDeque<Envelope>>>,
}

impl InMemoryRingBufferEventStore {
    pub fn new(capacity_per_thread: usize) -> Self {
        assert!(capacity_per_thread > 0, "capacity_per_thread must be > 0");
        Self {
            capacity_per_thread,
            buffers: Mutex::new(HashMap::new()),
        }
    }

    pub fn capacity_per_thread(&self) -> usize {
        self.capacity_per_thread
    }

    pub fn append(&self, thread_id: &str, envelope: Envelope) -> Result<(), EventStoreError> {
        if thread_id.trim().is_empty() {
            return Err(EventStoreError::EmptyThreadId);
        }
        if envelope.seq == 0 {
            return Err(EventStoreError::InvalidSeq);
        }

        let mut map = self.buffers.lock().expect("event store lock");
        let buf = map
            .entry(thread_id.to_string())
            .or_insert_with(VecDeque::new);
        buf.push_back(envelope);
        while buf.len() > self.capacity_per_thread {
            buf.pop_front();
        }
        Ok(())
    }

    pub fn replay_after(&self, thread_id: &str, after_seq: u64) -> Result<ReplayResult, EventStoreError> {
        if thread_id.trim().is_empty() {
            return Err(EventStoreError::EmptyThreadId);
        }

        let items: Vec<Envelope> = {
            let map = self.buffers.lock().expect("event store lock");
            let buf = match map.get(thread_id) {
                Some(v) if !v.is_empty() => v,
                _ => {
                    return Ok(ReplayResult {
                        envelopes: vec![],
                        complete: true,
                        available_from_seq: None,
                        available_to_seq: None,
                    })
                }
            };
            buf.iter().cloned().collect()
        };

        let available_from = items.first().map(|e| e.seq);
        let available_to = items.last().map(|e| e.seq);

        let filtered: Vec<Envelope> = items.into_iter().filter(|e| e.seq > after_seq).collect();
        if filtered.is_empty() {
            return Ok(ReplayResult {
                envelopes: vec![],
                complete: true,
                available_from_seq: available_from,
                available_to_seq: available_to,
            });
        }

        let expected_first = after_seq + 1;
        if filtered[0].seq != expected_first {
            return Ok(ReplayResult {
                envelopes: vec![],
                complete: false,
                available_from_seq: available_from,
                available_to_seq: available_to,
            });
        }

        let mut out: Vec<Envelope> = Vec::new();
        let mut expected = expected_first;
        let mut complete = true;
        for env in filtered {
            if env.seq != expected {
                complete = false;
                break;
            }
            out.push(env);
            expected += 1;
        }

        Ok(ReplayResult {
            envelopes: out,
            complete,
            available_from_seq: available_from,
            available_to_seq: available_to,
        })
    }
}

