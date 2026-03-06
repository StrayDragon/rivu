import json
from pathlib import Path

import pytest

from rivu_server_sdk import DiffViewPropsV1


def _load_vectors() -> dict:
    root = Path(__file__).resolve().parents[2]
    vectors_path = root / "spec" / "vectors" / "viewer-diff-view.v1.json"
    return json.loads(vectors_path.read_text("utf-8"))


def test_vectors_diff_view_props_valid_invalid() -> None:
    vectors = _load_vectors()

    for item in vectors["diffViewPropsV1"]["valid"]:
        DiffViewPropsV1.model_validate(item["props"])

    for item in vectors["diffViewPropsV1"]["invalid"]:
        with pytest.raises(Exception):
            DiffViewPropsV1.model_validate(item["props"])

