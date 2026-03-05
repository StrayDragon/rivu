use std::path::Path;

use rivu_server_sdk::{parse_heatmap_props_v1, parse_pivot_table_props_v1, DecodeLimits};

#[test]
fn vectors_viewer_pivot_heatmap_v1_valid_invalid() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/viewer-pivot-heatmap.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: serde_json::Value = serde_json::from_str(&raw).expect("parse vectors json");

    assert_eq!(vectors["version"].as_u64().unwrap_or(0), 1);

    let pivot_valid = vectors["pivotTablePropsV1"]["valid"].as_array().expect("pivot valid array");
    for item in pivot_valid {
        let id = item["id"].as_str().unwrap_or("<unknown>");
        let bytes = serde_json::to_vec(&item["props"]).expect("serialize props");
        let result = parse_pivot_table_props_v1(&bytes, DecodeLimits::default());
        assert!(result.is_ok(), "expected valid pivot props to parse: {}", id);
    }

    let pivot_invalid = vectors["pivotTablePropsV1"]["invalid"].as_array().expect("pivot invalid array");
    for item in pivot_invalid {
        let id = item["id"].as_str().unwrap_or("<unknown>");
        let bytes = serde_json::to_vec(&item["props"]).expect("serialize props");
        let result = parse_pivot_table_props_v1(&bytes, DecodeLimits::default());
        assert!(result.is_err(), "expected invalid pivot props to fail: {}", id);
    }

    let heatmap_valid = vectors["heatmapPropsV1"]["valid"].as_array().expect("heatmap valid array");
    for item in heatmap_valid {
        let id = item["id"].as_str().unwrap_or("<unknown>");
        let bytes = serde_json::to_vec(&item["props"]).expect("serialize props");
        let result = parse_heatmap_props_v1(&bytes, DecodeLimits::default());
        assert!(result.is_ok(), "expected valid heatmap props to parse: {}", id);
    }

    let heatmap_invalid = vectors["heatmapPropsV1"]["invalid"].as_array().expect("heatmap invalid array");
    for item in heatmap_invalid {
        let id = item["id"].as_str().unwrap_or("<unknown>");
        let bytes = serde_json::to_vec(&item["props"]).expect("serialize props");
        let result = parse_heatmap_props_v1(&bytes, DecodeLimits::default());
        assert!(result.is_err(), "expected invalid heatmap props to fail: {}", id);
    }
}

