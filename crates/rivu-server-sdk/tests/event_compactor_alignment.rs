use std::path::Path;

use rivu_server_sdk::{
    CompactingEventSink, DefaultEventCompactor, Envelope, EventCompactor, EventCompactorConfig,
    InMemoryRingBufferEventStore, SqliteSnapshotStore,
};

use serde_json::{json, Value};

fn config_from_vectors(value: &Value) -> EventCompactorConfig {
    let flush_interval_ms = value.get("flushIntervalMs").and_then(Value::as_u64).unwrap_or(0);
    let max_buffered_events = value
        .get("maxBufferedEvents")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let max_buffered_bytes = value.get("maxBufferedBytes").and_then(Value::as_u64).unwrap_or(0);
    let max_replay_events = value.get("maxReplayEvents").and_then(Value::as_u64).unwrap_or(0);

    EventCompactorConfig {
        flush_interval_ms: if flush_interval_ms > 0 {
            Some(flush_interval_ms)
        } else {
            None
        },
        max_buffered_events: if max_buffered_events > 0 {
            Some(max_buffered_events as usize)
        } else {
            None
        },
        max_buffered_bytes: if max_buffered_bytes > 0 {
            Some(max_buffered_bytes as usize)
        } else {
            None
        },
        max_replay_events: if max_replay_events > 0 {
            Some(max_replay_events as usize)
        } else {
            None
        },
    }
}

#[test]
fn vectors_event_compactor_output_matches_golden() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/event-compaction.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: Value = serde_json::from_str(&raw).expect("parse vectors json");
    assert_eq!(vectors["version"], 1);

    let cases = vectors["eventCompaction"].as_array().expect("eventCompaction cases array");
    for case in cases {
        let id = case["id"].as_str().unwrap_or("<unknown>");
        let config = config_from_vectors(&case["config"]);

        let mut compactor = DefaultEventCompactor::new(config);
        let mut out: Vec<Envelope> = vec![];

        let input_envs_value = case["input"]["envelopes"].clone();
        let input_envs: Vec<Envelope> = serde_json::from_value(input_envs_value).expect("parse input envelopes");
        for env in input_envs {
            out.extend(compactor.push(env).expect("push"));
        }
        out.extend(compactor.flush());

        let actual = serde_json::to_value(out).expect("serialize actual");
        let expected = case["expect"]["envelopes"].clone();
        assert_eq!(actual, expected, "case {}", id);
    }
}

#[test]
fn flush_triggers_by_max_buffered_events_exceeds() {
    let mut compactor = DefaultEventCompactor::new(EventCompactorConfig {
        max_buffered_events: Some(1),
        ..Default::default()
    });
    let out1 = compactor
        .push(Envelope {
            seq: 1,
            event: json!({ "type": "TEXT_MESSAGE_CHUNK", "messageId": "m1", "role": "assistant", "delta": "a" }),
        })
        .unwrap();
    assert!(out1.is_empty());

    let out2 = compactor
        .push(Envelope {
            seq: 2,
            event: json!({ "type": "TEXT_MESSAGE_CHUNK", "messageId": "m2", "role": "assistant", "delta": "b" }),
        })
        .unwrap();
    assert_eq!(out2.len(), 2);
    assert!(compactor.flush().is_empty());
}

#[test]
fn flush_triggers_by_max_buffered_bytes_exceeds() {
    let mut compactor = DefaultEventCompactor::new(EventCompactorConfig {
        max_buffered_bytes: Some(1),
        ..Default::default()
    });
    let out = compactor
        .push(Envelope {
            seq: 1,
            event: json!({ "type": "TEXT_MESSAGE_CHUNK", "messageId": "m1", "role": "assistant", "delta": "a" }),
        })
        .unwrap();
    assert_eq!(out.len(), 1);
    assert!(compactor.flush().is_empty());
}

#[test]
fn sink_persists_state_snapshots_to_snapshot_store() {
    let event_store = InMemoryRingBufferEventStore::new(10);
    let dir = tempfile::tempdir().unwrap();
    let db_path = dir.path().join("snap.db");
    let snapshot_store = SqliteSnapshotStore::new(db_path).unwrap();

    let compactor = DefaultEventCompactor::new(EventCompactorConfig {
        max_replay_events: Some(1),
        ..Default::default()
    });
    let mut sink = CompactingEventSink::new("t1", &event_store, &snapshot_store, compactor);

    sink.push(Envelope {
        seq: 1,
        event: json!({ "type": "STATE_SNAPSHOT", "snapshot": { "ui": { "v": 1, "components": {} }, "k": 0 } }),
    })
    .unwrap();
    sink.push(Envelope {
        seq: 2,
        event: json!({ "type": "STATE_DELTA", "delta": [{ "op": "add", "path": "/k", "value": 1 }] }),
    })
    .unwrap();
    sink.push(Envelope {
        seq: 3,
        event: json!({ "type": "STATE_DELTA", "delta": [{ "op": "replace", "path": "/k", "value": 2 }] }),
    })
    .unwrap();
    sink.flush().unwrap();

    let latest = snapshot_store.get_latest("t1").unwrap().expect("snapshot exists");
    assert_eq!(latest.seq, 3);
    assert_eq!(latest.shared_state["k"], 2);
}

