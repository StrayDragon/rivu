# A2UI: Chart generation prompt snippet (v1)

Use this as a **copy/paste prompt fragment** for an agent that needs to output `sharedState.ui` chart components.

## Target component

- `type: "Chart"`
- `schemaVersion: 1`
- Viewer/stateless: render-only, no network requests.

## Props shape (token-efficient)

Always generate:

```json
{
  "mark": "bar|line|pie",
  "data": { "columns": ["..."], "rows": [[...]] },
  "encoding": { "...": "columnName" },
  "options": { "title": "...", "unit": "...", "height": 240 }
}
```

Rules:
- `data.columns` is a non-empty string array.
- `data.rows` is an array of rows; each row length must equal `data.columns.length`.
- Cell types: `string | number | null` (no booleans, no objects).
- `encoding` maps visual channels to **existing** `data.columns` entries.

Required encodings:
- `mark="bar"` or `"line"`: `encoding.x` and `encoding.y`
- `mark="pie"`: `encoding.label` and `encoding.value`

Optional:
- `encoding.series` for multi-series charts (adds a legend).

## Practical guidance

- Prefer short column names (e.g. `["x","y","series"]`) to save tokens.
- Keep rows small (viewer charts are for **summary** data, not raw logs).
- If you need a legend, include a `series` column and set `encoding.series = "series"`.
- Use `options.title` for a human label; keep it short.

## Examples

### Bar (minimal)

```json
{
  "mark": "bar",
  "data": { "columns": ["x", "y"], "rows": [["Search", 34200], ["Email", 9400]] },
  "encoding": { "x": "x", "y": "y" },
  "options": { "title": "Revenue by channel", "unit": "USD" }
}
```

### Line (multi-series)

```json
{
  "mark": "line",
  "data": {
    "columns": ["x", "y", "series"],
    "rows": [["Mon", 210, "p50"], ["Mon", 340, "p90"], ["Tue", 190, "p50"], ["Tue", 310, "p90"]]
  },
  "encoding": { "x": "x", "y": "y", "series": "series" },
  "options": { "title": "Latency", "unit": "ms" }
}
```

### Pie

```json
{
  "mark": "pie",
  "data": { "columns": ["label", "value"], "rows": [["Search", 34200], ["Email", 9400]] },
  "encoding": { "label": "label", "value": "value" },
  "options": { "title": "Revenue share" }
}
```

