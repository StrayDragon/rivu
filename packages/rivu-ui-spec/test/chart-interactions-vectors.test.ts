import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { chartSetSelectionPayloadV1Schema, uiDatasetV1Schema } from '../src/index.js';

type VectorsV1 = {
  version: number;
  chartInteractionsV1: {
    valid: Array<{ id: string; eventName: string; payload: unknown; dataset: unknown }>;
    invalid: Array<{ id: string; eventName: string; payload: unknown; dataset: unknown }>;
  };
};

function loadVectors(): VectorsV1 {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(dirname, '..', '..', '..', 'spec', 'vectors', 'chart-interactions.v1.json');
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as VectorsV1;
}

function validateCase(input: { eventName: string; payload: unknown; dataset: unknown }): boolean {
  const datasetParsed = uiDatasetV1Schema.safeParse(input.dataset);
  if (!datasetParsed.success) return false;

  if (input.eventName === 'chart.clearSelection') {
    return !!input.payload && typeof input.payload === 'object' && !Array.isArray(input.payload);
  }

  if (input.eventName !== 'chart.setSelection') return false;

  const payloadParsed = chartSetSelectionPayloadV1Schema.safeParse(input.payload);
  if (!payloadParsed.success) return false;

  const selection = payloadParsed.data.selection;
  if (selection.kind === 'point') {
    return selection.rowIndex >= 0 && selection.rowIndex < datasetParsed.data.rows.length;
  }

  return true;
}

test('golden vectors: chart interactions payload validation', () => {
  const vectors = loadVectors();
  expect(vectors.version).toBe(1);

  for (const item of vectors.chartInteractionsV1.valid) {
    expect(validateCase(item), item.id).toBe(true);
  }

  for (const item of vectors.chartInteractionsV1.invalid) {
    expect(validateCase(item), item.id).toBe(false);
  }
});

