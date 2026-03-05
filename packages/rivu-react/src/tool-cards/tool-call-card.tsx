import type { CSSProperties, ReactNode } from 'react';
import type { RivuKernel } from 'rivu-kernel';

import { useKernelState } from '../use-kernel-state.js';

export type ToolCallCardSlots = {
  Header?: (args: { title: ReactNode; status: string; toolCallId: string }) => ReactNode;
  Body?: (args: { argsText: string; toolCallId: string }) => ReactNode;
  Actions?: (args: { toolCallId: string }) => ReactNode;
};

export type ToolCallCardProps = {
  kernel: RivuKernel;
  toolCallId: string;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  slots?: ToolCallCardSlots | undefined;
};

export function ToolCallCard(props: ToolCallCardProps) {
  const toolCall = useKernelState(props.kernel, (s) => s.toolCalls[props.toolCallId] ?? null);

  const title = toolCall ? toolCall.name || '(unnamed tool)' : '(missing tool call)';
  const status = toolCall?.status ?? 'missing';
  const argsText = toolCall?.args ?? '';

  const rootStyle: CSSProperties = {
    border: '1px solid var(--rivu-border-muted, #e5e7eb)',
    borderRadius: 'var(--rivu-radius-sm, 10px)',
    background: 'var(--rivu-bg, #fff)',
    boxShadow: 'var(--rivu-shadow, 0 1px 2px rgba(0,0,0,0.06))',
    padding: 'var(--rivu-space-4, 14px)',
    color: 'var(--rivu-fg, #111827)',
    ...props.style,
  };

  const headerNode = props.slots?.Header ? (
    props.slots.Header({ title, status, toolCallId: props.toolCallId })
  ) : (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ fontWeight: 700, fontSize: 'var(--rivu-font-size-base, 14px)' }}>{title}</div>
      <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: 'var(--rivu-fg-muted, #374151)' }}>{status}</div>
    </div>
  );

  const bodyNode = props.slots?.Body ? (
    props.slots.Body({ argsText, toolCallId: props.toolCallId })
  ) : (
    <pre
      style={{
        margin: 'var(--rivu-space-3, 12px) 0 0',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: 'var(--rivu-font-size-sm, 12px)',
        color: 'var(--rivu-fg-muted, #374151)',
      }}
    >
      {argsText || '(no args)'}
    </pre>
  );

  const actionsNode = props.slots?.Actions ? props.slots.Actions({ toolCallId: props.toolCallId }) : null;

  return (
    <section className={props.className} style={rootStyle} aria-label={`Tool call: ${props.toolCallId}`}>
      {headerNode}
      {bodyNode}
      {actionsNode ? <div style={{ marginTop: 'var(--rivu-space-3, 12px)' }}>{actionsNode}</div> : null}
    </section>
  );
}
