from __future__ import annotations

import math
import time
from dataclasses import dataclass
from typing import Any, Callable, Literal, TypedDict

from .json_patch import apply_json_patch
from .state_ui import UiComponentV1, UiStateV1
from .ui_v1_event import UiV1CustomEvent, UiV1EventValue


class UiV1EventProcessorError(Exception):
    pass


class AuthorizationError(UiV1EventProcessorError):
    pass


class RevisionConflictError(UiV1EventProcessorError):
    pass


class UnknownComponentError(UiV1EventProcessorError):
    pass


class InvalidPayloadError(UiV1EventProcessorError):
    pass


class ProcessedResult(TypedDict):
    shared_state: dict[str, Any]
    events: list[dict[str, Any]]
    component_id: str
    client_request_id: str
    new_revision: int


AuthorizeHook = Callable[[UiV1CustomEvent, UiComponentV1], None]


@dataclass
class UiV1EventProcessor:
    """A small helper to process `ui.v1.event` into AG-UI state events.

    This processor is intentionally minimal:
    - authorization is a hook
    - idempotency is tracked in-memory by `clientRequestId`
    - concurrency uses `baseRevision` vs component `revision`
    """

    authorize: AuthorizeHook | None = None
    now_ms: Callable[[], int] = lambda: int(time.time() * 1000)

    # clientRequestId -> ProcessedResult (events+revision) for idempotent retries
    _idempotency: dict[str, ProcessedResult] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self._idempotency is None:
            self._idempotency = {}

    def process(self, *, shared_state: dict[str, Any], event: UiV1CustomEvent) -> ProcessedResult:
        value: UiV1EventValue = event.value
        component_id = value.componentId
        client_request_id = value.clientRequestId

        existing = self._idempotency.get(client_request_id)
        if existing is not None:
            return existing

        ui_raw = shared_state.get("ui")
        if not isinstance(ui_raw, dict):
            raise UnknownComponentError("shared_state.ui is missing")
        ui_state = UiStateV1.model_validate(ui_raw)

        component_raw = ui_state.components.get(component_id)
        if component_raw is None:
            raise UnknownComponentError(f"component not found: {component_id}")

        if value.baseRevision != component_raw.revision:
            raise RevisionConflictError(
                f"revision conflict: baseRevision={value.baseRevision} currentRevision={component_raw.revision}"
            )

        if self.authorize is not None:
            self.authorize(event, component_raw)

        new_component = self._apply_component_event(component=component_raw, value=value)
        new_revision = int(new_component.revision)

        patch = [
            {
                "op": "add",
                "path": f"/ui/components/{_encode_pointer(component_id)}/state",
                "value": new_component.state or {},
            },
            {
                "op": "replace",
                "path": f"/ui/components/{_encode_pointer(component_id)}/revision",
                "value": new_revision,
            },
        ]

        next_shared_state = apply_json_patch(shared_state, patch)
        if not isinstance(next_shared_state, dict):
            raise UiV1EventProcessorError("patch produced non-object shared_state")

        state_delta_event: dict[str, Any] = {"type": "STATE_DELTA", "delta": patch}
        result: ProcessedResult = {
            "shared_state": next_shared_state,
            "events": [state_delta_event],
            "component_id": component_id,
            "client_request_id": client_request_id,
            "new_revision": new_revision,
        }

        self._idempotency[client_request_id] = result
        return result

    def _apply_component_event(self, *, component: UiComponentV1, value: UiV1EventValue) -> UiComponentV1:
        event_name: str = value.eventName
        payload: dict[str, Any] = value.payload

        state = dict(component.state or {})
        revision = int(component.revision)

        def is_finite_number(v: Any) -> bool:
            if isinstance(v, bool):
                return False
            if not isinstance(v, (int, float)):
                return False
            return math.isfinite(float(v))

        if component.type == "ApprovalCard":
            if event_name not in ("approve", "deny"):
                raise InvalidPayloadError(f"unsupported ApprovalCard eventName: {event_name}")
            state["status"] = "approved" if event_name == "approve" else "denied"
            state.setdefault("decidedAtMs", self.now_ms())
            return component.model_copy(update={"state": state, "revision": revision + 1})

        if component.type == "ConfirmCard":
            if event_name not in ("confirm", "cancel"):
                raise InvalidPayloadError(f"unsupported ConfirmCard eventName: {event_name}")
            state["status"] = "confirmed" if event_name == "confirm" else "cancelled"
            state.setdefault("decidedAtMs", self.now_ms())
            return component.model_copy(update={"state": state, "revision": revision + 1})

        if component.type == "Chart":
            if event_name == "chart.clearSelection":
                state["selection"] = {"kind": "none"}
                return component.model_copy(update={"state": state, "revision": revision + 1})

            if event_name != "chart.setSelection":
                raise InvalidPayloadError(f"unsupported Chart eventName: {event_name}")

            selection = payload.get("selection")
            if not isinstance(selection, dict):
                raise InvalidPayloadError("payload.selection must be an object")
            kind = selection.get("kind")

            if kind == "none":
                next_selection = {"kind": "none"}
            elif kind == "point":
                row_index = selection.get("rowIndex")
                if not isinstance(row_index, int) or row_index < 0:
                    raise InvalidPayloadError("payload.selection.rowIndex must be a non-negative integer")

                data = component.props.get("data")
                rows: Any = None
                if isinstance(data, dict):
                    rows = data.get("rows")
                if not isinstance(rows, list):
                    raise InvalidPayloadError("Chart props.data.rows must be an array")
                if row_index >= len(rows):
                    raise InvalidPayloadError(
                        f"payload.selection.rowIndex out of range: rowIndex={row_index} rows={len(rows)}"
                    )
                next_selection = {"kind": "point", "rowIndex": row_index}
            elif kind == "range":
                column = selection.get("column")
                if not isinstance(column, str) or not column.strip():
                    raise InvalidPayloadError("payload.selection.column must be a non-empty string")
                from_v = selection.get("from")
                to_v = selection.get("to")
                if from_v is not None and not (is_finite_number(from_v) or isinstance(from_v, str)):
                    raise InvalidPayloadError("payload.selection.from must be string|number|null")
                if to_v is not None and not (is_finite_number(to_v) or isinstance(to_v, str)):
                    raise InvalidPayloadError("payload.selection.to must be string|number|null")
                next_selection = {"kind": "range", "column": column, "from": from_v, "to": to_v}
            elif kind == "series":
                series_value = selection.get("value")
                if not (isinstance(series_value, str) or is_finite_number(series_value)):
                    raise InvalidPayloadError("payload.selection.value must be string|number")
                next_selection = {"kind": "series", "value": series_value}
            else:
                raise InvalidPayloadError('payload.selection.kind must be one of "none"|"point"|"range"|"series"')

            state["selection"] = next_selection
            return component.model_copy(update={"state": state, "revision": revision + 1})

        if component.type == "FormCard":
            values_state = dict(state.get("values") or {})
            if event_name == "setField":
                field_id = payload.get("fieldId")
                if not isinstance(field_id, str) or not field_id.strip():
                    raise InvalidPayloadError("payload.fieldId must be a non-empty string")
                values_state[field_id] = payload.get("value")
                state["values"] = values_state
                errors_state = dict(state.get("errors") or {})
                errors_state.pop(field_id, None)
                state["errors"] = errors_state
                return component.model_copy(update={"state": state, "revision": revision + 1})
            if event_name == "submit":
                submitted_values = payload.get("values")
                if isinstance(submitted_values, dict):
                    state["values"] = {**values_state, **submitted_values}
                state["status"] = "submitted"
                return component.model_copy(update={"state": state, "revision": revision + 1})
            raise InvalidPayloadError(f"unsupported FormCard eventName: {event_name}")

        raise InvalidPayloadError(f"unsupported component type: {component.type}")


def _encode_pointer(token: str) -> str:
    return token.replace("~", "~0").replace("/", "~1")
