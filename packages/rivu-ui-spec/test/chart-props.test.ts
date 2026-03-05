import { expect, test } from 'vitest';

import { chartPropsV1Schema } from '../src/index.js';

test('Chart props v1: valid bar', () => {
  const input = {
    mark: 'bar',
    data: { columns: ['x', 'y'], rows: [['Search', 10]] },
    encoding: { x: 'x', y: 'y' },
    options: { title: 'Demo', unit: 'USD', height: 240 },
  };

  const result = chartPropsV1Schema.safeParse(input);
  expect(result.success).toBe(true);
});

test('Chart props v1: allows empty rows (viewer-safe empty state)', () => {
  const input = {
    mark: 'bar',
    data: { columns: ['x', 'y'], rows: [] },
    encoding: { x: 'x', y: 'y' },
  };

  const result = chartPropsV1Schema.safeParse(input);
  expect(result.success).toBe(true);
});

test('Chart props v1: invalid when required encoding missing', () => {
  const input = {
    mark: 'bar',
    data: { columns: ['x', 'y'], rows: [['Search', 10]] },
    encoding: { x: 'x' },
  };

  const result = chartPropsV1Schema.safeParse(input);
  expect(result.success).toBe(false);
});

test('Chart props v1: invalid when encoding references unknown column', () => {
  const input = {
    mark: 'pie',
    data: { columns: ['label', 'value'], rows: [['Search', 10]] },
    encoding: { label: 'label', value: 'missing' },
  };

  const result = chartPropsV1Schema.safeParse(input);
  expect(result.success).toBe(false);
});

