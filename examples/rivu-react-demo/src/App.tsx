import { useEffect, useMemo, useState } from 'react';

import * as fastJsonPatch from 'fast-json-patch';
import {
  createKernel,
  selectMountedUiComponentsV1,
  selectUiComponentV1,
  selectUiDatasetV1,
  selectUiStateV1,
  type RivuKernel,
} from 'rivu-kernel';
import {
  ComponentRenderer,
  DATA_TABLE_COMPONENT_TYPE,
  DataTable,
  ProtocolInspector,
  ThreadView,
  UnknownComponentCard,
  buildUiV1Capabilities,
  createClientRequestId,
  createHost,
  createRegistry,
  dataTableRegistrationV1,
  defaultRenderHooks,
  exportChartSvgsV1,
  exportHtmlV1,
  type RivuExportSnapshotV1,
  useKernelState,
  viewerRegistryV1,
  workflowRegistryV1,
} from 'rivu-react';
import { UI_V1_EVENT_NAME, type UiV1CustomEvent } from 'rivu-ui-spec';

import { DEMO_MESSAGE_IDS, createBootstrapEnvelopes, createInitialSharedState } from './demo-fixtures.js';
import { createMockServer, type MockServer } from './mock-server.js';

type SectionId =
  | 'overview'
  | 'viewer'
  | 'workflow'
  | 'datasets'
  | 'charts'
  | 'lifecycle'
  | 'export'
  | 'compaction'
  | 'chat'
  | 'threadKit'
  | 'docs';

const SECTIONS: Array<{ id: SectionId; label: string; description: string }> = [
  { id: 'overview', label: 'Overview', description: 'How the demo works (kernel + registry + mounts + mock server).' },
  { id: 'viewer', label: 'Viewer', description: 'Stateless, replayable components (safe for offline export/review).' },
  { id: 'workflow', label: 'Workflow', description: 'Stateful components with ui.v1.event round-trip (server authoritative).' },
  { id: 'datasets', label: 'Datasets', description: 'dataRef + dataset updates via STATE_DELTA patches.' },
  { id: 'charts', label: 'Charts', description: 'Chart rendering + v1 interactions (point/range selection).' },
  { id: 'lifecycle', label: 'Lifecycle', description: 'building → ready streaming, plus error + unknown fallbacks.' },
  { id: 'export', label: 'Export', description: 'Export snapshot → HTML + SVG assets (deterministic/offline).' },
  { id: 'compaction', label: 'Compaction', description: 'Server-side event compaction simulation (chunks + snapshot tuning).' },
  { id: 'chat', label: 'Chat Layout', description: 'Mounts into messages: inline vs sidebar slots.' },
  { id: 'threadKit', label: 'Thread UI Kit', description: 'Optional Layer 2: messages + tool cards + mounts + run status.' },
  { id: 'docs', label: 'Docs', description: 'Where the matching guides live in this repo.' },
];

