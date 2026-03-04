use serde_json::{json, Value};

use crate::event_store::{Envelope, InMemoryRingBufferEventStore};
use crate::seq::SeqAllocator;
use crate::snapshot_store::SqliteSnapshotStore;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResumeKind {
    Replay,
    Snapshot,
    NotFound,
}

#[derive(Debug, Clone)]
pub struct ResumeResult {
    pub kind: ResumeKind,
    pub envelopes: Vec<Envelope>,
}

#[derive(thiserror::Error, Debug)]
pub enum ResumeError {
    #[error(transparent)]
    EventStore(#[from] crate::event_store::EventStoreError),
    #[error(transparent)]
    SnapshotStore(#[from] crate::snapshot_store::SnapshotStoreError),
    #[error(transparent)]
    Seq(#[from] crate::seq::SeqError),
}

pub fn resume_replay(
    thread_id: &str,
    resume_from: u64,
    event_store: &InMemoryRingBufferEventStore,
    snapshot_store: &SqliteSnapshotStore,
    seq_allocator: Option<&SeqAllocator>,
) -> Result<ResumeResult, ResumeError> {
    let replay = event_store.replay_after(thread_id, resume_from)?;
    if replay.complete {
        return Ok(ResumeResult {
            kind: ResumeKind::Replay,
            envelopes: replay.envelopes,
        });
    }

    let snapshot = snapshot_store.get_latest(thread_id)?;
    let Some(snap) = snapshot else {
        return Ok(ResumeResult {
            kind: ResumeKind::NotFound,
            envelopes: vec![],
        });
    };

    let seq = resume_from + 1;
    if let Some(alloc) = seq_allocator {
        alloc.observe(thread_id, seq)?;
    }

    let event: Value = json!({ "type": "STATE_SNAPSHOT", "snapshot": snap.shared_state });
    Ok(ResumeResult {
        kind: ResumeKind::Snapshot,
        envelopes: vec![Envelope { seq, event }],
    })
}

