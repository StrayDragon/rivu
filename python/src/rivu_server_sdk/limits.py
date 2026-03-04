from __future__ import annotations

import json
from collections.abc import Mapping, Sequence
from typing import Any


def estimate_json_utf8_size(value: Any) -> int:
    try:
        raw = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    except TypeError:
        return 2**63 - 1
    return len(raw.encode("utf-8"))


def exceeds_max_depth(value: Any, *, max_depth: int) -> bool:
    stack: list[tuple[Any, int]] = [(value, 1)]
    while stack:
        current, depth = stack.pop()
        if depth > max_depth:
            return True
        if isinstance(current, Mapping):
            for v in current.values():
                stack.append((v, depth + 1))
            continue
        if isinstance(current, (str, bytes)):
            continue
        if isinstance(current, Sequence):
            for v in current:
                stack.append((v, depth + 1))
    return False

