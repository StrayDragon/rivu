use std::collections::HashMap;
use std::sync::Mutex;

#[derive(thiserror::Error, Debug)]
pub enum SeqError {
    #[error("thread_id must be non-empty")]
    EmptyThreadId,
}

#[derive(Debug, Default)]
pub struct SeqAllocator {
    next_by_thread: Mutex<HashMap<String, u64>>,
}

impl SeqAllocator {
    pub fn next(&self, thread_id: &str) -> Result<u64, SeqError> {
        if thread_id.trim().is_empty() {
            return Err(SeqError::EmptyThreadId);
        }
        let mut map = self.next_by_thread.lock().expect("seq allocator lock");
        let seq = *map.get(thread_id).unwrap_or(&1);
        map.insert(thread_id.to_string(), seq + 1);
        Ok(seq)
    }

    pub fn observe(&self, thread_id: &str, seq: u64) -> Result<(), SeqError> {
        if thread_id.trim().is_empty() {
            return Err(SeqError::EmptyThreadId);
        }
        let mut map = self.next_by_thread.lock().expect("seq allocator lock");
        let next = seq.saturating_add(1);
        let current = *map.get(thread_id).unwrap_or(&1);
        if next > current {
            map.insert(thread_id.to_string(), next);
        }
        Ok(())
    }
}

