# UI Datasets (v1)

## Why

In viewer-style reports, tables and charts often reuse the same underlying data. If each component inlines its own copy inside `sharedState.ui.components[*].props`, you pay for it with:

- duplicated tokens in LLM output and transport
- larger `STATE_DELTA` patches (write amplification)
- drift risk (multiple copies of “the same data” becoming inconsistent)

UI datasets solve this by storing the data **once** and letting multiple components reference it.

## Data model

Datasets live under `sharedState.ui.datasets`:

```json
{
  "ui": {
    "v": 1,
    "datasets": {
      "ds_1": {
        "columns": ["label", "value"],
        "rows": [["Search", 34200], ["Email", 9400]]
      }
    },
    "components": { }
  }
}
```

- `datasetId` is the map key (non-empty string).
- Dataset shape is columnar: `columns: string[]` + `rows: (string|number|null)[][]`.
- Each row must have the same width as `columns.length`.

## Referencing data via `dataRef`

Components MAY reference a dataset with:

```json
{ "dataRef": { "datasetId": "ds_1" } }
```

When `dataRef` is present, the renderer prefers the referenced dataset.
Missing or invalid references must degrade viewer-safely (no crashes).

## Limits

Datasets are part of `sharedState.ui`, so they should be bounded by the same limits/policy framework:

- `uiState.maxDatasets`
- `uiState.maxDatasetRows`
- `uiState.maxDatasetColumns`

Use the defaults (`viewerDefaults` / `workflowDefaults`) as a baseline, and tune per product needs.

## Replay / export

Because `datasets` are stored in shared state:

- `STATE_SNAPSHOT` replays datasets deterministically.
- `STATE_DELTA` updates datasets via JSON Patch paths under `/ui/datasets/...`.
- export pipelines can keep the full “component ↔ dataset” linkage intact.

