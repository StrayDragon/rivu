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

test('exportHtmlV1 renders PivotTable deterministically', () => {
  const snapshot = {
    schema: 'rivu.export.v1',
    sharedState: {
      ui: {
        v: 1,
        datasets: {
          ds_sales: {
            columns: ['region', 'quarter', 'revenue'],
            rows: [
              ['APAC', 'Q1', 10],
              ['APAC', 'Q2', 20],
              ['EU', 'Q1', 7],
            ],
          },
        },
        components: {
          cmp_pivot: {
            type: 'PivotTable',
            schemaVersion: 1,
            props: {
              dataRef: { datasetId: 'ds_sales' },
              rows: ['region'],
              columns: 'quarter',
              value: 'revenue',
              agg: 'sum',
              options: { title: 'Revenue Pivot', unit: 'USD', showTotals: true },
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

  const html1 = exportHtmlV1(snapshot as any);
  const html2 = exportHtmlV1(snapshot as any);
  expect(html1).toBe(html2);
  expect(html1).toContain('Revenue Pivot');
  expect(html1).toContain('APAC');
  expect(html1).toContain('Q1');
});

test('exportHtmlV1 renders Heatmap deterministically', () => {
  const snapshot = {
    schema: 'rivu.export.v1',
    sharedState: {
      ui: {
        v: 1,
        datasets: {
          ds_latency: {
            columns: ['bucket', 'endpoint', 'p95_ms'],
            rows: [
              ['0-50', '/api/a', 12],
              ['50-100', '/api/a', 62],
              ['0-50', '/api/b', 18],
            ],
          },
        },
        components: {
          cmp_heatmap: {
            type: 'Heatmap',
            schemaVersion: 1,
            props: {
              dataRef: { datasetId: 'ds_latency' },
              encoding: { x: 'bucket', y: 'endpoint', value: 'p95_ms' },
              options: { title: 'Latency heatmap', unit: 'ms', height: 240 },
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

  const html1 = exportHtmlV1(snapshot as any);
  const html2 = exportHtmlV1(snapshot as any);
  expect(html1).toBe(html2);
  expect(html1).toContain('Latency heatmap');
  expect(html1).toContain('/api/a');
  expect(html1).toContain('0-50');
});

test('exportHtmlV1 renders DiffView deterministically', () => {
  const snapshot = {
    schema: 'rivu.export.v1',
    sharedState: {
      ui: {
        v: 1,
        components: {
          cmp_diff: {
            type: 'DiffView',
            schemaVersion: 1,
            props: {
              title: 'Before vs After',
              beforeLabel: 'Before',
              afterLabel: 'After',
              before: 'a\nb\nc\n',
              after: 'a\nc\nd\n',
              mode: 'split',
              limits: { maxChars: 200, maxLines: 50 },
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

  const html1 = exportHtmlV1(snapshot as any);
  const html2 = exportHtmlV1(snapshot as any);
  expect(html1).toBe(html2);
  expect(html1).toContain('Before vs After');
  expect(html1).toContain('Before');
  expect(html1).toContain('After');
  expect(html1).toContain('a');
  expect(html1).toContain('b');
  expect(html1).toContain('d');
});
