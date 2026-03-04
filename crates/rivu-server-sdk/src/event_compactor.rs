use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::{json, Value};

use crate::event_store::Envelope;
use crate::snapshot_store::SqliteSnapshotStore;
use crate::ui_spec::apply_json_patch;
use crate::{EventStoreError, InMemoryRingBufferEventStore, SnapshotStoreError};

#[derive(Debug, Clone, Copy, Default)]
pub struct EventCompactorConfig {
    /// Flush buffered envelopes when more than this many are buffered.
    ///
    /// Use `None` to disable.
    pub max_buffered_events: Option<usize>,

    /// Flush buffered envelopes when buffered JSON bytes exceed this budget.
    ///
    /// Use `None` to disable.
    pub max_buffered_bytes: Option<usize>,

    /// Flush buffered envelopes when more than this many milliseconds have elapsed since the last flush.
    ///
    /// Use `None` to disable.
    pub flush_interval_ms: Option<u64>,

    /// When the number of `STATE_DELTA` events since the last snapshot exceeds this budget, emit a
    /// `STATE_SNAPSHOT` to truncate the patch chain.
    ///
    /// Use `None` to disable.
    pub max_replay_events: Option<usize>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct EventCompactorMetrics {
    pub buffered_events: usize,
    pub buffered_bytes: usize,
    pub last_seq: u64,
    pub state_deltas_since_snapshot: usize,
    pub merged_text_chunks: u64,
    pub merged_tool_chunks: u64,
    pub snapshots_created: u64,
    pub flushes: u64,
}

#[derive(thiserror::Error, Debug)]
pub enum EventCompactorError {
    #[error("invalid envelope seq (must be > 0)")]
    InvalidSeq,

    #[error("STATE_SNAPSHOT.snapshot must be a json object")]
    SnapshotNotObject,

    #[error("STATE_DELTA.delta must be a json array")]
    DeltaNotArray,

    #[error("failed to apply json patch")]
    PatchApplyFailed,

    #[error(transparent)]
    EventStore(#[from] EventStoreError),

    #[error(transparent)]
    SnapshotStore(#[from] SnapshotStoreError),
}

pub trait EventCompactor {
    fn push(&mut self, envelope: Envelope) -> Result<Vec<Envelope>, EventCompactorError>;
    fn flush(&mut self) -> Vec<Envelope>;
    fn metrics(&self) -> EventCompactorMetrics;
}

#[derive(Debug, Clone)]
pub struct DefaultEventCompactor {
    config: EventCompactorConfig,
    buffer: Vec<Envelope>,
    buffered_bytes: usize,
    last_flush_at_ms: u64,
    last_seq: u64,
    shared_state: Value,
    state_deltas_since_snapshot: usize,
    merged_text_chunks: u64,
    merged_tool_chunks: u64,
    snapshots_created: u64,
    flushes: u64,
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn estimate_envelope_bytes(env: &Envelope) -> usize {
    // Best-effort estimate for buffering/flush budgets.
    serde_json::to_vec(env).map(|v| v.len()).unwrap_or(0)
}

fn get_string_field<'a>(event: &'a Value, key: &str) -> Option<&'a str> {
    event.get(key).and_then(Value::as_str).map(|s| s.trim()).filter(|s| !s.is_empty())
}

impl DefaultEventCompactor {
    pub fn new(config: EventCompactorConfig) -> Self {
        Self {
            config,
            buffer: vec![],
            buffered_bytes: 0,
            last_flush_at_ms: now_ms(),
            last_seq: 0,
            shared_state: Value::Object(serde_json::Map::new()),
            state_deltas_since_snapshot: 0,
            merged_text_chunks: 0,
            merged_tool_chunks: 0,
            snapshots_created: 0,
            flushes: 0,
        }
    }

    pub fn config(&self) -> EventCompactorConfig {
        self.config
    }

    fn should_flush_by_time(&self) -> bool {
        let Some(interval) = self.config.flush_interval_ms else {
            return false;
        };
        if self.buffer.is_empty() {
            return false;
        }
        now_ms().saturating_sub(self.last_flush_at_ms) >= interval
    }

    fn should_flush_by_budget(&self) -> bool {
        if let Some(max) = self.config.max_buffered_events {
            if self.buffer.len() > max {
                return true;
            }
        }
        if let Some(max) = self.config.max_buffered_bytes {
            if self.buffered_bytes > max {
                return true;
            }
        }
        false
    }

    fn push_buffered(&mut self, envelope: Envelope) {
        self.buffered_bytes += estimate_envelope_bytes(&envelope);
        self.buffer.push(envelope);
    }

