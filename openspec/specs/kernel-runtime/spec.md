## ADDED Requirements

### Requirement: Kernel exposes a framework-agnostic core API
The kernel MUST be usable without React/Svelte/Vue-specific dependencies.

At minimum, the kernel MUST expose:
- `dispatch(envelope)`: apply one server envelope `{ seq, event }`
- `getState()`: read current derived state (including `state.ui`)
- `subscribe(listener)`: subscribe to state changes and return an unsubscribe function
- `send(action)`: send a client action (e.g., `ui.v1.event`) via an injected transport

The kernel MUST NOT perform network requests directly.

#### Scenario: Subscriptions observe state changes
- **WHEN** a consumer calls `subscribe(listener)` and then calls `dispatch(...)` with an applied envelope
- **THEN** the listener is invoked after the state update

### Requirement: Kernel enforces `seq` ordering semantics
The kernel MUST maintain a `lastSeq` counter in its internal state.

When `dispatch(envelope)` is called:
- If `envelope.seq == lastSeq + 1`, the kernel MUST validate and apply the event.
- If `envelope.seq <= lastSeq`, the kernel MUST discard the envelope without mutating state.
- If `envelope.seq > lastSeq + 1`, the kernel MUST signal a gap and MUST NOT apply the envelope.

#### Scenario: Kernel discards old envelopes
- **WHEN** the kernel has `lastSeq = 10` and receives `dispatch({ seq: 9, event })`
- **THEN** the kernel discards the envelope and `getState().lastSeq` remains `10`

#### Scenario: Kernel signals gap
- **WHEN** the kernel has `lastSeq = 10` and receives `dispatch({ seq: 12, event })`
- **THEN** the kernel signals a gap and does not mutate state

### Requirement: Kernel validates inbound events and rejects unknown UI custom names by default
The kernel MUST perform runtime schema validation for inbound AG-UI events.

For `CUSTOM` events, the kernel MUST reject unknown `name` values by default.

#### Scenario: Reject invalid `ui.v1.event`
- **WHEN** the kernel receives a `CUSTOM(name="ui.v1.event")` whose `value` fails validation
- **THEN** the kernel rejects the event and does not mutate state

#### Scenario: Reject unknown custom event
- **WHEN** the kernel receives a `CUSTOM` event with `name="ui.unknown.event"`
- **THEN** the kernel rejects the event by default

### Requirement: Kernel applies AG-UI state events to maintain shared state
The kernel MUST maintain a shared state object that is updated by AG-UI state events:
- For `STATE_SNAPSHOT`, the kernel MUST replace the shared state entirely with `snapshot`.
- For `STATE_DELTA`, the kernel MUST apply the `delta` as JSON Patch operations (RFC 6902) to the current shared state.

If applying a `STATE_DELTA` fails, the kernel MUST enter a resynchronization-needed state and SHOULD request a fresh `STATE_SNAPSHOT`.

#### Scenario: Snapshot replaces state
- **WHEN** the kernel receives a `STATE_SNAPSHOT` event with a `snapshot` containing `ui`
- **THEN** `getState().state.ui` equals the snapshot’s `ui` value

#### Scenario: Delta patches state
- **WHEN** the kernel receives a `STATE_DELTA` whose JSON Patch operations modify `/ui/components/cmp_1/props`
- **THEN** the kernel updates `state.ui.components.cmp_1.props` accordingly

### Requirement: Kernel outbox enforces idempotent action sending
The kernel MUST require `clientRequestId` for user-generated actions (including `ui.v1.event`) and MUST support deduplication of actions by `clientRequestId`.

The kernel MUST NOT mutate server-authoritative state in response to `send(action)` unless corresponding server envelopes are later applied via `dispatch`.

#### Scenario: Deduplicate duplicate sends
- **WHEN** `send(action)` is called twice with the same `clientRequestId`
- **THEN** the kernel sends at most one transport request and treats the second as a duplicate

