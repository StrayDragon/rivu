import { expect, test } from 'vitest';

import { exportChartSvgsV1, exportHtmlV1 } from '../src/index.js';

test('exportHtmlV1 returns a standalone HTML document and renders mounts', () => {
  const snapshot = {
    schema: 'rivu.export.v1',
    exportedAtMs: 0,
    lastSeq: 1,
    sharedState: {
      ui: {
        v: 1,
        components: {
          cmp_metric: {
            type: 'MetricCard',
            schemaVersion: 1,
            props: { label: 'Revenue', value: 1234, unit: 'USD' },
            revision: 0,
            mounts: [{ messageId: 'msg_1', slot: 'inline', order: 0 }],
          },
        },
      },
    },
    messages: [{ id: 'msg_1', role: 'assistant', content: 'Hello export' }],
    toolCalls: [],
  };

  const html = exportHtmlV1(snapshot as any);
  expect(html.startsWith('<!doctype html>')).toBe(true);
  expect(html).toContain('Hello export');
  expect(html).toContain('Revenue');
  expect(html).toContain('USD');
});

test('exportHtmlV1 downgrades unknown components without leaking raw props values', () => {
  const snapshot = {
    schema: 'rivu.export.v1',
    sharedState: {
      ui: {
        v: 1,
        components: {
          cmp_unknown: {
            type: 'SecretWidget',
            schemaVersion: 99,
            props: { token: 'secret', amount: 1234 },
            revision: 0,
            mounts: [{ messageId: 'msg_1', slot: 'inline', order: 0 }],
          },
        },
      },
    },
    messages: [{ id: 'msg_1', role: 'assistant', content: 'Hello export' }],
    toolCalls: [],
  };

  const html = exportHtmlV1(snapshot as any);
  expect(html).toContain('Unknown component type');
  expect(html).toContain('SecretWidget');
  expect(html).toContain('token');
  expect(html).not.toContain('secret');
  expect(html).not.toContain('1234');
});

test('exportChartSvgsV1 exports <svg> assets for Chart components', () => {
  const snapshot = {
    schema: 'rivu.export.v1',
    sharedState: {
      ui: {
        v: 1,
        components: {
          cmp_chart: {
            type: 'Chart',
            schemaVersion: 1,
            props: {
              mark: 'pie',
              data: {
                columns: ['label', 'value'],
                rows: [
                  ['Search', 10],
                  ['Email', 5],
                ],
              },
              encoding: { label: 'label', value: 'value' },
              options: { title: 'Chart', unit: 'USD', height: 240 },
            },
            revision: 0,
            mounts: [{ messageId: 'msg_1', slot: 'inline', order: 0 }],
          },
        },
      },
    },
    messages: [{ id: 'msg_1', role: 'assistant', content: 'Hello export' }],
    toolCalls: [],
  };

  const svgs = exportChartSvgsV1({ snapshot: snapshot as any });
  expect(Object.keys(svgs)).toEqual(['cmp_chart']);
  expect(svgs.cmp_chart?.startsWith('<svg')).toBe(true);
  expect(svgs.cmp_chart).toContain('</svg>');
});
