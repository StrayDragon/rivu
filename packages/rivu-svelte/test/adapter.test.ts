import { expect, test } from 'vitest';
import { z } from 'zod';
import type { Component } from 'svelte';

import { createKernel } from 'rivu-kernel';

import { createRegistry, kernelStore, resolveUiComponentV1 } from '../src/index.js';

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
  const unknown = resolveUiComponentV1({ state: kernel.getState(), registry: unknownRegistry, componentId: 'cmp_1' });
  expect(unknown.status).toBe('unknown_type');

  const registry = createRegistry({
    Demo: {
      schemaVersion: 1,
      propsSchema: z.object({ foo: z.string() }),
      Component: DummyComponent,
    },
  });
  const invalidProps = resolveUiComponentV1({ state: kernel.getState(), registry, componentId: 'cmp_1' });
  expect(invalidProps.status).toBe('invalid_props');
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

  const result = resolveUiComponentV1({ state: kernel.getState(), registry, componentId: 'cmp_bad_state' });
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

  const building = resolveUiComponentV1({ state: kernel.getState(), registry, componentId: 'cmp_building' });
  expect(building.status).toBe('building');

  const error = resolveUiComponentV1({ state: kernel.getState(), registry, componentId: 'cmp_error' });
  expect(error.status).toBe('error');

  const unknownRegistry = createRegistry({});
  const unknownWins = resolveUiComponentV1({ state: kernel.getState(), registry: unknownRegistry, componentId: 'cmp_error' });
  expect(unknownWins.status).toBe('unknown_type');
});
