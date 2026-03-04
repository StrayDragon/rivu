use std::path::Path;

use rivu_server_sdk::{
    check_json_patch_limits_v1, check_ui_state_limits_v1, check_ui_v1_event_limits_v1, parse_ui_state_v1,
    parse_ui_data_ref_v1, parse_ui_dataset_v1, parse_ui_v1_custom_event, DecodeLimits, UiInputLimitsV1,
};

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

#[test]
fn vectors_ui_dataset_v1_valid_invalid() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/ui-v1.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: serde_json::Value = serde_json::from_str(&raw).expect("parse vectors json");

    let valid = vectors["uiDatasetV1"]["valid"].as_array().expect("valid array");
    for (i, item) in valid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_ui_dataset_v1(&bytes, DecodeLimits::default());
        assert!(result.is_ok(), "expected valid uiDatasetV1[{}] to parse", i);
    }

    let invalid = vectors["uiDatasetV1"]["invalid"].as_array().expect("invalid array");
    for (i, item) in invalid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_ui_dataset_v1(&bytes, DecodeLimits::default());
        assert!(result.is_err(), "expected invalid uiDatasetV1[{}] to fail", i);
    }
}

#[test]
fn vectors_ui_data_ref_v1_valid_invalid() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/ui-v1.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: serde_json::Value = serde_json::from_str(&raw).expect("parse vectors json");

    let valid = vectors["uiDataRefV1"]["valid"].as_array().expect("valid array");
    for (i, item) in valid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_ui_data_ref_v1(&bytes, DecodeLimits::default());
        assert!(result.is_ok(), "expected valid uiDataRefV1[{}] to parse", i);
    }

    let invalid = vectors["uiDataRefV1"]["invalid"].as_array().expect("invalid array");
    for (i, item) in invalid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_ui_data_ref_v1(&bytes, DecodeLimits::default());
        assert!(result.is_err(), "expected invalid uiDataRefV1[{}] to fail", i);
    }
}

#[test]
fn vectors_limits_v1_accept_reject() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/ui-v1.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: serde_json::Value = serde_json::from_str(&raw).expect("parse vectors json");

    let ui_event_cases = vectors["limitsV1"]["uiEvent"].as_array().expect("limitsV1.uiEvent array");
    for case in ui_event_cases {
        let id = case["id"].as_str().unwrap_or("<unknown>");
        let limits: UiInputLimitsV1 = serde_json::from_value(case["limits"].clone()).expect("parse limits");
        let input = case["input"].clone();
        let expect_ok = case["expect"]["ok"].as_bool().expect("expect.ok boolean");

        let bytes = serde_json::to_vec(&input).expect("serialize");
        let event = parse_ui_v1_custom_event(&bytes, DecodeLimits::default()).expect("parse ui.v1.event");
        let result = check_ui_v1_event_limits_v1(&event, &limits);
        assert_eq!(result.is_ok(), expect_ok, "uiEvent {}", id);
        if let Err(err) = result {
            let actual = serde_json::to_value(err).expect("serialize error");
            assert_eq!(actual, case["expect"]["error"], "uiEvent {}", id);
        }
    }

    let json_patch_cases = vectors["limitsV1"]["jsonPatch"].as_array().expect("limitsV1.jsonPatch array");
    for case in json_patch_cases {
        let id = case["id"].as_str().unwrap_or("<unknown>");
        let limits: UiInputLimitsV1 = serde_json::from_value(case["limits"].clone()).expect("parse limits");
        let input = case["input"].as_array().expect("patch array").clone();
        let expect_ok = case["expect"]["ok"].as_bool().expect("expect.ok boolean");

        let delta = input.into_iter().collect::<Vec<_>>();
        let result = check_json_patch_limits_v1(&delta, &limits);
        assert_eq!(result.is_ok(), expect_ok, "jsonPatch {}", id);
        if let Err(err) = result {
            let actual = serde_json::to_value(err).expect("serialize error");
            assert_eq!(actual, case["expect"]["error"], "jsonPatch {}", id);
        }
    }

    let ui_state_cases = vectors["limitsV1"]["uiState"].as_array().expect("limitsV1.uiState array");
    for case in ui_state_cases {
        let id = case["id"].as_str().unwrap_or("<unknown>");
        let limits: UiInputLimitsV1 = serde_json::from_value(case["limits"].clone()).expect("parse limits");
        let input = case["input"].clone();
        let expect_ok = case["expect"]["ok"].as_bool().expect("expect.ok boolean");

        let result = check_ui_state_limits_v1(&input, &limits);
        assert_eq!(result.is_ok(), expect_ok, "uiState {}", id);
        if let Err(err) = result {
            let actual = serde_json::to_value(err).expect("serialize error");
            assert_eq!(actual, case["expect"]["error"], "uiState {}", id);
        }
    }
}
