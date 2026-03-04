from __future__ import annotations

from typing import Any, TypedDict


class JsonPatchOp(TypedDict, total=False):
    op: str
    path: str
    value: Any


def _encode_pointer(token: str) -> str:
    return token.replace("~", "~0").replace("/", "~1")


def mount_component_v1(*, component_id: str, message_id: str, slot: str, order: int) -> list[JsonPatchOp]:
    return [
        {
            "op": "add",
            "path": f"/ui/components/{_encode_pointer(component_id)}/mounts/-",
            "value": {"messageId": message_id, "slot": slot, "order": order},
        }
    ]


def set_component_v1(*, component_id: str, component: dict[str, Any]) -> list[JsonPatchOp]:
    return [
        {
            "op": "add",
            "path": f"/ui/components/{_encode_pointer(component_id)}",
            "value": component,
        }
    ]


def unmount_component_v1(*, shared_state: dict[str, Any], component_id: str, message_id: str, slot: str) -> list[JsonPatchOp]:
    ui_raw = shared_state.get("ui")
    if not isinstance(ui_raw, dict):
        return []
    components_raw = ui_raw.get("components")
    if not isinstance(components_raw, dict):
        return []
    component_raw = components_raw.get(component_id)
    if not isinstance(component_raw, dict):
        return []
    mounts_raw = component_raw.get("mounts")
    if not isinstance(mounts_raw, list):
        return []

    next_mounts: list[dict[str, Any]] = []
    for m in mounts_raw:
        if not isinstance(m, dict):
            continue
        if m.get("messageId") == message_id and m.get("slot") == slot:
            continue
        next_mounts.append(m)

    return [
        {
            "op": "replace",
            "path": f"/ui/components/{_encode_pointer(component_id)}/mounts",
            "value": next_mounts,
        }
    ]


def set_component_props_v1(*, component_id: str, props: dict[str, Any]) -> list[JsonPatchOp]:
    return [
        {
            "op": "add",
            "path": f"/ui/components/{_encode_pointer(component_id)}/props",
            "value": props,
        }
    ]


def set_component_state_v1(*, component_id: str, state: dict[str, Any]) -> list[JsonPatchOp]:
    return [
        {
            "op": "add",
            "path": f"/ui/components/{_encode_pointer(component_id)}/state",
            "value": state,
        }
    ]


def increment_component_revision_v1(*, component_id: str, current_revision: int) -> list[JsonPatchOp]:
    next_revision = current_revision + 1
    return [
        {
            "op": "replace",
            "path": f"/ui/components/{_encode_pointer(component_id)}/revision",
            "value": next_revision,
        }
    ]