    fn try_merge_text_chunk(&mut self, envelope: &Envelope) -> bool {
        let event = &envelope.event;
        if event.get("type").and_then(Value::as_str) != Some("TEXT_MESSAGE_CHUNK") {
            return false;
        }
        let message_id = get_string_field(event, "messageId");
        if message_id.is_none() {
            return false;
        }
        let role = get_string_field(event, "role").unwrap_or("assistant");
        let delta = event.get("delta").and_then(Value::as_str).unwrap_or("");

        let Some(last) = self.buffer.last_mut() else {
            return false;
        };
        if last.event.get("type").and_then(Value::as_str) != Some("TEXT_MESSAGE_CHUNK") {
            return false;
        }
        let last_message_id = get_string_field(&last.event, "messageId");
        if last_message_id != message_id {
            return false;
        }
        let last_role = get_string_field(&last.event, "role").unwrap_or("assistant");
        if last_role != role {
            return false;
        }

        let prev_bytes = estimate_envelope_bytes(last);
        let last_delta = last.event.get("delta").and_then(Value::as_str).unwrap_or("");
        let combined = format!("{last_delta}{delta}");
        last.seq = envelope.seq;
        last.event["delta"] = Value::String(combined);
        self.buffered_bytes = self.buffered_bytes.saturating_sub(prev_bytes) + estimate_envelope_bytes(last);
        self.merged_text_chunks += 1;
        true
    }

    fn try_merge_tool_chunk(&mut self, envelope: &Envelope) -> bool {
        let event = &envelope.event;
        if event.get("type").and_then(Value::as_str) != Some("TOOL_CALL_CHUNK") {
            return false;
        }
        let tool_call_id = get_string_field(event, "toolCallId");
        if tool_call_id.is_none() {
            return false;
        }
        let delta = event.get("delta").and_then(Value::as_str).unwrap_or("");
        let name = get_string_field(event, "toolCallName").map(|s| s.to_string());
        let parent = get_string_field(event, "parentMessageId").map(|s| s.to_string());

        let Some(last) = self.buffer.last_mut() else {
            return false;
        };
        if last.event.get("type").and_then(Value::as_str) != Some("TOOL_CALL_CHUNK") {
            return false;
        }
        let last_tool_call_id = get_string_field(&last.event, "toolCallId");
        if last_tool_call_id != tool_call_id {
            return false;
        }

        let last_name = get_string_field(&last.event, "toolCallName").map(|s| s.to_string());
        if let (Some(a), Some(b)) = (&last_name, &name) {
            if a != b {
                return false;
            }
        }
        let last_parent = get_string_field(&last.event, "parentMessageId").map(|s| s.to_string());
        if let (Some(a), Some(b)) = (&last_parent, &parent) {
            if a != b {
                return false;
            }
        }

        let prev_bytes = estimate_envelope_bytes(last);
        let last_delta = last.event.get("delta").and_then(Value::as_str).unwrap_or("");
        let combined = format!("{last_delta}{delta}");
        last.seq = envelope.seq;
        last.event["delta"] = Value::String(combined);
        if last_name.is_none() {
            if let Some(name) = &name {
                last.event["toolCallName"] = Value::String(name.clone());
            }
        }
        if last_parent.is_none() {
            if let Some(parent) = &parent {
                last.event["parentMessageId"] = Value::String(parent.clone());
            }
        }
        self.buffered_bytes = self.buffered_bytes.saturating_sub(prev_bytes) + estimate_envelope_bytes(last);
        self.merged_tool_chunks += 1;
        true
    }

    fn on_state_snapshot(&mut self, envelope: &Envelope) -> Result<(), EventCompactorError> {
        let snapshot = envelope.event.get("snapshot").cloned().unwrap_or(Value::Null);
        if !snapshot.is_object() {
            return Err(EventCompactorError::SnapshotNotObject);
        }
        self.shared_state = snapshot;
        self.state_deltas_since_snapshot = 0;
        Ok(())
    }

    fn on_state_delta(&mut self, envelope: &Envelope) -> Result<(), EventCompactorError> {
        let delta = envelope
            .event
            .get("delta")
            .and_then(Value::as_array)
            .cloned()
            .ok_or(EventCompactorError::DeltaNotArray)?;
        let next = apply_json_patch(&self.shared_state, &delta).map_err(|_| EventCompactorError::PatchApplyFailed)?;
        if !next.is_object() {
            return Err(EventCompactorError::PatchApplyFailed);
        }
        self.shared_state = next;
        self.state_deltas_since_snapshot += 1;
        Ok(())
    }

