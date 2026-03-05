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
        cmp_report_section: {
          type: 'ReportSection',
          schemaVersion: 1,
          props: {
            title: 'ReportSection',
            description: 'A stateless, replayable container-like card (viewer profile).',
          },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'inline', order: 0 }],
        },
        cmp_metric_revenue: {
          type: 'MetricCard',
          schemaVersion: 1,
          props: {
            label: 'Revenue',
            value: 128_430,
            unit: 'USD',
            changePercent: 3.42,
            note: 'MoM (demo data)',
          },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'inline', order: 1 }],
        },
        cmp_lifecycle_metric: {
          type: 'MetricCard',
          schemaVersion: 1,
          props: {},
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'inline', order: 2 }],
          status: 'building',
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
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'inline', order: 3 }],
        },
        cmp_table_empty: {
          type: 'DataTable',
          schemaVersion: 1,
          props: {
            caption: 'DataTable (empty state demo)',
            columns: [
              { key: 'name', label: 'Customer' },
              { key: 'orders', label: 'Orders', align: 'right' },
              { key: 'amount', label: 'Amount', align: 'right' },
            ],
            rows: [],
          },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'inline', order: 4 }],
        },
        cmp_bar_chart: {
          type: 'BarChart',
          schemaVersion: 1,
          props: {
            title: 'BarChart (dataset demo)',
            unit: 'USD',
            dataRef: { datasetId: 'ds_revenue_by_channel' },
            items: [],
          },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'inline', order: 5 }],
        },
        cmp_chart: {
          type: 'Chart',
          schemaVersion: 1,
          props: {
            mark: 'pie',
            data: {
              columns: ['label', 'value'],
              rows: [
                ['Search', 34_200],
                ['Referral', 21_100],
                ['Direct', 17_800],
                ['Email', 9_400],
              ],
            },
            encoding: { label: 'label', value: 'value' },
            options: { title: 'Chart (v1 pie)', unit: 'USD', height: 240 },
          },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'inline', order: 6 }],
        },
        cmp_error_demo: {
          type: 'MetricCard',
          schemaVersion: 1,
          props: {},
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'sidebar', order: 2 }],
          status: 'error',
          error: {
            code: 'DEMO_ERROR',
            message: 'This component failed to generate (demo)',
            details: { hint: 'Use viewer-safe error details only.' },
          },
        },
        cmp_line_chart: {
          type: 'LineChart',
          schemaVersion: 1,
          props: {
            title: 'LineChart',
            unit: 'ms',
            points: [
              { x: 'Mon', y: 210 },
              { x: 'Tue', y: 190 },
              { x: 'Wed', y: 240 },
              { x: 'Thu', y: 205 },
              { x: 'Fri', y: 220 },
            ],
          },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'sidebar', order: 0 }],
        },
        cmp_citations: {
          type: 'CitationList',
          schemaVersion: 1,
          props: {
            title: 'CitationList (sidebar)',
            items: [
              { title: 'AG-UI Protocol', url: 'https://github.com/ag-ui-protocol/ag-ui', snippet: 'Wire format reference (demo link).' },
              { title: 'Rivu PRD.md', url: 'https://example.invalid', snippet: 'Invalid URL should be blocked (demo).' },
            ],
          },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant1, slot: 'sidebar', order: 1 }],
        },
        cmp_approval: {
          type: 'ApprovalCard',
          schemaVersion: 1,
          props: {
            title: 'ApprovalCard',
            description: 'Workflow component. Click approve/deny → ui.v1.event → server STATE_DELTA.',
          },
          state: { status: 'pending' },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant2, slot: 'inline', order: 0 }],
        },
        cmp_form: {
          type: 'FormCard',
          schemaVersion: 1,
          props: {
            title: 'FormCard',
            description: 'Workflow component. Edits + submit are server-authoritative.',
            submitLabel: 'Submit (demo)',
            fields: [
              { id: 'email', label: 'Email', type: 'text', required: true, placeholder: 'name@company.com' },
              { id: 'plan', label: 'Plan', type: 'select', required: true, placeholder: 'Choose…', options: [
                { label: 'Starter', value: 'starter' },
                { label: 'Pro', value: 'pro' },
                { label: 'Enterprise', value: 'enterprise' }
              ] },
              { id: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Optional' }
            ],
          },
          state: { values: {}, status: 'idle' },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant2, slot: 'inline', order: 1 }],
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
            options: { title: 'Chart (workflow interactions)', unit: 'USD', height: 240 },
          },
          state: { selection: { kind: 'none' } },
          revision: 0,
          mounts: [{ messageId: DEMO_MESSAGE_IDS.assistant2, slot: 'inline', order: 2 }],
        },
      },
    },
  };
}

export function createBootstrapEnvelopes(sharedState: Record<string, unknown>): RivuEnvelope[] {
  return [
    {
      seq: 1,
      event: { type: 'STATE_SNAPSHOT', snapshot: sharedState },
    },
    { seq: 2, event: { type: 'TEXT_MESSAGE_START', messageId: DEMO_MESSAGE_IDS.user1, role: 'user' } },
    { seq: 3, event: { type: 'TEXT_MESSAGE_CHUNK', messageId: DEMO_MESSAGE_IDS.user1, role: 'user', delta: 'Show me a compact report with charts and a couple of interactive steps.' } },
    { seq: 4, event: { type: 'TEXT_MESSAGE_END', messageId: DEMO_MESSAGE_IDS.user1 } },
    { seq: 5, event: { type: 'TEXT_MESSAGE_START', messageId: DEMO_MESSAGE_IDS.assistant1, role: 'assistant' } },
    { seq: 6, event: { type: 'TEXT_MESSAGE_CHUNK', messageId: DEMO_MESSAGE_IDS.assistant1, role: 'assistant', delta: 'Here is a viewer-style summary. Some cards are mounted inline, others in the sidebar.' } },
    { seq: 7, event: { type: 'TEXT_MESSAGE_END', messageId: DEMO_MESSAGE_IDS.assistant1 } },
    { seq: 8, event: { type: 'TEXT_MESSAGE_START', messageId: DEMO_MESSAGE_IDS.assistant2, role: 'assistant' } },
    { seq: 9, event: { type: 'TEXT_MESSAGE_CHUNK', messageId: DEMO_MESSAGE_IDS.assistant2, role: 'assistant', delta: 'Next, try the workflow components below (server-authoritative state via ui.v1.event).' } },
    { seq: 10, event: { type: 'TEXT_MESSAGE_END', messageId: DEMO_MESSAGE_IDS.assistant2 } },
  ];
}
