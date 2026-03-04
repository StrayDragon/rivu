from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, NonNegativeInt, PositiveInt, model_validator


class UiMountV1(BaseModel):
    model_config = ConfigDict(extra="forbid")

    messageId: str = Field(min_length=1)
    slot: str = Field(min_length=1)
    order: int


class UiComponentV1(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str = Field(min_length=1)
    schemaVersion: PositiveInt
    props: dict[str, Any]
    state: dict[str, Any] | None = None
    revision: NonNegativeInt
    mounts: list[UiMountV1]


class UiStateV1(BaseModel):
    model_config = ConfigDict(extra="allow")

    v: Literal[1]
    components: dict[str, UiComponentV1]

    @model_validator(mode="after")
    def _validate_component_ids(self) -> "UiStateV1":
        for component_id in self.components.keys():
            if not component_id.strip():
                raise ValueError("componentId must be non-empty")
        return self
