import { expect, test } from 'vitest';

import { RIVU_REACT_VERSION } from '../src/index.js';

test('smoke', () => {
  expect(RIVU_REACT_VERSION).toBe(1);
});

