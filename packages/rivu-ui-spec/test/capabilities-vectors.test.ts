import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { uiV1CapabilitiesCustomEventSchema } from '../src/index.js';

type CapabilityVectorsV1 = {
  version: number;
  uiV1Capabilities: { valid: unknown[]; invalid: unknown[] };
};

function loadVectors(): CapabilityVectorsV1 {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(dirname, '..', '..', '..', 'spec', 'vectors', 'ui-v1-capabilities.v1.json');
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as CapabilityVectorsV1;
}

test('golden vectors: ui.v1.capabilities valid/invalid', () => {
  const vectors = loadVectors();

  for (const [index, input] of vectors.uiV1Capabilities.valid.entries()) {
    const result = uiV1CapabilitiesCustomEventSchema.safeParse(input);
    expect(result.success, `valid uiV1Capabilities[${index}] should parse`).toBe(true);
  }

  for (const [index, input] of vectors.uiV1Capabilities.invalid.entries()) {
    const result = uiV1CapabilitiesCustomEventSchema.safeParse(input);
    expect(result.success, `invalid uiV1Capabilities[${index}] should fail`).toBe(false);
  }
});

