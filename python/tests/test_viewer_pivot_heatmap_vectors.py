import json
from pathlib import Path

import pytest

from rivu_server_sdk import HeatmapPropsV1, PivotTablePropsV1


def _load_vectors() -> dict:
    root = Path(__file__).resolve().parents[2]
    vectors_path = root / "spec" / "vectors" / "viewer-pivot-heatmap.v1.json"
    return json.loads(vectors_path.read_text("utf-8"))


def test_vectors_pivot_table_props_valid_invalid() -> None:
    vectors = _load_vectors()

    for item in vectors["pivotTablePropsV1"]["valid"]:
        PivotTablePropsV1.model_validate(item["props"])

    for item in vectors["pivotTablePropsV1"]["invalid"]:
        with pytest.raises(Exception):
            PivotTablePropsV1.model_validate(item["props"])


def test_vectors_heatmap_props_valid_invalid() -> None:
    vectors = _load_vectors()

    for item in vectors["heatmapPropsV1"]["valid"]:
        HeatmapPropsV1.model_validate(item["props"])

    for item in vectors["heatmapPropsV1"]["invalid"]:
        with pytest.raises(Exception):
            HeatmapPropsV1.model_validate(item["props"])

