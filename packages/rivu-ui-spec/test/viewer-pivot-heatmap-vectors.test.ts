import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { heatmapPropsV1Schema, pivotTablePropsV1Schema } from '../src/index.js';

type Case = { id: string; props: unknown };

type VectorsV1 = {
  version: number;
  pivotTablePropsV1: { valid: Case[]; invalid: Case[] };
  heatmapPropsV1: { valid: Case[]; invalid: Case[] };
};

function loadVectors(): VectorsV1 {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(dirname, '..', '..', '..', 'spec', 'vectors', 'viewer-pivot-heatmap.v1.json');
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as VectorsV1;
}

test('golden vectors: PivotTable props valid/invalid', () => {
  const vectors = loadVectors();
  expect(vectors.version).toBe(1);

  for (const item of vectors.pivotTablePropsV1.valid) {
    const result = pivotTablePropsV1Schema.safeParse(item.props);
    expect(result.success, item.id).toBe(true);
  }

  for (const item of vectors.pivotTablePropsV1.invalid) {
    const result = pivotTablePropsV1Schema.safeParse(item.props);
    expect(result.success, item.id).toBe(false);
  }
});

test('golden vectors: Heatmap props valid/invalid', () => {
  const vectors = loadVectors();
  expect(vectors.version).toBe(1);

  for (const item of vectors.heatmapPropsV1.valid) {
    const result = heatmapPropsV1Schema.safeParse(item.props);
    expect(result.success, item.id).toBe(true);
  }

  for (const item of vectors.heatmapPropsV1.invalid) {
    const result = heatmapPropsV1Schema.safeParse(item.props);
    expect(result.success, item.id).toBe(false);
  }
});

