// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { createKernel } from 'rivu-kernel';

import {
  APPROVAL_CARD_COMPONENT_TYPE,
  ApprovalCard,
  ComponentRenderer,
  DataTable,
  FormCard,
  MetricCard,
  approvalCardRegistrationV1,
  createHost,
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

  render(<ComponentRenderer kernel={kernel} host={createHost({ registry })} componentId="cmp_approval" />);

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Custom approve' }));
  });

  expect(actions.length).toBe(1);
  expect(actions[0].type).toBe('CUSTOM');
  expect(actions[0].name).toBe('ui.v1.event');
  expect(actions[0].value.eventName).toBe('approve');
});

test('DataTable slotProps inject into default cells', () => {
  const host = createHost({
    registry: createRegistry({}),
    slotProps: {
      DataTable: {
        td: { className: 'host-td', 'data-td': '1' },
      },
    },
  });

  render(<DataTable host={host} columns={[{ key: 'name', label: 'Name' }]} rows={[{ name: 'Acme' }]} />);
  const td = screen.getByText('Acme').closest('td') as HTMLElement | null;
  expect(td).toBeTruthy();
  expect(td!.className).toContain('host-td');
  expect(td!.getAttribute('data-td')).toBe('1');
});

test('ApprovalCard slotProps inject into buttons', () => {
  const kernel = createKernel({ actionTransport: vi.fn(async () => {}) });
  const host = createHost({
    registry: createRegistry({}),
    slotProps: {
      ApprovalCard: {
        approveButton: { className: 'approve-btn' },
        denyButton: { className: 'deny-btn' },
      },
    },
  });

  render(<ApprovalCard host={host} kernel={kernel} componentId="cmp_approval" revision={0} state={{ status: 'pending' }} title="Approve?" />);
  expect(screen.getByRole('button', { name: 'Approve' }).className).toContain('approve-btn');
  expect(screen.getByRole('button', { name: 'Deny' }).className).toContain('deny-btn');
});

test('FormCard slotProps inject into submit button', () => {
  const kernel = createKernel({ actionTransport: vi.fn(async () => {}) });
  const host = createHost({
    registry: createRegistry({}),
    slotProps: {
      FormCard: {
        submitButton: { className: 'submit-btn' },
      },
    },
  });

  render(
    <FormCard
      host={host}
      kernel={kernel}
      componentId="cmp_form"
      revision={0}
      state={{ values: {}, status: 'idle' }}
      title="Form"
      fields={[{ id: 'name', label: 'Name', type: 'text' }]}
    />,
  );

  expect(screen.getByRole('button', { name: 'Submit' }).className).toContain('submit-btn');
});
