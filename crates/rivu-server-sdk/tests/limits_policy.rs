use serde_json::json;

use rivu_server_sdk::{
    check_json_patch_limits_v1, decode_ui_v1_custom_event_with_limits_v1, push_json_patch_op_v1, DecodeUiV1CustomEventErrorV1,
    UiInputLimitsV1,
};

#[test]
fn decode_rejects_ui_event_payload_key_limit() {
    let limits: UiInputLimitsV1 = serde_json::from_value(json!({ "uiEvent": { "maxPayloadKeys": 1 } })).unwrap();
    let input = json!({
        "type": "CUSTOM",
        "name": "ui.v1.event",
        "value": {
            "componentId": "cmp_1",
            "eventName": "submit",
            "payload": { "a": 1, "b": 2 },
            "clientRequestId": "req_1",
            "baseRevision": 0
        }
    });
    let bytes = serde_json::to_vec(&input).unwrap();
    let err = decode_ui_v1_custom_event_with_limits_v1(&bytes, &limits).unwrap_err();
    match err {
        DecodeUiV1CustomEventErrorV1::LimitExceeded(e) => {
            assert_eq!(e.limit, "uiEvent.maxPayloadKeys");
            assert_eq!(e.max, 1);
            assert_eq!(e.observed, 2);
        }
        other => panic!("unexpected error: {other:?}"),
    }
}

#[test]
fn decode_rejects_max_string_length() {
    let limits: UiInputLimitsV1 = serde_json::from_value(json!({ "decode": { "maxStringLength": 3 } })).unwrap();
    let input = json!({
        "type": "CUSTOM",
        "name": "ui.v1.event",
        "value": {
            "componentId": "cmp_1",
            "eventName": "submit",
            "payload": { "a": "toolong" },
            "clientRequestId": "req_1",
            "baseRevision": 0
        }
    });
    let bytes = serde_json::to_vec(&input).unwrap();
    let err = decode_ui_v1_custom_event_with_limits_v1(&bytes, &limits).unwrap_err();
    match err {
        DecodeUiV1CustomEventErrorV1::LimitExceeded(e) => {
            assert_eq!(e.limit, "decode.maxStringLength");
            assert_eq!(e.max, 3);
            assert!(e.observed > 3);
        }
        other => panic!("unexpected error: {other:?}"),
    }
}

#[test]
fn json_patch_rejects_disallowed_path_prefix() {
    let limits: UiInputLimitsV1 = serde_json::from_value(json!({ "jsonPatch": { "allowedPathPrefixes": ["/ui"] } })).unwrap();
    let patch = vec![json!({ "op": "add", "path": "/messages/0/content", "value": "nope" })];

    let err = check_json_patch_limits_v1(&patch, &limits).unwrap_err();
    assert_eq!(err.limit, "jsonPatch.allowedPathPrefixes");
    assert_eq!(err.max, 0);
    assert_eq!(err.observed, 1);
    assert_eq!(err.path.as_deref(), Some("/messages/0/content"));
}

#[test]
fn json_patch_builder_rejects_disallowed_path_prefix() {
    let limits: UiInputLimitsV1 = serde_json::from_value(json!({ "jsonPatch": { "allowedPathPrefixes": ["/ui"] } })).unwrap();
    let mut ops = vec![];
    let err = push_json_patch_op_v1(&mut ops, json!({ "op": "add", "path": "/messages/0", "value": 1 }), &limits).unwrap_err();
    assert_eq!(err.limit, "jsonPatch.allowedPathPrefixes");
    assert_eq!(err.path.as_deref(), Some("/messages/0"));
}

