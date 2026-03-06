import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { multiStepWizardPropsV1Schema, multiStepWizardStateV1Schema, wizardEventPayloadV1Schema } from '../src/index.js';

type PropsCase = { id: string; props: unknown };
type StateCase = { id: string; state: unknown };
type EventCase = { id: string; event: unknown };

type VectorsV1 = {
  version: number;
  multiStepWizardPropsV1: { valid: PropsCase[]; invalid: PropsCase[] };
  multiStepWizardStateV1: { valid: StateCase[]; invalid: StateCase[] };
  wizardEventPayloadV1: { valid: EventCase[]; invalid: EventCase[] };
};

function loadVectors(): VectorsV1 {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(dirname, '..', '..', '..', 'spec', 'vectors', 'workflow-wizard.v1.json');
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as VectorsV1;
}

test('golden vectors: MultiStepWizard props valid/invalid', () => {
  const vectors = loadVectors();
  expect(vectors.version).toBe(1);

  for (const item of vectors.multiStepWizardPropsV1.valid) {
    const result = multiStepWizardPropsV1Schema.safeParse(item.props);
    expect(result.success, item.id).toBe(true);
  }

  for (const item of vectors.multiStepWizardPropsV1.invalid) {
    const result = multiStepWizardPropsV1Schema.safeParse(item.props);
    expect(result.success, item.id).toBe(false);
  }
});

test('golden vectors: MultiStepWizard state valid/invalid', () => {
  const vectors = loadVectors();
  expect(vectors.version).toBe(1);

  for (const item of vectors.multiStepWizardStateV1.valid) {
    const result = multiStepWizardStateV1Schema.safeParse(item.state);
    expect(result.success, item.id).toBe(true);
  }

  for (const item of vectors.multiStepWizardStateV1.invalid) {
    const result = multiStepWizardStateV1Schema.safeParse(item.state);
    expect(result.success, item.id).toBe(false);
  }
});

test('golden vectors: wizard ui.v1.event payloads valid/invalid', () => {
  const vectors = loadVectors();
  expect(vectors.version).toBe(1);

  for (const item of vectors.wizardEventPayloadV1.valid) {
    const result = wizardEventPayloadV1Schema.safeParse(item.event);
    expect(result.success, item.id).toBe(true);
  }

  for (const item of vectors.wizardEventPayloadV1.invalid) {
    const result = wizardEventPayloadV1Schema.safeParse(item.event);
    expect(result.success, item.id).toBe(false);
  }
});

