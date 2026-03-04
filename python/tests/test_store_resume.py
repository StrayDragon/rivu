from __future__ import annotations

import tempfile

import pytest

from rivu_server_sdk import (
    InMemoryRingBufferEventStore,
    SeqAllocator,
    SqliteSnapshotStore,
    UiV1CustomEvent,
    UiV1EventProcessor,
    RevisionConflictError,
    resume_replay,
)
from rivu_server_sdk.reduce_v1 import reduce_envelopes_v1


def test_seq_allocator_monotonic_and_observe() -> None:
    alloc = SeqAllocator()
    assert alloc.next("t1") == 1
    assert alloc.next("t1") == 2
    alloc.observe("t1", 10)
    assert alloc.next("t1") == 11


def test_ring_buffer_replay_incomplete_when_evicted() -> None:
    store = InMemoryRingBufferEventStore(capacity_per_thread=2)
    thread_id = "t1"
    store.append(thread_id, {"seq": 1, "event": {"type": "STATE_SNAPSHOT", "snapshot": {}}})
    store.append(thread_id, {"seq": 2, "event": {"type": "STATE_SNAPSHOT", "snapshot": {}}})
    store.append(thread_id, {"seq": 3, "event": {"type": "STATE_SNAPSHOT", "snapshot": {}}})
    store.append(thread_id, {"seq": 4, "event": {"type": "STATE_SNAPSHOT", "snapshot": {}}})

    replay = store.replay_after(thread_id, after_seq=1)
    assert replay.complete is False
    assert replay.envelopes == []


def test_resume_falls_back_to_snapshot_and_bumps_allocator() -> None:
    store = InMemoryRingBufferEventStore(capacity_per_thread=2)
    thread_id = "t1"
    store.append(thread_id, {"seq": 3, "event": {"type": "STATE_SNAPSHOT", "snapshot": {"k": 1}}})
    store.append(thread_id, {"seq": 4, "event": {"type": "STATE_SNAPSHOT", "snapshot": {"k": 2}}})

    with tempfile.TemporaryDirectory() as td:
        snap_store = SqliteSnapshotStore(f"{td}/snap.db")
        snap_store.put(thread_id=thread_id, seq=4, shared_state={"ui": {"v": 1, "components": {}}})

        alloc = SeqAllocator()
        res = resume_replay(
            thread_id=thread_id,
            resume_from=1,
            event_store=store,
            snapshot_store=snap_store,
            seq_allocator=alloc,
        )

        assert res.kind == "snapshot"
        assert len(res.envelopes) == 1
        assert res.envelopes[0]["seq"] == 2
        assert res.envelopes[0]["event"]["type"] == "STATE_SNAPSHOT"

        assert alloc.next(thread_id) == 3


def test_ui_v1_event_processor_idempotency_and_revision_conflict() -> None:
    shared_state: dict[str, object] = {
        "ui": {
            "v": 1,
            "components": {
                "cmp_1": {
                    "type": "ApprovalCard",
                    "schemaVersion": 1,
                    "props": {"title": "Approve?"},
                    "state": {"status": "pending"},
                    "revision": 0,
                    "mounts": [],
                }
            },
        }
    }

    event = UiV1CustomEvent.model_validate(
        {
            "type": "CUSTOM",
            "name": "ui.v1.event",
            "value": {
                "componentId": "cmp_1",
                "eventName": "approve",
                "payload": {},
                "clientRequestId": "req_1",
                "baseRevision": 0,
            },
        }
    )

    processor = UiV1EventProcessor()
    first = processor.process(shared_state=shared_state, event=event)
    assert first["new_revision"] == 1
    assert first["events"][0]["type"] == "STATE_DELTA"

    second = processor.process(shared_state=first["shared_state"], event=event)
    assert second["new_revision"] == 1
    assert second["shared_state"]["ui"]["components"]["cmp_1"]["revision"] == 1

    conflict_event = UiV1CustomEvent.model_validate(
        {
            "type": "CUSTOM",
            "name": "ui.v1.event",
            "value": {
                "componentId": "cmp_1",
                "eventName": "deny",
                "payload": {},
                "clientRequestId": "req_2",
                "baseRevision": 0,
            },
        }
    )

    with pytest.raises(RevisionConflictError):
        processor.process(shared_state=first["shared_state"], event=conflict_event)

    reduced = reduce_envelopes_v1([{"seq": 1, "event": {"type": "STATE_SNAPSHOT", "snapshot": first["shared_state"]}}])
    assert reduced["status"] == "ok"
    assert reduced["sharedState"]["ui"]["components"]["cmp_1"]["revision"] == 1

