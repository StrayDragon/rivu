## 1. React workflow UI kit components

- [x] 1.1 Define `ConfirmCard` props/state schemas + component implementation (tokens + className/style + minimal slots)
- [x] 1.2 Define `TaskStatusCard` props schema + component implementation (stateless, replayable, tokens + className/style)
- [x] 1.3 Register both components in `workflowRegistryV1` and export from `rivu-react` entrypoints
- [x] 1.4 Add minimal unit tests for rendering + event emission shape (confirm/cancel include baseRevision/clientRequestId)

## 2. Server SDK event processing (Python + Rust)

- [x] 2.1 Extend Python `UiV1EventProcessor` to support `ConfirmCard` events (`confirm`/`cancel`) with idempotency + revision increments
- [x] 2.2 Add Python tests: valid transitions, idempotent retry, revision conflict rejection
- [x] 2.3 Extend Rust `UiV1EventProcessor` to support `ConfirmCard` events with the same semantics
- [x] 2.4 Add Rust tests mirroring Python cases (including golden-vector style cases where applicable)

## 3. Demo + docs verification loop

- [x] 3.1 Add demo fixtures for ConfirmCard and TaskStatusCard mounts in `examples/rivu-react-demo`
- [x] 3.2 Update demo mock server to process ConfirmCard actions and emit `STATE_DELTA` updates (optionally emit tool-call events as illustrative output)
- [x] 3.3 Add a docs page describing the two cards, eventName set, and backend responsibilities (auth/audit/tool execution)
- [x] 3.4 Run repo typecheck/build and ensure the new cards render + round-trip in the demo
