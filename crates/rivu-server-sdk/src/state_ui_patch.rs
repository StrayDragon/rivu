use serde_json::{json, Value};

use crate::UiMountV1;

fn encode_pointer(token: &str) -> String {
    token.replace('~', "~0").replace('/', "~1")
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
