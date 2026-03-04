import { useEffect, useMemo, useState } from 'react';

import { createKernel, selectMountedUiComponentsV1, type RivuKernel } from 'rivu-kernel';
import {
  ComponentRenderer,
  ProtocolInspector,
  buildUiV1Capabilities,
  createHost,
  createRegistry,
  useKernelState,
  viewerRegistryV1,
  workflowRegistryV1,
} from 'rivu-react';

import { DEMO_MESSAGE_IDS, createBootstrapEnvelopes, createInitialSharedState } from './demo-fixtures.js';
import { createMockServer } from './mock-server.js';
import { Badge } from './components/ui/badge.js';
import { Button } from './components/ui/button.js';
import { Card, CardContent, CardHeader } from './components/ui/card.js';
import { Switch } from './components/ui/switch.js';
import { cn } from './lib/utils.js';

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
    <button
      type="button"
      className="w-full text-left"
      onClick={() => props.onSelect(props.messageId)}
    >
      <Card className={cn('transition', props.selected ? 'ring-2 ring-ring' : 'hover:bg-muted/40')}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{message.role}</Badge>
            <span>{props.messageId}</span>
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
          {inlineMounted.length ? (
            <div className="mt-3 flex flex-col gap-3">
              {inlineMounted.map((m) => (
                <ComponentRenderer key={m.componentId} kernel={props.kernel} host={props.host} componentId={m.componentId} />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </button>
  );
}

function SidebarMounts(props: { kernel: RivuKernel; host: ReturnType<typeof createHost>; messageId: string }) {
  const sidebarMounted = useKernelState(props.kernel, (s) =>
    selectMountedUiComponentsV1({ state: s, messageId: props.messageId, slot: 'sidebar' }),
  );

  if (!sidebarMounted.length) return <div className="text-sm text-muted-foreground">No sidebar mounts.</div>;

  return (
    <div className="flex flex-col gap-3">
      {sidebarMounted.map((m) => (
        <ComponentRenderer key={m.componentId} kernel={props.kernel} host={props.host} componentId={m.componentId} />
      ))}
    </div>
  );
}

export function App() {
  const registry = useMemo(() => createRegistry({ ...viewerRegistryV1, ...workflowRegistryV1 }), []);
  const host = useMemo(() => createHost({ registry }), [registry]);

  const [resetKey, setResetKey] = useState(0);
  const [dark, setDark] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string>(DEMO_MESSAGE_IDS.assistant1);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

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
          value: { ...buildUiV1Capabilities(host), client: { framework: 'react', runtime: 'rivu-react-shadcn-demo' } },
        } as any);
        server!.bootstrap();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    bootstrap();
    setSelectedMessageId(DEMO_MESSAGE_IDS.assistant1);
  }, [bootstrap]);

  const messageIds = useKernelState(kernel, (s) => s.messageOrder);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3">
          <div className="font-extrabold tracking-tight">Rivu + shadcn/ui</div>
          <div className="text-xs text-muted-foreground">
            Host UI uses Tailwind + shadcn CSS variables. Rivu inherits tokens via <code>--rivu-*</code> mapping.
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Dark</span>
            <Switch checked={dark} onCheckedChange={setDark} aria-label="Toggle dark mode" />
          </div>
          <Button variant="outline" size="sm" type="button" onClick={() => setResetKey((k) => k + 1)}>
            Reset
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-extrabold">Chat embeds</div>
                <div className="mt-1 text-xs text-muted-foreground">Inline mounts render inside message cards. Click to change sidebar.</div>
              </div>
              <Badge variant="secondary">mounts: inline / sidebar</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col gap-3">
              {messageIds.map((id) => (
                <MessageCard
                  key={id}
                  kernel={kernel}
                  host={host}
                  messageId={id}
                  selected={id === selectedMessageId}
                  onSelect={setSelectedMessageId}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold">Sidebar mounts</div>
                  <div className="mt-1 text-xs text-muted-foreground">{selectedMessageId}</div>
                </div>
                <Badge variant="secondary">viewer-safe</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <SidebarMounts kernel={kernel} host={host} messageId={selectedMessageId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <div className="text-sm font-extrabold">ProtocolInspector</div>
              <div className="mt-1 text-xs text-muted-foreground">Kernel state + outbox + ui summary</div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ProtocolInspector kernel={kernel} />
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
