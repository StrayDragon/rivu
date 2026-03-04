use std::path::Path;

use rivu_server_sdk::{parse_ui_state_v1, parse_ui_v1_custom_event, DecodeLimits};

#[test]
fn vectors_ui_v1_event_valid_invalid() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/ui-v1.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: serde_json::Value = serde_json::from_str(&raw).expect("parse vectors json");

    let valid = vectors["uiV1Event"]["valid"].as_array().expect("valid array");
    for (i, item) in valid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_ui_v1_custom_event(&bytes, DecodeLimits::default());
        assert!(result.is_ok(), "expected valid uiV1Event[{}] to parse", i);
    }

    let invalid = vectors["uiV1Event"]["invalid"].as_array().expect("invalid array");
    for (i, item) in invalid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_ui_v1_custom_event(&bytes, DecodeLimits::default());
        assert!(result.is_err(), "expected invalid uiV1Event[{}] to fail", i);
    }
}

#[test]
fn vectors_ui_state_v1_valid_invalid() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/ui-v1.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: serde_json::Value = serde_json::from_str(&raw).expect("parse vectors json");

    let valid = vectors["uiStateV1"]["valid"].as_array().expect("valid array");
    for (i, item) in valid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_ui_state_v1(&bytes, DecodeLimits::default());
        assert!(result.is_ok(), "expected valid uiStateV1[{}] to parse", i);
    }

    let invalid = vectors["uiStateV1"]["invalid"].as_array().expect("invalid array");
    for (i, item) in invalid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_ui_state_v1(&bytes, DecodeLimits::default());
        assert!(result.is_err(), "expected invalid uiStateV1[{}] to fail", i);
    }
}

