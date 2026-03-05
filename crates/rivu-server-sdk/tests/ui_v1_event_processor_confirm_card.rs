use rivu_server_sdk::{UiV1CustomEvent, UiV1EventProcessor, UiV1EventProcessorError};
use serde_json::json;

#[test]
fn ui_v1_event_processor_confirm_card_confirm_idempotency_and_conflict() {
    let shared_state = json!({
      "ui": {
        "v": 1,
        "components": {
          "cmp_confirm": {
            "type": "ConfirmCard",
            "schemaVersion": 1,
            "props": { "title": "Confirm?" },
            "state": { "status": "pending" },
            "revision": 0,
            "mounts": []
          }
        }
      }
    });

    let confirm_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_confirm",
        "eventName": "confirm",
        "payload": {},
        "clientRequestId": "req_1",
        "baseRevision": 0
      }
    });
    let confirm: UiV1CustomEvent = serde_json::from_value(confirm_json).unwrap();

    let processor = UiV1EventProcessor::default();
    let first = processor.process(&shared_state, &confirm).unwrap();
    assert_eq!(first.new_revision, 1);
    assert_eq!(first.shared_state["ui"]["components"]["cmp_confirm"]["revision"], 1);
    assert_eq!(
        first.shared_state["ui"]["components"]["cmp_confirm"]["state"]["status"],
        "confirmed"
    );
    assert!(
        first.shared_state["ui"]["components"]["cmp_confirm"]["state"]["decidedAtMs"]
            .as_i64()
            .is_some()
    );

    let second = processor.process(&first.shared_state, &confirm).unwrap();
    assert_eq!(second.new_revision, 1);
    assert_eq!(
        second.shared_state["ui"]["components"]["cmp_confirm"]["revision"],
        1
    );

    let conflict_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_confirm",
        "eventName": "cancel",
        "payload": {},
        "clientRequestId": "req_2",
        "baseRevision": 0
      }
    });
    let conflict: UiV1CustomEvent = serde_json::from_value(conflict_json).unwrap();
    let err = processor.process(&first.shared_state, &conflict).unwrap_err();
    match err {
        UiV1EventProcessorError::RevisionConflict { .. } => {}
        other => panic!("expected RevisionConflict, got {other:?}"),
    }
}

#[test]
fn ui_v1_event_processor_confirm_card_cancel_transition() {
    let shared_state = json!({
      "ui": {
        "v": 1,
        "components": {
          "cmp_confirm": {
            "type": "ConfirmCard",
            "schemaVersion": 1,
            "props": { "title": "Confirm?" },
            "state": { "status": "pending" },
            "revision": 0,
            "mounts": []
          }
        }
      }
    });

    let cancel_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_confirm",
        "eventName": "cancel",
        "payload": {},
        "clientRequestId": "req_cancel_1",
        "baseRevision": 0
      }
    });
    let cancel: UiV1CustomEvent = serde_json::from_value(cancel_json).unwrap();

    let processor = UiV1EventProcessor::default();
    let first = processor.process(&shared_state, &cancel).unwrap();
    assert_eq!(first.new_revision, 1);
    assert_eq!(
        first.shared_state["ui"]["components"]["cmp_confirm"]["state"]["status"],
        "cancelled"
    );
    assert!(
        first.shared_state["ui"]["components"]["cmp_confirm"]["state"]["decidedAtMs"]
            .as_i64()
            .is_some()
    );
}

