import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyPatch } from 'fast-json-patch';
import { expect, test } from 'vitest';

type ReduceEnvelope = { seq: number; event: { type: string; [k: string]: unknown } };
type ReduceGap = { expectedSeq: number; gotSeq: number };
type ReduceStatus = 'ok' | 'gap' | 'patch_error';

type ReduceResult = {
  status: ReduceStatus;
  lastSeq: number;
  needsResync: boolean;
  sharedState: Record<string, unknown>;
  gap?: ReduceGap;
};

type VectorsV1 = {
  version: number;
  reduce: Array<{ id: string; envelopes: ReduceEnvelope[]; expect: ReduceResult }>;
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function loadVectors(): VectorsV1 {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(dirname, '..', '..', '..', 'spec', 'vectors', 'ui-v1.v1.json');
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as VectorsV1;
}

function reduceEnvelopes(envelopes: ReduceEnvelope[]): ReduceResult {
  let lastSeq = 0;
  let sharedState: Record<string, unknown> = {};

  for (const envelope of envelopes) {
    const { seq, event } = envelope;

    if (seq <= lastSeq) continue;
    if (seq > lastSeq + 1) {
      return {
        status: 'gap',
        lastSeq,
        needsResync: true,
        gap: { expectedSeq: lastSeq + 1, gotSeq: seq },
        sharedState,
      };
    }

    if (event.type === 'STATE_SNAPSHOT') {
      const snapshot = (event as any).snapshot as unknown;
      if (!isJsonObject(snapshot)) {
        return { status: 'patch_error', lastSeq, needsResync: true, sharedState };
      }
      sharedState = structuredClone(snapshot);
      lastSeq = seq;
      continue;
    }

    if (event.type === 'STATE_DELTA') {
      const delta = (event as any).delta as unknown;
      if (!Array.isArray(delta)) {
        return { status: 'patch_error', lastSeq, needsResync: true, sharedState };
      }
      try {
        const result = applyPatch(sharedState, delta as any[], true, false);
        const next = result.newDocument as unknown;
        if (!isJsonObject(next)) {
          return { status: 'patch_error', lastSeq, needsResync: true, sharedState };
        }
        sharedState = next;
        lastSeq = seq;
        continue;
      } catch {
        return { status: 'patch_error', lastSeq, needsResync: true, sharedState };
      }
    }

    lastSeq = seq;
  }

  return { status: 'ok', lastSeq, needsResync: false, sharedState };
}

test('golden vectors: reduce shared state', () => {
  const vectors = loadVectors();

  for (const testcase of vectors.reduce) {
    const actual = reduceEnvelopes(testcase.envelopes);
    expect(actual, testcase.id).toEqual(testcase.expect);
  }
});

