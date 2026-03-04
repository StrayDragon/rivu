## ADDED Requirements

### Requirement: UI kit ships `FileUploadCard@1` as a stateful Workflow component

The UI kit MUST ship a stateful workflow component:
- `type = "FileUploadCard"`
- `schemaVersion = 1`

It MUST use server-authoritative state under `sharedState.ui.components[componentId].state` and optimistic concurrency via `revision`.

#### Scenario: Snapshot restores uploaded file refs
- **WHEN** a `STATE_SNAPSHOT` contains a `FileUploadCard@1` with state containing file refs
- **THEN** the UI renders the same file list after refresh/replay

### Requirement: Upload bytes are out-of-band; `ui.v1.event` carries only file refs

`FileUploadCard@1` interactions MUST use `CUSTOM(name="ui.v1.event")` and MUST NOT send file bytes in the payload.

The payload MUST carry only an `UploadedFileRef` (and/or identifiers) needed for server-authoritative state updates and auditing.

#### Scenario: Payload does not contain base64 file contents
- **WHEN** a client adds a file
- **THEN** the emitted `ui.v1.event.value.payload` contains a file ref object, not the raw file contents

### Requirement: FileUploadCard uses a fixed event set

`FileUploadCard@1` MUST use `eventName` in:
- `file.add`
- `file.remove`
- `file.submit`

Each event MUST include `clientRequestId` and `baseRevision`.

#### Scenario: Remove uses baseRevision
- **WHEN** the user removes a file
- **THEN** the client sends `eventName="file.remove"` with the current `baseRevision`

### Requirement: Committed files are written only via server deltas

The UI MUST NOT treat locally selected files as committed server state unless a server envelope (`STATE_DELTA`/`STATE_SNAPSHOT`) writes the file refs into the component state and increments `revision`.

#### Scenario: Local upload failure does not mutate state
- **WHEN** an out-of-band upload fails locally
- **THEN** the component does not mutate `sharedState.ui` state and remains consistent with server state
