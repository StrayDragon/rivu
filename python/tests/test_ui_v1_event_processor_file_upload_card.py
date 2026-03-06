from __future__ import annotations

import pytest

from rivu_server_sdk import (
    InvalidPayloadError,
    RevisionConflictError,
    UiV1CustomEvent,
    UiV1EventProcessor,
)


def test_ui_v1_event_processor_file_upload_card_add_idempotency_and_conflict() -> None:
    shared_state: dict[str, object] = {
        "ui": {
            "v": 1,
            "components": {
                "cmp_upload": {
                    "type": "FileUploadCard",
                    "schemaVersion": 1,
                    "props": {"title": "Upload"},
                    "state": {"files": [], "status": "idle"},
                    "revision": 0,
                    "mounts": [],
                }
            },
        }
    }

    processor = UiV1EventProcessor()

    add = UiV1CustomEvent.model_validate(
        {
            "type": "CUSTOM",
            "name": "ui.v1.event",
            "value": {
                "componentId": "cmp_upload",
                "eventName": "file.add",
                "payload": {
                    "file": {
                        "id": "file_1",
                        "name": "a.txt",
                        "sizeBytes": 12,
                        "mimeType": "text/plain",
                    }
                },
                "clientRequestId": "req_1",
                "baseRevision": 0,
            },
        }
    )

    first = processor.process(shared_state=shared_state, event=add)
    assert first["new_revision"] == 1
    state = first["shared_state"]["ui"]["components"]["cmp_upload"]["state"]
    assert len(state["files"]) == 1
    assert state["files"][0]["id"] == "file_1"

    second = processor.process(shared_state=first["shared_state"], event=add)
    assert second["new_revision"] == 1
    assert second["shared_state"]["ui"]["components"]["cmp_upload"]["revision"] == 1

    conflict = UiV1CustomEvent.model_validate(
        {
            "type": "CUSTOM",
            "name": "ui.v1.event",
            "value": {
                "componentId": "cmp_upload",
                "eventName": "file.remove",
                "payload": {"fileId": "file_1"},
                "clientRequestId": "req_2",
                "baseRevision": 0,
            },
        }
    )

    with pytest.raises(RevisionConflictError):
        processor.process(shared_state=first["shared_state"], event=conflict)


def test_ui_v1_event_processor_file_upload_card_submit_rejects_non_empty_payload() -> None:
    shared_state: dict[str, object] = {
        "ui": {
            "v": 1,
            "components": {
                "cmp_upload": {
                    "type": "FileUploadCard",
                    "schemaVersion": 1,
                    "props": {"title": "Upload"},
                    "state": {"files": [], "status": "idle"},
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
                "componentId": "cmp_upload",
                "eventName": "file.submit",
                "payload": {"x": 1},
                "clientRequestId": "req_bad",
                "baseRevision": 0,
            },
        }
    )

    with pytest.raises(InvalidPayloadError):
        processor.process(shared_state=shared_state, event=bad)

