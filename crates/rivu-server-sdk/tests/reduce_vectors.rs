use std::path::Path;

use rivu_server_sdk::{reduce_envelopes_v1, ReduceEnvelopeV1};

#[test]
fn vectors_reduce_v1() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/ui-v1.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: serde_json::Value = serde_json::from_str(&raw).expect("parse vectors json");

    let cases = vectors["reduce"].as_array().expect("reduce cases array");
    for case in cases {
        let id = case["id"].as_str().unwrap_or("<unknown>");
        let envs_value = case["envelopes"].clone();
        let envs: Vec<ReduceEnvelopeV1> = serde_json::from_value(envs_value).expect("parse envelopes");
        let actual = serde_json::to_value(reduce_envelopes_v1(&envs)).expect("serialize actual");
        let expected = case["expect"].clone();
        assert_eq!(actual, expected, "case {}", id);
    }
}

