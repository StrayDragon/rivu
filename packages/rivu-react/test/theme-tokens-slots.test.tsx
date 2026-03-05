// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { createKernel } from 'rivu-kernel';

import {
  APPROVAL_CARD_COMPONENT_TYPE,
  ApprovalCard,
  ComponentRenderer,
  DataTable,
  MetricCard,
  approvalCardRegistrationV1,
  createRegistry,
  workflowRegistryV1,
} from '../src/index.js';

test('MetricCard forwards className/style', () => {
  const { container } = render(<MetricCard label="Revenue" value={1234} className="host-class" style={{ opacity: 0.5 }} />);
  const root = container.firstElementChild as HTMLElement | null;
  expect(root).toBeTruthy();
  expect(root!.className).toContain('host-class');
  expect(root!.style.opacity).toBe('0.5');
});

test('DataTable slots.EmptyState overrides default', () => {
  render(
    <DataTable
      caption="Empty"
      columns={[{ key: 'name', label: 'Name' }]}
      rows={[]}
      slots={{ EmptyState: () => <div>Nothing here</div> }}
    />,
  );
  expect(screen.getByText('Nothing here')).toBeTruthy();
});

test('DataTable slots.Cell overrides cell rendering', () => {
  render(
    <DataTable
      columns={[{ key: 'amount', label: 'Amount', align: 'right' }]}
      rows={[{ amount: 10 }]}
      slots={{
        Cell: ({ value }) => <span>v:{value}</span>,
      }}
    />,
  );
  expect(screen.getByText('v:10')).toBeTruthy();
});

test('ApprovalCard Actions slot can trigger approve', async () => {
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

  const registry = createRegistry({
    ...workflowRegistryV1,
    [APPROVAL_CARD_COMPONENT_TYPE]: {
      ...approvalCardRegistrationV1,
      render: ({ kernel, componentId, revision, props, state }) => (
        <ApprovalCard
          kernel={kernel}
          componentId={componentId}
          revision={revision}
          state={state}
          {...props}
          slots={{
            Actions: ({ onApprove }) => (
              <button type="button" onClick={onApprove}>
                Custom approve
              </button>
            ),
          }}
        />
      ),
    },
  });

  render(<ComponentRenderer kernel={kernel} registry={registry} componentId="cmp_approval" />);

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Custom approve' }));
  });

  expect(actions.length).toBe(1);
  expect(actions[0].type).toBe('CUSTOM');
  expect(actions[0].name).toBe('ui.v1.event');
  expect(actions[0].value.eventName).toBe('approve');
});
