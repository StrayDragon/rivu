import { expect, test } from 'vitest';

import { createKernel } from 'rivu-kernel';

import { protocolInspectorStore } from '../src/index.js';

test('protocolInspectorStore subscribers receive updates after dispatch', () => {
  const kernel = createKernel();
  const store = protocolInspectorStore(kernel);

  const seen: number[] = [];
  const unsubscribe = store.subscribe((snap) => seen.push(snap.lastSeq));

  kernel.dispatch({ seq: 1, event: { type: 'STATE_SNAPSHOT', snapshot: { ui: { v: 1, components: {} } } } });

  unsubscribe();

  expect(seen[0]).toBe(0);
  expect(seen).toContain(1);
});

