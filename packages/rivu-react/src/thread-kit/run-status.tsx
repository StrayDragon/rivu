import type { CSSProperties } from 'react';
import type { RivuKernel } from 'rivu-kernel';

import { useKernelState } from '../use-kernel-state.js';

export type RunStatusProps = {
  kernel: RivuKernel;
  className?: string | undefined;
  style?: CSSProperties | undefined;
};

export function RunStatus(props: RunStatusProps) {
  const snap = useKernelState(props.kernel, (s) => ({
    lastSeq: s.lastSeq,
    needsResync: s.needsResync,
    resyncReason: s.resyncReason,
    gap: s.gap,
    limitExceeded: s.limitExceeded,
  }));

  const rootStyle: CSSProperties = {
    border: '1px solid var(--rivu-border-muted, #e5e7eb)',
    borderRadius: 'var(--rivu-radius-sm, 10px)',
    background: 'var(--rivu-bg-muted, #f9fafb)',
    padding: 'var(--rivu-space-3, 12px)',
    color: 'var(--rivu-fg, #111827)',
    ...props.style,
  };

  if (!snap.needsResync) {
    return (
      <div className={props.className} style={rootStyle}>
        <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: 'var(--rivu-fg-muted, #374151)' }}>
          lastSeq {snap.lastSeq} • ok
        </div>
      </div>
    );
  }

  const details =
    snap.resyncReason === 'gap'
      ? snap.gap
        ? `gap expected=${snap.gap.expectedSeq} got=${snap.gap.gotSeq}`
        : 'gap'
      : snap.resyncReason === 'patch_error'
        ? 'patch error'
        : snap.resyncReason === 'limit_exceeded'
          ? `limit exceeded: ${snap.limitExceeded?.limit ?? 'unknown'}`
          : 'needs resync';

  return (
    <div className={props.className} style={rootStyle} role="status">
      <div style={{ fontWeight: 700, fontSize: 'var(--rivu-font-size-sm, 12px)', color: 'var(--rivu-danger-fg, #b91c1c)' }}>
        needs resync
      </div>
      <div style={{ marginTop: 4, fontSize: 'var(--rivu-font-size-sm, 12px)', color: 'var(--rivu-fg-muted, #374151)' }}>
        lastSeq {snap.lastSeq} • {details}
      </div>
    </div>
  );
}
