// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { createKernel } from 'rivu-kernel';

import { ComponentRenderer, createHost, createRegistry, viewerRegistryV1, workflowRegistryV1 } from '../src/index.js';

const viewerHost = createHost({ registry: createRegistry(viewerRegistryV1) });
const workflowHost = createHost({ registry: createRegistry(workflowRegistryV1) });

test('Viewer component props validate and render (MetricCard)', () => {
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
              props: { label: 'Revenue', value: 1234, unit: 'USD' },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(
    <ComponentRenderer
      kernel={kernel}
      host={viewerHost}
      componentId="cmp_metric"
    />,
  );

  expect(screen.getByText('Revenue')).toBeTruthy();
  expect(screen.getByText(/1[, ]?234/)).toBeTruthy();
});

test('MetricCard uses host formatNumber hook', () => {
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
              props: { label: 'Revenue', value: 1234, unit: 'USD' },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  const host = createHost({
    registry: createRegistry(viewerRegistryV1),
    renderHooks: {
      formatNumber: () => 'formatted',
    },
  });

  render(<ComponentRenderer kernel={kernel} host={host} componentId="cmp_metric" />);
  expect(screen.getByText('formatted')).toBeTruthy();
});

test('Viewer component props validate and render (Chart empty state)', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_chart: {
              type: 'Chart',
              schemaVersion: 1,
              props: {
                mark: 'bar',
                data: { columns: ['x', 'y'], rows: [] },
                encoding: { x: 'x', y: 'y' },
                options: { title: 'Chart (empty)', unit: 'USD', height: 220 },
              },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(<ComponentRenderer kernel={kernel} host={viewerHost} componentId="cmp_chart" />);

  expect(screen.getByText('Chart (empty)')).toBeTruthy();
  expect(screen.getByText('No data')).toBeTruthy();
});

test('Viewer component degrades to UnknownComponentCard on invalid Chart props', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_chart: {
              type: 'Chart',
              schemaVersion: 1,
              props: {
                mark: 'bar',
                data: { columns: ['x', 'y'], rows: [['Search', 10]] },
                encoding: { x: 'x' },
              },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(<ComponentRenderer kernel={kernel} host={viewerHost} componentId="cmp_chart" />);
  expect(screen.getByText('Invalid component props')).toBeTruthy();
});

test('PivotTable aggregates deterministically (sum + totals)', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          datasets: {
            ds_sales: {
              columns: ['region', 'quarter', 'revenue'],
              rows: [
                ['APAC', 'Q1', 10],
                ['APAC', 'Q1', 5],
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
                options: { title: 'Revenue Pivot', showTotals: true },
              },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(<ComponentRenderer kernel={kernel} host={viewerHost} componentId="cmp_pivot" />);

  expect(screen.getByText('Revenue Pivot')).toBeTruthy();
  expect(screen.getByText('APAC')).toBeTruthy();
  expect(screen.getByText('EU')).toBeTruthy();
  expect(screen.getByText('Q1')).toBeTruthy();
  expect(screen.getByText('Q2')).toBeTruthy();
  expect(screen.getAllByText('15').length).toBeGreaterThan(0);
  expect(screen.getAllByText('20').length).toBeGreaterThan(0);
  expect(screen.getAllByText('7').length).toBeGreaterThan(0);
});

test('Heatmap rejects non-numeric values in encoding.value column', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          datasets: {
            ds_latency: {
              columns: ['bucket', 'endpoint', 'p95_ms'],
              rows: [['0-50', '/api/a', 'bad']],
            },
          },
          components: {
            cmp_heatmap: {
              type: 'Heatmap',
              schemaVersion: 1,
              props: {
                dataRef: { datasetId: 'ds_latency' },
                encoding: { x: 'bucket', y: 'endpoint', value: 'p95_ms' },
              },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(<ComponentRenderer kernel={kernel} host={viewerHost} componentId="cmp_heatmap" />);

  expect(screen.getByText('Heatmap value must be numeric')).toBeTruthy();
});

test('DiffView renders split mode with labels', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
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
                before: 'a\nb\n',
                after: 'a\nc\n',
                mode: 'split',
                limits: { maxChars: 200, maxLines: 50 },
              },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(<ComponentRenderer kernel={kernel} host={viewerHost} componentId="cmp_diff" />);

  expect(screen.getByText('Before vs After')).toBeTruthy();
  expect(screen.getByText('Before')).toBeTruthy();
  expect(screen.getByText('After')).toBeTruthy();
  expect(screen.getByText('b')).toBeTruthy();
  expect(screen.getByText('c')).toBeTruthy();
});

