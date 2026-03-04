from __future__ import annotations

from rivu_server_sdk import (
    increment_component_revision_v1,
    mount_component_v1,
    set_component_props_v1,
    set_component_state_v1,
    set_component_v1,
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
