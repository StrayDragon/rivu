# Examples (Interactive Gallery)

The primary runnable example in this repo is `examples/rivu-react-demo` (Vite + React). It’s a **categorized, interactive UI gallery** that demonstrates recent Rivu features end-to-end:

- Viewer vs Workflow components
- `sharedState.ui` mounts (`inline` / `sidebar`)
- `ui.v1.capabilities` handshake
- datasets (`sharedState.ui.datasets`) + `dataRef`
- chart interactions (`chart.setSelection` / `chart.clearSelection`)
- lifecycle (`building` → streaming patches → `ready`), plus `error` / UnknownComponent fallbacks
- viewer export (JSON snapshot → HTML + chart SVG)
- event compaction (server-side simulation)

Additional “host UI skin” demos (showing low-intrusion blending into popular UI systems):

- `examples/rivu-react-mui-demo` — Material UI (MUI) shell + `--rivu-*` token bridge
- `examples/rivu-react-shadcn-demo` — Tailwind + shadcn-style CSS variables + `--rivu-*` mapping

## Run

From repo root:

```bash
pnpm install
pnpm -C examples/rivu-react-demo dev
```

For the skin demos:

```bash
pnpm -C examples/rivu-react-mui-demo dev
pnpm -C examples/rivu-react-shadcn-demo dev
```

## Gallery sections (what to look at)

- **Overview**: kernel + UI state summary, and a `ui.v1.capabilities` payload you can re-send.
- **Viewer**: stateless, replayable cards (`MetricCard`, `DataTable`, `Chart`, etc.).
- **Workflow**: `ApprovalCard` / `FormCard` / interactive `Chart` and the server-authoritative loop.
- **Datasets**: mutate `ds_revenue_by_channel` via `STATE_DELTA` and watch `DataTable`/`BarChart` update.
- **Charts**: compare viewer chart (non-interactive) vs workflow chart (interactive selection state).
- **Lifecycle**: skeleton (`building`) → `ready` streaming; also `error` + unknown type fallbacks.
- **Export**: generate `rivu.export.v1` snapshot; derive HTML + chart SVGs.
- **Compaction**: merge streaming chunks + snapshot insertion; observe replay vs snapshot fallback behavior.
- **Chat Layout**: the mounts-based embedding pattern (inline content + sidebar mounts).

## Code map

- `examples/rivu-react-demo/src/App.tsx` — the gallery UI + per-section helpers.
- `examples/rivu-react-demo/src/demo-fixtures.ts` — initial `sharedState.ui` + bootstrap envelopes.
- `examples/rivu-react-demo/src/mock-server.ts` — in-browser “server” enforcing idempotency/revision + emitting `STATE_DELTA`.

## Related guides

- `docs/integration-quickstart.md` — SSE/WS envelopes + `resumeFrom`.
- `docs/integration.md` — kernel/registry usage, lifecycle, and component catalog.
- `docs/viewer-export.md` — export formats and PDF guidance.
- `docs/event-compaction.md` — server-side compaction strategy.
- `docs/design-system.md` — theme tokens + slots.
- `docs/a2ui-bridge.md` — server-side A2UI (`a2ui.v1`) → safe `/ui/...` patch compilation.
