from __future__ import annotations

import json
from pathlib import Path
from typing import Any, TypedDict

from rivu_server_sdk.json_patch import JsonPatchError, apply_json_patch


class Envelope(TypedDict):
    seq: int
    event: dict[str, Any]


class DerivedMessage(TypedDict):
    id: str
    role: str
    content: str


class DerivedToolCall(TypedDict):
    id: str
    name: str
    parentMessageId: str | None
    args: str


class DerivedState(TypedDict):
    sharedState: dict[str, Any]
    messages: list[DerivedMessage]
    toolCalls: list[DerivedToolCall]


def _load_vectors() -> dict[str, Any]:
    root = Path(__file__).resolve().parents[2]
    vectors_path = root / "spec" / "vectors" / "event-compaction.v1.json"
    return json.loads(vectors_path.read_text("utf-8"))


def _reduce_for_compaction(envelopes: list[Envelope]) -> DerivedState:
    sorted_envs = sorted(envelopes, key=lambda e: int(e.get("seq", 0)))

    last_seq = 0
    shared_state: dict[str, Any] = {}
    messages_by_id: dict[str, DerivedMessage] = {}
    tool_calls_by_id: dict[str, DerivedToolCall] = {}

    for env in sorted_envs:
        seq = env.get("seq")
        event = env.get("event")
        if not isinstance(seq, int):
            continue
        if seq <= last_seq:
            continue
        last_seq = seq

        if not isinstance(event, dict):
            continue
        event_type = event.get("type")
        if event_type == "STATE_SNAPSHOT":
            snapshot = event.get("snapshot")
            if not isinstance(snapshot, dict):
                raise AssertionError("STATE_SNAPSHOT.snapshot must be an object")
            shared_state = snapshot.copy()
            continue

        if event_type == "STATE_DELTA":
            delta = event.get("delta")
            if not isinstance(delta, list):
                raise AssertionError("STATE_DELTA.delta must be an array")
            try:
                next_state = apply_json_patch(shared_state, delta)  # type: ignore[arg-type]
            except JsonPatchError as e:
                raise AssertionError("apply_json_patch failed") from e
            if not isinstance(next_state, dict):
                raise AssertionError("patch result must be an object")
            shared_state = next_state
            continue

        if event_type == "TEXT_MESSAGE_CHUNK":
            message_id = event.get("messageId")
            if not isinstance(message_id, str) or not message_id.strip():
                continue
            delta_str = event.get("delta")
            role = event.get("role")
            if not isinstance(delta_str, str):
                delta_str = ""
            if not isinstance(role, str) or not role.strip():
                role = "assistant"
            prev = messages_by_id.get(message_id, {"id": message_id, "role": role, "content": ""})
            messages_by_id[message_id] = {"id": message_id, "role": prev["role"], "content": prev["content"] + delta_str}
            continue

        if event_type == "TOOL_CALL_CHUNK":
            tool_call_id = event.get("toolCallId")
            if not isinstance(tool_call_id, str) or not tool_call_id.strip():
                continue
            delta_str = event.get("delta")
            if not isinstance(delta_str, str):
                delta_str = ""
            name = event.get("toolCallName")
            if not isinstance(name, str):
                name = ""
            parent_message_id = event.get("parentMessageId")
            if not isinstance(parent_message_id, str):
                parent_message_id = None
            prev = tool_calls_by_id.get(
                tool_call_id,
                {"id": tool_call_id, "name": name, "parentMessageId": parent_message_id, "args": ""},
            )
            tool_calls_by_id[tool_call_id] = {
                "id": tool_call_id,
                "name": prev["name"] or name,
                "parentMessageId": prev["parentMessageId"] if prev["parentMessageId"] is not None else parent_message_id,
                "args": prev["args"] + delta_str,
            }
            continue

    messages = sorted(messages_by_id.values(), key=lambda m: m["id"])
    tool_calls = sorted(tool_calls_by_id.values(), key=lambda t: t["id"])
    return {"sharedState": shared_state, "messages": messages, "toolCalls": tool_calls}


def test_event_compaction_vectors_reduce_equivalence() -> None:
    vectors = _load_vectors()
    assert vectors["version"] == 1

    for case in vectors["eventCompaction"]:
        reduced_input = _reduce_for_compaction(case["input"]["envelopes"])
        reduced_compacted = _reduce_for_compaction(case["expect"]["envelopes"])
        assert reduced_input == case["expect"]["derived"], case["id"]
        assert reduced_compacted == case["expect"]["derived"], case["id"]

