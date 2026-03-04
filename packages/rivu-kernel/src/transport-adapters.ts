import type { RivuEnvelope } from './kernel.js';

export type DecodeEnvelopeResult =
  | { ok: true; envelope: RivuEnvelope }
  | { ok: false; error: Error };

function parsePositiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Decode a single SSE message into a kernel envelope.
 *
 * Recommended mapping:
 * - `id: <seq>`
 * - `data: <JSON.stringify(event)>`
 */
export function decodeSseMessageToEnvelope(params: {
  id: string | null | undefined;
  data: string;
}): DecodeEnvelopeResult {
  const seq = parsePositiveInt(params.id);
  if (seq == null) return { ok: false, error: new Error('SSE id must be a positive integer seq') };

  try {
    const event = JSON.parse(params.data) as unknown;
    return { ok: true, envelope: { seq, event } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error('failed to parse SSE data as JSON') };
  }
}

/**
 * Decode a single WebSocket message into a kernel envelope.
 *
 * Recommended message shape:
 * `{ "seq": 42, "event": { ... } }`
 */
export function decodeWsMessageToEnvelope(message: unknown): DecodeEnvelopeResult {
  let raw: unknown = message;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error : new Error('failed to parse WS message as JSON') };
    }
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: new Error('WS message must be an object') };
  }

  const seq = parsePositiveInt((raw as any).seq);
  if (seq == null) return { ok: false, error: new Error('WS message seq must be a positive integer') };

  return { ok: true, envelope: { seq, event: (raw as any).event } };
}
