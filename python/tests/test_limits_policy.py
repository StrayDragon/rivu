import pytest

from rivu_server_sdk.limits import (
    LimitExceededError,
    check_json_patch_limits_v1,
    push_json_patch_op_v1,
    viewerDefaults,
    workflowDefaults,
)
from rivu_server_sdk.ui_v1_event import decode_ui_v1_custom_event_with_limits_v1


def _ui_v1_event(*, payload: dict) -> dict:
    return {
        "type": "CUSTOM",
        "name": "ui.v1.event",
        "value": {
            "componentId": "cmp_1",
            "eventName": "submit",
            "payload": payload,
            "clientRequestId": "req_1",
            "baseRevision": 0,
        },
    }


def test_python_limits_defaults_match_spec() -> None:
    assert viewerDefaults["decode"]["maxBytes"] == 1_048_576
    assert viewerDefaults["decode"]["maxDepth"] == 32
    assert viewerDefaults["decode"]["maxStringLength"] == 100_000
    assert viewerDefaults["uiEvent"]["maxPayloadKeys"] == 32
    assert viewerDefaults["uiState"]["maxComponents"] == 500
    assert viewerDefaults["uiState"]["maxMountsTotal"] == 5_000
    assert viewerDefaults["uiState"]["maxDatasets"] == 50
    assert viewerDefaults["uiState"]["maxDatasetRows"] == 10_000
    assert viewerDefaults["uiState"]["maxDatasetColumns"] == 50
    assert viewerDefaults["jsonPatch"]["maxOps"] == 2_000
    assert viewerDefaults["jsonPatch"]["maxPathLength"] == 256
    assert viewerDefaults["jsonPatch"]["allowedPathPrefixes"] == ["/ui"]

    assert workflowDefaults["decode"]["maxBytes"] == 262_144
    assert workflowDefaults["decode"]["maxDepth"] == 24
    assert workflowDefaults["decode"]["maxStringLength"] == 50_000
    assert workflowDefaults["uiEvent"]["maxPayloadKeys"] == 16
    assert workflowDefaults["uiState"]["maxComponents"] == 200
    assert workflowDefaults["uiState"]["maxMountsTotal"] == 2_000
    assert workflowDefaults["uiState"]["maxDatasets"] == 20
    assert workflowDefaults["uiState"]["maxDatasetRows"] == 2_000
    assert workflowDefaults["uiState"]["maxDatasetColumns"] == 50
    assert workflowDefaults["jsonPatch"]["maxOps"] == 500
    assert workflowDefaults["jsonPatch"]["maxPathLength"] == 256
    assert workflowDefaults["jsonPatch"]["allowedPathPrefixes"] == ["/ui"]


def test_decode_rejects_max_string_length() -> None:
    event = _ui_v1_event(payload={"a": "x" * 16})
    limits = {"decode": {"maxStringLength": 15}}

    with pytest.raises(LimitExceededError) as e:
        decode_ui_v1_custom_event_with_limits_v1(event, limits=limits)

    assert e.value.info == {
        "code": "LIMIT_EXCEEDED",
        "limit": "decode.maxStringLength",
        "max": 15,
        "observed": 16,
    }


def test_decode_rejects_max_payload_keys() -> None:
    event = _ui_v1_event(payload={"a": 1, "b": 2})
    limits = {"uiEvent": {"maxPayloadKeys": 1}}

    with pytest.raises(LimitExceededError) as e:
        decode_ui_v1_custom_event_with_limits_v1(event, limits=limits)

    assert e.value.info == {
        "code": "LIMIT_EXCEEDED",
        "limit": "uiEvent.maxPayloadKeys",
        "max": 1,
        "observed": 2,
    }


def test_json_patch_builder_rejects_disallowed_path() -> None:
    ops: list[dict] = []
    limits = {"jsonPatch": {"allowedPathPrefixes": ["/ui"]}}
    op = {"op": "replace", "path": "/messages/0", "value": 1}

    with pytest.raises(LimitExceededError) as e:
        push_json_patch_op_v1(ops=ops, op=op, limits=limits)

    assert e.value.info == {
        "code": "LIMIT_EXCEEDED",
        "limit": "jsonPatch.allowedPathPrefixes",
        "max": 0,
        "observed": 1,
        "path": "/messages/0",
    }


def test_json_patch_builder_rejects_too_many_ops() -> None:
    ops: list[dict] = []
    limits = {"jsonPatch": {"maxOps": 1}}

    push_json_patch_op_v1(ops=ops, op={"op": "replace", "path": "/ui/a", "value": 1}, limits=limits)
    with pytest.raises(LimitExceededError) as e:
        push_json_patch_op_v1(ops=ops, op={"op": "replace", "path": "/ui/b", "value": 2}, limits=limits)

    assert e.value.info == {
        "code": "LIMIT_EXCEEDED",
        "limit": "jsonPatch.maxOps",
        "max": 1,
        "observed": 2,
    }


def test_json_patch_check_rejects_disallowed_path() -> None:
    limits = {"jsonPatch": {"allowedPathPrefixes": ["/ui"]}}
    delta = [{"op": "replace", "path": "/messages/0", "value": 1}]

    with pytest.raises(LimitExceededError) as e:
        check_json_patch_limits_v1(delta=delta, limits=limits)

    assert e.value.info == {
        "code": "LIMIT_EXCEEDED",
        "limit": "jsonPatch.allowedPathPrefixes",
        "max": 0,
        "observed": 1,
        "path": "/messages/0",
    }

