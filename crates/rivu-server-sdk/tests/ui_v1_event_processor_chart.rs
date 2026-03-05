use rivu_server_sdk::{UiV1CustomEvent, UiV1EventProcessor, UiV1EventProcessorError};
use serde_json::json;

#[test]
fn ui_v1_event_processor_chart_selection_idempotency_and_conflict() {
    let shared_state = json!({
      "ui": {
        "v": 1,
        "components": {
          "cmp_chart": {
            "type": "Chart",
            "schemaVersion": 1,
            "props": {
              "mark": "bar",
              "data": { "columns": ["x", "y"], "rows": [[1, 10], [2, 20]] },
              "encoding": { "x": "x", "y": "y" }
            },
            "state": { "selection": { "kind": "none" } },
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
        "componentId": "cmp_chart",
        "eventName": "chart.setSelection",
        "payload": { "selection": { "kind": "point", "rowIndex": 1 } },
        "clientRequestId": "req_1",
        "baseRevision": 0
      }
    });
    let event: UiV1CustomEvent = serde_json::from_value(event_json).unwrap();

    let processor = UiV1EventProcessor::default();
    let first = processor.process(&shared_state, &event).unwrap();
    assert_eq!(first.new_revision, 1);
    assert_eq!(first.shared_state["ui"]["components"]["cmp_chart"]["revision"], 1);
    assert_eq!(
        first.shared_state["ui"]["components"]["cmp_chart"]["state"]["selection"]["kind"],
        "point"
    );
    assert_eq!(
        first.shared_state["ui"]["components"]["cmp_chart"]["state"]["selection"]["rowIndex"],
        1
    );

    let second = processor.process(&first.shared_state, &event).unwrap();
    assert_eq!(second.new_revision, 1);
    assert_eq!(
        second.shared_state["ui"]["components"]["cmp_chart"]["revision"],
        1
    );

    let conflict_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_chart",
        "eventName": "chart.clearSelection",
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

    let invalid_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_chart",
        "eventName": "chart.setSelection",
        "payload": { "selection": { "kind": "point", "rowIndex": 2 } },
        "clientRequestId": "req_3",
        "baseRevision": 1
      }
    });
    let invalid: UiV1CustomEvent = serde_json::from_value(invalid_json).unwrap();
    let err = processor.process(&first.shared_state, &invalid).unwrap_err();
    match err {
        UiV1EventProcessorError::InvalidPayload(msg) => assert!(msg.contains("out of range"), "msg={msg}"),
        other => panic!("expected InvalidPayload, got {other:?}"),
    }

    let clear_json = json!({
      "type": "CUSTOM",
      "name": "ui.v1.event",
      "value": {
        "componentId": "cmp_chart",
        "eventName": "chart.clearSelection",
        "payload": {},
        "clientRequestId": "req_4",
        "baseRevision": 1
      }
    });
    let clear: UiV1CustomEvent = serde_json::from_value(clear_json).unwrap();
    let cleared = processor.process(&first.shared_state, &clear).unwrap();
    assert_eq!(cleared.new_revision, 2);
    assert_eq!(
        cleared.shared_state["ui"]["components"]["cmp_chart"]["state"]["selection"]["kind"],
        "none"
    );
}

