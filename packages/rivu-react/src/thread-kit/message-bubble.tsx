import type { CSSProperties, ReactNode } from 'react';
import type { RivuKernelMessage } from 'rivu-kernel';

export type MessageBubbleSlots = {
  Header?: (args: { message: RivuKernelMessage }) => ReactNode;
  Content?: (args: { message: RivuKernelMessage }) => ReactNode;
  Footer?: (args: { message: RivuKernelMessage }) => ReactNode;
};

export type MessageBubbleProps = {
  message: RivuKernelMessage;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  slots?: MessageBubbleSlots | undefined;
};

function roleLabel(role: RivuKernelMessage['role']) {
  return role === 'assistant' ? 'assistant' : role === 'user' ? 'user' : role;
}

export function MessageBubble(props: MessageBubbleProps) {
  const muted = 'var(--rivu-fg-muted, #374151)';
  const isStreaming = props.message.status === 'streaming';

  const rootStyle: CSSProperties = {
    border: '1px solid var(--rivu-border-muted, #e5e7eb)',
    borderRadius: 'var(--rivu-radius, 12px)',
    background: 'var(--rivu-bg, #fff)',
    boxShadow: 'var(--rivu-shadow, 0 1px 2px rgba(0,0,0,0.06))',
    padding: 'var(--rivu-space-4, 14px)',
    ...props.style,
  };

  const header = props.slots?.Header ? (
    props.slots.Header({ message: props.message })
  ) : (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
      <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: muted, fontWeight: 700 }}>{roleLabel(props.message.role)}</div>
      <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: muted }}>{isStreaming ? 'streaming' : 'done'}</div>
    </div>
  );

  const content = props.slots?.Content ? (
    props.slots.Content({ message: props.message })
  ) : (
    <div style={{ marginTop: 'var(--rivu-space-3, 12px)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
      {props.message.content}
    </div>
  );

  const footer = props.slots?.Footer ? props.slots.Footer({ message: props.message }) : null;

  return (
    <article className={props.className} style={rootStyle} aria-label={`Message ${props.message.id}`}>
      {header}
      {content}
      {footer ? <div style={{ marginTop: 'var(--rivu-space-3, 12px)' }}>{footer}</div> : null}
    </article>
  );
}
