## ADDED Requirements

### Requirement: ConfirmCard component exists and round-trips via `ui.v1.event`

The UI kit MUST include a `ConfirmCard` workflow component that supports a full server-authoritative round-trip:
`ui.v1.event` → server validation/idempotency/concurrency → `STATE_DELTA` → UI update.

The component MUST:
- define a `schemaVersion` and validate props/state
- emit `CUSTOM(name="ui.v1.event")` with a stable `eventName` set (at least `confirm` and `cancel`)
- include `componentId/clientRequestId/baseRevision` in emitted events

#### Scenario: Confirm emits ui.v1.event with baseRevision
- **WHEN** a user clicks “Confirm” on a `ConfirmCard`
- **THEN** the client sends `CUSTOM(name="ui.v1.event")` with `eventName="confirm"` and the correct `componentId/clientRequestId/baseRevision`

### Requirement: ConfirmCard is server-authoritative and revision-controlled

`ConfirmCard` MUST treat `state.ui.components[componentId].state` and `revision` as authoritative.

The component MUST NOT present a committed “confirmed/cancelled” state unless a corresponding server envelope is applied.

#### Scenario: Offline confirm does not fake committed state
- **WHEN** a user clicks Confirm but the server rejects the request or is unreachable
- **THEN** the component does not falsely display a committed server state

### Requirement: TaskStatusCard component exists and is replayable

The UI kit MUST include a `TaskStatusCard` component intended for long-running task status display.

`TaskStatusCard` MUST be viewer-safe and replayable:
- it renders from props only (no required network requests)
- it can be updated by server-produced `STATE_DELTA` changes to its props

#### Scenario: Server updates task progress via props
- **WHEN** the server applies a `STATE_DELTA` that updates the `TaskStatusCard` props (e.g. status/progress/message)
- **THEN** the UI updates to reflect the new task status

### Requirement: Workflow cards are themable and override-friendly

`ConfirmCard` and `TaskStatusCard` MUST:
- use Rivu theme tokens (`--rivu-*`) with fallbacks
- accept `className` overrides (and SHOULD accept `style` overrides)
- expose a minimal slots/overrides surface for hosts to customize actions/status display without breaking server-authoritative behavior

#### Scenario: Host customizes confirm actions rendering
- **WHEN** a host provides a custom actions renderer/slot for `ConfirmCard`
- **THEN** the UI uses the host renderer while still emitting `ui.v1.event` on user actions

