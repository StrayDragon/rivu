import json
from pathlib import Path

from rivu_server_sdk.reduce_v1 import reduce_envelopes_v1


def _load_vectors() -> dict:
    root = Path(__file__).resolve().parents[2]
    vectors_path = root / "spec" / "vectors" / "ui-v1.v1.json"
    return json.loads(vectors_path.read_text("utf-8"))


def test_reduce_vectors() -> None:
    vectors = _load_vectors()
    for case in vectors["reduce"]:
        actual = reduce_envelopes_v1(case["envelopes"])
        assert actual == case["expect"], case["id"]

