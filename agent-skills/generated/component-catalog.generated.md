# Component Catalog (generated)

This file is generated from Rivu source exports (React UI kit). Do not edit by hand.

## Viewer (stateless / replayable)

- `BarChart` (schemaVersion: `1`) — source: `packages/rivu-react/src/ui-kit/viewer.tsx`
- `Chart` (schemaVersion: `1`) — source: `packages/rivu-react/src/ui-kit/chart.tsx`
- `CitationList` (schemaVersion: `1`) — source: `packages/rivu-react/src/ui-kit/viewer.tsx`
- `DataTable` (schemaVersion: `1`) — source: `packages/rivu-react/src/ui-kit/viewer.tsx`
- `LineChart` (schemaVersion: `1`) — source: `packages/rivu-react/src/ui-kit/viewer.tsx`
- `MetricCard` (schemaVersion: `1`) — source: `packages/rivu-react/src/ui-kit/viewer.tsx`
- `ReportSection` (schemaVersion: `1`) — source: `packages/rivu-react/src/ui-kit/viewer.tsx`

## Workflow (stateful / round-trip)

- `ApprovalCard` (schemaVersion: `1`) — source: `packages/rivu-react/src/ui-kit/workflow.tsx`
- `FormCard` (schemaVersion: `1`) — source: `packages/rivu-react/src/ui-kit/workflow.tsx`

## Notes

- Prefer `Chart` for new integrations (compact data: `columns + rows`).
- Workflow components require server-authoritative updates (`ui.v1.event` → `STATE_DELTA`).
