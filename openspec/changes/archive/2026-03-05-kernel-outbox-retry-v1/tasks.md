## 1. Kernel API & state machine

- [x] 1.1 Define the public retry API (e.g. `kernel.retry(clientRequestId)`), including return type and error semantics
- [x] 1.2 Extend outbox entry state to track retry attempts (attempt count / timestamps / last error as needed)
- [x] 1.3 Implement retry behavior for `status="failed"` entries (re-invoke transport, update state, preserve `clientRequestId` idempotency)
- [x] 1.4 Add an optional outbox cleanup API or bounded strategy (explicit clear / keep-last-N / TTL-like hook)

## 2. Tests

- [x] 2.1 Add unit tests: failed send transitions to `failed` and surfaces error
- [x] 2.2 Add unit tests: retry re-sends transport and updates outbox entry state
- [x] 2.3 Add unit tests: duplicate sends while pending/acked remain deduped

## 3. Docs and demo verification

- [x] 3.1 Update docs to describe retry semantics and the server-side idempotency requirement (`clientRequestId`)
- [x] 3.2 Update `ProtocolInspector` or an example view to visualize outbox entries and trigger retry (optional but recommended)
- [x] 3.3 Add an example/mock failure path demonstrating “fail once → retry succeeds” without mutating shared state locally
