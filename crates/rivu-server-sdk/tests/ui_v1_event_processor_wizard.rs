use rivu_server_sdk::{UiV1CustomEvent, UiV1EventProcessor, UiV1EventProcessorError};
use serde_json::json;

#[test]
fn ui_v1_event_processor_wizard_next_idempotency_and_conflict() {
    let shared_state = json!({
      "ui": {
        "v": 1,
        "components": {
          "cmp_wiz": {
            "type": "MultiStepWizard",
            "schemaVersion": 1,
            "props": {
              "title": "Wizard",
              "steps": [
                { "id": "s1", "title": "Step 1", "fields": [{ "id": "email", "label": "Email", "type": "text" }] },
                { "id": "s2", "title": "Step 2", "fields": [{ "id": "plan", "label": "Plan", "type": "text" }] }
              ]
            },
            "state": { "currentStepId": "s1", "values": {}, "status": "idle" },
            "revision": 0,
            "mounts": []
          }
        }
      }
    });

    let next_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_wiz",
        "eventName": "wizard.next",
        "payload": {},
        "clientRequestId": "req_1",
        "baseRevision": 0
      }
    });
    let next: UiV1CustomEvent = serde_json::from_value(next_json).unwrap();

    let processor = UiV1EventProcessor::default();
    let first = processor.process(&shared_state, &next).unwrap();
    assert_eq!(first.new_revision, 1);
    assert_eq!(first.shared_state["ui"]["components"]["cmp_wiz"]["revision"], 1);
    assert_eq!(
        first.shared_state["ui"]["components"]["cmp_wiz"]["state"]["currentStepId"],
        "s2"
    );

    let second = processor.process(&first.shared_state, &next).unwrap();
    assert_eq!(second.new_revision, 1);
    assert_eq!(second.shared_state["ui"]["components"]["cmp_wiz"]["revision"], 1);

    let conflict_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_wiz",
        "eventName": "wizard.prev",
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
fn ui_v1_event_processor_wizard_next_rejects_non_empty_payload() {
    let shared_state = json!({
      "ui": {
        "v": 1,
        "components": {
          "cmp_wiz": {
            "type": "MultiStepWizard",
            "schemaVersion": 1,
            "props": {
              "title": "Wizard",
              "steps": [
                { "id": "s1", "title": "Step 1", "fields": [{ "id": "email", "label": "Email", "type": "text" }] },
                { "id": "s2", "title": "Step 2", "fields": [{ "id": "plan", "label": "Plan", "type": "text" }] }
              ]
            },
            "state": { "currentStepId": "s1", "values": {}, "status": "idle" },
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
        "componentId": "cmp_wiz",
        "eventName": "wizard.next",
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

