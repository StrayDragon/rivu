import type { ReactNode } from 'react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createKernel, selectMountedUiComponentsV1, type RivuKernelState } from 'rivu-kernel';

import type { UiComponentV1 } from 'rivu-ui-spec';

import { createRegistry } from './registry.js';
import type { RivuComponentRegistry } from './registry.js';
import { viewerRegistryV1 } from './ui-kit/viewer.js';
import { workflowRegistryV1 } from './ui-kit/workflow.js';

export type RivuExportMessageV1 = {
  id: string;
  role: string;
  content: string;
  [k: string]: unknown;
};

export type RivuExportToolCallV1 = {
  id: string;
  name: string;
  args: string;
  status: string;
  parentMessageId: string | null;
  resultMessageId: string | null;
  [k: string]: unknown;
};

export type RivuExportSnapshotV1 = {
  schema?: string;
  exportedAtMs?: number;
  lastSeq?: number;
  sharedState: Record<string, unknown>;
  messages: RivuExportMessageV1[];
  toolCalls: RivuExportToolCallV1[];
  [k: string]: unknown;
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function summarizeValue(value: unknown): unknown {
  if (value === null) return { type: 'null' };
  if (typeof value === 'string') return { type: 'string', len: value.length };
  if (typeof value === 'number') return { type: 'number' };
  if (typeof value === 'boolean') return { type: 'boolean' };
  if (Array.isArray(value)) {
    const typeSet = new Set(value.map((v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)));
    return { type: 'array', len: value.length, itemTypes: Array.from(typeSet).sort() };
  }
  if (isJsonObject(value)) {
    const keys = Object.keys(value).slice(0, 50);
    return { type: 'object', keys, truncated: Object.keys(value).length > keys.length };
  }
  return { type: typeof value };
}

function summarizeProps(props: unknown): Record<string, unknown> | null {
  if (!isJsonObject(props)) return null;
  const out: Record<string, unknown> = {};
  const keys = Object.keys(props).slice(0, 50);
  for (const k of keys) out[k] = summarizeValue(props[k]);
  if (Object.keys(props).length > keys.length) out.__truncated__ = true;
  return out;
}

function defaultRegistry(): RivuComponentRegistry {
  return createRegistry({ ...viewerRegistryV1, ...workflowRegistryV1 });
}

function resolveSnapshot(input: unknown): RivuExportSnapshotV1 {
  if (!isJsonObject(input)) throw new Error('snapshot must be a JSON object');
  const sharedState = (input as any).sharedState as unknown;
  const messages = (input as any).messages as unknown;
  const toolCalls = (input as any).toolCalls as unknown;
  if (!isJsonObject(sharedState)) throw new Error('snapshot.sharedState must be a JSON object');
  if (!Array.isArray(messages)) throw new Error('snapshot.messages must be an array');
  if (!Array.isArray(toolCalls)) throw new Error('snapshot.toolCalls must be an array');
  return input as RivuExportSnapshotV1;
}

function ExportUnknownComponentBlock(props: {
  title: string;
  componentId: string;
  componentType: string;
  schemaVersion: number;
  propsSummary: Record<string, unknown> | null;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--rivu-border, #e5e7eb)',
        borderRadius: 12,
        padding: 12,
        background: 'var(--rivu-bg-muted, #fafafa)',
        boxShadow: 'var(--rivu-shadow, none)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        fontSize: 12,
        color: 'var(--rivu-fg, #111827)',
      }}
    >
      <div style={{ fontWeight: 650 }}>{props.title}</div>
      <div style={{ marginTop: 6, color: 'var(--rivu-fg-muted, #374151)' }}>
        <span>id: {props.componentId}</span>
        <span> • type: {props.componentType}</span>
        <span> • v: {props.schemaVersion}</span>
      </div>
      {props.propsSummary ? (
        <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', overflowX: 'auto', color: 'var(--rivu-fg-muted, #374151)' }}>
          {JSON.stringify(props.propsSummary, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function renderComponentForExport(params: {
  kernelState: RivuKernelState;
  registry: RivuComponentRegistry;
  componentId: string;
  component: UiComponentV1;
}): ReactNode {
  const registration = params.registry[params.component.type];
  if (!registration) {
    return (
      <ExportUnknownComponentBlock
        title="Unknown component type"
        componentId={params.componentId}
        componentType={params.component.type}
        schemaVersion={params.component.schemaVersion}
        propsSummary={summarizeProps(params.component.props)}
      />
    );
  }

  if (registration.schemaVersion !== params.component.schemaVersion) {
    return (
      <ExportUnknownComponentBlock
        title="Schema version mismatch"
        componentId={params.componentId}
        componentType={params.component.type}
        schemaVersion={params.component.schemaVersion}
        propsSummary={summarizeProps(params.component.props)}
      />
    );
  }

  const status = params.component.status ?? 'ready';
  if (status === 'building') {
    return (
      <div
        style={{
          border: '1px solid var(--rivu-border-muted, #f3f4f6)',
          borderRadius: 12,
          padding: 12,
          background: 'var(--rivu-bg-muted, #fafafa)',
          color: 'var(--rivu-muted, #6b7280)',
          fontSize: 12,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        Building…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        style={{
          border: '1px solid var(--rivu-danger-border, rgba(251, 113, 133, 0.25))',
          borderRadius: 12,
          padding: 12,
          background: 'var(--rivu-danger-bg, rgba(251, 113, 133, 0.2))',
          color: 'var(--rivu-fg, #111827)',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
          fontSize: 12,
        }}
      >
        <div style={{ fontWeight: 650 }}>Component error</div>
        <div style={{ marginTop: 6, opacity: 0.9 }}>
          {params.component.error?.code ? <span>{params.component.error.code}: </span> : null}
          {params.component.error?.message ?? 'Unknown error'}
        </div>
      </div>
    );
  }

  const propsResult = registration.propsSchema.safeParse(params.component.props);
  if (!propsResult.success) {
    return (
      <ExportUnknownComponentBlock
        title="Invalid component props"
        componentId={params.componentId}
        componentType={params.component.type}
        schemaVersion={params.component.schemaVersion}
        propsSummary={summarizeProps(params.component.props)}
      />
    );
  }

  const stateResult = registration.stateSchema ? registration.stateSchema.safeParse(params.component.state ?? {}) : null;
  if (stateResult && !stateResult.success) {
    return (
      <ExportUnknownComponentBlock
        title="Invalid component state"
        componentId={params.componentId}
        componentType={params.component.type}
        schemaVersion={params.component.schemaVersion}
        propsSummary={summarizeProps(params.component.props)}
      />
    );
  }

  const kernel = {
    dispatch: () => ({ status: 'invalid', error: new Error('export kernel is read-only') } as const),
    getState: () => params.kernelState,
    subscribe: () => () => {},
    send: async () => {
      throw new Error('export kernel does not support send()');
    },
  } as const;

  return registration.render({
    kernel: kernel as any,
    componentId: params.componentId,
    componentType: params.component.type,
    schemaVersion: params.component.schemaVersion,
    revision: params.component.revision,
    props: propsResult.data,
    state: stateResult ? stateResult.data : undefined,
  });
}

type ExportHtmlOptions = {
  snapshot: RivuExportSnapshotV1;
  registry?: RivuComponentRegistry;
  title?: string;
};

export function exportHtmlV1(snapshot: RivuExportSnapshotV1): string;
export function exportHtmlV1(options: ExportHtmlOptions): string;
export function exportHtmlV1(arg: RivuExportSnapshotV1 | ExportHtmlOptions): string {
  const snapshot = resolveSnapshot(isJsonObject(arg) && 'snapshot' in arg ? (arg as ExportHtmlOptions).snapshot : arg);
  const registry = (isJsonObject(arg) && 'snapshot' in arg ? (arg as ExportHtmlOptions).registry : undefined) ?? defaultRegistry();
  const title = (isJsonObject(arg) && 'snapshot' in arg ? (arg as ExportHtmlOptions).title : undefined) ?? 'Rivu Viewer Export';

  const kernel = createKernel();
  const r = kernel.dispatch({ seq: 1, event: { type: 'STATE_SNAPSHOT', snapshot: snapshot.sharedState } });
  if (r.status !== 'applied' && r.status !== 'duplicate') {
    throw new Error(`failed to apply STATE_SNAPSHOT: ${r.status}`);
  }

  const kernelState = kernel.getState();

  const messages = snapshot.messages
    .map((m, i) => {
      const id = typeof m?.id === 'string' ? m.id : `msg_${i}`;
      const role = typeof m?.role === 'string' ? m.role : 'unknown';
      const content = typeof m?.content === 'string' ? m.content : '';
      return { id, role, content };
    });

  const doc = (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <style
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --rivu-bg: #ffffff;
                --rivu-bg-muted: #fafafa;
                --rivu-fg: #111827;
                --rivu-fg-muted: #374151;
                --rivu-muted: #6b7280;
                --rivu-border: #e5e7eb;
                --rivu-border-muted: #f3f4f6;
                --rivu-shadow: none;
              }
              body {
                margin: 0;
                padding: 32px 18px;
                font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
                color: var(--rivu-fg);
                background: var(--rivu-bg);
              }
              .container { max-width: 980px; margin: 0 auto; }
              .meta { font-size: 12px; color: var(--rivu-fg-muted); }
              .msg { margin-top: 18px; padding: 14px; border: 1px solid var(--rivu-border); border-radius: 14px; background: var(--rivu-bg); }
              .msgRole { font-weight: 750; font-size: 12px; color: var(--rivu-fg-muted); text-transform: uppercase; letter-spacing: 0.02em; }
              .msgContent { margin-top: 8px; white-space: pre-wrap; line-height: 1.55; }
              .slotTitle { margin-top: 14px; font-size: 12px; color: var(--rivu-fg-muted); font-weight: 650; }
              .mounts { margin-top: 10px; display: flex; flex-direction: column; gap: 10px; }
            `,
          }}
        />
      </head>
      <body>
        <div className="container">
          <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
          <div className="meta" style={{ marginTop: 6 }}>
            {snapshot.schema ? <span>schema: {String(snapshot.schema)} • </span> : null}
            {typeof snapshot.lastSeq === 'number' ? <span>lastSeq: {snapshot.lastSeq} • </span> : null}
            {typeof snapshot.exportedAtMs === 'number' ? <span>exportedAtMs: {snapshot.exportedAtMs}</span> : null}
          </div>

          {messages.map((m) => {
            const inlineMounted = selectMountedUiComponentsV1({ state: kernelState, messageId: m.id, slot: 'inline' });
            const sidebarMounted = selectMountedUiComponentsV1({ state: kernelState, messageId: m.id, slot: 'sidebar' });

            return (
              <div key={m.id} className="msg">
                <div className="msgRole">{m.role}</div>
                <div className="msgContent">{m.content}</div>

                {inlineMounted.length ? (
                  <>
                    <div className="slotTitle">inline</div>
                    <div className="mounts">
                      {inlineMounted.map(({ componentId, component }) => (
                        <div key={componentId}>{renderComponentForExport({ kernelState, registry, componentId, component })}</div>
                      ))}
                    </div>
                  </>
                ) : null}

                {sidebarMounted.length ? (
                  <>
                    <div className="slotTitle">sidebar</div>
                    <div className="mounts">
                      {sidebarMounted.map(({ componentId, component }) => (
                        <div key={componentId}>{renderComponentForExport({ kernelState, registry, componentId, component })}</div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </body>
    </html>
  );

  return `<!doctype html>${renderToStaticMarkup(doc)}`;
}

export function exportChartSvgsV1(options: { snapshot: RivuExportSnapshotV1; registry?: RivuComponentRegistry }): Record<string, string> {
  const snapshot = resolveSnapshot(options.snapshot);
  const registry = options.registry ?? defaultRegistry();

  const kernel = createKernel();
  const r = kernel.dispatch({ seq: 1, event: { type: 'STATE_SNAPSHOT', snapshot: snapshot.sharedState } });
  if (r.status !== 'applied' && r.status !== 'duplicate') {
    throw new Error(`failed to apply STATE_SNAPSHOT: ${r.status}`);
  }

  const state = kernel.getState();
  const ui = (state.sharedState as any).ui as unknown;
  if (!isJsonObject(ui) || !isJsonObject((ui as any).components)) return {};

  const out: Record<string, string> = {};

  for (const [componentId, raw] of Object.entries((ui as any).components as Record<string, unknown>)) {
    const component = raw as UiComponentV1;
    if (!component || component.type !== 'Chart') continue;

    const html = renderToStaticMarkup(<>{renderComponentForExport({ kernelState: state, registry, componentId, component })}</>);
    const start = html.indexOf('<svg');
    if (start < 0) continue;
    const end = html.indexOf('</svg>', start);
    if (end < 0) continue;
    out[componentId] = html.slice(start, end + '</svg>'.length);
  }

  return out;
}

