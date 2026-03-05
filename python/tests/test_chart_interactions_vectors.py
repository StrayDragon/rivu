from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from rivu_server_sdk import UiDatasetV1


def _load_vectors() -> dict[str, Any]:
    root = Path(__file__).resolve().parents[2]
    vectors_path = root / "spec" / "vectors" / "chart-interactions.v1.json"
    return json.loads(vectors_path.read_text("utf-8"))


def _is_finite_number(value: Any) -> bool:
    if isinstance(value, bool):
        return False
    return isinstance(value, (int, float))


def _validate_case(*, event_name: str, payload: Any, dataset: Any) -> bool:
    try:
        ds = UiDatasetV1.model_validate(dataset)
    except Exception:
        return False

    if event_name == "chart.clearSelection":
        return isinstance(payload, dict)

    if event_name != "chart.setSelection":
        return False

    if not isinstance(payload, dict):
        return False
    selection = payload.get("selection")
    if not isinstance(selection, dict):
        return False

    kind = selection.get("kind")
    if kind == "none":
        return True

    if kind == "point":
        row_index = selection.get("rowIndex")
        if not isinstance(row_index, int) or row_index < 0:
            return False
        return row_index < len(ds.rows)

    if kind == "range":
        column = selection.get("column")
        if not isinstance(column, str) or not column.strip():
            return False
        if "from" not in selection or "to" not in selection:
            return False
        from_v = selection.get("from")
        to_v = selection.get("to")
        if from_v is not None and not (_is_finite_number(from_v) or isinstance(from_v, str)):
            return False
        if to_v is not None and not (_is_finite_number(to_v) or isinstance(to_v, str)):
            return False
        return True

    if kind == "series":
        value = selection.get("value")
        if isinstance(value, str):
            return True
        return _is_finite_number(value)

    return False


def test_chart_interactions_vectors_validation() -> None:
    vectors = _load_vectors()
    assert vectors["version"] == 1

    for item in vectors["chartInteractionsV1"]["valid"]:
        assert _validate_case(event_name=item["eventName"], payload=item["payload"], dataset=item["dataset"]) is True, item["id"]

    for item in vectors["chartInteractionsV1"]["invalid"]:
        assert _validate_case(event_name=item["eventName"], payload=item["payload"], dataset=item["dataset"]) is False, item["id"]
