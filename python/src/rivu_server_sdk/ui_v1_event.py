from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, NonNegativeInt

from .limits import estimate_json_utf8_size, exceeds_max_depth

UI_V1_EVENT_NAME = "ui.v1.event"


class UiV1EventValue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    componentId: str = Field(min_length=1)
    eventName: str = Field(min_length=1)
    payload: dict[str, Any]
    clientRequestId: str = Field(min_length=1)
    baseRevision: NonNegativeInt

    @classmethod
    def parse_with_limits(
        cls,
        value: Any,
        *,
        max_bytes: int | None = None,
        max_depth: int | None = None,
    ) -> "UiV1EventValue":
        if max_bytes is not None and estimate_json_utf8_size(value) > max_bytes:
            raise ValueError("ui.v1.event value exceeds max_bytes")
        if max_depth is not None and exceeds_max_depth(value, max_depth=max_depth):
            raise ValueError("ui.v1.event value exceeds max_depth")
        return cls.model_validate(value)


class UiV1CustomEvent(BaseModel):
    # Allow passthrough meta fields (e.g. timestamp/rawEvent) and future extensions.
    model_config = ConfigDict(extra="allow")

    type: Literal["CUSTOM"]
    name: Literal["ui.v1.event"]
    value: UiV1EventValue

    timestamp: float | None = None
    rawEvent: Any | None = None

    @classmethod
    def parse_with_limits(
        cls,
        event: Any,
        *,
        max_bytes: int | None = None,
        max_depth: int | None = None,
    ) -> "UiV1CustomEvent":
        if max_bytes is not None and estimate_json_utf8_size(event) > max_bytes:
            raise ValueError("ui.v1.event event exceeds max_bytes")
        if max_depth is not None and exceeds_max_depth(event, max_depth=max_depth):
            raise ValueError("ui.v1.event event exceeds max_depth")
        return cls.model_validate(event)

