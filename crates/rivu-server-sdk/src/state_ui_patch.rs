use serde_json::{json, Value};

use crate::{UiMountV1, UiSpecError};

fn encode_pointer(token: &str) -> String {
    token.replace('~', "~0").replace('/', "~1")
}

pub fn data_ref_v1(dataset_id: &str) -> Result<Value, UiSpecError> {
    if dataset_id.trim().is_empty() {
        return Err(UiSpecError::ValidationError("dataRef.datasetId must be non-empty".into()));
    }
    Ok(json!({ "datasetId": dataset_id }))
}

pub fn set_dataset_v1(shared_state: &Value, dataset_id: &str, dataset: Value) -> Result<Vec<Value>, UiSpecError> {
    if dataset_id.trim().is_empty() {
        return Err(UiSpecError::ValidationError("datasetId must be non-empty".into()));
    }

    let datasets = shared_state
        .get("ui")
        .and_then(|ui| ui.get("datasets"))
        .and_then(|d| d.as_object());

    if datasets.is_none() {
        return Ok(vec![json!({
            "op": "add",
            "path": "/ui/datasets",
            "value": { dataset_id: dataset },
        })]);
    }

    Ok(vec![json!({
        "op": "add",
        "path": format!("/ui/datasets/{}", encode_pointer(dataset_id)),
        "value": dataset,
    })])
}

pub fn delete_dataset_v1(shared_state: &Value, dataset_id: &str) -> Result<Vec<Value>, UiSpecError> {
    if dataset_id.trim().is_empty() {
        return Err(UiSpecError::ValidationError("datasetId must be non-empty".into()));
    }

    let Some(datasets) = shared_state
        .get("ui")
        .and_then(|ui| ui.get("datasets"))
        .and_then(|d| d.as_object())
    else {
        return Ok(vec![]);
    };

    if !datasets.contains_key(dataset_id) {
        return Ok(vec![]);
    }

    let mut next = datasets.clone();
    next.remove(dataset_id);

    Ok(vec![json!({
        "op": "replace",
        "path": "/ui/datasets",
        "value": Value::Object(next),
    })])
}

pub fn mount_component_v1(component_id: &str, message_id: &str, slot: &str, order: i64) -> Vec<Value> {
    vec![json!({
        "op": "add",
        "path": format!("/ui/components/{}/mounts/-", encode_pointer(component_id)),
        "value": { "messageId": message_id, "slot": slot, "order": order },
    })]
}

pub fn set_component_v1(component_id: &str, component: Value) -> Vec<Value> {
    vec![json!({
        "op": "add",
        "path": format!("/ui/components/{}", encode_pointer(component_id)),
        "value": component,
    })]
}

pub fn delete_component_v1(shared_state: &Value, component_id: &str) -> Result<Vec<Value>, UiSpecError> {
    if component_id.trim().is_empty() {
        return Err(UiSpecError::ValidationError("componentId must be non-empty".into()));
    }

    let Some(components) = shared_state
        .get("ui")
        .and_then(|ui| ui.get("components"))
        .and_then(|c| c.as_object())
    else {
        return Ok(vec![]);
    };

    if !components.contains_key(component_id) {
        return Ok(vec![]);
    }

    let mut next = components.clone();
    next.remove(component_id);

    Ok(vec![json!({
        "op": "replace",
        "path": "/ui/components",
        "value": Value::Object(next),
    })])
}

pub fn unmount_component_v1(mounts: &[UiMountV1], component_id: &str, message_id: &str, slot: &str) -> Vec<Value> {
    let next_mounts: Vec<Value> = mounts
        .iter()
        .filter(|m| !(m.message_id == message_id && m.slot == slot))
        .map(|m| json!({ "messageId": m.message_id, "slot": m.slot, "order": m.order }))
        .collect();

    vec![json!({
        "op": "replace",
        "path": format!("/ui/components/{}/mounts", encode_pointer(component_id)),
        "value": next_mounts,
    })]
}

pub fn set_component_props_v1(component_id: &str, props: Value) -> Vec<Value> {
    vec![json!({
        "op": "add",
        "path": format!("/ui/components/{}/props", encode_pointer(component_id)),
        "value": props,
    })]
}

pub fn set_component_state_v1(component_id: &str, state: Value) -> Vec<Value> {
    vec![json!({
        "op": "add",
        "path": format!("/ui/components/{}/state", encode_pointer(component_id)),
        "value": state,
    })]
}

pub fn increment_component_revision_v1(component_id: &str, current_revision: u64) -> Vec<Value> {
    vec![json!({
        "op": "replace",
        "path": format!("/ui/components/{}/revision", encode_pointer(component_id)),
        "value": current_revision + 1,
    })]
}
