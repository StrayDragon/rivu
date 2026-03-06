use std::path::Path;

use rivu_server_sdk::{parse_diff_view_props_v1, DecodeLimits};

#[test]
fn vectors_viewer_diff_view_v1_valid_invalid() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/viewer-diff-view.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: serde_json::Value = serde_json::from_str(&raw).expect("parse vectors json");

    assert_eq!(vectors["version"].as_u64().unwrap_or(0), 1);

    let valid = vectors["diffViewPropsV1"]["valid"].as_array().expect("valid array");
    for item in valid {
        let id = item["id"].as_str().unwrap_or("<unknown>");
        let bytes = serde_json::to_vec(&item["props"]).expect("serialize props");
        let result = parse_diff_view_props_v1(&bytes, DecodeLimits::default());
        assert!(result.is_ok(), "expected valid diff props to parse: {}", id);
    }

    let invalid = vectors["diffViewPropsV1"]["invalid"].as_array().expect("invalid array");
    for item in invalid {
        let id = item["id"].as_str().unwrap_or("<unknown>");
        let bytes = serde_json::to_vec(&item["props"]).expect("serialize props");
        let result = parse_diff_view_props_v1(&bytes, DecodeLimits::default());
        assert!(result.is_err(), "expected invalid diff props to fail: {}", id);
    }
}

