use std::path::PathBuf;

use rivu_server_sdk::{
    reduce_envelopes_v1, resume_replay, Envelope, InMemoryRingBufferEventStore, SeqAllocator,
    SqliteSnapshotStore, UiV1EventProcessor, UiV1EventProcessorError, encode_sse_event,
};

use serde_json::json;

#[test]
fn seq_allocator_monotonic_and_observe() {
    let alloc = SeqAllocator::default();
    assert_eq!(alloc.next("t1").unwrap(), 1);
    assert_eq!(alloc.next("t1").unwrap(), 2);
    alloc.observe("t1", 10).unwrap();
    assert_eq!(alloc.next("t1").unwrap(), 11);
}

#[test]
fn sse_encodes_id_and_data() {
    let line = encode_sse_event(12, &json!({ "type": "STATE_SNAPSHOT", "snapshot": {} })).unwrap();
    assert!(line.starts_with("id: 12\n"));
    assert!(line.contains("\ndata: {"));
    assert!(line.ends_with("\n\n"));
}

#[test]
fn ring_buffer_replay_incomplete_when_evicted() {
    let store = InMemoryRingBufferEventStore::new(2);
    let thread_id = "t1";
    store
        .append(
            thread_id,
            Envelope {
                seq: 1,
                event: json!({ "type": "STATE_SNAPSHOT", "snapshot": {} }),
            },
        )
        .unwrap();
    store
        .append(
            thread_id,
            Envelope {
                seq: 2,
                event: json!({ "type": "STATE_SNAPSHOT", "snapshot": {} }),
            },
        )
        .unwrap();
    store
        .append(
            thread_id,
            Envelope {
                seq: 3,
                event: json!({ "type": "STATE_SNAPSHOT", "snapshot": {} }),
            },
        )
        .unwrap();
    store
        .append(
            thread_id,
            Envelope {
                seq: 4,
                event: json!({ "type": "STATE_SNAPSHOT", "snapshot": {} }),
            },
        )
        .unwrap();

    let replay = store.replay_after(thread_id, 1).unwrap();
    assert!(!replay.complete);
    assert!(replay.envelopes.is_empty());
}

#[test]
fn resume_falls_back_to_snapshot_and_bumps_allocator() {
    let store = InMemoryRingBufferEventStore::new(2);
    let thread_id = "t1";
    store
        .append(
            thread_id,
            Envelope {
                seq: 3,
                event: json!({ "type": "STATE_SNAPSHOT", "snapshot": { "k": 1 } }),
            },
        )
        .unwrap();
    store
        .append(
            thread_id,
            Envelope {
                seq: 4,
                event: json!({ "type": "STATE_SNAPSHOT", "snapshot": { "k": 2 } }),
            },
        )
        .unwrap();

    let dir = tempfile::tempdir().unwrap();
    let db_path: PathBuf = dir.path().join("snap.db");
    let snap_store = SqliteSnapshotStore::new(db_path).unwrap();
    snap_store
        .put(thread_id, 4, &json!({ "ui": { "v": 1, "components": {} } }))
        .unwrap();

    let alloc = SeqAllocator::default();
    let res = resume_replay(thread_id, 1, &store, &snap_store, Some(&alloc)).unwrap();
    assert_eq!(res.kind, rivu_server_sdk::ResumeKind::Snapshot);
    assert_eq!(res.envelopes.len(), 1);
    assert_eq!(res.envelopes[0].seq, 2);
    assert_eq!(res.envelopes[0].event["type"], "STATE_SNAPSHOT");
    assert_eq!(alloc.next(thread_id).unwrap(), 3);
}

#[test]
fn ui_v1_event_processor_idempotency_and_revision_conflict() {
    let shared_state = json!({
      "ui": {
        "v": 1,
        "components": {
          "cmp_1": {
            "type": "ApprovalCard",
            "schemaVersion": 1,
            "props": { "title": "Approve?" },
            "state": { "status": "pending" },
            "revision": 0,
            "mounts": []
          }
        }
      }
    });

    let event_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_1",
        "eventName": "approve",
        "payload": {},
        "clientRequestId": "req_1",
        "baseRevision": 0
      }
    });
    let event: rivu_server_sdk::UiV1CustomEvent = serde_json::from_value(event_json).unwrap();

    let processor = UiV1EventProcessor::default();
    let first = processor.process(&shared_state, &event).unwrap();
    assert_eq!(first.new_revision, 1);
    assert_eq!(first.events[0]["type"], "STATE_DELTA");

    let second = processor.process(&first.shared_state, &event).unwrap();
    assert_eq!(second.new_revision, 1);
    assert_eq!(
        second.shared_state["ui"]["components"]["cmp_1"]["revision"],
        1
    );

    let conflict_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_1",
        "eventName": "deny",
        "payload": {},
        "clientRequestId": "req_2",
        "baseRevision": 0
      }
    });
    let conflict: rivu_server_sdk::UiV1CustomEvent = serde_json::from_value(conflict_json).unwrap();

    let err = processor.process(&first.shared_state, &conflict).unwrap_err();
    match err {
        UiV1EventProcessorError::RevisionConflict { .. } => {}
        other => panic!("expected RevisionConflict, got {other:?}"),
    }

    let reduced = reduce_envelopes_v1(&[rivu_server_sdk::ReduceEnvelopeV1 {
        seq: 1,
        event: json!({ "type": "STATE_SNAPSHOT", "snapshot": first.shared_state.clone() }),
    }]);
    assert_eq!(reduced.status, "ok");
    assert_eq!(reduced.shared_state["ui"]["components"]["cmp_1"]["revision"], 1);
}
