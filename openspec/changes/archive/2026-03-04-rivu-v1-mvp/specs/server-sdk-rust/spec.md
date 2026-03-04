## ADDED Requirements

### Requirement: Rust SDK validates and encodes AG-UI events and `ui.v1.event`
The Rust SDK MUST provide strict encode/decode/validate utilities for:
- AG-UI core events
- `CUSTOM(name="ui.v1.event")`

#### Scenario: Decode rejects invalid custom payload
- **WHEN** a Rust service receives an invalid `ui.v1.event`
- **THEN** the SDK rejects it before business logic runs

### Requirement: Rust SDK provides `seq` allocation and resume utilities
The Rust SDK MUST provide utilities to:
- allocate monotonically increasing `seq` values for a thread stream
- serve replay starting from `resumeFrom`
- fall back to snapshot-based resynchronization when replay is incomplete

#### Scenario: Serve resume replay window
- **WHEN** a client reconnects with `resumeFrom=100` and the event store has `seq=101..120`
- **THEN** the SDK returns `seq=101..120` in order

### Requirement: Rust SDK ships default no-external-service stores
The Rust SDK MUST include default storage implementations that require no external services:
- an in-memory ring-buffer EventStore
- a SQLite-based (or file-based) SnapshotStore

#### Scenario: Restore after process restart
- **WHEN** the process restarts and the in-memory store is empty
- **THEN** the SDK can still restore state from the latest SQLite/file snapshot

### Requirement: Rust SDK supports idempotency and revision conflict handling
The Rust SDK MUST provide helper utilities for:
- idempotency using `clientRequestId`
- optimistic concurrency using `baseRevision` and component `revision`

#### Scenario: Idempotent retry does not duplicate effects
- **WHEN** the same `clientRequestId` is processed twice
- **THEN** the SDK returns the original result without reapplying mutations

