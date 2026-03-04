# react-examples Specification

## Purpose
TBD - created by archiving change rivu-react-examples. Update Purpose after archive.
## Requirements
### Requirement: React demo project exists
The repository MUST include a runnable React demo under `examples/` that depends on `rivu-kernel` and `rivu-react` via workspace dependencies.

#### Scenario: Install and start dev server
- **WHEN** the user runs `pnpm -C examples/rivu-react-demo dev`
- **THEN** a Vite dev server starts successfully without requiring external services

### Requirement: Demo renders all v1 MVP components
The demo MUST render all v1 MVP component types from the official registries.

#### Scenario: Viewer components visible
- **WHEN** the demo loads the initial `STATE_SNAPSHOT`
- **THEN** `ReportSection`, `MetricCard`, `DataTable`, `BarChart`, `LineChart`, and `CitationList` are rendered

#### Scenario: Workflow components visible
- **WHEN** the demo loads the initial `STATE_SNAPSHOT`
- **THEN** `ApprovalCard` and `FormCard` are rendered

### Requirement: Demo demonstrates mounts embedding
The demo MUST demonstrate `state.ui.components[componentId].mounts` embedding using PRD slots `inline | sidebar`.

#### Scenario: Inline mounts render under messages
- **WHEN** a component is mounted with `{ slot: "inline" }` for a message
- **THEN** the component is rendered in the message content area

#### Scenario: Sidebar mounts render in sidebar
- **WHEN** a component is mounted with `{ slot: "sidebar" }` for a message
- **THEN** the component is rendered in a sidebar area

### Requirement: Workflow round-trip uses server-authoritative state
Workflow components MUST only update their persisted state after receiving server-produced AG-UI events.

#### Scenario: ApprovalCard approve updates revision via server delta
- **WHEN** the user clicks Approve on an `ApprovalCard`
- **THEN** the client sends `CUSTOM(name="ui.v1.event")` with `baseRevision`
- **AND THEN** the demo server responds with a `STATE_DELTA` that updates the component `state` and increments `revision`

#### Scenario: FormCard setField and submit update via server delta
- **WHEN** the user edits a field or submits a `FormCard`
- **THEN** the client sends `CUSTOM(name="ui.v1.event")` with `baseRevision`
- **AND THEN** the demo server responds with a `STATE_DELTA` that updates the component `state` and increments `revision`

### Requirement: No Provider required
The demo MUST render components without requiring a global Provider.

#### Scenario: ComponentRenderer receives kernel and registry explicitly
- **WHEN** the demo renders a component
- **THEN** it passes `kernel` and `registry` directly to `ComponentRenderer`

