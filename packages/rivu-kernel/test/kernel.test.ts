import { expect, test, vi } from 'vitest';

import { createKernel } from '../src/index.js';

test('dispatch: seq duplicate and gap', () => {
  const kernel = createKernel();

  const r1 = kernel.dispatch({ seq: 1, event: { type: 'STATE_SNAPSHOT', snapshot: {} } });
  expect(r1).toEqual({ status: 'applied', seq: 1 });
  expect(kernel.getState().lastSeq).toBe(1);

  const rDup = kernel.dispatch({ seq: 1, event: { type: 'STATE_SNAPSHOT', snapshot: {} } });
  expect(rDup).toEqual({ status: 'duplicate', seq: 1 });
  expect(kernel.getState().lastSeq).toBe(1);

  const rGap = kernel.dispatch({ seq: 3, event: { type: 'STATE_SNAPSHOT', snapshot: {} } });
  expect(rGap).toEqual({ status: 'gap', expectedSeq: 2, gotSeq: 3 });
  expect(kernel.getState().lastSeq).toBe(1);
  expect(kernel.getState().needsResync).toBe(true);
  expect(kernel.getState().resyncReason).toBe('gap');
  expect(kernel.getState().gap).toEqual({ expectedSeq: 2, gotSeq: 3 });
});

test('dispatch: patch error triggers resync without advancing lastSeq', () => {
  const kernel = createKernel();

  kernel.dispatch({
    seq: 1,
    event: { type: 'STATE_SNAPSHOT', snapshot: { ui: { v: 1, components: {} } } },
  });
  expect(kernel.getState().lastSeq).toBe(1);

  const r2 = kernel.dispatch({
    seq: 2,
    event: {
      type: 'STATE_DELTA',
      delta: [{ op: 'replace', path: '/ui/components/missing', value: 1 }],
    },
  });
  expect(r2).toEqual({ status: 'needs_resync', reason: 'patch_error' });
  expect(kernel.getState().lastSeq).toBe(1);
  expect(kernel.getState().needsResync).toBe(true);
  expect(kernel.getState().resyncReason).toBe('patch_error');
  expect(kernel.getState().gap).toBe(null);
});

test('dispatch: limit_exceeded rejects STATE_DELTA without advancing lastSeq', () => {
  const kernel = createKernel({
    limits: { jsonPatch: { maxOps: 1 } } as any,
  });

  kernel.dispatch({
    seq: 1,
    event: { type: 'STATE_SNAPSHOT', snapshot: { ui: { v: 1, components: {} } } },
  });

  const before = kernel.getState().sharedState;
  const r2 = kernel.dispatch({
    seq: 2,
    event: {
      type: 'STATE_DELTA',
      delta: [
        { op: 'replace', path: '/ui/v', value: 1 },
        { op: 'replace', path: '/ui/v', value: 1 },
      ],
    },
  });

  expect(r2).toEqual({ status: 'needs_resync', reason: 'limit_exceeded' });
  expect(kernel.getState().lastSeq).toBe(1);
  expect(kernel.getState().needsResync).toBe(true);
  expect(kernel.getState().resyncReason).toBe('limit_exceeded');
  expect(kernel.getState().limitExceeded).toEqual({ limit: 'jsonPatch.maxOps', max: 1, observed: 2 });
  expect(kernel.getState().sharedState).toEqual(before);
});

test('dispatch: limit_exceeded rejects STATE_DELTA with disallowed path prefixes', () => {
  const kernel = createKernel({
    limits: { jsonPatch: { allowedPathPrefixes: ['/ui'] } } as any,
  });

  kernel.dispatch({
    seq: 1,
    event: { type: 'STATE_SNAPSHOT', snapshot: { ui: { v: 1, components: {} } } },
  });

  const r2 = kernel.dispatch({
    seq: 2,
    event: {
      type: 'STATE_DELTA',
      delta: [{ op: 'add', path: '/messages/0/content', value: 'nope' }],
    },
  });

  expect(r2).toEqual({ status: 'needs_resync', reason: 'limit_exceeded' });
  expect(kernel.getState().lastSeq).toBe(1);
  expect(kernel.getState().resyncReason).toBe('limit_exceeded');
  expect(kernel.getState().limitExceeded).toEqual({
    limit: 'jsonPatch.allowedPathPrefixes',
    max: 0,
    observed: 1,
    path: '/messages/0/content',
  });
});

test('dispatch: limit_exceeded rejects STATE_SNAPSHOT when uiState.maxComponents exceeded', () => {
  const kernel = createKernel({
    limits: { uiState: { maxComponents: 1 } } as any,
  });

  const r1 = kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_1: { type: 'MetricCard', schemaVersion: 1, props: {}, revision: 0, mounts: [] },
            cmp_2: { type: 'MetricCard', schemaVersion: 1, props: {}, revision: 0, mounts: [] },
          },
        },
      },
    },
  });

  expect(r1).toEqual({ status: 'needs_resync', reason: 'limit_exceeded' });
  expect(kernel.getState().lastSeq).toBe(0);
  expect(kernel.getState().sharedState).toEqual({});
  expect(kernel.getState().needsResync).toBe(true);
  expect(kernel.getState().resyncReason).toBe('limit_exceeded');
  expect(kernel.getState().limitExceeded).toEqual({ limit: 'uiState.maxComponents', max: 1, observed: 2 });
});

test('dispatch: unknown custom event name is rejected by default', () => {
  const kernel = createKernel();

  const r1 = kernel.dispatch({
    seq: 1,
    event: { type: 'CUSTOM', name: 'ui.v1.unknown', value: {} },
  });
  expect(r1.status).toBe('invalid');
  expect(kernel.getState().lastSeq).toBe(0);
});

test('send: deduplicates by clientRequestId and updates outbox status', async () => {
  const transport = vi.fn(async () => {});
  const kernel = createKernel({ actionTransport: transport });

  const action = {
    type: 'CUSTOM',
    name: 'ui.v1.event',
    value: {
      componentId: 'cmp_1',
      eventName: 'submit',
      payload: {},
      clientRequestId: 'req_1',
      baseRevision: 0,
    },
  } as const;

  const p1 = kernel.send(action);
  const p2 = kernel.send(action);
  expect(transport).toHaveBeenCalledTimes(1);

  const r1 = await p1;
  const r2 = await p2;
  expect(r1).toEqual({ status: 'sent', clientRequestId: 'req_1' });
  expect(r2).toEqual({ status: 'sent', clientRequestId: 'req_1' });

  expect(kernel.getState().outbox.req_1?.status).toBe('acked');

  const r3 = await kernel.send(action);
  expect(r3).toEqual({ status: 'duplicate', clientRequestId: 'req_1' });
});
