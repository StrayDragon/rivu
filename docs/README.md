# Docs Index

Start here (for most users):

- `docs/examples.md` — interactive examples gallery (what to click + code map)
- `docs/integration-quickstart.md` — canonical SSE/WS → `{seq,event}` → kernel → `sharedState.ui` baseline
- `docs/integration.md` — adoption ladder + kernel/registry + lifecycle + component catalog
- `docs/thread-ui-kit.md` — optional Layer 2: ThreadView + ToolCards (messages, tool cards, mounts, run status)
- `docs/workflow-cards.md` — workflow primitives: `ConfirmCard` + `TaskStatusCard` (server-authoritative)
- `docs/workflow-multi-step-wizard.md` — `MultiStepWizard@1` contract + server-authoritative processing guidance
- `docs/workflow-file-upload-card.md` — `FileUploadCard@1` upload boundary + security + audit guidance
- `docs/agent-skills.md` — optional: agent skills bundle for integrators/maintainers

For contributors (requirements + planned work):

- `openspec/specs/` — authoritative requirements
- `openspec/changes/README.md` — active changes + PRD migration index

Core concepts:

- `docs/design-system.md` — theme tokens (`--rivu-*`) + slots / render hooks (blend into your design system)
- `docs/a2ui-bridge.md` — `a2ui.v1` (agent-to-UI) → server-compiled safe `/ui/...` patches

Server-side operations:

- `docs/event-compaction.md` — flush/merge/snapshot tuning for high-frequency streams
- `docs/export-review.md` — snapshot/export/review baseline + restoring `sharedState.ui`

Export pipeline:

- `docs/viewer-export.md` — HTML/SVG/PDF export guidance (deterministic + offline)
- `docs/viewer-export.md` pairs with `packages/rivu-react/src/viewer-export.tsx`
- `docs/viewer-pivot-heatmap.md` — PivotTable/Heatmap props + datasets guidance
- `docs/viewer-diff-view.md` — DiffView usage + payload sizing guidance

Integrations (adapters):

- `docs/integration-zirvox.md` — Zirvox WS delta/final/abort → AG-UI + `seq`
- `docs/integration-crystalith.md` — Crystalith SSE chunk/done/error → AG-UI SSE
