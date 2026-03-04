import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { uiDataRefV1Schema, uiDatasetV1Schema, uiStateV1Schema, uiV1CustomEventSchema } from '../src/index.js';

type VectorsV1 = {
  version: number;
  uiV1Event: { valid: unknown[]; invalid: unknown[] };
  uiStateV1: { valid: unknown[]; invalid: unknown[] };
  uiDatasetV1: { valid: unknown[]; invalid: unknown[] };
  uiDataRefV1: { valid: unknown[]; invalid: unknown[] };
};

function loadVectors(): VectorsV1 {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(dirname, '..', '..', '..', 'spec', 'vectors', 'ui-v1.v1.json');
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as VectorsV1;
}

test('golden vectors: ui.v1.event valid/invalid', () => {
  const vectors = loadVectors();

  for (const [index, input] of vectors.uiV1Event.valid.entries()) {
    const result = uiV1CustomEventSchema.safeParse(input);
    expect(result.success, `valid uiV1Event[${index}] should parse`).toBe(true);
  }

  for (const [index, input] of vectors.uiV1Event.invalid.entries()) {
    const result = uiV1CustomEventSchema.safeParse(input);
    expect(result.success, `invalid uiV1Event[${index}] should fail`).toBe(false);
  }
});

test('golden vectors: state.ui v1 valid/invalid', () => {
  const vectors = loadVectors();

  for (const [index, input] of vectors.uiStateV1.valid.entries()) {
    const result = uiStateV1Schema.safeParse(input);
    expect(result.success, `valid uiStateV1[${index}] should parse`).toBe(true);
  }

  for (const [index, input] of vectors.uiStateV1.invalid.entries()) {
    const result = uiStateV1Schema.safeParse(input);
    expect(result.success, `invalid uiStateV1[${index}] should fail`).toBe(false);
  }
});

test('golden vectors: ui.dataset v1 valid/invalid', () => {
  const vectors = loadVectors();

  for (const [index, input] of vectors.uiDatasetV1.valid.entries()) {
    const result = uiDatasetV1Schema.safeParse(input);
    expect(result.success, `valid uiDatasetV1[${index}] should parse`).toBe(true);
  }

  for (const [index, input] of vectors.uiDatasetV1.invalid.entries()) {
    const result = uiDatasetV1Schema.safeParse(input);
    expect(result.success, `invalid uiDatasetV1[${index}] should fail`).toBe(false);
  }
});

test('golden vectors: ui.dataRef v1 valid/invalid', () => {
  const vectors = loadVectors();

  for (const [index, input] of vectors.uiDataRefV1.valid.entries()) {
    const result = uiDataRefV1Schema.safeParse(input);
    expect(result.success, `valid uiDataRefV1[${index}] should parse`).toBe(true);
  }

  for (const [index, input] of vectors.uiDataRefV1.invalid.entries()) {
    const result = uiDataRefV1Schema.safeParse(input);
    expect(result.success, `invalid uiDataRefV1[${index}] should fail`).toBe(false);
  }
});
