from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, NonNegativeInt, PositiveInt, model_validator


class UiMountV1(BaseModel):
    model_config = ConfigDict(extra="forbid")

    messageId: str = Field(min_length=1)
    slot: str = Field(min_length=1)
    order: int


class UiComponentErrorV1(BaseModel):
    model_config = ConfigDict(extra="allow")

    code: str = Field(min_length=1)
    message: str = Field(min_length=1)
    details: dict[str, Any] | None = None


class UiComponentV1(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str = Field(min_length=1)
    schemaVersion: PositiveInt
    props: dict[str, Any]
    state: dict[str, Any] | None = None
    revision: NonNegativeInt
    mounts: list[UiMountV1]
    status: Literal["building", "ready", "error"] | None = None
    error: UiComponentErrorV1 | None = None

    @model_validator(mode="after")
    def _validate_lifecycle(self) -> "UiComponentV1":
        status = self.status or "ready"
        if status == "error":
            if self.error is None:
                raise ValueError("component.error must be set when status=error")
            return self
        if self.error is not None:
            raise ValueError("component.error must be omitted unless status=error")
        return self


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
