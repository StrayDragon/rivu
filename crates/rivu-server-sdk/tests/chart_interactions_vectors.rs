use std::path::Path;

use rivu_server_sdk::UiDatasetV1;

use serde_json::Value;

fn is_finite_number(v: &Value) -> bool {
    match v {
        Value::Number(n) => n.as_f64().is_some_and(|f| f.is_finite()),
        _ => false,
    }
}

fn validate_case(event_name: &str, payload: &Value, dataset: &Value) -> bool {
    let ds: UiDatasetV1 = match serde_json::from_value(dataset.clone()) {
        Ok(v) => v,
        Err(_) => return false,
    };
    if ds.validate().is_err() {
        return false;
    }

    if event_name == "chart.clearSelection" {
        return payload.is_object();
    }
    if event_name != "chart.setSelection" {
        return false;
    }

    let Some(payload_obj) = payload.as_object() else {
        return false;
    };
    let Some(selection) = payload_obj.get("selection").and_then(Value::as_object) else {
        return false;
    };
    let kind = selection.get("kind").and_then(Value::as_str).unwrap_or("");

    match kind {
        "none" => true,
        "point" => {
            let row_index = selection.get("rowIndex").and_then(Value::as_i64).unwrap_or(-1);
            if row_index < 0 {
                return false;
            }
            (row_index as usize) < ds.rows.len()
        }
        "range" => {
            let column = selection.get("column").and_then(Value::as_str).unwrap_or("").trim();
            if column.is_empty() {
                return false;
            }
            let Some(from) = selection.get("from") else {
                return false;
            };
            let Some(to) = selection.get("to") else {
                return false;
            };
            let ok_from = from.is_null() || from.is_string() || is_finite_number(from);
            let ok_to = to.is_null() || to.is_string() || is_finite_number(to);
            ok_from && ok_to
        }
        "series" => {
            let value = selection.get("value").unwrap_or(&Value::Null);
            value.is_string() || is_finite_number(value)
        }
        _ => false,
    }
}

#[test]
fn vectors_chart_interactions_payload_validation() {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../spec/vectors/chart-interactions.v1.json");
    let raw = std::fs::read_to_string(path).expect("read vectors");
    let vectors: Value = serde_json::from_str(&raw).expect("parse vectors json");
    assert_eq!(vectors["version"], 1);

    let valid = vectors["chartInteractionsV1"]["valid"].as_array().expect("valid array");
    for item in valid {
        let id = item["id"].as_str().unwrap_or("<unknown>");
        let event_name = item["eventName"].as_str().unwrap_or("");
        let payload = &item["payload"];
        let dataset = &item["dataset"];
        assert!(validate_case(event_name, payload, dataset), "case {}", id);
    }

    let invalid = vectors["chartInteractionsV1"]["invalid"].as_array().expect("invalid array");
    for item in invalid {
        let id = item["id"].as_str().unwrap_or("<unknown>");
        let event_name = item["eventName"].as_str().unwrap_or("");
        let payload = &item["payload"];
        let dataset = &item["dataset"];
        assert!(!validate_case(event_name, payload, dataset), "case {}", id);
    }
}
