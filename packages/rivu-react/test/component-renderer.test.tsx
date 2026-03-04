// @vitest-environment jsdom
import { render, screen, act } from '@testing-library/react';
import { z } from 'zod';
import { expect, test } from 'vitest';

import { createKernel } from 'rivu-kernel';

import { ComponentRenderer, createHost, createRegistry, useKernelState } from '../src/index.js';

test('ComponentRenderer renders registered component and updates on STATE_DELTA', () => {
  const kernel = createKernel();

  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_metric: {
              type: 'MetricCard',
              schemaVersion: 1,
              props: { label: 'Revenue', value: 1 },
              revision: 0,
              mounts: [{ messageId: 'msg_1', slot: 'inline', order: 0 }],
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    MetricCard: {
      schemaVersion: 1,
      propsSchema: z.object({ label: z.string(), value: z.number() }).strict(),
      render: ({ props }) => (
        <div data-testid="metric">
          {props.label}:{props.value}
        </div>
      ),
    },
  });

  render(<ComponentRenderer kernel={kernel} host={createHost({ registry })} componentId="cmp_metric" />);
  expect(screen.getByTestId('metric').textContent).toBe('Revenue:1');

  act(() => {
    kernel.dispatch({
      seq: 2,
      event: {
        type: 'STATE_DELTA',
        delta: [{ op: 'replace', path: '/ui/components/cmp_metric/props/value', value: 2 }],
      },
    });
  });

  expect(screen.getByTestId('metric').textContent).toBe('Revenue:2');
});

test('ComponentRenderer degrades on unknown component type', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_unknown: {
              type: 'UnknownThing',
              schemaVersion: 1,
              props: {},
              revision: 0,
              mounts: [{ messageId: 'msg_1', slot: 'inline', order: 0 }],
            },
          },
        },
      },
    },
  });

  render(<ComponentRenderer kernel={kernel} host={createHost({ registry: createRegistry({}) })} componentId="cmp_unknown" />);
  expect(screen.getByText('Unknown component type')).toBeTruthy();
});

test('ComponentRenderer degrades on invalid props', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_bad: {
              type: 'MetricCard',
              schemaVersion: 1,
              props: { label: 'Revenue', value: 'oops' },
              revision: 0,
              mounts: [{ messageId: 'msg_1', slot: 'inline', order: 0 }],
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    MetricCard: {
      schemaVersion: 1,
      propsSchema: z.object({ label: z.string(), value: z.number() }).strict(),
      render: () => <div data-testid="metric" />,
    },
  });

  render(<ComponentRenderer kernel={kernel} host={createHost({ registry })} componentId="cmp_bad" />);
  expect(screen.getByText('Invalid component props')).toBeTruthy();
});

test('ComponentRenderer degrades on invalid state', () => {
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
              type: 'MetricCard',
              schemaVersion: 1,
              props: { label: 'Revenue', value: 1 },
              state: { status: 123 },
              revision: 0,
              mounts: [{ messageId: 'msg_1', slot: 'inline', order: 0 }],
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    MetricCard: {
      schemaVersion: 1,
      propsSchema: z.object({ label: z.string(), value: z.number() }).strict(),
      stateSchema: z.object({ status: z.string() }).strict(),
      render: () => <div data-testid="metric" />,
    },
  });

  render(<ComponentRenderer kernel={kernel} host={createHost({ registry })} componentId="cmp_bad_state" />);
  expect(screen.getByText('Invalid component state')).toBeTruthy();
});

test('ComponentRenderer renders skeleton for status=building (without strict props validation)', () => {
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
              type: 'MetricCard',
              schemaVersion: 1,
              props: {},
              revision: 0,
              mounts: [],
              status: 'building',
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    MetricCard: {
      schemaVersion: 1,
      propsSchema: z.object({ label: z.string(), value: z.number() }).strict(),
      render: () => <div data-testid="metric" />,
    },
  });

  render(<ComponentRenderer kernel={kernel} host={createHost({ registry })} componentId="cmp_building" />);
  expect(screen.getByTestId('rivu-component-skeleton')).toBeTruthy();
});

test('ComponentRenderer renders error card for status=error (without strict props validation)', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_error: {
              type: 'MetricCard',
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
    MetricCard: {
      schemaVersion: 1,
      propsSchema: z.object({ label: z.string(), value: z.number() }).strict(),
      render: () => <div data-testid="metric" />,
    },
  });

  render(<ComponentRenderer kernel={kernel} host={createHost({ registry })} componentId="cmp_error" />);
  expect(screen.getByTestId('rivu-component-error-card')).toBeTruthy();
  expect(screen.getByText('BOOM: failed')).toBeTruthy();
});

test('ComponentRenderer applies host sanitizeComponentProps', () => {
  const kernel = createKernel();

  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_metric: {
              type: 'MetricCard',
              schemaVersion: 1,
              props: { label: 'Revenue', value: 1 },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    MetricCard: {
      schemaVersion: 1,
      propsSchema: z.object({ label: z.string(), value: z.number() }).strict(),
      render: ({ props }) => (
        <div data-testid="metric_sanitized">
          {props.label}:{props.value}
        </div>
      ),
    },
  });

  const host = createHost({
    registry,
    renderHooks: {
      sanitizeComponentProps: (_meta, props) => ({ ...props, value: 42 }),
    },
  });

  render(<ComponentRenderer kernel={kernel} host={host} componentId="cmp_metric" />);
  expect(screen.getByTestId('metric_sanitized').textContent).toBe('Revenue:42');
});

test('ComponentRenderer degrades when host sanitizer blocks props', () => {
  const kernel = createKernel();

  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_metric: {
              type: 'MetricCard',
              schemaVersion: 1,
              props: { label: 'Revenue', value: 1 },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  const registry = createRegistry({
    MetricCard: {
      schemaVersion: 1,
      propsSchema: z.object({ label: z.string(), value: z.number() }).strict(),
      render: () => <div data-testid="metric" />,
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

  render(<ComponentRenderer kernel={kernel} host={host} componentId="cmp_metric" />);
  expect(screen.getByText('Component props blocked by host sanitizer')).toBeTruthy();
});

test('useKernelState subscribes and re-renders', () => {
  const kernel = createKernel();

  function View() {
    const lastSeq = useKernelState(kernel, (s) => s.lastSeq);
    return <div data-testid="seq">{lastSeq}</div>;
  }

  render(<View />);
  expect(screen.getByTestId('seq').textContent).toBe('0');

  act(() => {
    kernel.dispatch({ seq: 1, event: { type: 'STATE_SNAPSHOT', snapshot: {} } });
  });

  expect(screen.getByTestId('seq').textContent).toBe('1');
});