    fn maybe_truncate_patch_chain(&mut self, seq: u64) {
        let Some(max) = self.config.max_replay_events else {
            return;
        };
        if self.state_deltas_since_snapshot <= max {
            return;
        }

        // Keep snapshots; drop buffered STATE_DELTA events after the last snapshot.
        let last_snapshot_seq = self
            .buffer
            .iter()
            .rev()
            .find(|env| env.event.get("type").and_then(Value::as_str) == Some("STATE_SNAPSHOT"))
            .map(|env| env.seq)
            .unwrap_or(0);

        self.buffer.retain(|env| {
            let t = env.event.get("type").and_then(Value::as_str).unwrap_or("");
            t != "STATE_DELTA" || env.seq <= last_snapshot_seq
        });

        self.buffer.push(Envelope {
            seq,
            event: json!({ "type": "STATE_SNAPSHOT", "snapshot": self.shared_state.clone() }),
        });

        self.buffered_bytes = self.buffer.iter().map(estimate_envelope_bytes).sum();
        self.state_deltas_since_snapshot = 0;
        self.snapshots_created += 1;
    }
}

impl EventCompactor for DefaultEventCompactor {
    fn push(&mut self, envelope: Envelope) -> Result<Vec<Envelope>, EventCompactorError> {
        if envelope.seq == 0 {
            return Err(EventCompactorError::InvalidSeq);
        }

        let mut flushed: Vec<Envelope> = vec![];

        if self.should_flush_by_time() {
            flushed.extend(self.flush());
        }

        self.last_seq = envelope.seq.max(self.last_seq);

        if self.try_merge_text_chunk(&envelope) {
            // merged
        } else if self.try_merge_tool_chunk(&envelope) {
            // merged
        } else {
            self.push_buffered(envelope.clone());
        }

        let event_type = envelope.event.get("type").and_then(Value::as_str).unwrap_or("");
        if event_type == "STATE_SNAPSHOT" {
            self.on_state_snapshot(&envelope)?;
        } else if event_type == "STATE_DELTA" {
            self.on_state_delta(&envelope)?;
            self.maybe_truncate_patch_chain(envelope.seq);
        }

        if self.should_flush_by_budget() {
            flushed.extend(self.flush());
        }

        Ok(flushed)
    }

    fn flush(&mut self) -> Vec<Envelope> {
        if self.buffer.is_empty() {
            return vec![];
        }
        self.flushes += 1;
        self.last_flush_at_ms = now_ms();
        self.buffered_bytes = 0;
        std::mem::take(&mut self.buffer)
    }

    fn metrics(&self) -> EventCompactorMetrics {
        EventCompactorMetrics {
            buffered_events: self.buffer.len(),
            buffered_bytes: self.buffered_bytes,
            last_seq: self.last_seq,
            state_deltas_since_snapshot: self.state_deltas_since_snapshot,
            merged_text_chunks: self.merged_text_chunks,
            merged_tool_chunks: self.merged_tool_chunks,
            snapshots_created: self.snapshots_created,
            flushes: self.flushes,
        }
    }
}

/// Optional helper that persists compactor output into the default stores:
/// - compacted envelopes → `InMemoryRingBufferEventStore`
/// - emitted `STATE_SNAPSHOT` → `SqliteSnapshotStore`
pub struct CompactingEventSink<'a> {
    thread_id: &'a str,
    event_store: &'a InMemoryRingBufferEventStore,
    snapshot_store: &'a SqliteSnapshotStore,
    compactor: DefaultEventCompactor,
}

impl<'a> CompactingEventSink<'a> {
    pub fn new(
        thread_id: &'a str,
        event_store: &'a InMemoryRingBufferEventStore,
        snapshot_store: &'a SqliteSnapshotStore,
        compactor: DefaultEventCompactor,
    ) -> Self {
        Self {
            thread_id,
            event_store,
            snapshot_store,
            compactor,
        }
    }

    pub fn push(&mut self, envelope: Envelope) -> Result<(), EventCompactorError> {
        let out = self.compactor.push(envelope)?;
        self.persist(out)?;
        Ok(())
    }

    pub fn flush(&mut self) -> Result<(), EventCompactorError> {
        let out = self.compactor.flush();
        self.persist(out)?;
        Ok(())
    }

    pub fn metrics(&self) -> EventCompactorMetrics {
        self.compactor.metrics()
    }

    fn persist(&self, envelopes: Vec<Envelope>) -> Result<(), EventCompactorError> {
        for env in envelopes {
            if env.event.get("type").and_then(Value::as_str) == Some("STATE_SNAPSHOT") {
                let snapshot = env.event.get("snapshot").cloned().unwrap_or(Value::Null);
                if !snapshot.is_object() {
                    return Err(EventCompactorError::SnapshotNotObject);
                }
                self.snapshot_store.put(self.thread_id, env.seq, &snapshot)?;
            }
            self.event_store.append(self.thread_id, env)?;
        }
        Ok(())
    }
}
