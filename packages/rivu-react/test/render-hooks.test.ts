import { expect, test } from 'vitest';

import { defaultRenderHooks } from '../src/index.js';

test('defaultRenderHooks.sanitizeUrl trims and allowlists protocols', () => {
  expect(defaultRenderHooks.sanitizeUrl('   ')).toBeNull();
  expect(defaultRenderHooks.sanitizeUrl('javascript:alert(1)')).toBeNull();

  const https = defaultRenderHooks.sanitizeUrl(' https://example.com/path ');
  expect(typeof https).toBe('string');
  expect(https).toContain('https://example.com/path');

  expect(defaultRenderHooks.sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
});
