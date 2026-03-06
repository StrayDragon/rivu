import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { fileUploadCardEventPayloadV1Schema, fileUploadCardPropsV1Schema, fileUploadCardStateV1Schema } from '../src/index.js';

type PropsCase = { id: string; props: unknown };
type StateCase = { id: string; state: unknown };
type EventCase = { id: string; event: unknown };

type VectorsV1 = {
  version: number;
  fileUploadCardPropsV1: { valid: PropsCase[]; invalid: PropsCase[] };
  fileUploadCardStateV1: { valid: StateCase[]; invalid: StateCase[] };
  fileUploadCardEventPayloadV1: { valid: EventCase[]; invalid: EventCase[] };
};

function loadVectors(): VectorsV1 {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(dirname, '..', '..', '..', 'spec', 'vectors', 'workflow-file-upload-card.v1.json');
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as VectorsV1;
}

test('golden vectors: FileUploadCard props valid/invalid', () => {
  const vectors = loadVectors();
  expect(vectors.version).toBe(1);

  for (const item of vectors.fileUploadCardPropsV1.valid) {
    const result = fileUploadCardPropsV1Schema.safeParse(item.props);
    expect(result.success, item.id).toBe(true);
  }

  for (const item of vectors.fileUploadCardPropsV1.invalid) {
    const result = fileUploadCardPropsV1Schema.safeParse(item.props);
    expect(result.success, item.id).toBe(false);
  }
});

test('golden vectors: FileUploadCard state valid/invalid', () => {
  const vectors = loadVectors();
  expect(vectors.version).toBe(1);

  for (const item of vectors.fileUploadCardStateV1.valid) {
    const result = fileUploadCardStateV1Schema.safeParse(item.state);
    expect(result.success, item.id).toBe(true);
  }

  for (const item of vectors.fileUploadCardStateV1.invalid) {
    const result = fileUploadCardStateV1Schema.safeParse(item.state);
    expect(result.success, item.id).toBe(false);
  }
});

test('golden vectors: FileUploadCard ui.v1.event payloads valid/invalid', () => {
  const vectors = loadVectors();
  expect(vectors.version).toBe(1);

  for (const item of vectors.fileUploadCardEventPayloadV1.valid) {
    const result = fileUploadCardEventPayloadV1Schema.safeParse(item.event);
    expect(result.success, item.id).toBe(true);
  }

  for (const item of vectors.fileUploadCardEventPayloadV1.invalid) {
    const result = fileUploadCardEventPayloadV1Schema.safeParse(item.event);
    expect(result.success, item.id).toBe(false);
  }
});

