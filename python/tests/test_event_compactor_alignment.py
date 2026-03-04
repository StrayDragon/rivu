from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any

from rivu_server_sdk import (
    CompactingEventSink,
    DefaultEventCompactor,
    EventCompactorConfig,
    InMemoryRingBufferEventStore,
    SqliteSnapshotStore,
)


def _load_vectors() -> dict[str, Any]:
    root = Path(__file__).resolve().parents[2]
    vectors_path = root / "spec" / "vectors" / "event-compaction.v1.json"
    return json.loads(vectors_path.read_text("utf-8"))


def _config_from_vectors(value: dict[str, Any]) -> EventCompactorConfig:
    flush_interval_ms = int(value.get("flushIntervalMs", 0) or 0)
    max_buffered_events = int(value.get("maxBufferedEvents", 0) or 0)
    max_buffered_bytes = int(value.get("maxBufferedBytes", 0) or 0)
    max_replay_events = int(value.get("maxReplayEvents", 0) or 0)
    return EventCompactorConfig(
        flush_interval_ms=flush_interval_ms if flush_interval_ms > 0 else None,
        max_buffered_events=max_buffered_events if max_buffered_events > 0 else None,
        max_buffered_bytes=max_buffered_bytes if max_buffered_bytes > 0 else None,
        max_replay_events=max_replay_events if max_replay_events > 0 else None,
    )


def test_event_compactor_output_matches_golden_vectors() -> None:
    vectors = _load_vectors()
    assert vectors["version"] == 1

    for case in vectors["eventCompaction"]:
        config = _config_from_vectors(case["config"])
        compactor = DefaultEventCompactor(config)

        out: list[dict[str, Any]] = []
        for env in case["input"]["envelopes"]:
            out.extend(compactor.push(env))
        out.extend(compactor.flush())

        assert out == case["expect"]["envelopes"], case["id"]


def test_flush_triggers_by_max_buffered_events_exceeds() -> None:
    compactor = DefaultEventCompactor(EventCompactorConfig(max_buffered_events=1))
    out1 = compactor.push({"seq": 1, "event": {"type": "TEXT_MESSAGE_CHUNK", "messageId": "m1", "role": "assistant", "delta": "a"}})
    assert out1 == []
    out2 = compactor.push({"seq": 2, "event": {"type": "TEXT_MESSAGE_CHUNK", "messageId": "m2", "role": "assistant", "delta": "b"}})
    assert len(out2) == 2
    assert compactor.flush() == []


def test_flush_triggers_by_max_buffered_bytes_exceeds() -> None:
    compactor = DefaultEventCompactor(EventCompactorConfig(max_buffered_bytes=1))
    out = compactor.push({"seq": 1, "event": {"type": "TEXT_MESSAGE_CHUNK", "messageId": "m1", "role": "assistant", "delta": "a"}})
    assert len(out) == 1
    assert compactor.flush() == []


def test_sink_persists_state_snapshots_to_snapshot_store() -> None:
    event_store = InMemoryRingBufferEventStore(capacity_per_thread=10)
    with tempfile.TemporaryDirectory() as td:
        snapshot_store = SqliteSnapshotStore(f"{td}/snap.db")
        sink = CompactingEventSink(
            thread_id="t1",
            event_store=event_store,
            snapshot_store=snapshot_store,
            compactor=DefaultEventCompactor(EventCompactorConfig(max_replay_events=1)),
        )

        sink.push({"seq": 1, "event": {"type": "STATE_SNAPSHOT", "snapshot": {"ui": {"v": 1, "components": {}}, "k": 0}}})
        sink.push({"seq": 2, "event": {"type": "STATE_DELTA", "delta": [{"op": "add", "path": "/k", "value": 1}]}})
        sink.push({"seq": 3, "event": {"type": "STATE_DELTA", "delta": [{"op": "replace", "path": "/k", "value": 2}]}})
        sink.flush()

        latest = snapshot_store.get_latest(thread_id="t1")
        assert latest is not None
        assert latest.seq == 3
        assert latest.shared_state["k"] == 2

