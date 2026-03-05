from __future__ import annotations

import pytest

from rivu_server_sdk import RevisionConflictError, UiV1CustomEvent, UiV1EventProcessor


def test_ui_v1_event_processor_confirm_card_confirm_idempotency_and_conflict() -> None:
    shared_state: dict[str, object] = {
        "ui": {
            "v": 1,
            "components": {
                "cmp_confirm": {
                    "type": "ConfirmCard",
                    "schemaVersion": 1,
                    "props": {"title": "Confirm?"},
                    "state": {"status": "pending"},
                    "revision": 0,
                    "mounts": [],
                }
            },
        }
    }

    processor = UiV1EventProcessor()

    confirm = UiV1CustomEvent.model_validate(
        {
            "type": "CUSTOM",
            "name": "ui.v1.event",
            "value": {
                "componentId": "cmp_confirm",
                "eventName": "confirm",
                "payload": {},
                "clientRequestId": "req_1",
                "baseRevision": 0,
            },
        }
    )

    first = processor.process(shared_state=shared_state, event=confirm)
    assert first["new_revision"] == 1
    state = first["shared_state"]["ui"]["components"]["cmp_confirm"]["state"]
    assert state["status"] == "confirmed"
    assert isinstance(state.get("decidedAtMs"), int)

    second = processor.process(shared_state=first["shared_state"], event=confirm)
    assert second["new_revision"] == 1
    assert second["shared_state"]["ui"]["components"]["cmp_confirm"]["revision"] == 1

    conflict = UiV1CustomEvent.model_validate(
        {
            "type": "CUSTOM",
            "name": "ui.v1.event",
            "value": {
                "componentId": "cmp_confirm",
                "eventName": "cancel",
                "payload": {},
                "clientRequestId": "req_2",
                "baseRevision": 0,
            },
        }
    )

    with pytest.raises(RevisionConflictError):
        processor.process(shared_state=first["shared_state"], event=conflict)


def test_ui_v1_event_processor_confirm_card_cancel_transition() -> None:
    shared_state: dict[str, object] = {
        "ui": {
            "v": 1,
            "components": {
                "cmp_confirm": {
                    "type": "ConfirmCard",
                    "schemaVersion": 1,
                    "props": {"title": "Confirm?"},
                    "state": {"status": "pending"},
                    "revision": 0,
                    "mounts": [],
                }
            },
        }
    }

    processor = UiV1EventProcessor()

    cancel = UiV1CustomEvent.model_validate(
        {
            "type": "CUSTOM",
            "name": "ui.v1.event",
            "value": {
                "componentId": "cmp_confirm",
                "eventName": "cancel",
                "payload": {},
                "clientRequestId": "req_cancel_1",
                "baseRevision": 0,
            },
        }
    )

    first = processor.process(shared_state=shared_state, event=cancel)
    assert first["new_revision"] == 1
    state = first["shared_state"]["ui"]["components"]["cmp_confirm"]["state"]
    assert state["status"] == "cancelled"
    assert isinstance(state.get("decidedAtMs"), int)

