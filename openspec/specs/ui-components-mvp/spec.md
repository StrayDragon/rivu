# ui-components-mvp Specification

## Purpose
Define requirements for the v1 MVP UI kit components, including viewer-safe stateless components and workflow stateful round-trip components.

## Requirements

### Requirement: Viewer profile ships stateless, replayable components
The UI kit MUST include a Viewer-oriented subset of components that are stateless (no server-authoritative writes) and replayable from `state.ui` snapshots.

At minimum, the kit MUST provide:
- `ReportSection`
- `MetricCard`
- `DataTable`
- `BarChart`
- `LineChart`
- `CitationList`
- `UnknownComponentCard`

#### Scenario: Viewer components render from props only
- **WHEN** a Viewer component is rendered with the same validated props across two sessions
- **THEN** the visual output is stable and does not depend on external services or network requests

### Requirement: Workflow profile ships at least one stateful round-trip component
The UI kit MUST include at least one stateful Workflow component that can complete a full round-trip:
`ui.v1.event` → server validation/authorization/idempotency/concurrency → `STATE_DELTA` → UI update.

The v1 MVP MUST include at least:
- `ApprovalCard` (stateful)
- `FormCard` (stateful)

#### Scenario: ApprovalCard approve round-trip
- **WHEN** a user clicks “approve” on an `ApprovalCard`
- **THEN** the frontend sends `CUSTOM(name="ui.v1.event")` with `eventName="approve"` and the correct `componentId/clientRequestId/baseRevision`

### Requirement: Stateful components are server-authoritative
Stateful components MUST treat `state.ui.components[componentId].state` and `revision` as authoritative.

Stateful components MUST NOT apply local state changes as if they were committed unless a corresponding server envelope is applied.

#### Scenario: Server-only state transition
- **WHEN** a user interacts with a stateful component while offline or the server rejects the request
- **THEN** the component does not falsely show a committed server state

### Requirement: Components validate props and state against schema versions
Each shipped component type MUST define:
- a `schemaVersion`
- a props schema
- for stateful components, a state schema

Renderers MUST validate received props/state before rendering.

#### Scenario: Invalid props degrade gracefully
- **WHEN** a component is mounted with props that do not validate against its schemaVersion
- **THEN** the UI renders `UnknownComponentCard` (or equivalent) instead of crashing

### Requirement: Browser components do not execute tools
Browser-side components MUST NOT execute tools with side effects.

Components MAY emit `ui.v1.event` actions, but tool execution and authorization MUST remain server-side.

#### Scenario: Interaction does not call tool locally
- **WHEN** a user submits a `FormCard`
- **THEN** the frontend only sends `ui.v1.event` and does not perform side-effecting actions locally
