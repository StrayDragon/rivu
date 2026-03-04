import { expect, test } from 'vitest';
import { z } from 'zod';
import type { Component } from 'svelte';

import { buildUiV1Capabilities, createHost, createRegistry } from '../src/index.js';

const DummyComponent = ((_: any, __: any) => ({})) as unknown as Component<any>;

test('buildUiV1Capabilities reflects registry and schemaVersion (and default features)', () => {
  const registry = createRegistry({
    DataTable: {
      schemaVersion: 1,
      propsSchema: z.object({}).passthrough(),
      Component: DummyComponent,
    },
    Chart: {
      schemaVersion: 1,
      propsSchema: z.object({}).passthrough(),
      Component: DummyComponent,
    },
  });

  const caps = buildUiV1Capabilities(createHost({ registry }));

  expect(caps.v).toBe(1);
  expect(caps.components.DataTable).toEqual({ minSchemaVersion: 1, maxSchemaVersion: 1 });
  expect(caps.components.Chart).toEqual({ minSchemaVersion: 1, maxSchemaVersion: 1 });

  expect(caps.features!.datasets).toBe(true);
  expect(caps.features!.lifecycle).toBe(true);
  expect(caps.features!.chart?.marks).toEqual(['bar', 'line', 'pie']);
  expect(caps.features!.chart?.interactions).toEqual([]);
});

test('buildUiV1Capabilities allows host overrides / extensions for features', () => {
  const registry = createRegistry({
    Chart: {
      schemaVersion: 1,
      propsSchema: z.object({}).passthrough(),
      Component: DummyComponent,
    },
  });

  const caps = buildUiV1Capabilities(createHost({ registry }), {
    datasets: false,
    chart: { interactions: ['chart.setSelection'] },
    export: { formats: ['json'] },
    unknownFutureKey: { ok: true },
  });

  expect(caps.features!.datasets).toBe(false);
  expect(caps.features!.chart?.marks).toEqual(['bar', 'line', 'pie']);
  expect(caps.features!.chart?.interactions).toEqual(['chart.setSelection']);
  expect(caps.features!.export?.formats).toEqual(['json']);
  expect((caps.features as any).unknownFutureKey).toEqual({ ok: true });
});
