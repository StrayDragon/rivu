# viewer-pivot-heatmap Specification

## Purpose
TBD - created by archiving change viewer-pivottable-heatmap-v1. Update Purpose after archive.
## Requirements
### Requirement: Viewer ships `PivotTable@1` and `Heatmap@1` as stateless components

The UI kit MUST ship two Viewer-only, stateless components:
- `PivotTable` (`schemaVersion = 1`)
- `Heatmap` (`schemaVersion = 1`)

They MUST render deterministically from `sharedState.ui.components[componentId].props` and referenced datasets, and MUST NOT perform network requests.

#### Scenario: Same snapshot renders deterministically
- **WHEN** the same `STATE_SNAPSHOT` is rendered twice
- **THEN** `PivotTable` and `Heatmap` produce stable output (content/layout semantics are consistent)

### Requirement: Components support datasets via `dataRef` and degrade safely

`PivotTable@1` and `Heatmap@1` props MUST allow referencing datasets via `dataRef.datasetId`.

When a referenced dataset is missing or invalid, components MUST degrade in a viewer-safe way (readable diagnostic + no crash).

#### Scenario: Missing dataset degrades without crashing
- **WHEN** `dataRef.datasetId` references a non-existent dataset
- **THEN** the component renders a viewer-safe fallback and the page remains usable

### Requirement: PivotTable aggregation is strictly validated

`PivotTable@1` props MUST include:
- `rows: string[]` (min 1)
- `columns: string` (non-empty)
- `value: string` (non-empty)
- `agg: "sum"|"count"|"avg"|"min"|"max"`

All referenced columns MUST exist in the input dataset (from `dataRef` or inline `data`). Invalid references MUST be rejected by schema validation or render-time checks and MUST degrade safely.

#### Scenario: Invalid column reference is rejected
- **WHEN** `rows` includes a column name not present in `dataset.columns`
- **THEN** validation fails (or render degrades with a viewer-safe error) and the app does not crash

### Requirement: Heatmap uses explicit encoding (x/y/value)

`Heatmap@1` props MUST include:
- `encoding.x`: non-empty string (column name)
- `encoding.y`: non-empty string (column name)
- `encoding.value`: non-empty string (column name)

The `value` column MUST be interpreted as numeric (number or null). Non-numeric values MUST be rejected or degraded safely.

#### Scenario: Heatmap rejects non-numeric values
- **WHEN** the referenced `encoding.value` column contains a non-numeric value
- **THEN** the component does not crash and renders a viewer-safe error/fallback

### Requirement: Exports render PivotTable and Heatmap deterministically

The export pipeline (HTML) MUST be able to render `PivotTable@1` and `Heatmap@1` from a structured JSON snapshot without external network requests.

#### Scenario: HTML export includes heatmap output
- **WHEN** a snapshot includes a mounted `Heatmap@1`
- **THEN** HTML export succeeds and includes a deterministic representation of the heatmap

