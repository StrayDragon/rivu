import { expect, test } from 'vitest';
import { z } from 'zod';
import type { Component } from 'svelte';

import { createKernel } from 'rivu-kernel';
import { uiDataRefV1Schema } from 'rivu-ui-spec';

import { createHost, createRegistry, kernelStore, resolveUiComponentV1 } from '../src/index.js';

const DummyComponent = ((_: any, __: any) => ({})) as unknown as Component<any>;

test('kernelStore subscribers receive updates after dispatch', () => {
  const kernel = createKernel();
  const store = kernelStore(kernel);

  const seen: number[] = [];
  const unsubscribe = store.subscribe((state) => seen.push(state.lastSeq));

  kernel.dispatch({ seq: 1, event: { type: 'STATE_SNAPSHOT', snapshot: {} } });

  unsubscribe();

  expect(seen[0]).toBe(0);
  expect(seen).toContain(1);
});

test('resolveUiComponentV1 degrades gracefully for unknown type / invalid props', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_1: {
              type: 'Demo',
              schemaVersion: 1,
              props: {},
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  const unknownRegistry = createRegistry({});
  const unknown = resolveUiComponentV1({ state: kernel.getState(), host: createHost({ registry: unknownRegistry }), componentId: 'cmp_1' });
  expect(unknown.status).toBe('unknown_type');

  const registry = createRegistry({
    Demo: {
      schemaVersion: 1,
      propsSchema: z.object({ foo: z.string() }),
      Component: DummyComponent,
    },
  });
  const invalidProps = resolveUiComponentV1({ state: kernel.getState(), host: createHost({ registry }), componentId: 'cmp_1' });
  expect(invalidProps.status).toBe('invalid_props');
});

test('resolveUiComponentV1 applies host sanitizeComponentProps', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_1: {
              type: 'Demo',
              schemaVersion: 1,
              props: { foo: 'ok' },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    Demo: {
      schemaVersion: 1,
      propsSchema: z.object({ foo: z.string() }),
      Component: DummyComponent,
    },
  });

  const host = createHost({
    registry,
    renderHooks: {
      sanitizeComponentProps: (_meta, props) => ({ ...props, foo: 'sanitized' }),
    },
  });

  const resolved = resolveUiComponentV1({ state: kernel.getState(), host, componentId: 'cmp_1' });
  expect(resolved.status).toBe('ok');
  expect((resolved as any).props.foo).toBe('sanitized');
});

test('resolveUiComponentV1 degrades when host sanitizer blocks props', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_1: {
              type: 'Demo',
              schemaVersion: 1,
              props: { foo: 'ok' },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    Demo: {
      schemaVersion: 1,
      propsSchema: z.object({ foo: z.string() }),
      Component: DummyComponent,
    },
  });

  const host = createHost({
    registry,
    renderHooks: {
      sanitizeComponentProps: () => {
        throw new Error('blocked');
      },
    },
  });

  const resolved = resolveUiComponentV1({ state: kernel.getState(), host, componentId: 'cmp_1' });
  expect(resolved.status).toBe('invalid_props');
  expect((resolved as any).details.reason).toBe('blocked_by_sanitizer');
});

test('resolveUiComponentV1 degrades on invalid state', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_bad_state: {
              type: 'Demo',
              schemaVersion: 1,
              props: { foo: 'ok' },
              state: { bar: 123 },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    Demo: {
      schemaVersion: 1,
      propsSchema: z.object({ foo: z.string() }),
      stateSchema: z.object({ bar: z.string() }),
      Component: DummyComponent,
    },
  });

  const result = resolveUiComponentV1({ state: kernel.getState(), host: createHost({ registry }), componentId: 'cmp_bad_state' });
  expect(result.status).toBe('invalid_state');
});

