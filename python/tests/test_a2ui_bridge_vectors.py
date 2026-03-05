import json
from pathlib import Path

import pytest

from rivu_server_sdk import A2uiV1, InMemoryKeyMapStore, compile_a2ui_v1, decode_a2ui_v1_with_limits_v1
from rivu_server_sdk.limits import LimitExceededError, viewerDefaults


def _load_vectors() -> dict:
    root = Path(__file__).resolve().parents[2]
    vectors_path = root / "spec" / "vectors" / "a2ui-v1.v1.json"
    return json.loads(vectors_path.read_text("utf-8"))


def test_vectors_a2ui_v1_valid_invalid() -> None:
    vectors = _load_vectors()

    for item in vectors["a2uiV1"]["valid"]:
        A2uiV1.model_validate(item)

    for item in vectors["a2uiV1"]["invalid"]:
        with pytest.raises(Exception):
            A2uiV1.model_validate(item)


def test_vectors_compile_a2ui_v1() -> None:
    vectors = _load_vectors()

    for case in vectors["compileA2uiV1"]:
        thread_id = case["threadId"]
        shared_state = case["initialSharedState"]
        store = InMemoryKeyMapStore()
        for key, component_id in case["initialKeyMap"].items():
            store.set(thread_id=thread_id, key=key, component_id=component_id)

        payload = A2uiV1.model_validate(case["input"])
        result = compile_a2ui_v1(payload=payload, shared_state=shared_state, thread_id=thread_id, key_map_store=store)

        expect = case["expect"]
        assert result["patchOps"] == expect["patchOps"], case["id"]
        assert result["createdComponentIds"] == expect["createdComponentIds"], case["id"]
        assert result["warnings"] == expect["warnings"], case["id"]
        assert store.list(thread_id=thread_id) == expect["keyMap"], case["id"]


def test_decode_a2ui_v1_respects_decode_limits() -> None:
    payload = {"v": 1, "ops": []}

    limits = dict(viewerDefaults)
    limits["decode"] = {"maxBytes": 1, "maxDepth": 4}
    with pytest.raises(LimitExceededError):
        decode_a2ui_v1_with_limits_v1(payload, limits=limits)

