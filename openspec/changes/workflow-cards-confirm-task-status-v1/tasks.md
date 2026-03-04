## 1. React workflow UI kit components

- [ ] 1.1 Define `ConfirmCard` props/state schemas + component implementation (tokens + className/style + minimal slots)
- [ ] 1.2 Define `TaskStatusCard` props schema + component implementation (stateless, replayable, tokens + className/style)
- [ ] 1.3 Register both components in `workflowRegistryV1` and export from `rivu-react` entrypoints
- [ ] 1.4 Add minimal unit tests for rendering + event emission shape (confirm/cancel include baseRevision/clientRequestId)

## 2. Server SDK event processing (Python + Rust)

- [ ] 2.1 Extend Python `UiV1EventProcessor` to support `ConfirmCard` events (`confirm`/`cancel`) with idempotency + revision increments
- [ ] 2.2 Add Python tests: valid transitions, idempotent retry, revision conflict rejection
- [ ] 2.3 Extend Rust `UiV1EventProcessor` to support `ConfirmCard` events with the same semantics
- [ ] 2.4 Add Rust tests mirroring Python cases (including golden-vector style cases where applicable)

## 3. Demo + docs verification loop

- [ ] 3.1 Add demo fixtures for ConfirmCard and TaskStatusCard mounts in `examples/rivu-react-demo`
- [ ] 3.2 Update demo mock server to process ConfirmCard actions and emit `STATE_DELTA` updates (optionally emit tool-call events as illustrative output)
- [ ] 3.3 Add a docs page describing the two cards, eventName set, and backend responsibilities (auth/audit/tool execution)
- [ ] 3.4 Run repo typecheck/build and ensure the new cards render + round-trip in the demo

