use serde_json::json;

use rivu_server_sdk::{
    data_ref_v1, delete_dataset_v1, increment_component_revision_v1, mount_component_v1, reduce_envelopes_v1,
    set_component_props_v1, set_component_state_v1, set_component_v1, set_dataset_v1, unmount_component_v1,
    ReduceEnvelopeV1, UiMountV1,
};

fn reduce_with_delta(shared_state: serde_json::Value, delta: Vec<serde_json::Value>) -> serde_json::Value {
    let snapshot_event = json!({ "type": "STATE_SNAPSHOT", "snapshot": shared_state });
    let delta_event = json!({ "type": "STATE_DELTA", "delta": delta });
    let envs = vec![
        ReduceEnvelopeV1 {
            seq: 1,
            event: snapshot_event,
        },
        ReduceEnvelopeV1 { seq: 2, event: delta_event },
    ];
    let reduced = reduce_envelopes_v1(&envs);
    assert_eq!(reduced.status, "ok");
    reduced.shared_state
}

#[test]
fn mount_component_v1_appends_mount() {
    let shared_state = json!({
        "ui": {
            "v": 1,
            "components": {
                "cmp_1": { "type": "MetricCard", "schemaVersion": 1, "props": {}, "revision": 0, "mounts": [] }
            }
        }
    });

    let next = reduce_with_delta(shared_state, mount_component_v1("cmp_1", "msg_1", "inline", 0));
    assert_eq!(next["ui"]["components"]["cmp_1"]["mounts"][0]["messageId"], "msg_1");
}

#[test]
fn set_component_v1_adds_component() {
    let shared_state = json!({ "ui": { "v": 1, "components": {} } });

    let component = json!({
        "type": "MetricCard",
        "schemaVersion": 1,
        "props": { "label": "Revenue", "value": 1 },
        "revision": 0,
        "mounts": [],
    });

    let mut delta = vec![];
    delta.extend(set_component_v1("cmp_1", component));
    delta.extend(mount_component_v1("cmp_1", "msg_1", "inline", 0));

    let next = reduce_with_delta(shared_state, delta);
    assert_eq!(next["ui"]["components"]["cmp_1"]["type"], "MetricCard");
    assert_eq!(next["ui"]["components"]["cmp_1"]["mounts"][0]["messageId"], "msg_1");
}

#[test]
fn unmount_component_v1_removes_matching_mounts() {
    let mounts = vec![
        UiMountV1 {
            message_id: "msg_1".into(),
            slot: "inline".into(),
            order: 0,
        },
        UiMountV1 {
            message_id: "msg_1".into(),
            slot: "sidebar".into(),
            order: 0,
        },
        UiMountV1 {
            message_id: "msg_1".into(),
            slot: "inline".into(),
            order: 1,
        },
    ];

    let shared_state = json!({
        "ui": {
            "v": 1,
            "components": {
                "cmp_1": {
                    "type": "MetricCard",
                    "schemaVersion": 1,
                    "props": {},
                    "revision": 0,
                    "mounts": [
                        { "messageId": "msg_1", "slot": "inline", "order": 0 },
                        { "messageId": "msg_1", "slot": "sidebar", "order": 0 },
                        { "messageId": "msg_1", "slot": "inline", "order": 1 }
                    ]
                }
            }
        }
    });

    let delta = unmount_component_v1(&mounts, "cmp_1", "msg_1", "inline");
    let next = reduce_with_delta(shared_state, delta);
    assert_eq!(next["ui"]["components"]["cmp_1"]["mounts"].as_array().unwrap().len(), 1);
    assert_eq!(next["ui"]["components"]["cmp_1"]["mounts"][0]["slot"], "sidebar");
}

#[test]
fn set_component_props_state_and_revision() {
    let shared_state = json!({
        "ui": {
            "v": 1,
            "components": {
                "cmp_1": { "type": "FormCard", "schemaVersion": 1, "props": {}, "revision": 10, "mounts": [] }
            }
        }
    });

    let mut delta = vec![];
    delta.extend(set_component_props_v1("cmp_1", json!({ "title": "Hello" })));
    delta.extend(set_component_state_v1("cmp_1", json!({ "status": "pending" })));
    delta.extend(increment_component_revision_v1("cmp_1", 10));

    let next = reduce_with_delta(shared_state, delta);
    assert_eq!(next["ui"]["components"]["cmp_1"]["props"]["title"], "Hello");
    assert_eq!(next["ui"]["components"]["cmp_1"]["state"]["status"], "pending");
    assert_eq!(next["ui"]["components"]["cmp_1"]["revision"], 11);
}

#[test]
fn set_dataset_v1_adds_datasets_when_missing() {
    let shared_state = json!({ "ui": { "v": 1, "components": {} } });
    let dataset = json!({ "columns": ["label", "value"], "rows": [["Search", 10]] });

    let delta = set_dataset_v1(&shared_state, "ds_1", dataset).expect("set_dataset_v1 ok");
    let next = reduce_with_delta(shared_state, delta);
    assert_eq!(next["ui"]["datasets"]["ds_1"]["columns"][0], "label");
}

#[test]
fn set_dataset_v1_adds_dataset_when_datasets_exist() {
    let shared_state = json!({
        "ui": { "v": 1, "components": {}, "datasets": { "ds_old": { "columns": ["a"], "rows": [[1]] } } }
    });
    let dataset = json!({ "columns": ["label", "value"], "rows": [["Email", 5]] });

    let delta = set_dataset_v1(&shared_state, "ds_1", dataset).expect("set_dataset_v1 ok");
    let next = reduce_with_delta(shared_state, delta);
    assert_eq!(next["ui"]["datasets"]["ds_old"]["columns"][0], "a");
    assert_eq!(next["ui"]["datasets"]["ds_1"]["rows"][0][0], "Email");
}

#[test]
fn delete_dataset_v1_removes_dataset_when_present() {
    let shared_state = json!({
        "ui": { "v": 1, "components": {}, "datasets": { "ds_1": { "columns": ["a"], "rows": [[1]] } } }
    });

    let delta = delete_dataset_v1(&shared_state, "ds_1").expect("delete_dataset_v1 ok");
    let next = reduce_with_delta(shared_state, delta);
    assert!(next["ui"]["datasets"].get("ds_1").is_none());
}

#[test]
fn data_ref_v1_rejects_empty_dataset_id() {
    let err = data_ref_v1("   ").unwrap_err();
    let msg = format!("{err}");
    assert!(msg.contains("dataRef.datasetId must be non-empty"));
}
