import type { OutboxEntry, RivuKernel } from 'rivu-kernel';
import { uiStateV1Schema } from 'rivu-ui-spec';
import { useCallback, useMemo, useState } from 'react';

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
  entries: Array<{
    clientRequestId: string;
    status: OutboxEntry['status'];
    createdAtMs: number;
    attemptCount: number;
    lastAttemptAtMs: number;
    ackedAtMs: number | null;
    failedAtMs: number | null;
    errorMessage: string | null;
  }>;
};

function formatOutboxError(error: unknown): string {
  if (!error) return '';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

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
    .sort((a, b) => b.lastAttemptAtMs - a.lastAttemptAtMs)
    .slice(0, maxOutboxEntries)
    .map((e) => ({
      clientRequestId: e.clientRequestId,
      status: e.status,
      createdAtMs: e.createdAtMs,
      attemptCount: e.attemptCount,
      lastAttemptAtMs: e.lastAttemptAtMs,
      ackedAtMs: e.ackedAtMs,
      failedAtMs: e.failedAtMs,
      errorMessage: e.error ? formatOutboxError(e.error) : null,
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

  const [actionError, setActionError] = useState<string | null>(null);
  const entries = useKernelState(props.kernel, (s) =>
    Object.values(s.outbox)
      .sort((a, b) => b.lastAttemptAtMs - a.lastAttemptAtMs)
      .slice(0, maxOutboxEntries),
  );

  const info = useKernelState(props.kernel, (s) => ({
    lastSeq: s.lastSeq,
    needsResync: s.needsResync,
    resyncReason: s.resyncReason,
    limitExceeded: s.limitExceeded,
    gap: s.gap,
    outbox: summarizeOutbox(s.outbox, maxOutboxEntries),
    'sharedState.ui': summarizeUiV1((s.sharedState as any)?.ui, maxUiComponents),
  }));

  const failedEntries = useMemo(() => entries.filter((e) => e.status === 'failed'), [entries]);

  const onRetry = useCallback(
    async (clientRequestId: string) => {
      setActionError(null);
      try {
        await props.kernel.retry(clientRequestId);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err));
      }
    },
    [props.kernel],
  );

  const onClear = useCallback(() => {
    setActionError(null);
    props.kernel.clearOutbox({ keepLastN: maxOutboxEntries });
  }, [props.kernel, maxOutboxEntries]);

  return (
    <div
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 'var(--rivu-font-size-sm, 12px)',
      }}
    >
      <div style={{ fontWeight: 750, marginBottom: 6 }}>ProtocolInspector</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ color: 'var(--rivu-fg-muted, #374151)' }}>
          outbox: {info.outbox.total} (pending {info.outbox.pending}, acked {info.outbox.acked}, failed {info.outbox.failed})
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={info.outbox.total <= maxOutboxEntries}
          style={{
            border: '1px solid var(--rivu-border-muted, #e5e7eb)',
            borderRadius: 'var(--rivu-radius-sm, 10px)',
            background: 'var(--rivu-bg, #fff)',
            padding: '4px 8px',
            cursor: info.outbox.total <= maxOutboxEntries ? 'not-allowed' : 'pointer',
          }}
          title={`Keep last ${maxOutboxEntries} entries`}
        >
          Clear (keep last {maxOutboxEntries})
        </button>
      </div>
      {actionError ? <div style={{ marginBottom: 8, color: 'var(--rivu-danger-fg, #b91c1c)' }}>action error: {actionError}</div> : null}
      {failedEntries.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {failedEntries.map((e) => (
            <div key={e.clientRequestId} style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 650 }}>{e.clientRequestId}</span>
              <span style={{ color: 'var(--rivu-fg-muted, #374151)' }}>attempts {e.attemptCount}</span>
              <span style={{ color: 'var(--rivu-danger-fg, #b91c1c)' }}>failed</span>
              {e.failedAtMs != null ? (
                <span style={{ color: 'var(--rivu-fg-muted, #374151)' }}>at {new Date(e.failedAtMs).toLocaleTimeString()}</span>
              ) : null}
              {e.error ? <span style={{ color: 'var(--rivu-fg-muted, #374151)' }}>error: {formatOutboxError(e.error)}</span> : null}
              <button
                type="button"
                onClick={() => void onRetry(e.clientRequestId)}
                style={{
                  border: '1px solid var(--rivu-border-muted, #e5e7eb)',
                  borderRadius: 'var(--rivu-radius-sm, 10px)',
                  background: 'var(--rivu-bg, #fff)',
                  padding: '4px 8px',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(info, null, 2)}</pre>
    </div>
  );
}
