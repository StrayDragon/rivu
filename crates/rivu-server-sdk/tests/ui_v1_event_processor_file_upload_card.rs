use rivu_server_sdk::{UiV1CustomEvent, UiV1EventProcessor, UiV1EventProcessorError};
use serde_json::json;

#[test]
fn ui_v1_event_processor_file_upload_card_add_idempotency_and_conflict() {
    let shared_state = json!({
      "ui": {
        "v": 1,
        "components": {
          "cmp_upload": {
            "type": "FileUploadCard",
            "schemaVersion": 1,
            "props": { "title": "Upload" },
            "state": { "files": [], "status": "idle" },
            "revision": 0,
            "mounts": []
          }
        }
      }
    });

    let add_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_upload",
        "eventName": "file.add",
        "payload": {
          "file": { "id": "file_1", "name": "a.txt", "sizeBytes": 12, "mimeType": "text/plain" }
        },
        "clientRequestId": "req_1",
        "baseRevision": 0
      }
    });
    let add: UiV1CustomEvent = serde_json::from_value(add_json).unwrap();

    let processor = UiV1EventProcessor::default();
    let first = processor.process(&shared_state, &add).unwrap();
    assert_eq!(first.new_revision, 1);
    assert_eq!(first.shared_state["ui"]["components"]["cmp_upload"]["revision"], 1);
    assert_eq!(first.shared_state["ui"]["components"]["cmp_upload"]["state"]["files"].as_array().unwrap().len(), 1);

    let second = processor.process(&first.shared_state, &add).unwrap();
    assert_eq!(second.new_revision, 1);
    assert_eq!(second.shared_state["ui"]["components"]["cmp_upload"]["revision"], 1);

    let conflict_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_upload",
        "eventName": "file.remove",
        "payload": { "fileId": "file_1" },
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
fn ui_v1_event_processor_file_upload_card_submit_rejects_non_empty_payload() {
    let shared_state = json!({
      "ui": {
        "v": 1,
        "components": {
          "cmp_upload": {
            "type": "FileUploadCard",
            "schemaVersion": 1,
            "props": { "title": "Upload" },
            "state": { "files": [], "status": "idle" },
            "revision": 0,
            "mounts": []
          }
        }
      }
    });

    let bad_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_upload",
        "eventName": "file.submit",
        "payload": { "x": 1 },
        "clientRequestId": "req_bad",
        "baseRevision": 0
      }
    });
    let bad: UiV1CustomEvent = serde_json::from_value(bad_json).unwrap();

    let processor = UiV1EventProcessor::default();
    let err = processor.process(&shared_state, &bad).unwrap_err();
    match err {
        UiV1EventProcessorError::InvalidPayload(_) => {}
        other => panic!("expected InvalidPayload, got {other:?}"),
    }
}

