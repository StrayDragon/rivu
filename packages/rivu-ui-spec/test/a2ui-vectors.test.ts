import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { a2uiV1Schema } from '../src/index.js';

type A2uiVectorsV1 = {
  version: number;
  a2uiV1: { valid: unknown[]; invalid: unknown[] };
};

function loadVectors(): A2uiVectorsV1 {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(dirname, '..', '..', '..', 'spec', 'vectors', 'a2ui-v1.v1.json');
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as A2uiVectorsV1;
}

test('golden vectors: a2ui.v1 valid/invalid', () => {
  const vectors = loadVectors();

  for (const [index, input] of vectors.a2uiV1.valid.entries()) {
    const result = a2uiV1Schema.safeParse(input);
    expect(result.success, `valid a2uiV1[${index}] should parse`).toBe(true);
  }

  for (const [index, input] of vectors.a2uiV1.invalid.entries()) {
    const result = a2uiV1Schema.safeParse(input);
    expect(result.success, `invalid a2uiV1[${index}] should fail`).toBe(false);
  }
});

