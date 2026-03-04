import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyPatch } from 'fast-json-patch';
import { expect, test } from 'vitest';

type Envelope = { seq: number; event: { type: string; [k: string]: unknown } };

type DerivedMessage = { id: string; role: string; content: string };
type DerivedToolCall = { id: string; name: string; parentMessageId: string | null; args: string };

type DerivedState = {
  sharedState: Record<string, unknown>;
  messages: DerivedMessage[];
  toolCalls: DerivedToolCall[];
};

type VectorsV1 = {
  version: number;
  eventCompaction: Array<{
    id: string;
    config: {
      flushIntervalMs: number;
      maxBufferedEvents: number;
      maxBufferedBytes: number;
      maxReplayEvents: number;
    };
    input: { envelopes: Envelope[] };
    expect: { envelopes: Envelope[]; derived: DerivedState };
  }>;
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function loadVectors(): VectorsV1 {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(dirname, '..', '..', '..', 'spec', 'vectors', 'event-compaction.v1.json');
  const raw = readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as VectorsV1;
}

function reduceForCompaction(envelopes: Envelope[]): DerivedState {
  const sorted = [...envelopes].sort((a, b) => a.seq - b.seq);

  let lastSeq = 0;
  let sharedState: Record<string, unknown> = {};
  const messagesById: Record<string, DerivedMessage> = {};
  const toolCallsById: Record<string, DerivedToolCall> = {};

  for (const env of sorted) {
    if (!Number.isFinite(env.seq)) continue;
    if (env.seq <= lastSeq) continue;
    lastSeq = env.seq;

    const event = env.event ?? ({ type: '' } as any);
    const eventType = String((event as any).type ?? '');

    if (eventType === 'STATE_SNAPSHOT') {
      const snapshot = (event as any).snapshot as unknown;
      if (!isJsonObject(snapshot)) throw new Error('STATE_SNAPSHOT.snapshot must be an object');
      sharedState = structuredClone(snapshot);
      continue;
    }

    if (eventType === 'STATE_DELTA') {
      const delta = (event as any).delta as unknown;
      if (!Array.isArray(delta)) throw new Error('STATE_DELTA.delta must be an array');
      const result = applyPatch(sharedState, delta as any[], true, false);
      const next = result.newDocument as unknown;
      if (!isJsonObject(next)) throw new Error('patch result must be an object');
      sharedState = next;
      continue;
    }

    if (eventType === 'TEXT_MESSAGE_CHUNK') {
      const messageId = (event as any).messageId as unknown;
      if (typeof messageId !== 'string' || !messageId.trim()) continue;
      const delta = typeof (event as any).delta === 'string' ? String((event as any).delta) : '';
      const role = typeof (event as any).role === 'string' ? String((event as any).role) : 'assistant';
      const prev = messagesById[messageId] ?? { id: messageId, role, content: '' };
      messagesById[messageId] = { ...prev, content: `${prev.content}${delta}` };
      continue;
    }

    if (eventType === 'TOOL_CALL_CHUNK') {
      const toolCallId = (event as any).toolCallId as unknown;
      if (typeof toolCallId !== 'string' || !toolCallId.trim()) continue;
      const delta = typeof (event as any).delta === 'string' ? String((event as any).delta) : '';
      const name = typeof (event as any).toolCallName === 'string' ? String((event as any).toolCallName) : '';
      const parentMessageId = typeof (event as any).parentMessageId === 'string' ? String((event as any).parentMessageId) : null;
      const prev =
        toolCallsById[toolCallId] ?? ({ id: toolCallId, name, parentMessageId, args: '' } satisfies DerivedToolCall);
      toolCallsById[toolCallId] = {
        ...prev,
        name: prev.name || name,
        parentMessageId: prev.parentMessageId ?? parentMessageId,
        args: `${prev.args}${delta}`,
      };
      continue;
    }
  }

  const messages = Object.values(messagesById).sort((a, b) => a.id.localeCompare(b.id));
  const toolCalls = Object.values(toolCallsById).sort((a, b) => a.id.localeCompare(b.id));
  return { sharedState, messages, toolCalls };
}

test('golden vectors: event compaction reduce equivalence', () => {
  const vectors = loadVectors();
  expect(vectors.version).toBe(1);

  for (const testcase of vectors.eventCompaction) {
    const reducedInput = reduceForCompaction(testcase.input.envelopes);
    const reducedCompacted = reduceForCompaction(testcase.expect.envelopes);

    expect(reducedInput, `${testcase.id}: reduce(input)`).toEqual(testcase.expect.derived);
    expect(reducedCompacted, `${testcase.id}: reduce(compacted)`).toEqual(testcase.expect.derived);
  }
});

