import { useEffect, useMemo, useState } from 'react';

import { createKernel, selectMountedUiComponentsV1, type RivuKernel } from 'rivu-kernel';
import { ComponentRenderer, createRegistry, ProtocolInspector, useKernelState, viewerRegistryV1, workflowRegistryV1 } from 'rivu-react';

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

export function App() {
  const registry = useMemo(() => createRegistry({ ...viewerRegistryV1, ...workflowRegistryV1 }), []);

  const [resetKey, setResetKey] = useState(0);
  const [showInspector, setShowInspector] = useState(true);

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
      bootstrap: () => server!.bootstrap(),
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
    <div className="app">
      <div className="topbar">
        <div className="brand">Rivu React Demo</div>
        <div className="hint">Viewer + Workflow components with `sharedState.ui` mounts and a mock server-authoritative loop.</div>
        <div className="spacer" />
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
