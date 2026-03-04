import { expect, test } from 'vitest';

import { decodeSseMessageToEnvelope, decodeWsMessageToEnvelope } from '../src/index.js';

test('decodeSseMessageToEnvelope: parses id + JSON event', () => {
  const r = decodeSseMessageToEnvelope({
    id: '42',
    data: JSON.stringify({ type: 'TEXT_MESSAGE_CHUNK', messageId: 'm1', role: 'assistant', delta: 'hi' }),
  });
  expect(r).toEqual({
    ok: true,
    envelope: {
      seq: 42,
      event: { type: 'TEXT_MESSAGE_CHUNK', messageId: 'm1', role: 'assistant', delta: 'hi' },
    },
  });
});

test('decodeSseMessageToEnvelope: rejects invalid id', () => {
  const r = decodeSseMessageToEnvelope({ id: 'nope', data: '{}' });
  expect(r.ok).toBe(false);
});

test('decodeWsMessageToEnvelope: parses object message', () => {
  const r = decodeWsMessageToEnvelope({ seq: 7, event: { type: 'STATE_SNAPSHOT', snapshot: {} } });
  expect(r).toEqual({
    ok: true,
    envelope: { seq: 7, event: { type: 'STATE_SNAPSHOT', snapshot: {} } },
  });
});

test('decodeWsMessageToEnvelope: parses JSON string message', () => {
  const r = decodeWsMessageToEnvelope(JSON.stringify({ seq: 8, event: { type: 'TEXT_MESSAGE_END', messageId: 'm1' } }));
  expect(r).toEqual({
    ok: true,
    envelope: { seq: 8, event: { type: 'TEXT_MESSAGE_END', messageId: 'm1' } },
  });
});

