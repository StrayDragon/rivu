use std::path::Path;

use rivu_server_sdk::{
    compile_a2ui_v1, decode_a2ui_v1_with_limits_v1, parse_a2ui_v1, DecodeLimits, InMemoryKeyMapStore, KeyMapStore,
    UiInputDecodeLimitsV1, UiInputLimitsV1,
};

#[test]
fn vectors_a2ui_v1_valid_invalid() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/a2ui-v1.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: serde_json::Value = serde_json::from_str(&raw).expect("parse vectors json");

    let valid = vectors["a2uiV1"]["valid"].as_array().expect("valid array");
    for (i, item) in valid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_a2ui_v1(&bytes, DecodeLimits::default());
        assert!(result.is_ok(), "expected valid a2uiV1[{}] to parse", i);
    }

    let invalid = vectors["a2uiV1"]["invalid"].as_array().expect("invalid array");
    for (i, item) in invalid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_a2ui_v1(&bytes, DecodeLimits::default());
        assert!(result.is_err(), "expected invalid a2uiV1[{}] to fail", i);
    }
}

#[test]
fn vectors_compile_a2ui_v1() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/a2ui-v1.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: serde_json::Value = serde_json::from_str(&raw).expect("parse vectors json");

    let cases = vectors["compileA2uiV1"].as_array().expect("compileA2uiV1 array");
    for case in cases {
        let id = case["id"].as_str().unwrap_or("<unknown>");
        let thread_id = case["threadId"].as_str().expect("threadId");
        let shared_state = case["initialSharedState"].clone();

        let store = InMemoryKeyMapStore::new();
        let initial_key_map = case["initialKeyMap"].as_object().expect("initialKeyMap object");
        for (key, component_id) in initial_key_map {
            store
                .set(thread_id, key, component_id.as_str().expect("component id"))
                .expect("store.set");
        }

        let payload = serde_json::from_value(case["input"].clone()).expect("parse payload");
        let result = compile_a2ui_v1(&shared_state, &payload, thread_id, &store, None).expect("compile");

        let expect = &case["expect"];
        assert_eq!(serde_json::to_value(&result.patch_ops).unwrap(), expect["patchOps"], "{}", id);
        assert_eq!(
            serde_json::to_value(&result.created_component_ids).unwrap(),
            expect["createdComponentIds"],
            "{}",
            id
        );
        assert_eq!(serde_json::to_value(&result.warnings).unwrap(), expect["warnings"], "{}", id);

        let got_key_map = store.list(thread_id).expect("store.list");
        assert_eq!(serde_json::to_value(got_key_map).unwrap(), expect["keyMap"], "{}", id);
    }
}

#[test]
fn decode_a2ui_v1_respects_decode_limits() {
    let payload = br#"{"v":1,"ops":[]}"#;
    let limits = UiInputLimitsV1 {
        decode: Some(UiInputDecodeLimitsV1 {
            max_bytes: Some(1),
            max_depth: Some(4),
            max_string_length: None,
        }),
        ..Default::default()
    };

    let result = decode_a2ui_v1_with_limits_v1(payload, &limits);
    assert!(result.is_err(), "expected maxBytes rejection");
}

