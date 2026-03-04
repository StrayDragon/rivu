import type { RivuEnvelope } from 'rivu-kernel';

export const DEMO_MESSAGE_IDS = {
  user1: 'msg_user_1',
  assistant1: 'msg_assistant_1',
  assistant2: 'msg_assistant_2',
} as const;

export function createInitialSharedState() {
  return {
    ui: {
      v: 1,
      datasets: {
        ds_revenue_by_channel: {
          columns: ['label', 'value'],
          rows: [
            ['Search', 34_200],
            ['Referral', 21_100],
            ['Direct', 17_800],
            ['Email', 9_400],
          ],
        },
      },
      components: {
        cmp_metric_revenue: {
          type: 'MetricCard',
          schemaVersion: 1,
          props: { label: 'Revenue', value: 128_430, unit: 'USD', changePercent: 3.42, note: 'MoM (demo data)' },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'inline', order: 0 }],
        },
        cmp_table: {
          type: 'DataTable',
          schemaVersion: 1,
          props: {
            caption: 'Revenue by channel (dataset demo)',
            dataRef: { datasetId: 'ds_revenue_by_channel' },
            columns: [
              { key: 'label', label: 'Channel' },
              { key: 'value', label: 'Revenue', align: 'right' },
            ],
            rows: [],
          },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'inline', order: 1 }],
        },
        cmp_chart: {
          type: 'Chart',
          schemaVersion: 1,
          props: {
            mark: 'bar',
            data: {
              columns: ['label', 'value'],
              rows: [
                ['Search', 34_200],
                ['Referral', 21_100],
                ['Direct', 17_800],
                ['Email', 9_400],
              ],
            },
            encoding: { x: 'label', y: 'value' },
            options: { title: 'Chart (viewer)', unit: 'USD', height: 220 },
          },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'inline', order: 2 }],
        },
        cmp_error_demo: {
          type: 'MetricCard',
          schemaVersion: 1,
          props: {},
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'sidebar', order: 0 }],
          status: 'error',
          error: { code: 'DEMO_ERROR', message: 'This component failed to generate (demo)' },
        },
        cmp_unknown_demo: {
          type: 'NotRegistered',
          schemaVersion: 1,
          props: { title: 'Unknown component (demo)' },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'sidebar', order: 1 }],
        },
        cmp_approval: {
          type: 'ApprovalCard',
          schemaVersion: 1,
          props: { title: 'ApprovalCard', description: 'Approve/deny is server-authoritative.' },
          state: { status: 'pending' },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant2, slot: 'inline', order: 0 }],
        },
        cmp_chart_workflow: {
          type: 'Chart',
          schemaVersion: 1,
          props: {
            mark: 'bar',
            data: {
              columns: ['label', 'value'],
              rows: [
                ['Search', 34_200],
                ['Referral', 21_100],
                ['Direct', 17_800],
                ['Email', 9_400],
              ],
            },
            encoding: { x: 'label', y: 'value' },
            options: { title: 'Chart (interactive)', unit: 'USD', height: 220 },
          },
          state: { selection: { kind: 'none' } },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant2, slot: 'inline', order: 1 }],
        },
      },
    },
  };
}

export function createBootstrapEnvelopes(sharedState: Record<string, unknown>): RivuEnvelope[] {
  return [
    { seq: 1, event: { type: 'STATE_SNAPSHOT', snapshot: sharedState } },
    { seq: 2, event: { type: 'TEXT_MESSAGE_START', messageId: DEMO_MESSAGE_IDS.assistant1, role: 'assistant' } },
    { seq: 3, event: { type: 'TEXT_MESSAGE_CHUNK', messageId: DEMO_MESSAGE_IDS.assistant1, role: 'assistant', delta: 'Viewer-style cards mounted inline + sidebar.' } },
    { seq: 4, event: { type: 'TEXT_MESSAGE_END', messageId: DEMO_MESSAGE_IDS.assistant1 } },
    { seq: 5, event: { type: 'TEXT_MESSAGE_START', messageId: DEMO_MESSAGE_IDS.assistant2, role: 'assistant' } },
    { seq: 6, event: { type: 'TEXT_MESSAGE_CHUNK', messageId: DEMO_MESSAGE_IDS.assistant2, role: 'assistant', delta: 'Workflow cards: interactions round-trip via ui.v1.event → STATE_DELTA.' } },
    { seq: 7, event: { type: 'TEXT_MESSAGE_END', messageId: DEMO_MESSAGE_IDS.assistant2 } },
  ];
}