const EXAMPLES = {
  viewer: [
    {
      componentId: 'cmp_report_section',
      title: 'ReportSection',
      description: 'A simple container card (stateless, viewer-safe).',
    },
    {
      componentId: 'cmp_metric_revenue',
      title: 'MetricCard',
      description: 'A basic metric card with optional unit/change/note.',
    },
    {
      componentId: 'cmp_table',
      title: 'DataTable + dataset',
      description: 'Uses props.dataRef → sharedState.ui.datasets lookup.',
    },
    {
      componentId: 'cmp_table_empty',
      title: 'DataTable empty state',
      description: 'Demonstrates host-side slots override in the demo registry.',
    },
    {
      componentId: 'cmp_bar_chart',
      title: 'BarChart + dataset',
      description: 'Uses required dataset columns: label/value.',
    },
    {
      componentId: 'cmp_chart',
      title: 'Chart (viewer)',
      description: 'Inline data (columns+rows) for token efficiency.',
    },
    {
      componentId: 'cmp_line_chart',
      title: 'LineChart',
      description: 'Simple inline points example.',
    },
    {
      componentId: 'cmp_citations',
      title: 'CitationList',
      description: 'Unsafe/invalid URLs are blocked in the renderer.',
    },
  ],
  workflow: [
    {
      componentId: 'cmp_approval',
      title: 'ApprovalCard',
      description: 'Approve/deny sends ui.v1.event; server emits STATE_DELTA.',
    },
    {
      componentId: 'cmp_form',
      title: 'FormCard',
      description: 'Edits + submit are server-authoritative (baseRevision enforced).',
    },
    {
      componentId: 'cmp_chart_workflow',
      title: 'Chart (interactive)',
      description: 'Selection state is stored in component.state and updated by server.',
    },
  ],
  lifecycle: [
    {
      componentId: 'cmp_lifecycle_metric',
      title: 'building → ready',
      description: 'Start as building (skeleton), then stream patches and flip to ready.',
    },
    {
      componentId: 'cmp_error_demo',
      title: 'error state',
      description: 'Server can set status=error with viewer-safe details.',
    },
    {
      componentId: 'cmp_unknown_demo',
      title: 'unknown component',
      description: 'Unregistered component type should never crash the page.',
    },
  ],
} as const;

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function openHtmlPreview(html: string) {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function createExportSnapshotV1(kernel: RivuKernel): RivuExportSnapshotV1 {
  const state = kernel.getState();
  return structuredClone({
    schema: 'rivu.export.v1',
    exportedAtMs: Date.now(),
    lastSeq: state.lastSeq,
    sharedState: state.sharedState,
    messages: state.messageOrder.map((id) => state.messages[id]).filter(Boolean) as any,
    toolCalls: state.toolCallOrder.map((id) => state.toolCalls[id]).filter(Boolean) as any,
  });
}

function ExampleCard(props: {
  kernel: RivuKernel;
  host: ReturnType<typeof createHost>;
  componentId: string;
  title: string;
  description: string;
}) {
  const component = useKernelState(props.kernel, (s) => selectUiComponentV1(s, props.componentId));

  if (!component) {
    return (
      <div className="exampleCard">
        <div className="exampleHeader">
          <div className="exampleTitle">{props.title}</div>
          <div className="hint">Component not found: {props.componentId}</div>
        </div>
      </div>
    );
  }

  const status = component.status ?? 'ready';

  return (
    <div className="exampleCard">
      <div className="exampleHeader">
        <div style={{ minWidth: 0 }}>
          <div className="exampleTitle">{props.title}</div>
          <div className="hint" style={{ marginTop: 4 }}>
            {props.description}
          </div>
        </div>
        <div className="exampleMeta">
          <span className="pill">{component.type}</span>
          <span className="pill">v{component.schemaVersion}</span>
          <span className="pill">rev {component.revision}</span>
          <span className="pill">{status}</span>
        </div>
      </div>

      <div className="exampleBody">
        <ComponentRenderer kernel={props.kernel} host={props.host} componentId={props.componentId} />
      </div>

      <details className="exampleDetails">
        <summary className="detailsSummary">Raw component JSON</summary>
        <pre>{JSON.stringify({ componentId: props.componentId, ...component }, null, 2)}</pre>
      </details>
    </div>
  );
}

function MessageCard(props: {
  kernel: RivuKernel;
  host: ReturnType<typeof createHost>;
  messageId: string;
  selected: boolean;
  onSelect: (messageId: string) => void;
}) {
  const message = useKernelState(props.kernel, (s) => s.messages[props.messageId] ?? null);
  const inlineMounted = useKernelState(props.kernel, (s) =>
    selectMountedUiComponentsV1({ state: s, messageId: props.messageId, slot: 'inline' }),
  );

  if (!message) return null;

  return (
    <div
      className={`msg ${props.selected ? 'msgSelected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => props.onSelect(props.messageId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') props.onSelect(props.messageId);
      }}
    >
      <div className="msgMeta">
        <span className="pill">{message.role}</span>
        <span>{props.messageId}</span>
      </div>
      <div className="msgContent">{message.content}</div>

      {inlineMounted.length ? (
        <div className="mounts">
          {inlineMounted.map((m) => (
            <ComponentRenderer key={m.componentId} kernel={props.kernel} host={props.host} componentId={m.componentId} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SidebarMounts(props: { kernel: RivuKernel; host: ReturnType<typeof createHost>; messageId: string }) {
  const sidebarMounted = useKernelState(props.kernel, (s) =>
    selectMountedUiComponentsV1({ state: s, messageId: props.messageId, slot: 'sidebar' }),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sidebarMounted.length ? (
        sidebarMounted.map((m) => (
          <ComponentRenderer key={m.componentId} kernel={props.kernel} host={props.host} componentId={m.componentId} />
        ))
      ) : (
        <div className="hint">No sidebar mounts for this message.</div>
      )}
    </div>
  );
}

type DemoEnvelope = { seq: number; event: { type: string; [k: string]: unknown } };

type LongRunReport = {
  maxReplayEvents: number;
  rawEvents: number;
  compactedEvents: number;
  rawSnapshots: number;
  compactedSnapshots: number;
  resumeFrom: number;
  rawResumeKind: 'replay' | 'snapshot';
  compactedResumeKind: 'replay' | 'snapshot';
  rawEnvelopesToSend: number;
  compactedEnvelopesToSend: number;
};

function replayAfter(envelopes: DemoEnvelope[], afterSeq: number): { complete: boolean; envelopes: DemoEnvelope[] } {
  const sorted = [...envelopes].sort((a, b) => a.seq - b.seq);
  const filtered = sorted.filter((e) => e.seq > afterSeq);
  if (!filtered.length) return { complete: true, envelopes: [] };

  const expectedFirst = afterSeq + 1;
  const first = filtered[0];
  if (!first) return { complete: false, envelopes: [] };
  if (first.seq !== expectedFirst) return { complete: false, envelopes: [] };

  const out: DemoEnvelope[] = [];
  let expected = expectedFirst;
  for (const env of filtered) {
    if (env.seq !== expected) return { complete: false, envelopes: [] };
    out.push(env);
    expected += 1;
  }
  return { complete: true, envelopes: out };
}

function compactEnvelopesV1(envelopes: DemoEnvelope[], config: { maxReplayEvents: number }): DemoEnvelope[] {
  const sorted = [...envelopes].sort((a, b) => a.seq - b.seq);
  const out: DemoEnvelope[] = [];

  let sharedState: Record<string, unknown> = {};
  let stateDeltasSinceSnapshot = 0;

  for (const env of sorted) {
    const e = env.event;

    const last = out[out.length - 1];
    if (e.type === 'TEXT_MESSAGE_CHUNK' && last?.event.type === 'TEXT_MESSAGE_CHUNK') {
      const messageId = (e as any).messageId;
      const lastMessageId = (last.event as any).messageId;
      const role = (e as any).role;
      const lastRole = (last.event as any).role;
      if (typeof messageId === 'string' && messageId === lastMessageId && String(role ?? 'assistant') === String(lastRole ?? 'assistant')) {
        const prev = String((last.event as any).delta ?? '');
        const next = String((e as any).delta ?? '');
        (last.event as any).delta = `${prev}${next}`;
        last.seq = env.seq;
        continue;
      }
    }

    if (e.type === 'TOOL_CALL_CHUNK' && last?.event.type === 'TOOL_CALL_CHUNK') {
      const toolCallId = (e as any).toolCallId;
      const lastToolCallId = (last.event as any).toolCallId;
      if (typeof toolCallId === 'string' && toolCallId === lastToolCallId) {
        const name = (e as any).toolCallName;
        const lastName = (last.event as any).toolCallName;
        if (typeof name === 'string' && typeof lastName === 'string' && name && lastName && name !== lastName) {
          // incompatible metadata: don't merge
        } else {
          const parent = (e as any).parentMessageId;
          const lastParent = (last.event as any).parentMessageId;
          if (typeof parent === 'string' && typeof lastParent === 'string' && parent && lastParent && parent !== lastParent) {
            // incompatible metadata: don't merge
          } else {
            const prev = String((last.event as any).delta ?? '');
            const next = String((e as any).delta ?? '');
            (last.event as any).delta = `${prev}${next}`;
            if (!lastName && typeof name === 'string' && name) (last.event as any).toolCallName = name;
            if (!lastParent && typeof parent === 'string' && parent) (last.event as any).parentMessageId = parent;
            last.seq = env.seq;
            continue;
          }
        }
      }
    }

    out.push({ seq: env.seq, event: structuredClone(env.event) });

    if (e.type === 'STATE_SNAPSHOT') {
      const snapshot = (e as any).snapshot;
      if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
        sharedState = structuredClone(snapshot);
        stateDeltasSinceSnapshot = 0;
      }
      continue;
    }

    if (e.type === 'STATE_DELTA') {
      const delta = (e as any).delta;
      if (Array.isArray(delta)) {
        const result = fastJsonPatch.applyPatch(sharedState, delta as any[], true, false);
        const next = result.newDocument as unknown;
        if (next && typeof next === 'object' && !Array.isArray(next)) {
          sharedState = next as Record<string, unknown>;
          stateDeltasSinceSnapshot += 1;
        }
      }

      if (config.maxReplayEvents > 0 && stateDeltasSinceSnapshot > config.maxReplayEvents) {
        let lastSnapshotSeq = 0;
        for (let i = out.length - 1; i >= 0; i -= 1) {
          const item = out[i];
          if (!item) continue;
          const t = (item.event as any).type;
          if (t === 'STATE_SNAPSHOT') {
            lastSnapshotSeq = item.seq;
            break;
          }
        }

        const retained = out.filter((x) => {
          const t = (x.event as any).type;
          return t !== 'STATE_DELTA' || x.seq <= lastSnapshotSeq;
        });
        retained.push({ seq: env.seq, event: { type: 'STATE_SNAPSHOT', snapshot: structuredClone(sharedState) } as any });

        out.length = 0;
        out.push(...retained);
        stateDeltasSinceSnapshot = 0;
      }
    }
  }

  return out;
}

function runLongRunSimulation(params: { maxReplayEvents: number }): LongRunReport {
  const raw: DemoEnvelope[] = [];
  let seq = 0;
  const push = (event: DemoEnvelope['event']) => {
    seq += 1;
    raw.push({ seq, event });
  };

  push({ type: 'STATE_SNAPSHOT', snapshot: { ui: { v: 1, components: {} }, k: 0 } });

  const chunks = 1200;
  for (let i = 0; i < chunks; i += 1) {
    push({ type: 'TEXT_MESSAGE_CHUNK', messageId: 'msg_long', role: 'assistant', delta: 'x' });
  }

  const toolChunks = 800;
  for (let i = 0; i < toolChunks; i += 1) {
    push({ type: 'TOOL_CALL_CHUNK', toolCallId: 'tc_long', toolCallName: 'search', parentMessageId: 'msg_long', delta: 'y' });
  }

  const deltas = 900;
  for (let i = 1; i <= deltas; i += 1) {
    push({ type: 'STATE_DELTA', delta: [{ op: 'replace', path: '/k', value: i }] });
  }

  const compacted = compactEnvelopesV1(raw, { maxReplayEvents: params.maxReplayEvents });

  const resumeFrom = 0;
  const rawReplay = replayAfter(raw, resumeFrom);
  const compactReplay = replayAfter(compacted, resumeFrom);

  const rawResumeKind: LongRunReport['rawResumeKind'] = rawReplay.complete ? 'replay' : 'snapshot';
  const compactedResumeKind: LongRunReport['compactedResumeKind'] = compactReplay.complete ? 'replay' : 'snapshot';

  const rawSnapshots = raw.filter((e) => e.event.type === 'STATE_SNAPSHOT').length;
  const compactedSnapshots = compacted.filter((e) => e.event.type === 'STATE_SNAPSHOT').length;

  return {
    maxReplayEvents: params.maxReplayEvents,
    rawEvents: raw.length,
    compactedEvents: compacted.length,
    rawSnapshots,
    compactedSnapshots,
    resumeFrom,
    rawResumeKind,
    compactedResumeKind,
    rawEnvelopesToSend: rawReplay.complete ? rawReplay.envelopes.length : 1,
    compactedEnvelopesToSend: compactReplay.complete ? compactReplay.envelopes.length : 1,
  };
}

function OverviewSection(props: {
  kernel: RivuKernel;
  host: ReturnType<typeof createHost>;
  server: MockServer;
  onSendCapabilities: () => void;
  lastSentAtMs: number | null;
}) {
  const summary = useKernelState(props.kernel, (s) => {
    const ui = selectUiStateV1(s);
    return {
      lastSeq: s.lastSeq,
      needsResync: s.needsResync,
      componentCount: ui ? Object.keys(ui.components).length : null,
      datasetCount: ui?.datasets ? Object.keys(ui.datasets).length : 0,
    };
  });

  const capabilities = useMemo(() => buildUiV1Capabilities(props.host), [props.host]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hint" style={{ lineHeight: 1.55 }}>
        This demo is intentionally <b>server-authoritative</b>: the browser only renders <code>sharedState.ui</code> and sends{' '}
        <code>CUSTOM(name=&quot;ui.v1.event&quot;)</code> actions. The in-browser mock server applies validation/concurrency rules and emits{' '}
        <code>STATE_DELTA</code> patches back into the kernel.
      </div>

      <div className="calloutRow">
        <div className="callout">
          <div className="calloutTitle">Kernel</div>
          <div className="calloutValue">lastSeq: {summary.lastSeq}</div>
          <div className="calloutHint">needsResync: {String(summary.needsResync)}</div>
        </div>
        <div className="callout">
          <div className="calloutTitle">UI State</div>
          <div className="calloutValue">components: {summary.componentCount ?? '—'}</div>
          <div className="calloutHint">datasets: {summary.datasetCount}</div>
        </div>
        <div className="callout">
          <div className="calloutTitle">Capabilities</div>
          <div className="calloutValue">{Object.keys(capabilities.components ?? {}).length} components</div>
          <div className="calloutHint">Sent: {props.lastSentAtMs ? new Date(props.lastSentAtMs).toLocaleTimeString() : 'boot only'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" type="button" onClick={props.onSendCapabilities}>
          Send capabilities
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            const snapshot = createExportSnapshotV1(props.kernel);
            downloadText('rivu-export.json', JSON.stringify(snapshot, null, 2), 'application/json');
          }}
        >
          Download export snapshot (JSON)
        </button>
      </div>

      <details className="exampleDetails">
        <summary className="detailsSummary">Computed ui.v1.capabilities (JSON)</summary>
        <pre>{JSON.stringify(capabilities, null, 2)}</pre>
      </details>
    </div>
  );
}

function ViewerSection(props: { kernel: RivuKernel; host: ReturnType<typeof createHost> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hint" style={{ lineHeight: 1.55 }}>
        Viewer components should be <b>stateless</b> and replayable: render-only, deterministic, and safe for export/offline review.
      </div>

      <div className="exampleGrid">
        {EXAMPLES.viewer.map((ex) => (
          <ExampleCard key={ex.componentId} kernel={props.kernel} host={props.host} componentId={ex.componentId} title={ex.title} description={ex.description} />
        ))}
      </div>
    </div>
  );
}

function WorkflowSection(props: { kernel: RivuKernel; host: ReturnType<typeof createHost> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hint" style={{ lineHeight: 1.55 }}>
        Workflow components are <b>stateful</b>: UI interactions send <code>ui.v1.event</code> with <code>clientRequestId</code> +{' '}
        <code>baseRevision</code>, and the server commits updates via <code>STATE_DELTA</code>.
        {' '}Demo: the first <code>FormCard</code> submit simulates a transport failure; use <code>ProtocolInspector</code> outbox retry to re-send the failed <code>clientRequestId</code>.
      </div>

      <div className="exampleGrid">
        {EXAMPLES.workflow.map((ex) => (
          <ExampleCard key={ex.componentId} kernel={props.kernel} host={props.host} componentId={ex.componentId} title={ex.title} description={ex.description} />
        ))}
      </div>
    </div>
  );
}

function DatasetsSection(props: { kernel: RivuKernel; host: ReturnType<typeof createHost>; server: MockServer }) {
  const datasetId = 'ds_revenue_by_channel';
  const dataset = useKernelState(props.kernel, (s) => selectUiDatasetV1(s, datasetId));
  const [error, setError] = useState<string | null>(null);

  const mutate = (fn: (current: NonNullable<typeof dataset>) => Array<Array<string | number | null>>) => {
    setError(null);
    if (!dataset) {
      setError(`Dataset missing: ${datasetId}`);
      return;
    }
    try {
      const nextRows = fn(dataset);
      props.server.setDatasetRows(datasetId, nextRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hint" style={{ lineHeight: 1.55 }}>
        Datasets live in <code>sharedState.ui.datasets</code>. Components can reference them via <code>props.dataRef</code> to avoid repeating data
        across many components.
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          className="btn"
          type="button"
          onClick={() =>
            mutate((current) => {
              const valueIndex = current.columns.indexOf('value');
              if (valueIndex < 0) throw new Error('dataset missing column: value');
              return current.rows.map((row) => {
                const next = [...row] as Array<string | number | null>;
                const v = next[valueIndex];
                if (typeof v === 'number' && Number.isFinite(v)) {
                  const factor = 0.8 + Math.random() * 0.6;
                  next[valueIndex] = Math.round(v * factor);
                }
                return next;
              });
            })
          }
        >
          Randomize values
        </button>
        <button
          className="btn"
          type="button"
          onClick={() =>
            mutate((current) => {
              const labelIndex = current.columns.indexOf('label');
              const valueIndex = current.columns.indexOf('value');
              if (labelIndex < 0 || valueIndex < 0) throw new Error('dataset requires label/value columns');
              const nextRows = [...current.rows];
              nextRows.push(
                nextRows.length % 2 === 0 ? ['Social', 11_600] : ['Partners', 14_250],
              );
              return nextRows.map((row) => row.map((cell) => cell as any) as Array<string | number | null>);
            })
          }
        >
          Add a row
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setError(null);
            const initial = createInitialSharedState() as any;
            const base = initial?.ui?.datasets?.[datasetId];
            if (!base?.rows) {
              setError('Could not load initial dataset baseline.');
              return;
            }
            props.server.setDatasetRows(datasetId, structuredClone(base.rows));
          }}
        >
          Reset dataset
        </button>
      </div>

      {error ? <div className="errorBanner">{error}</div> : null}

      <details className="exampleDetails" open>
        <summary className="detailsSummary">Dataset JSON ({datasetId})</summary>
        <pre>{JSON.stringify(dataset, null, 2)}</pre>
      </details>

      <div className="exampleGrid">
        <ExampleCard kernel={props.kernel} host={props.host} componentId="cmp_table" title="DataTable + dataRef" description="Table resolves rows from dataset columns." />
        <ExampleCard kernel={props.kernel} host={props.host} componentId="cmp_bar_chart" title="BarChart + dataRef" description="Chart resolves items from dataset label/value." />
      </div>
    </div>
  );
}

function ChartsSection(props: { kernel: RivuKernel; host: ReturnType<typeof createHost> }) {
  const workflowChart = useKernelState(props.kernel, (s) => selectUiComponentV1(s, 'cmp_chart_workflow'));
  const [actionError, setActionError] = useState<string | null>(null);

  const send = async (action: UiV1CustomEvent) => {
    setActionError(null);
    try {
      await props.kernel.send(action);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const clearSelection = async () => {
    if (!workflowChart) return;
    await send({
      type: 'CUSTOM',
      name: UI_V1_EVENT_NAME,
      value: {
        componentId: 'cmp_chart_workflow',
        eventName: 'chart.clearSelection',
        payload: {},
        clientRequestId: createClientRequestId(),
        baseRevision: workflowChart.revision,
      },
    });
  };

  const selectFirstPoint = async () => {
    if (!workflowChart) return;
    await send({
      type: 'CUSTOM',
      name: UI_V1_EVENT_NAME,
      value: {
        componentId: 'cmp_chart_workflow',
        eventName: 'chart.setSelection',
        payload: { selection: { kind: 'point', rowIndex: 0 } },
        clientRequestId: createClientRequestId(),
        baseRevision: workflowChart.revision,
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hint" style={{ lineHeight: 1.55 }}>
        <code>Chart</code> supports compact data (<code>columns + rows</code>) and optional v1 interactions. When <code>component.state</code> exists,
        the renderer enables selection events that round-trip via <code>ui.v1.event</code>.
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" type="button" onClick={() => void selectFirstPoint()}>
          Select first bar (server)
        </button>
        <button className="btn" type="button" onClick={() => void clearSelection()}>
          Clear selection (server)
        </button>
      </div>

      {actionError ? <div className="errorBanner">{actionError}</div> : null}

      <details className="exampleDetails" open>
        <summary className="detailsSummary">Workflow chart selection state (cmp_chart_workflow)</summary>
        <pre>{JSON.stringify(workflowChart?.state ?? null, null, 2)}</pre>
      </details>

      <div className="exampleGrid">
        <ExampleCard kernel={props.kernel} host={props.host} componentId="cmp_chart" title="Chart (viewer)" description="Inline data; no state → not interactive." />
        <ExampleCard kernel={props.kernel} host={props.host} componentId="cmp_chart_workflow" title="Chart (workflow + interactions)" description="Click bars or brush a range to update selection." />
      </div>
    </div>
  );
}

function LifecycleSection(props: { kernel: RivuKernel; host: ReturnType<typeof createHost> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hint" style={{ lineHeight: 1.55 }}>
        Components can be mounted early with <code>status=&quot;building&quot;</code> and later streamed to <code>ready</code> using patches. When ready,
        props/state must validate against the client registry schemas.
      </div>

      <div className="exampleGrid">
        {EXAMPLES.lifecycle.map((ex) => (
          <ExampleCard key={ex.componentId} kernel={props.kernel} host={props.host} componentId={ex.componentId} title={ex.title} description={ex.description} />
        ))}
      </div>

      <div className="hint">
        Tip: click <b>Reset</b> in the top bar to replay the lifecycle stream from the beginning.
      </div>
    </div>
  );
}

function ExportSection(props: { kernel: RivuKernel; host: ReturnType<typeof createHost> }) {
  const [snapshot, setSnapshot] = useState<RivuExportSnapshotV1 | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [svgs, setSvgs] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ensureSnapshot = () => {
    const next = createExportSnapshotV1(props.kernel);
    setSnapshot(next);
    return next;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hint" style={{ lineHeight: 1.55 }}>
        Export is snapshot-based: generate a deterministic JSON snapshot (<code>rivu.export.v1</code>), then derive HTML/SVG/PDF without replay.
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setError(null);
            setHtml(null);
            setSvgs(null);
            setSnapshot(ensureSnapshot());
          }}
        >
          Generate snapshot
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setError(null);
            const s = snapshot ?? ensureSnapshot();
            downloadText('rivu-export.json', JSON.stringify(s, null, 2), 'application/json');
          }}
        >
          Download JSON
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setError(null);
            try {
              const s = snapshot ?? ensureSnapshot();
              const out = exportHtmlV1({ snapshot: s, host: props.host, title: 'Rivu Viewer Export (Demo)' });
              setHtml(out);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          }}
        >
          Generate HTML
        </button>
        <button
          className="btn"
          type="button"
          disabled={!html}
          onClick={() => {
            if (!html) return;
            openHtmlPreview(html);
          }}
        >
          Open HTML
        </button>
        <button
          className="btn"
          type="button"
          disabled={!html}
          onClick={() => {
            if (!html) return;
            downloadText('rivu-export.html', html, 'text/html');
          }}
        >
          Download HTML
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setError(null);
            try {
              const s = snapshot ?? ensureSnapshot();
              setSvgs(exportChartSvgsV1({ snapshot: s as any, host: props.host }));
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          }}
        >
          Export chart SVGs
        </button>
      </div>

      {error ? <div className="errorBanner">{error}</div> : null}

      {snapshot ? (
        <details className="exampleDetails">
          <summary className="detailsSummary">Snapshot JSON</summary>
          <pre>{JSON.stringify(snapshot, null, 2)}</pre>
        </details>
      ) : null}

      {html ? (
        <details className="exampleDetails">
          <summary className="detailsSummary">HTML (first 2 KB)</summary>
          <pre>{html.slice(0, 2048)}{html.length > 2048 ? '\n…' : ''}</pre>
        </details>
      ) : null}

      {svgs ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="hint">Exported SVGs: {Object.keys(svgs).length}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(svgs).map(([componentId, svg]) => (
              <button key={componentId} className="btn" type="button" onClick={() => downloadText(`${componentId}.svg`, svg, 'image/svg+xml')}>
                Download {componentId}.svg
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CompactionSection() {
  const [maxReplayEvents, setMaxReplayEvents] = useState(200);
  const [report, setReport] = useState<LongRunReport | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hint" style={{ lineHeight: 1.55 }}>
        Compaction is a <b>server-side storage boundary</b> optimization: merge streaming chunk events and periodically snapshot sharedState to bound
        replay cost. If compaction introduces <code>seq</code> gaps, resume should fall back to a single <code>STATE_SNAPSHOT</code>.
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          maxReplayEvents
          <input
            type="number"
            min={0}
            step={50}
            value={maxReplayEvents}
            onChange={(e) => setMaxReplayEvents(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            className="input"
            style={{ width: 120 }}
          />
        </label>
        <button className="btn" type="button" onClick={() => setReport(runLongRunSimulation({ maxReplayEvents }))}>
          Run simulation
        </button>
      </div>

      {report ? (
        <div className="calloutRow">
          <div className="callout">
            <div className="calloutTitle">Persisted envelopes</div>
            <div className="calloutValue">
              {report.rawEvents.toLocaleString()} → {report.compactedEvents.toLocaleString()}
            </div>
            <div className="calloutHint">maxReplayEvents={report.maxReplayEvents}</div>
          </div>
          <div className="callout">
            <div className="calloutTitle">Snapshots</div>
            <div className="calloutValue">
              {report.rawSnapshots} → {report.compactedSnapshots}
            </div>
            <div className="calloutHint">Inserted to cap replay</div>
          </div>
          <div className="callout">
            <div className="calloutTitle">ResumeFrom=0</div>
            <div className="calloutValue">
              raw {report.rawResumeKind} / compact {report.compactedResumeKind}
            </div>
            <div className="calloutHint">
              {report.rawEnvelopesToSend.toLocaleString()} vs {report.compactedEnvelopesToSend.toLocaleString()} envelopes to send
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DocsSection() {
  const links: Array<{ title: string; path: string; note: string }> = [
    { title: 'Integration quickstart', path: 'docs/integration-quickstart.md', note: 'Canonical SSE/WS + resumeFrom baseline.' },
    { title: 'Integration guide', path: 'docs/integration.md', note: 'Kernel + registry + lifecycle + component catalog.' },
    { title: 'Viewer export', path: 'docs/viewer-export.md', note: 'Snapshot → HTML/SVG/PDF export pipeline.' },
    { title: 'Export & review', path: 'docs/export-review.md', note: 'Snapshot/export baseline and restoration.' },
    { title: 'Event compaction', path: 'docs/event-compaction.md', note: 'Server-side flush/merge + snapshot tuning.' },
    { title: 'Design system', path: 'docs/design-system.md', note: 'Theme tokens + slots conventions.' },
    { title: 'A2UI bridge', path: 'docs/a2ui-bridge.md', note: 'Agent-to-UI compact ops compiled into safe /ui patches.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="hint">Docs live in-repo. Open these files in your editor:</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
        {links.map((l) => (
          <div key={l.path} className="docCard">
            <div style={{ fontWeight: 750 }}>{l.title}</div>
            <div className="hint" style={{ marginTop: 4 }}>
              <code>{l.path}</code>
            </div>
            <div className="hint" style={{ marginTop: 8, lineHeight: 1.45 }}>
              {l.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatSection(props: {
  kernel: RivuKernel;
  host: ReturnType<typeof createHost>;
  selectedMessageId: string;
  onSelectMessageId: (messageId: string) => void;
}) {
  const messageIds = useKernelState(props.kernel, (s) => s.messageOrder);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="hint" style={{ lineHeight: 1.55 }}>
        This view demonstrates mounts-based embedding: UI components are placed into message slots (e.g. <code>inline</code> / <code>sidebar</code>)
        via <code>sharedState.ui.components[...].mounts</code>.
      </div>

      <div className="chat">
        {messageIds.map((id) => (
          <MessageCard
            key={id}
            kernel={props.kernel}
            host={props.host}
            messageId={id}
            selected={id === props.selectedMessageId}
            onSelect={props.onSelectMessageId}
          />
        ))}
      </div>
    </div>
  );
}

function ThreadKitSection(props: { kernel: RivuKernel; registry: ReturnType<typeof createRegistry>; host: ReturnType<typeof createHost> }) {
  const simulateGap = () => {
    const s = props.kernel.getState();
    props.kernel.dispatch({
      seq: s.lastSeq + 2,
      event: { type: 'TEXT_MESSAGE_CHUNK', messageId: DEMO_MESSAGE_IDS.assistant2, role: 'assistant', delta: ' (simulated gap)' },
    });
  };

  const simulatePatchError = () => {
    const s = props.kernel.getState();
    props.kernel.dispatch({
      seq: s.lastSeq + 1,
      event: { type: 'STATE_DELTA', delta: [{ op: 'replace', path: '/ui/components/missing', value: 1 }] },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="hint" style={{ lineHeight: 1.55 }}>
        Thread UI Kit is an <b>optional</b> Layer 2 wrapper: it renders messages, tool calls/results, mounts, and kernel run status without any Provider
        or network coupling.
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn" type="button" onClick={simulateGap}>
          Simulate seq gap
        </button>
        <button className="btn" type="button" onClick={simulatePatchError}>
          Simulate patch error
        </button>
        <div className="hint" style={{ alignSelf: 'center' }}>
          Use <b>Reset</b> to restore a clean run.
        </div>
      </div>

      <ThreadView
        kernel={props.kernel}
        registry={props.registry}
        renderHooks={props.host.renderHooks}
        slotProps={props.host.slotProps}
        sidebar
      />
    </div>
  );
}

export function App() {
  const registry = useMemo(
    () =>
      createRegistry({
        ...viewerRegistryV1,
        ...workflowRegistryV1,
        [DATA_TABLE_COMPONENT_TYPE]: {
          ...dataTableRegistrationV1,
          render: ({ kernel, host, componentId, componentType, schemaVersion, props }) => {
            const hooks = host.renderHooks;
            const meta = { componentId, componentType };
            const slots = {
              EmptyState: () => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontWeight: 750 }}>Custom empty state</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>Rendered via `slots.EmptyState` (host-side override).</div>
                </div>
              ),
              Cell: ({
                value,
                column,
                rowIndex,
              }: {
                value: string | number | null;
                column: { key: string };
                rowIndex: number;
              }) => {
                if (value === null) return '';
                const path = `rows[${rowIndex}].${column.key}`;
                if (column.key === 'amount' && typeof value === 'number') {
                  return hooks.formatCurrency(value, { ...meta, path, currency: 'USD' });
                }
                if (typeof value === 'number') return hooks.formatNumber(value, { ...meta, path });
                if (typeof value === 'string') return hooks.formatValue(value, { ...meta, path });
                return hooks.formatValue(value, { ...meta, path });
              },
            };

            if (props.dataRef) {
              const datasetId = props.dataRef.datasetId;
              const dataset = selectUiDatasetV1(kernel.getState(), datasetId);
              if (!dataset) {
                return (
                  <UnknownComponentCard
                    title="Dataset not found"
                    componentId={componentId}
                    componentType={componentType}
                    schemaVersion={schemaVersion}
                    details={{ datasetId }}
                  />
                );
              }

              const indexes = new Map(dataset.columns.map((name, i) => [name, i] as const));
              const missingColumns = props.columns
                .filter((col: { key: string }) => !indexes.has(col.key))
                .map((col: { key: string }) => col.key);
              if (missingColumns.length > 0) {
                return (
                  <UnknownComponentCard
                    title="Dataset column mismatch"
                    componentId={componentId}
                    componentType={componentType}
                    schemaVersion={schemaVersion}
                    details={{ datasetId, missingColumns, datasetColumns: dataset.columns }}
                  />
                );
              }

              const resolvedRows = dataset.rows.map((row) => {
                const out: Record<string, string | number | null> = {};
                for (const col of props.columns) {
                  out[col.key] = (row[indexes.get(col.key)!] as any) ?? null;
                }
                return out;
              });

              return <DataTable {...props} rows={resolvedRows} slots={slots as any} />;
            }

            return <DataTable {...props} slots={slots as any} />;
          },
        },
      }),
    [],
  );
  const [compactNumbers, setCompactNumbers] = useState(false);
  const [strictUrlSanitizer, setStrictUrlSanitizer] = useState(false);

  const host = useMemo(() => {
    const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
    return createHost({
      registry,
      renderHooks: {
        ...(compactNumbers
          ? {
              formatNumber: (value) => compact.format(value),
            }
          : {}),
        ...(strictUrlSanitizer
          ? {
              sanitizeUrl: (rawUrl) => {
                const url = defaultRenderHooks.sanitizeUrl(rawUrl);
                if (!url) return null;
                try {
                  const parsed = new URL(url);
                  // Demo: show that hosts can tighten policy beyond the default allowlist.
                  if (parsed.protocol !== 'https:') return null;
                  if (parsed.hostname !== 'example.com') return null;
                  return url;
                } catch {
                  return null;
                }
              },
            }
          : {}),
      },
    });
  }, [registry, compactNumbers, strictUrlSanitizer]);

  const [resetKey, setResetKey] = useState(0);
  const [showInspector, setShowInspector] = useState(true);
  const [theme, setTheme] = useState<'default' | 'brand' | 'dark'>('default');
  const [section, setSection] = useState<SectionId>('overview');
  const [selectedMessageId, setSelectedMessageId] = useState<string>(DEMO_MESSAGE_IDS.assistant1);
  const [capSentAtMs, setCapSentAtMs] = useState<number | null>(null);

  const themeVars: Record<string, string> | undefined = useMemo(() => {
    if (theme === 'default') return undefined;
    if (theme === 'brand') {
      return {
        colorScheme: 'light',
        '--rivu-border': '#c4b5fd',
        '--rivu-border-muted': '#ddd6fe',
        '--rivu-bg-muted': '#faf5ff',
        '--rivu-shadow': '0 1px 2px rgba(0,0,0,0.06)',
        '--rivu-chart-1': '#7c3aed',
        '--rivu-chart-2': '#0f766e',
        '--rivu-chart-3': '#f59e0b',
        '--rivu-chart-4': '#be123c',
      };
    }
    return {
      colorScheme: 'dark',
      '--rivu-bg': '#0b1220',
      '--rivu-bg-muted': '#0f172a',
      '--rivu-bg-subtle': '#111827',
      '--rivu-fg': '#e2e8f0',
      '--rivu-fg-muted': '#cbd5e1',
      '--rivu-muted': '#94a3b8',
      '--rivu-border': '#334155',
      '--rivu-border-muted': '#1f2937',
      '--rivu-shadow': 'none',
      '--rivu-chart-1': '#38bdf8',
      '--rivu-chart-2': '#34d399',
      '--rivu-chart-3': '#fbbf24',
      '--rivu-chart-4': '#fb7185',
      '--rivu-chart-5': '#a78bfa',
      '--rivu-chart-6': '#22d3ee',
      '--rivu-positive-bg': 'rgba(52, 211, 153, 0.12)',
      '--rivu-negative-bg': 'rgba(251, 113, 133, 0.12)',
      '--rivu-danger-bg': 'rgba(251, 113, 133, 0.2)',
      '--rivu-danger-border': 'rgba(251, 113, 133, 0.25)',
    };
  }, [theme]);

  const { kernel, server, bootstrap } = useMemo(() => {
    const sharedState = createInitialSharedState();
    const bootstrapEnvelopes = createBootstrapEnvelopes(sharedState);

    let server: MockServer | null = null;
    const kernel = createKernel({
      actionTransport: async (action) => {
        if (!server) throw new Error('server not ready');
        await server.actionTransport(action);
      },
    });

    server = createMockServer({ kernel, initialSharedState: sharedState, bootstrapEnvelopes });

    const sendCapabilities = async () => {
      const capabilitiesHost = createHost({ registry });
      const capabilitiesEvent = {
        type: 'CUSTOM',
        name: 'ui.v1.capabilities',
        value: { ...buildUiV1Capabilities(capabilitiesHost), client: { framework: 'react', runtime: 'rivu-react-demo' } },
      } as const;
      await server!.capabilitiesTransport(capabilitiesEvent as any);
    };

    return {
      kernel,
      server,
      bootstrap: async () => {
        await sendCapabilities();
        server!.bootstrap();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, registry]);

  useEffect(() => {
    void bootstrap();
    setSelectedMessageId(DEMO_MESSAGE_IDS.assistant1);
    setCapSentAtMs(Date.now());
  }, [bootstrap]);

  const onSendCapabilities = () => {
    void (async () => {
      await server.capabilitiesTransport({
        type: 'CUSTOM',
        name: 'ui.v1.capabilities',
        value: { ...buildUiV1Capabilities(host), client: { framework: 'react', runtime: 'rivu-react-demo' } },
      } as any);
      setCapSentAtMs(Date.now());
    })();
  };

  const sectionMeta = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]!;

  return (
    <div className="app" style={themeVars as any}>
      <div className="topbar">
        <div className="brand">Rivu Examples</div>
        <div className="hint">{sectionMeta.label}: {sectionMeta.description}</div>
        <div className="spacer" />
        <button className="btn" type="button" onClick={() => setCompactNumbers((v) => !v)}>
          Formatter: {compactNumbers ? 'compact' : 'default'}
        </button>
        <button className="btn" type="button" onClick={() => setStrictUrlSanitizer((v) => !v)}>
          URL sanitizer: {strictUrlSanitizer ? 'strict' : 'default'}
        </button>
        <button className="btn" type="button" onClick={() => setTheme((t) => (t === 'default' ? 'brand' : t === 'brand' ? 'dark' : 'default'))}>
          Theme: {theme}
        </button>
        <button className="btn" type="button" onClick={() => setShowInspector((v) => !v)}>
          {showInspector ? 'Hide' : 'Show'} Inspector
        </button>
        <button className="btn" type="button" onClick={() => setResetKey((k) => k + 1)}>
          Reset
        </button>
      </div>

      <div className={`layout ${showInspector ? '' : 'layoutNoInspector'}`}>
        <div className="panel nav" role="navigation" aria-label="Examples navigation">
          <div className="panelHeader">
            <div className="panelTitle">Sections</div>
            <div className="hint">Interactive, categorized examples</div>
          </div>
          <div className="panelBody navBody">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`navItem ${section === s.id ? 'navItemActive' : ''}`}
                type="button"
                onClick={() => setSection(s.id)}
              >
                <div className="navItemLabel">{s.label}</div>
                <div className="navItemDesc">{s.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div className="panelTitle">{sectionMeta.label}</div>
            <div className="hint">{sectionMeta.description}</div>
          </div>
          <div className="panelBody">
            {section === 'overview' ? (
              <OverviewSection kernel={kernel} host={host} server={server} onSendCapabilities={onSendCapabilities} lastSentAtMs={capSentAtMs} />
            ) : null}
            {section === 'viewer' ? <ViewerSection kernel={kernel} host={host} /> : null}
            {section === 'workflow' ? <WorkflowSection kernel={kernel} host={host} /> : null}
            {section === 'datasets' ? <DatasetsSection kernel={kernel} host={host} server={server} /> : null}
            {section === 'charts' ? <ChartsSection kernel={kernel} host={host} /> : null}
            {section === 'lifecycle' ? <LifecycleSection kernel={kernel} host={host} /> : null}
            {section === 'export' ? <ExportSection kernel={kernel} host={host} /> : null}
            {section === 'compaction' ? <CompactionSection /> : null}
            {section === 'chat' ? (
              <ChatSection kernel={kernel} host={host} selectedMessageId={selectedMessageId} onSelectMessageId={setSelectedMessageId} />
            ) : null}
            {section === 'threadKit' ? <ThreadKitSection kernel={kernel} registry={registry} host={host} /> : null}
            {section === 'docs' ? <DocsSection /> : null}
          </div>
        </div>

        {showInspector ? (
          <div className="panel">
            <div className="panelHeader">
              <div className="panelTitle">{section === 'chat' ? 'Sidebar mounts + Inspector' : 'Inspector'}</div>
              <div className="hint">Kernel state + outbox + ui summary</div>
            </div>
            <div className="panelBody">
              {section === 'chat' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <SidebarMounts kernel={kernel} host={host} messageId={selectedMessageId} />
                  <div style={{ borderTop: '1px solid var(--rivu-border-muted, #f1f5f9)', paddingTop: 12 }}>
                    <ProtocolInspector kernel={kernel} />
                  </div>
                </div>
              ) : (
                <ProtocolInspector kernel={kernel} />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
