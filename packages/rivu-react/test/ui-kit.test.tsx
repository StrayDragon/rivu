// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { createKernel } from 'rivu-kernel';

import { ComponentRenderer, createRegistry, viewerRegistryV1, workflowRegistryV1 } from '../src/index.js';

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
      registry={createRegistry(viewerRegistryV1)}
      componentId="cmp_metric"
    />,
  );

  expect(screen.getByText('Revenue')).toBeTruthy();
  expect(screen.getByText(/1[, ]?234/)).toBeTruthy();
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
      registry={createRegistry(workflowRegistryV1)}
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
      registry={createRegistry(workflowRegistryV1)}
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
