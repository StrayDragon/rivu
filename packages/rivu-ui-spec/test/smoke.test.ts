import { expect, test } from 'vitest';

import { RIVU_UI_SPEC_VERSION } from '../src/index.js';

test('smoke', () => {
  expect(RIVU_UI_SPEC_VERSION).toBe(1);
});

