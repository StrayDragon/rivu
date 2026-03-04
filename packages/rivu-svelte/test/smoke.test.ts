import { expect, test } from 'vitest';

import { RIVU_SVELTE_VERSION } from '../src/index.js';

test('smoke', () => {
  expect(RIVU_SVELTE_VERSION).toBe(1);
});

