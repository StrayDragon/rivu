## ADDED Requirements

### Requirement: UI interactions use `CUSTOM(name="ui.v1.event")`
The system MUST represent client→server UI interactions as an AG-UI `CUSTOM` event with `name` exactly equal to `ui.v1.event`.

The event MUST include a `value` object with the following required fields:
- `componentId`: non-empty string
- `eventName`: non-empty string
- `payload`: JSON object (MUST NOT be an array at the root)
- `clientRequestId`: non-empty string (used for idempotency)
- `baseRevision`: non-negative integer (used for optimistic concurrency)

The system MUST reject `ui.v1.event` messages that fail schema validation.

#### Scenario: Accept a valid `ui.v1.event`
- **WHEN** a client sends a `CUSTOM` event with `name="ui.v1.event"` whose `value` matches the required fields and types
- **THEN** the SDK validators accept the event and can decode it into typed structures

#### Scenario: Reject missing `clientRequestId`
- **WHEN** a client sends a `ui.v1.event` whose `value.clientRequestId` is missing or empty
- **THEN** the SDK validators reject the event as invalid

### Requirement: UI state is stored under `state.ui` (v1)
The system MUST store renderable UI component data inside the AG-UI shared state at `state.ui`.

`state.ui` MUST be an object with:
- `v`: integer equal to `1`
- `components`: an object map keyed by `componentId`

Each `state.ui.components[componentId]` entry MUST contain:
- `type`: non-empty string (component type identifier)
- `schemaVersion`: positive integer
- `props`: JSON object
- `revision`: non-negative integer
- `mounts`: array of mount objects

Each mount object MUST contain:
- `messageId`: non-empty string
- `slot`: non-empty string
- `order`: number

If a component is stateful, it MUST also contain:
- `state`: JSON object (server-authoritative persisted state)

If a component is stateless, the `state` field MAY be omitted.

#### Scenario: `STATE_SNAPSHOT` can fully restore UI
- **WHEN** a `STATE_SNAPSHOT` event is received whose `snapshot` contains a valid `state.ui` object
- **THEN** a consumer can reconstruct the full set of UI components and mounts from `state.ui.components`

### Requirement: Revisions support optimistic concurrency
For any stateful component, the server MUST treat `state.ui.components[componentId].revision` as the authoritative revision.

For any `ui.v1.event` that intends to mutate server-authoritative component state, the server MUST compare `baseRevision` against the current `revision` and MUST NOT apply the mutation when they differ.

#### Scenario: Accept matching `baseRevision`
- **WHEN** a `ui.v1.event` is processed with `baseRevision` equal to the current component `revision`
- **THEN** the server may accept and apply the change and emit a `STATE_DELTA` or `STATE_SNAPSHOT` reflecting the new `revision`

#### Scenario: Reject conflicting `baseRevision`
- **WHEN** a `ui.v1.event` is processed with `baseRevision` not equal to the current component `revision`
- **THEN** the server rejects the change and the client can be resynchronized via replay or `STATE_SNAPSHOT`

### Requirement: `ui.v1.event` inputs are treated as untrusted
SDK validators MUST support configurable limits for decoding `ui.v1.event` payloads (including maximum bytes and maximum nesting depth).

When a received `ui.v1.event` exceeds configured limits, the SDK MUST reject it.

#### Scenario: Reject oversized payload
- **WHEN** a `ui.v1.event` payload exceeds the configured maximum size
- **THEN** the SDK rejects the event before it reaches business logic

### Requirement: Golden vectors exist for `ui.v1.event` and `state.ui`
The spec package MUST provide golden vectors that include:
- valid `ui.v1.event` examples
- invalid `ui.v1.event` examples
- valid `state.ui` snapshots

The vectors MUST be consumable by TypeScript, Python, and Rust test suites.

#### Scenario: Cross-language validation matches vectors
- **WHEN** each language implementation validates the golden vector inputs
- **THEN** they all agree on which vectors are valid vs invalid

