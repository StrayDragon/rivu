# workflow-wizard Specification

## Purpose
TBD - created by archiving change workflow-multi-step-wizard-v1. Update Purpose after archive.
## Requirements
### Requirement: UI kit ships `MultiStepWizard@1` as a stateful Workflow component

The UI kit MUST ship a stateful workflow component:
- `type = "MultiStepWizard"`
- `schemaVersion = 1`

It MUST use server-authoritative state stored under `sharedState.ui.components[componentId].state` and optimistic concurrency via `revision`.

#### Scenario: Wizard renders from snapshot state
- **WHEN** a `STATE_SNAPSHOT` contains a valid `MultiStepWizard@1` component entry
- **THEN** the UI renders the correct current step and field values from server state

### Requirement: Wizard interactions use `ui.v1.event` with a fixed event set

`MultiStepWizard@1` MUST emit `CUSTOM(name="ui.v1.event")` with `eventName` in:
- `wizard.setField`
- `wizard.next`
- `wizard.prev`
- `wizard.submit`
- `wizard.reset`

Each event MUST include `clientRequestId` and `baseRevision`.

#### Scenario: Next step uses baseRevision
- **WHEN** the user clicks “Next”
- **THEN** the client sends `ui.v1.event` with `eventName="wizard.next"` and the current `baseRevision`

### Requirement: Server-authoritative round-trip (no local commit)

The wizard UI MUST NOT treat local edits/navigation as committed server state unless a corresponding server envelope is later applied.

#### Scenario: Offline setField does not commit
- **WHEN** the client is offline and `wizard.setField` cannot be sent
- **THEN** the UI does not falsely show the field as committed server state

### Requirement: Wizard state is replayable and auditable

Wizard state MUST be fully reconstructible from `STATE_SNAPSHOT/STATE_DELTA` and MUST include:
- current step pointer
- values map
- optional field errors map
- status/disabled flags (when relevant)

#### Scenario: Refresh restores progress
- **WHEN** the page is refreshed and restored from the latest snapshot
- **THEN** the wizard shows the same current step and values as before

