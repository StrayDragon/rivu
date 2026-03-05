import { readable, type Readable } from 'svelte/store';

import type { OutboxEntry, RivuKernel } from 'rivu-kernel';
import { uiStateV1Schema } from 'rivu-ui-spec';

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

export type ProtocolInspectorSnapshot = {
  lastSeq: number;
  needsResync: boolean;
  resyncReason: 'gap' | 'patch_error' | 'limit_exceeded' | null;
  limitExceeded: { limit: string; max: number; observed: number; path?: string } | null;
  gap: { expectedSeq: number; gotSeq: number } | null;
  outbox: OutboxSummary;
  'sharedState.ui': UiSummary;
};

export type ProtocolInspectorStoreOptions = {
  maxOutboxEntries?: number;
  maxUiComponents?: number;
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

function getSnapshot(kernel: RivuKernel, options: ProtocolInspectorStoreOptions): ProtocolInspectorSnapshot {
  const maxOutboxEntries = options.maxOutboxEntries ?? 20;
  const maxUiComponents = options.maxUiComponents ?? 50;
  const state = kernel.getState();
  return {
    lastSeq: state.lastSeq,
    needsResync: state.needsResync,
    resyncReason: state.resyncReason,
    limitExceeded: state.limitExceeded,
    gap: state.gap,
    outbox: summarizeOutbox(state.outbox, maxOutboxEntries),
    'sharedState.ui': summarizeUiV1((state.sharedState as any)?.ui, maxUiComponents),
  };
}

export function protocolInspectorStore(kernel: RivuKernel, options: ProtocolInspectorStoreOptions = {}): Readable<ProtocolInspectorSnapshot> {
  return readable(getSnapshot(kernel, options), (set) => kernel.subscribe(() => set(getSnapshot(kernel, options))));
}
