import json
from pathlib import Path

import pytest

from rivu_server_sdk import UiV1CapabilitiesCustomEvent


def _load_vectors() -> dict:
    root = Path(__file__).resolve().parents[2]
    vectors_path = root / "spec" / "vectors" / "ui-v1-capabilities.v1.json"
    return json.loads(vectors_path.read_text("utf-8"))


def test_vectors_ui_v1_capabilities_valid_invalid() -> None:
    vectors = _load_vectors()

    for item in vectors["uiV1Capabilities"]["valid"]:
        UiV1CapabilitiesCustomEvent.model_validate(item)

    for item in vectors["uiV1Capabilities"]["invalid"]:
        with pytest.raises(Exception):
            UiV1CapabilitiesCustomEvent.model_validate(item)

