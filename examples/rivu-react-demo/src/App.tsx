import { useEffect, useMemo, useState } from 'react';

import { createKernel, selectMountedUiComponentsV1, type RivuKernel } from 'rivu-kernel';
import {
  ComponentRenderer,
  DATA_TABLE_COMPONENT_TYPE,
  DataTable,
  ProtocolInspector,
  buildUiV1Capabilities,
  createRegistry,
  dataTableRegistrationV1,
  exportChartSvgsV1,
  exportHtmlV1,
  useKernelState,
  viewerRegistryV1,
  workflowRegistryV1,
} from 'rivu-react';

import { DEMO_MESSAGE_IDS, createBootstrapEnvelopes, createInitialSharedState } from './demo-fixtures.js';
import { createMockServer } from './mock-server.js';

function MessageCard(props: {
  kernel: RivuKernel;
  registry: ReturnType<typeof createRegistry>;
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
            <ComponentRenderer
              key={m.componentId}
              kernel={props.kernel}
              registry={props.registry}
              componentId={m.componentId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SidebarMounts(props: { kernel: RivuKernel; registry: ReturnType<typeof createRegistry>; messageId: string }) {
  const sidebarMounted = useKernelState(props.kernel, (s) =>
    selectMountedUiComponentsV1({ state: s, messageId: props.messageId, slot: 'sidebar' }),
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sidebarMounted.length ? (
        sidebarMounted.map((m) => (
          <ComponentRenderer key={m.componentId} kernel={props.kernel} registry={props.registry} componentId={m.componentId} />
        ))
      ) : (
        <div className="hint">No sidebar mounts for this message.</div>
      )}
    </div>
  );
}

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ExportMenu(props: { kernel: RivuKernel; registry: ReturnType<typeof createRegistry> }) {
  return (
    <details style={{ position: 'relative' }}>
      <summary className="btn" style={{ listStyle: 'none' }}>
        Export
      </summary>
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          zIndex: 50,
          minWidth: 220,
          padding: 10,
          borderRadius: 12,
          border: '1px solid var(--rivu-border, #e5e7eb)',
          background: 'var(--rivu-bg, #fff)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <button
          className="btn"
          type="button"
          onClick={() => {
            const state = props.kernel.getState();
            const snapshot = {
              schema: 'rivu.export.v1',
              exportedAtMs: Date.now(),
              lastSeq: state.lastSeq,
              sharedState: state.sharedState,
              messages: state.messageOrder.map((id) => state.messages[id]).filter(Boolean),
              toolCalls: state.toolCallOrder.map((id) => state.toolCalls[id]).filter(Boolean),
            };
            downloadText('rivu-export.json', JSON.stringify(snapshot, null, 2), 'application/json');
          }}
        >
          Download JSON
        </button>

        <button
          className="btn"
          type="button"
          onClick={() => {
            const state = props.kernel.getState();
            const snapshot = {
              schema: 'rivu.export.v1',
              exportedAtMs: Date.now(),
              lastSeq: state.lastSeq,
              sharedState: state.sharedState,
              messages: state.messageOrder
                .map((id) => state.messages[id])
                .filter(Boolean)
                .map((m) => ({ id: m!.id, role: m!.role, content: m!.content, status: m!.status })),
              toolCalls: state.toolCallOrder
                .map((id) => state.toolCalls[id])
                .filter(Boolean)
                .map((t) => ({
                  id: t!.id,
                  name: t!.name,
                  args: t!.args,
                  status: t!.status,
                  parentMessageId: t!.parentMessageId,
                  resultMessageId: t!.resultMessageId,
                })),
            };

            const html = exportHtmlV1({ snapshot, registry: props.registry, title: 'Rivu Viewer Export (Demo)' });
            downloadText('rivu-export.html', html, 'text/html');
          }}
        >
          Download HTML
        </button>

        <button
          className="btn"
          type="button"
          onClick={() => {
            const state = props.kernel.getState();
            const snapshot = {
              schema: 'rivu.export.v1',
              exportedAtMs: Date.now(),
              lastSeq: state.lastSeq,
              sharedState: state.sharedState,
              messages: [],
              toolCalls: [],
            };

            const svgs = exportChartSvgsV1({ snapshot: snapshot as any, registry: props.registry });
            const first = Object.entries(svgs)[0];
            if (!first) return;
            const [componentId, svg] = first;
            downloadText(`${componentId}.svg`, svg, 'image/svg+xml');
          }}
        >
          Download SVG (Chart)
        </button>
      </div>
    </details>
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
          render: ({ props }) => (
            <DataTable
              {...props}
              slots={{
                EmptyState: () => (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontWeight: 750 }}>Custom empty state</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>Rendered via `slots.EmptyState` (host-side override).</div>
                  </div>
                ),
                Cell: ({ value, column }) => {
                  if (value === null) return '';
                  if (column.key === 'amount' && typeof value === 'number') {
                    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
                  }
                  if (typeof value === 'number') return value.toLocaleString();
                  return value;
                },
              }}
            />
          ),
        },
      }),
    [],
  );

  const [resetKey, setResetKey] = useState(0);
  const [showInspector, setShowInspector] = useState(true);
  const [theme, setTheme] = useState<'default' | 'brand' | 'dark'>('default');

  const themeVars: Record<string, string> | undefined = useMemo(() => {
    if (theme === 'default') return undefined;
    if (theme === 'brand') {
      return {
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

  const { kernel, bootstrap } = useMemo(() => {
    const sharedState = createInitialSharedState();
    const bootstrapEnvelopes = createBootstrapEnvelopes(sharedState);

    let server: ReturnType<typeof createMockServer> | null = null;
    const kernel = createKernel({
      actionTransport: async (action) => {
        if (!server) throw new Error('server not ready');
        await server.actionTransport(action);
      },
    });

    server = createMockServer({ kernel, initialSharedState: sharedState, bootstrapEnvelopes });

    return {
      kernel,
      bootstrap: () => {
        void server!.capabilitiesTransport({
          type: 'CUSTOM',
          name: 'ui.v1.capabilities',
          value: { ...buildUiV1Capabilities(registry), client: { framework: 'react', runtime: 'rivu-react-demo' } },
        });
        server!.bootstrap();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const messageIds = useKernelState(kernel, (s) => s.messageOrder);
  const [selectedMessageId, setSelectedMessageId] = useState<string>(DEMO_MESSAGE_IDS.assistant1);

  useEffect(() => {
    bootstrap();
    setSelectedMessageId(DEMO_MESSAGE_IDS.assistant1);
  }, [bootstrap]);

  return (
    <div className="app" style={themeVars as any}>
      <div className="topbar">
        <div className="brand">Rivu React Demo</div>
        <div className="hint">Viewer + Workflow components with `sharedState.ui` mounts and a mock server-authoritative loop.</div>
        <div className="spacer" />
        <ExportMenu kernel={kernel} registry={registry} />
        <button
          className="btn"
          type="button"
          onClick={() => setTheme((t) => (t === 'default' ? 'brand' : t === 'brand' ? 'dark' : 'default'))}
        >
          Theme: {theme}
        </button>
        <button className="btn" type="button" onClick={() => setShowInspector((v) => !v)}>
          {showInspector ? 'Hide' : 'Show'} Inspector
        </button>
        <button className="btn" type="button" onClick={() => setResetKey((k) => k + 1)}>
          Reset
        </button>
      </div>

      <div className="layout">
        <div className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Chat (inline mounts)</div>
            <div className="hint">Click a message to change the sidebar.</div>
          </div>
          <div className="panelBody">
            <div className="chat">
              {messageIds.map((id) => (
                <MessageCard
                  key={id}
                  kernel={kernel}
                  registry={registry}
                  messageId={id}
                  selected={id === selectedMessageId}
                  onSelect={setSelectedMessageId}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Sidebar mounts</div>
            <div className="hint">{selectedMessageId}</div>
          </div>
          <div className="panelBody">
            <SidebarMounts kernel={kernel} registry={registry} messageId={selectedMessageId} />

            {showInspector ? (
              <div style={{ marginTop: 12 }}>
                <ProtocolInspector kernel={kernel} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
