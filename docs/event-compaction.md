# Event Compaction (flush / snapshot / tuning)

This guide describes a recommended **server-side** flush/compaction strategy for Rivu-style high-frequency event streams.

**Goal:** reduce write amplification and bound replay/export cost by merging streamed `*_CHUNK` events and periodically snapshotting `sharedState`.

## What compaction does (v1)

Compaction is intended to run at the **storage boundary**:
- online clients can still receive fine-grained streaming events
- the stored/replayed stream can be compacted (fewer envelopes) without changing final semantics

Default v1 behaviors:
- merge **consecutive** `TEXT_MESSAGE_CHUNK` with the same `messageId` (string concatenation)
- merge **consecutive** `TOOL_CALL_CHUNK` with the same `toolCallId` (args concatenation)
- when `STATE_DELTA` chains become too long, emit a `STATE_SNAPSHOT` to truncate patch replay

## Flush triggers (v1)

A compactor should support combining these triggers:
- **by time**: `flushIntervalMs` (e.g. every 5s)
- **by event count**: `maxBufferedEvents` (e.g. flush after buffering > 1000 envelopes)
- **by bytes**: `maxBufferedBytes` (e.g. flush after buffering > 256 KB of JSON)

Tuning notes:
- smaller thresholds → lower memory, more frequent writes
- larger thresholds → better merge ratio, fewer writes, but higher in-memory buffering

## Snapshot / replay budget

Use `maxReplayEvents` to keep patch replay bounded:
- when the number of `STATE_DELTA` since the last snapshot **exceeds** `maxReplayEvents`
- emit a `STATE_SNAPSHOT` representing the current `sharedState`

This pairs with `resumeFrom` semantics:
- if replay is incomplete (due to compaction/eviction), fall back to sending `STATE_SNAPSHOT`

## Python (server SDK)

Minimal outline using the default stores + compactor sink:

```py
from rivu_server_sdk import (
  InMemoryRingBufferEventStore,
  SqliteSnapshotStore,
  CompactingEventSink,
  DefaultEventCompactor,
  EventCompactorConfig,
)

events = InMemoryRingBufferEventStore(capacity_per_thread=20_000)
snaps = SqliteSnapshotStore("rivu.snapshots.db")

sink = CompactingEventSink(
  thread_id="th_1",
  event_store=events,
  snapshot_store=snaps,
  compactor=DefaultEventCompactor(EventCompactorConfig(
    flush_interval_ms=5_000,
    max_buffered_events=1_000,
    max_buffered_bytes=256_000,
    max_replay_events=1_000,
  )),
)

# On each emitted envelope:
sink.push({"seq": 1, "event": {"type": "TEXT_MESSAGE_CHUNK", "messageId": "m1", "role": "assistant", "delta": "hi"}})

# At the end (or on shutdown):
sink.flush()
```

## Rust (server SDK)

Minimal outline:

```rust
use rivu_server_sdk::{
  CompactingEventSink, DefaultEventCompactor, EventCompactorConfig,
  Envelope, InMemoryRingBufferEventStore, SqliteSnapshotStore,
};
use serde_json::json;

let events = InMemoryRingBufferEventStore::new(20_000);
let snaps = SqliteSnapshotStore::new("rivu.snapshots.db").unwrap();

let compactor = DefaultEventCompactor::new(EventCompactorConfig {
  flush_interval_ms: Some(5_000),
  max_buffered_events: Some(1_000),
  max_buffered_bytes: Some(256_000),
  max_replay_events: Some(1_000),
});

let mut sink = CompactingEventSink::new("th_1", &events, &snaps, compactor);

sink.push(Envelope {
  seq: 1,
  event: json!({ "type": "TEXT_MESSAGE_CHUNK", "messageId": "m1", "role": "assistant", "delta": "hi" }),
}).unwrap();

sink.flush().unwrap();
```