test('resolveUiComponentV1 respects lifecycle status (unknown > error > building > ready)', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_building: {
              type: 'Demo',
              schemaVersion: 1,
              props: {},
              revision: 0,
              mounts: [],
              status: 'building',
            },
            cmp_error: {
              type: 'Demo',
              schemaVersion: 1,
              props: {},
              revision: 0,
              mounts: [],
              status: 'error',
              error: { code: 'BOOM', message: 'failed' },
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    Demo: {
      schemaVersion: 1,
      propsSchema: z.object({ foo: z.string() }),
      Component: DummyComponent,
    },
  });
  const host = createHost({ registry });

  const building = resolveUiComponentV1({ state: kernel.getState(), host, componentId: 'cmp_building' });
  expect(building.status).toBe('building');
  expect((building as any).revision).toBe(0);
  expect((building as any).hasState).toBe(false);

  const error = resolveUiComponentV1({ state: kernel.getState(), host, componentId: 'cmp_error' });
  expect(error.status).toBe('error');
  expect((error as any).revision).toBe(0);
  expect((error as any).hasState).toBe(false);

  const unknownRegistry = createRegistry({});
  const unknownWins = resolveUiComponentV1({ state: kernel.getState(), host: createHost({ registry: unknownRegistry }), componentId: 'cmp_error' });
  expect(unknownWins.status).toBe('unknown_type');
});

test('resolveUiComponentV1 resolves DataTable dataRef from sharedState.ui.datasets', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          datasets: {
            ds_1: {
              columns: ['name', 'orders'],
              rows: [['Acme', 12]],
            },
          },
          components: {
            cmp_table: {
              type: 'DataTable',
              schemaVersion: 1,
              props: {
                caption: 'Top customers',
                dataRef: { datasetId: 'ds_1' },
                columns: [
                  { key: 'name', label: 'Customer' },
                  { key: 'orders', label: 'Orders' },
                ],
                rows: [],
              },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    DataTable: {
      schemaVersion: 1,
      propsSchema: z.object({
        caption: z.string().optional(),
        dataRef: uiDataRefV1Schema.optional(),
        columns: z.array(z.object({ key: z.string().min(1), label: z.string().min(1) }).strict()),
        rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
      }),
      Component: DummyComponent,
    },
  });

  const resolved = resolveUiComponentV1({ state: kernel.getState(), host: createHost({ registry }), componentId: 'cmp_table' });
  expect(resolved.status).toBe('ok');
  expect((resolved as any).revision).toBe(0);
  expect((resolved as any).hasState).toBe(false);
  expect((resolved as any).props.rows).toEqual([{ name: 'Acme', orders: 12 }]);
});

test('resolveUiComponentV1 degrades when dataRef dataset is missing', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          datasets: {},
          components: {
            cmp_table: {
              type: 'DataTable',
              schemaVersion: 1,
              props: {
                dataRef: { datasetId: 'ds_missing' },
                columns: [{ key: 'name', label: 'Customer' }],
                rows: [],
              },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    DataTable: {
      schemaVersion: 1,
      propsSchema: z.object({
        dataRef: uiDataRefV1Schema.optional(),
        columns: z.array(z.object({ key: z.string().min(1), label: z.string().min(1) }).strict()),
        rows: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
      }),
      Component: DummyComponent,
    },
  });

  const resolved = resolveUiComponentV1({ state: kernel.getState(), host: createHost({ registry }), componentId: 'cmp_table' });
  expect(resolved.status).toBe('invalid_props');
  expect((resolved as any).details.reason).toBe('dataset_not_found');
  expect((resolved as any).details.datasetId).toBe('ds_missing');
});

test('resolveUiComponentV1 resolves BarChart dataRef from sharedState.ui.datasets', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          datasets: {
            ds_chart: {
              columns: ['label', 'value'],
              rows: [
                ['Search', 10],
                ['Email', 5],
              ],
            },
          },
          components: {
            cmp_chart: {
              type: 'BarChart',
              schemaVersion: 1,
              props: {
                dataRef: { datasetId: 'ds_chart' },
                items: [],
              },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    BarChart: {
      schemaVersion: 1,
      propsSchema: z.object({
        dataRef: uiDataRefV1Schema.optional(),
        items: z.array(z.object({ label: z.string().min(1), value: z.number() }).strict()),
      }),
      Component: DummyComponent,
    },
  });

  const resolved = resolveUiComponentV1({ state: kernel.getState(), host: createHost({ registry }), componentId: 'cmp_chart' });
  expect(resolved.status).toBe('ok');
  expect((resolved as any).props.items).toEqual([
    { label: 'Search', value: 10 },
    { label: 'Email', value: 5 },
  ]);
});
