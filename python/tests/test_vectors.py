import json
from pathlib import Path

import pytest

from rivu_server_sdk import UiStateV1, UiV1CustomEvent


def _load_vectors() -> dict:
    root = Path(__file__).resolve().parents[2]
    vectors_path = root / "spec" / "vectors" / "ui-v1.v1.json"
    return json.loads(vectors_path.read_text("utf-8"))


def test_vectors_ui_v1_event_valid_invalid() -> None:
    vectors = _load_vectors()

    for item in vectors["uiV1Event"]["valid"]:
        UiV1CustomEvent.model_validate(item)

    for item in vectors["uiV1Event"]["invalid"]:
        with pytest.raises(Exception):
            UiV1CustomEvent.model_validate(item)


def test_vectors_ui_state_v1_valid_invalid() -> None:
    vectors = _load_vectors()

    for item in vectors["uiStateV1"]["valid"]:
        UiStateV1.model_validate(item)

    for item in vectors["uiStateV1"]["invalid"]:
        with pytest.raises(Exception):
            UiStateV1.model_validate(item)