test('DiffView truncates before/after when limits exceeded', () => {
  const kernel = createKernel();
  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_diff_trunc: {
              type: 'DiffView',
              schemaVersion: 1,
              props: {
                before: 'l1\nl2\nl3\n',
                after: 'l1\nl2\nl4\n',
                limits: { maxLines: 2 },
              },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(<ComponentRenderer kernel={kernel} host={viewerHost} componentId="cmp_diff_trunc" />);

  expect(screen.getByText(/Truncated/)).toBeTruthy();
  expect(screen.getByText('l1')).toBeTruthy();
  expect(screen.getByText('l2')).toBeTruthy();
  expect(screen.queryByText('l3')).toBeNull();
  expect(screen.queryByText('l4')).toBeNull();
});

test('Chart emits ui.v1.event chart.setSelection with baseRevision', async () => {
  const actions: any[] = [];
  const kernel = createKernel({
    actionTransport: vi.fn(async (action) => {
      actions.push(action);
    }),
  });

  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_chart: {
              type: 'Chart',
              schemaVersion: 1,
              props: {
                mark: 'bar',
                data: { columns: ['x', 'y'], rows: [['A', 10]] },
                encoding: { x: 'x', y: 'y' },
              },
              state: { selection: { kind: 'none' } },
              revision: 7,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(<ComponentRenderer kernel={kernel} host={viewerHost} componentId="cmp_chart" />);

  const bar = document.querySelector('svg rect[tabindex="0"]') as SVGRectElement | null;
  expect(bar).toBeTruthy();

  await act(async () => {
    fireEvent.click(bar!);
  });

  expect(actions.length).toBe(1);
  expect(actions[0].type).toBe('CUSTOM');
  expect(actions[0].name).toBe('ui.v1.event');
  expect(actions[0].value.componentId).toBe('cmp_chart');
  expect(actions[0].value.eventName).toBe('chart.setSelection');
  expect(actions[0].value.baseRevision).toBe(7);
  expect(actions[0].value.payload.selection.kind).toBe('point');
  expect(actions[0].value.payload.selection.rowIndex).toBe(0);
  expect(typeof actions[0].value.clientRequestId).toBe('string');
  expect(actions[0].value.clientRequestId.length).toBeGreaterThan(0);
});

test('ApprovalCard emits ui.v1.event approve with baseRevision', async () => {
  const actions: any[] = [];
  const kernel = createKernel({
    actionTransport: vi.fn(async (action) => {
      actions.push(action);
    }),
  });

  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_approval: {
              type: 'ApprovalCard',
              schemaVersion: 1,
              props: { title: 'Approve?' },
              state: { status: 'pending' },
              revision: 7,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(
    <ComponentRenderer
      kernel={kernel}
      host={workflowHost}
      componentId="cmp_approval"
    />,
  );

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
  });

  expect(actions.length).toBe(1);
  expect(actions[0].type).toBe('CUSTOM');
  expect(actions[0].name).toBe('ui.v1.event');
  expect(actions[0].value.componentId).toBe('cmp_approval');
  expect(actions[0].value.eventName).toBe('approve');
  expect(actions[0].value.baseRevision).toBe(7);
  expect(typeof actions[0].value.clientRequestId).toBe('string');
  expect(actions[0].value.clientRequestId.length).toBeGreaterThan(0);
});

test('ConfirmCard emits ui.v1.event confirm and cancel with baseRevision', async () => {
  const actions: any[] = [];
  const kernel = createKernel({
    actionTransport: vi.fn(async (action) => {
      actions.push(action);
    }),
  });

  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_confirm: {
              type: 'ConfirmCard',
              schemaVersion: 1,
              props: { title: 'Confirm?' },
              state: { status: 'pending' },
              revision: 7,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(<ComponentRenderer kernel={kernel} host={workflowHost} componentId="cmp_confirm" />);

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  });

  expect(actions.length).toBe(2);
  expect(actions[0].type).toBe('CUSTOM');
  expect(actions[0].name).toBe('ui.v1.event');
  expect(actions[0].value.componentId).toBe('cmp_confirm');
  expect(actions[0].value.eventName).toBe('confirm');
  expect(actions[0].value.baseRevision).toBe(7);
  expect(typeof actions[0].value.clientRequestId).toBe('string');
  expect(actions[0].value.clientRequestId.length).toBeGreaterThan(0);

  expect(actions[1].type).toBe('CUSTOM');
  expect(actions[1].name).toBe('ui.v1.event');
  expect(actions[1].value.componentId).toBe('cmp_confirm');
  expect(actions[1].value.eventName).toBe('cancel');
  expect(actions[1].value.baseRevision).toBe(7);
  expect(typeof actions[1].value.clientRequestId).toBe('string');
  expect(actions[1].value.clientRequestId.length).toBeGreaterThan(0);
});

test('FormCard emits ui.v1.event setField and submit', async () => {
  const actions: any[] = [];
  const kernel = createKernel({
    actionTransport: vi.fn(async (action) => {
      actions.push(action);
    }),
  });

  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_form: {
              type: 'FormCard',
              schemaVersion: 1,
              props: {
                title: 'Form',
                fields: [{ id: 'name', label: 'Name', type: 'text' }],
              },
              state: { values: { name: '' } },
              revision: 3,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(
    <ComponentRenderer
      kernel={kernel}
      host={workflowHost}
      componentId="cmp_form"
    />,
  );

  await act(async () => {
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada' } });
  });

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
  });

  expect(actions.length).toBe(2);
  expect(actions[0].value.eventName).toBe('setField');
  expect(actions[0].value.payload.fieldId).toBe('name');
  expect(actions[0].value.payload.value).toBe('Ada');
  expect(actions[0].value.baseRevision).toBe(3);

  expect(actions[1].value.eventName).toBe('submit');
  expect(actions[1].value.payload.values.name).toBe('Ada');
  expect(actions[1].value.baseRevision).toBe(3);
});

test('TaskStatusCard renders status and progress', () => {
  const kernel = createKernel();

  kernel.dispatch({
    seq: 1,
    event: {
      type: 'STATE_SNAPSHOT',
      snapshot: {
        ui: {
          v: 1,
          components: {
            cmp_task_status: {
              type: 'TaskStatusCard',
              schemaVersion: 1,
              props: { title: 'Deploy', status: 'running', progress: 0.42, message: 'Working…' },
              revision: 0,
              mounts: [],
            },
          },
        },
      },
    },
  });

  render(<ComponentRenderer kernel={kernel} host={workflowHost} componentId="cmp_task_status" />);

  expect(screen.getByText('Deploy')).toBeTruthy();
  expect(screen.getByText('running')).toBeTruthy();
  expect(screen.getByText('42%')).toBeTruthy();
  expect(screen.getByText('Working…')).toBeTruthy();
});
