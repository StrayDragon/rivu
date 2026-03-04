use std::path::Path;

use rivu_server_sdk::{
    choose_viewer_chart_component_v1, parse_ui_v1_capabilities_custom_event, ui_v1_capabilities_choose_compatible,
    ui_v1_capabilities_is_supported, DecodeLimits, UiV1CapabilitiesComponentRangeV1, UiV1CapabilitiesCustomEvent,
    UiV1CapabilitiesValueV1,
};

#[test]
fn vectors_ui_v1_capabilities_valid_invalid() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/ui-v1-capabilities.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: serde_json::Value = serde_json::from_str(&raw).expect("parse vectors json");

    let valid = vectors["uiV1Capabilities"]["valid"].as_array().expect("valid array");
    for (i, item) in valid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_ui_v1_capabilities_custom_event(&bytes, DecodeLimits::default());
        assert!(result.is_ok(), "expected valid uiV1Capabilities[{}] to parse", i);
    }

    let invalid = vectors["uiV1Capabilities"]["invalid"].as_array().expect("invalid array");
    for (i, item) in invalid.iter().enumerate() {
        let bytes = serde_json::to_vec(item).expect("serialize");
        let result = parse_ui_v1_capabilities_custom_event(&bytes, DecodeLimits::default());
        assert!(result.is_err(), "expected invalid uiV1Capabilities[{}] to fail", i);
    }
}

#[test]
fn helpers_is_supported_choose_compatible() {
    let event = UiV1CapabilitiesCustomEvent {
        event_type: "CUSTOM".into(),
        name: "ui.v1.capabilities".into(),
        value: UiV1CapabilitiesValueV1 {
            v: 1,
            components: [
                (
                    "MetricCard".to_string(),
                    UiV1CapabilitiesComponentRangeV1 {
                        min_schema_version: 1,
                        max_schema_version: 2,
                    },
                ),
                (
                    "BarChart".to_string(),
                    UiV1CapabilitiesComponentRangeV1 {
                        min_schema_version: 1,
                        max_schema_version: 1,
                    },
                ),
            ]
            .into_iter()
            .collect(),
            features: None,
            client: None,
            extra: Default::default(),
        },
        timestamp: None,
        raw_event: None,
        extra: Default::default(),
    };

    assert!(ui_v1_capabilities_is_supported(&event.value, "MetricCard", 1));
    assert!(ui_v1_capabilities_is_supported(&event.value, "MetricCard", 2));
    assert!(!ui_v1_capabilities_is_supported(&event.value, "MetricCard", 3));

    let chosen = ui_v1_capabilities_choose_compatible(&event.value, &[("MetricCard", 1), ("MetricCard", 2)]).expect("choose");
    assert_eq!(chosen, ("MetricCard".to_string(), 2));

    let chosen = ui_v1_capabilities_choose_compatible(&event.value, &[("Chart", 1), ("BarChart", 1)]).expect("choose");
    assert_eq!(chosen, ("BarChart".to_string(), 1));
}

#[test]
fn helper_choose_viewer_chart_component_v1() {
    let value = UiV1CapabilitiesValueV1 {
        v: 1,
        components: [
            (
                "Chart".to_string(),
                UiV1CapabilitiesComponentRangeV1 {
                    min_schema_version: 1,
                    max_schema_version: 1,
                },
            ),
            (
                "BarChart".to_string(),
                UiV1CapabilitiesComponentRangeV1 {
                    min_schema_version: 1,
                    max_schema_version: 1,
                },
            ),
            (
                "LineChart".to_string(),
                UiV1CapabilitiesComponentRangeV1 {
                    min_schema_version: 1,
                    max_schema_version: 1,
                },
            ),
        ]
        .into_iter()
        .collect(),
        features: Some(serde_json::from_value(serde_json::json!({
            "datasets": true,
            "lifecycle": true,
            "chart": { "marks": ["bar", "pie"], "interactions": [] }
        }))
        .expect("parse features")),
        client: None,
        extra: Default::default(),
    };

    let chosen = choose_viewer_chart_component_v1(&value, "bar").expect("choose");
    assert_eq!(chosen, ("Chart".to_string(), 1));

    let chosen = choose_viewer_chart_component_v1(&value, "line").expect("choose");
    assert_eq!(chosen, ("LineChart".to_string(), 1));
}
