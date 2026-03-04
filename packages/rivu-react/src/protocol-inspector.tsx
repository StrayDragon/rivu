import type { OutboxEntry, RivuKernel } from 'rivu-kernel';
import { uiStateV1Schema } from 'rivu-ui-spec';

import { useKernelState } from './use-kernel-state.js';

export type ProtocolInspectorProps = {
  kernel: RivuKernel;
  maxOutboxEntries?: number;
  maxUiComponents?: number;
};

type OutboxSummary = {
  total: number;
  pending: number;
  acked: number;
  failed: number;
  entries: Array<Pick<OutboxEntry, 'clientRequestId' | 'status' | 'createdAtMs' | 'ackedAtMs' | 'failedAtMs'>>;
};

type UiSummary =
  | {
      ok: true;
      v: 1;
      componentCount: number;
      mounted: Array<{ componentId: string; type: string; mountCount: number }>;
      components: Array<{ componentId: string; type: string; schemaVersion: number; revision: number; mounts: unknown[] }>;
    }
  | {
      ok: false;
      error: 'invalid_ui_state';
      issues: unknown[];
    };

function summarizeOutbox(outbox: Record<string, OutboxEntry>, maxOutboxEntries: number): OutboxSummary {
  const entries = Object.values(outbox);
  let pending = 0;
  let acked = 0;
  let failed = 0;
  for (const e of entries) {
    if (e.status === 'pending') pending += 1;
    else if (e.status === 'acked') acked += 1;
    else if (e.status === 'failed') failed += 1;
  }

  const recent = [...entries]
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .slice(0, maxOutboxEntries)
    .map((e) => ({
      clientRequestId: e.clientRequestId,
      status: e.status,
      createdAtMs: e.createdAtMs,
      ackedAtMs: e.ackedAtMs,
      failedAtMs: e.failedAtMs,
    }));

  return { total: entries.length, pending, acked, failed, entries: recent };
}

function summarizeUiV1(uiRaw: unknown, maxUiComponents: number): UiSummary {
  const parsed = uiStateV1Schema.safeParse(uiRaw);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_ui_state', issues: parsed.error.issues };
  }

  const ui = parsed.data;
  const components = Object.entries(ui.components)
    .slice(0, maxUiComponents)
    .map(([componentId, component]) => ({
      componentId,
      type: component.type,
      schemaVersion: component.schemaVersion,
      revision: component.revision,
      mounts: component.mounts,
    }));

  const mounted = Object.entries(ui.components)
    .filter(([, c]) => c.mounts.length > 0)
    .slice(0, maxUiComponents)
    .map(([componentId, c]) => ({ componentId, type: c.type, mountCount: c.mounts.length }));

  return {
    ok: true,
    v: 1,
    componentCount: Object.keys(ui.components).length,
    mounted,
    components,
  };
}

export function ProtocolInspector(props: ProtocolInspectorProps) {
  const maxOutboxEntries = props.maxOutboxEntries ?? 20;
  const maxUiComponents = props.maxUiComponents ?? 50;

  const info = useKernelState(props.kernel, (s) => ({
    lastSeq: s.lastSeq,
    needsResync: s.needsResync,
    resyncReason: s.resyncReason,
    limitExceeded: s.limitExceeded,
    gap: s.gap,
    outbox: summarizeOutbox(s.outbox, maxOutboxEntries),
    'sharedState.ui': summarizeUiV1((s.sharedState as any)?.ui, maxUiComponents),
  }));

  return (
    <div
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 'var(--rivu-font-size-sm, 12px)',
      }}
    >
      <div style={{ fontWeight: 750, marginBottom: 6 }}>ProtocolInspector</div>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(info, null, 2)}</pre>
    </div>
  );
}
