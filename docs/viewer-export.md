# Viewer Export (HTML / SVG / PDF)

This guide describes a recommended, **deterministic** and **offline** export pipeline for Viewer outputs.

## 1) Input: structured JSON snapshot (`rivu.export.v1`)

Export uses a JSON snapshot as the single source of truth (no event replay required).

Recommended shape (v1):

```json
{
  "schema": "rivu.export.v1",
  "exportedAtMs": 0,
  "lastSeq": 0,
  "sharedState": { "ui": { "v": 1, "components": {} } },
  "messages": [],
  "toolCalls": []
}
```

Notes:
- `sharedState.ui` should validate as `UiStateV1` (from `rivu-ui-spec`).
- `messages/toolCalls` are included for review context. Export HTML can choose how much to render (v1: keep it simple).

See also:
- `docs/export-review.md` (JSON snapshot baseline)

## 2) HTML export (core)

In TS/Node (or in-browser demo), generate a standalone HTML string:

```ts
import { createHost, exportHtmlV1 } from 'rivu-react';

const host = createHost({ registry }); // your registry (viewer/workflow/custom)

const html = exportHtmlV1({
  snapshot,
  host,
});
```

Guarantees (v1):
- deterministic: same snapshot → same HTML
- offline: no external network requests
- graceful downgrade: unknown components become a safe placeholder block (type/version + props summary)

## 3) SVG export (charts)

If the snapshot contains `Chart` components, you can export SVG assets:

```ts
import { exportChartSvgsV1 } from 'rivu-react';

const svgs = exportChartSvgsV1({ snapshot, host });
// { [componentId]: "<svg ...>...</svg>" }
```

You can:
- inline the SVG into HTML (recommended for offline review), or
- download per-chart SVG files for higher quality post-processing.

## 4) PDF export via Playwright / Chromium (optional)

PDF is typically derived from HTML using a headless browser.

Example using Playwright:

```ts
import { chromium } from 'playwright';
import { exportHtmlV1 } from 'rivu-react';

const html = exportHtmlV1({ snapshot, host });

const browser = await chromium.launch();
const page = await browser.newPage();

// IMPORTANT: keep the HTML fully offline (no http(s):// assets).
await page.setContent(html, { waitUntil: 'load' });

await page.pdf({
  path: 'viewer-export.pdf',
  printBackground: true,
  format: 'A4',
});

await browser.close();
```

If you prefer a small wrapper helper (still optional dependency):

```ts
import { exportPdfV1 } from 'rivu-react';

const pdfBytes = await exportPdfV1({
  snapshot,
  host,
  pdfOptions: { format: 'A4' },
});
```

If you cannot (or do not want to) install Playwright in your production runtime:
- generate HTML in your app runtime
- run PDF rendering in a separate worker/job where Chromium is available
