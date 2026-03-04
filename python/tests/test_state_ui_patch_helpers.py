from __future__ import annotations

from rivu_server_sdk import (
    data_ref_v1,
    delete_dataset_v1,
    increment_component_revision_v1,
    mount_component_v1,
    set_component_props_v1,
    set_component_state_v1,
    set_component_v1,
    set_dataset_v1,
    unmount_component_v1,
)
from rivu_server_sdk.json_patch import apply_json_patch


def _shared_state_with_component(*, mounts: list[dict] | None = None, revision: int = 0) -> dict:
    return {
        "ui": {
            "v": 1,
            "components": {
                "cmp_1": {
                    "type": "MetricCard",
                    "schemaVersion": 1,
                    "props": {},
                    "revision": revision,
                    "mounts": mounts or [],
                }
            },
        }
    }


def test_mount_component_v1_appends_mount() -> None:
    shared_state = _shared_state_with_component()
    patch = mount_component_v1(component_id="cmp_1", message_id="msg_1", slot="inline", order=0)
    next_state = apply_json_patch(shared_state, patch)
    assert next_state["ui"]["components"]["cmp_1"]["mounts"] == [{"messageId": "msg_1", "slot": "inline", "order": 0}]


def test_set_component_v1_adds_component() -> None:
    shared_state = {"ui": {"v": 1, "components": {}}}
    component = {
        "type": "MetricCard",
        "schemaVersion": 1,
        "props": {"label": "Revenue", "value": 1},
        "revision": 0,
        "mounts": [],
    }
    patch = set_component_v1(component_id="cmp_1", component=component)
    next_state = apply_json_patch(shared_state, patch)
    assert next_state["ui"]["components"]["cmp_1"]["type"] == "MetricCard"


def test_unmount_component_v1_removes_matching_mounts() -> None:
    shared_state = _shared_state_with_component(
        mounts=[
            {"messageId": "msg_1", "slot": "inline", "order": 0},
            {"messageId": "msg_1", "slot": "sidebar", "order": 0},
            {"messageId": "msg_1", "slot": "inline", "order": 1},
        ]
    )
    patch = unmount_component_v1(shared_state=shared_state, component_id="cmp_1", message_id="msg_1", slot="inline")
    next_state = apply_json_patch(shared_state, patch)
    assert next_state["ui"]["components"]["cmp_1"]["mounts"] == [{"messageId": "msg_1", "slot": "sidebar", "order": 0}]


def test_set_component_props_v1_replaces_props() -> None:
    shared_state = _shared_state_with_component()
    patch = set_component_props_v1(component_id="cmp_1", props={"label": "Revenue", "value": 1})
    next_state = apply_json_patch(shared_state, patch)
    assert next_state["ui"]["components"]["cmp_1"]["props"] == {"label": "Revenue", "value": 1}


def test_set_component_state_v1_adds_state() -> None:
    shared_state = _shared_state_with_component()
    patch = set_component_state_v1(component_id="cmp_1", state={"status": "pending"})
    next_state = apply_json_patch(shared_state, patch)
    assert next_state["ui"]["components"]["cmp_1"]["state"] == {"status": "pending"}


def test_increment_component_revision_v1_updates_revision() -> None:
    shared_state = _shared_state_with_component(revision=10)
    patch = increment_component_revision_v1(component_id="cmp_1", current_revision=10)
    next_state = apply_json_patch(shared_state, patch)
    assert next_state["ui"]["components"]["cmp_1"]["revision"] == 11


def test_set_dataset_v1_adds_datasets_when_missing() -> None:
    shared_state = {"ui": {"v": 1, "components": {}}}
    dataset = {"columns": ["label", "value"], "rows": [["Search", 10]]}
    patch = set_dataset_v1(shared_state=shared_state, dataset_id="ds_1", dataset=dataset)
    next_state = apply_json_patch(shared_state, patch)
    assert next_state["ui"]["datasets"]["ds_1"]["columns"] == ["label", "value"]


def test_set_dataset_v1_adds_dataset_when_datasets_exist() -> None:
    shared_state = {"ui": {"v": 1, "components": {}, "datasets": {"ds_old": {"columns": ["a"], "rows": [[1]]}}}}
    dataset = {"columns": ["label", "value"], "rows": [["Email", 5]]}
    patch = set_dataset_v1(shared_state=shared_state, dataset_id="ds_1", dataset=dataset)
    next_state = apply_json_patch(shared_state, patch)
    assert next_state["ui"]["datasets"]["ds_old"]["columns"] == ["a"]
    assert next_state["ui"]["datasets"]["ds_1"]["rows"] == [["Email", 5]]


def test_delete_dataset_v1_removes_dataset_when_present() -> None:
    shared_state = {"ui": {"v": 1, "components": {}, "datasets": {"ds_1": {"columns": ["a"], "rows": [[1]]}}}}
    patch = delete_dataset_v1(shared_state=shared_state, dataset_id="ds_1")
    next_state = apply_json_patch(shared_state, patch)
    assert "ds_1" not in next_state["ui"]["datasets"]


def test_data_ref_v1_requires_non_empty_dataset_id() -> None:
    try:
        data_ref_v1(dataset_id="   ")
        assert False, "expected ValueError"
    except ValueError:
        pass
