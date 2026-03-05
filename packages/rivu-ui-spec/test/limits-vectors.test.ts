import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { checkJsonPatchLimitsV1, checkUiStateLimitsV1, checkUiV1EventLimitsV1 } from '../src/index.js';

type LimitVectorCase = {
  id: string;
  limits: unknown;
  input: unknown;
  expect: { ok: true } | { ok: false; error: unknown };
};

type VectorsV1 = {
  version: number;
  limitsV1: {
    uiEvent: LimitVectorCase[];
    jsonPatch: LimitVectorCase[];
    uiState: LimitVectorCase[];
  };
};

function loadVectors(): VectorsV1 {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(dirname, '..', '..', '..', 'spec', 'vectors', 'ui-v1.v1.json');
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as VectorsV1;
}

test('golden vectors: limits v1 accept/reject', () => {
  const vectors = loadVectors();

  for (const c of vectors.limitsV1.uiEvent) {
    const result = checkUiV1EventLimitsV1({ limits: c.limits as any, input: c.input });
    expect(result.ok, `uiEvent ${c.id}`).toBe(c.expect.ok);
    if (!c.expect.ok) expect(result).toEqual({ ok: false, error: c.expect.error });
  }

  for (const c of vectors.limitsV1.jsonPatch) {
    const result = checkJsonPatchLimitsV1({ limits: c.limits as any, input: c.input });
    expect(result.ok, `jsonPatch ${c.id}`).toBe(c.expect.ok);
    if (!c.expect.ok) expect(result).toEqual({ ok: false, error: c.expect.error });
  }

  for (const c of vectors.limitsV1.uiState) {
    const result = checkUiStateLimitsV1({ limits: c.limits as any, input: c.input });
    expect(result.ok, `uiState ${c.id}`).toBe(c.expect.ok);
    if (!c.expect.ok) expect(result).toEqual({ ok: false, error: c.expect.error });
  }
});

