# Rivu React Demo (Viewer + Workflow)

This demo is a runnable reference for the **thinnest React integration surface**:

- no required Provider (explicit `kernel` + `registry` props)
- mounts-based embedding (`slot: "inline" | "sidebar"`)
- workflow round-trip via `CUSTOM(name="ui.v1.event")` → server `STATE_DELTA`

## Run

From repo root:

```bash
pnpm install
pnpm -C examples/rivu-react-demo dev
```

## What to look at

- `src/App.tsx` — chat-like layout + `<ComponentRenderer kernel registry />`
- `src/demo-fixtures.ts` — `sharedState.ui` fixture + bootstrap envelopes (seq-ordered)
- `src/mock-server.ts` — in-browser mock server that enforces:
  - idempotency by `clientRequestId`
  - concurrency by `baseRevision == component.revision`
  - server-authoritative component `state` + `revision` updates via `STATE_DELTA`

## Notes

- The mock server runs in the same process as the UI for demo purposes only.
- For real resume/store/snapshot, use the Python/Rust server SDKs (`docs/integration.md`).
