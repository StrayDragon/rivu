## MODIFIED Requirements

### Requirement: Kernel outbox enforces idempotent action sending

The kernel MUST require `clientRequestId` for user-generated actions (including `ui.v1.event`) and MUST support deduplication of actions by `clientRequestId`.

The kernel MUST NOT mutate server-authoritative state in response to `send(action)` unless corresponding server envelopes are later applied via `dispatch`.

The kernel MUST provide a way to retry sending an action that previously failed to send:
- Retries MUST reuse the same `clientRequestId`.
- Retrying MUST re-invoke the injected transport and update outbox state accordingly.
- Retrying MUST NOT bypass schema validation of the action payload.

#### Scenario: Deduplicate duplicate sends
- **WHEN** `send(action)` is called twice with the same `clientRequestId` while the first send is pending or acked
- **THEN** the kernel sends at most one transport request and treats the second as a duplicate

#### Scenario: Retry a failed send
- **WHEN** an action send fails and the outbox entry becomes `status="failed"`
- **AND WHEN** the host retries the same `clientRequestId` via the kernel retry mechanism
- **THEN** the kernel invokes the transport again and updates the outbox entry to reflect the new attempt

