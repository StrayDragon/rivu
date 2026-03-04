import { expect, test } from 'vitest';

import { createKernel } from '../src/index.js';

test('smoke', () => {
  const kernel = createKernel();
  expect(kernel.getState().lastSeq).toBe(0);
});
