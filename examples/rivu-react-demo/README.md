# Rivu React Demo (Interactive Examples Gallery)

This demo is a runnable, **categorized interactive UI gallery** for the React adapter + UI kit.

It keeps the integration surface intentionally thin:

- no required Provider (explicit `kernel` + `host` props)
- mounts-based embedding (`slot: "inline" | "sidebar"`)
- workflow round-trip via `CUSTOM(name="ui.v1.event")` → server `STATE_DELTA`

## Run

From repo root:

```bash
pnpm install
pnpm -C examples/rivu-react-demo dev
```

## What to look at

- In-app sections: Viewer / Workflow / Datasets / Charts / Lifecycle / Export / Compaction / Chat Layout.
- `src/App.tsx` — gallery UI + per-section helpers
- `src/demo-fixtures.ts` — `sharedState.ui` fixture + bootstrap envelopes (seq-ordered)
- `src/mock-server.ts` — in-browser mock server that enforces:
  - idempotency by `clientRequestId`
  - concurrency by `baseRevision == component.revision`
  - server-authoritative component `state` + `revision` updates via `STATE_DELTA`
  - dataset mutations via `STATE_DELTA` (demo helper)

## Notes

- The mock server runs in the same process as the UI for demo purposes only.
- For real resume/store/snapshot, use the Python/Rust server SDKs (`docs/integration.md`).
