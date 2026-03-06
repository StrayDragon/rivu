from __future__ import annotations

import pytest

from rivu_server_sdk import (
    InvalidPayloadError,
    RevisionConflictError,
    UiV1CustomEvent,
    UiV1EventProcessor,
)


def test_ui_v1_event_processor_wizard_next_idempotency_and_conflict() -> None:
    shared_state: dict[str, object] = {
        "ui": {
            "v": 1,
            "components": {
                "cmp_wiz": {
                    "type": "MultiStepWizard",
                    "schemaVersion": 1,
                    "props": {
                        "title": "Wizard",
                        "steps": [
                            {
                                "id": "s1",
                                "title": "Step 1",
                                "fields": [{"id": "email", "label": "Email", "type": "text"}],
                            },
                            {
                                "id": "s2",
                                "title": "Step 2",
                                "fields": [{"id": "plan", "label": "Plan", "type": "text"}],
                            },
                        ],
                    },
                    "state": {"currentStepId": "s1", "values": {}, "status": "idle"},
                    "revision": 0,
                    "mounts": [],
                }
            },
        }
    }

    processor = UiV1EventProcessor()

    next_event = UiV1CustomEvent.model_validate(
        {
            "type": "CUSTOM",
            "name": "ui.v1.event",
            "value": {
                "componentId": "cmp_wiz",
                "eventName": "wizard.next",
                "payload": {},
                "clientRequestId": "req_1",
                "baseRevision": 0,
            },
        }
    )

    first = processor.process(shared_state=shared_state, event=next_event)
    assert first["new_revision"] == 1
    assert first["shared_state"]["ui"]["components"]["cmp_wiz"]["revision"] == 1
    assert first["shared_state"]["ui"]["components"]["cmp_wiz"]["state"]["currentStepId"] == "s2"

    second = processor.process(shared_state=first["shared_state"], event=next_event)
    assert second["new_revision"] == 1
    assert second["shared_state"]["ui"]["components"]["cmp_wiz"]["revision"] == 1

    conflict = UiV1CustomEvent.model_validate(
        {
            "type": "CUSTOM",
            "name": "ui.v1.event",
            "value": {
                "componentId": "cmp_wiz",
                "eventName": "wizard.prev",
                "payload": {},
                "clientRequestId": "req_2",
                "baseRevision": 0,
            },
        }
    )

    with pytest.raises(RevisionConflictError):
        processor.process(shared_state=first["shared_state"], event=conflict)


def test_ui_v1_event_processor_wizard_next_rejects_non_empty_payload() -> None:
    shared_state: dict[str, object] = {
        "ui": {
            "v": 1,
            "components": {
                "cmp_wiz": {
                    "type": "MultiStepWizard",
                    "schemaVersion": 1,
                    "props": {
                        "title": "Wizard",
                        "steps": [
                            {
                                "id": "s1",
                                "title": "Step 1",
                                "fields": [{"id": "email", "label": "Email", "type": "text"}],
                            },
                            {
                                "id": "s2",
                                "title": "Step 2",
                                "fields": [{"id": "plan", "label": "Plan", "type": "text"}],
                            },
                        ],
                    },
                    "state": {"currentStepId": "s1", "values": {}, "status": "idle"},
                    "revision": 0,
                    "mounts": [],
                }
            },
        }
    }

    processor = UiV1EventProcessor()

    bad = UiV1CustomEvent.model_validate(
        {
            "type": "CUSTOM",
            "name": "ui.v1.event",
            "value": {
                "componentId": "cmp_wiz",
                "eventName": "wizard.next",
                "payload": {"x": 1},
                "clientRequestId": "req_bad",
                "baseRevision": 0,
            },
        }
    )

    with pytest.raises(InvalidPayloadError):
        processor.process(shared_state=shared_state, event=bad)

