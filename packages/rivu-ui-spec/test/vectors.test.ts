import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { uiStateV1Schema, uiV1CustomEventSchema } from '../src/index.js';

type VectorsV1 = {
  version: number;
  uiV1Event: { valid: unknown[]; invalid: unknown[] };
  uiStateV1: { valid: unknown[]; invalid: unknown[] };
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
