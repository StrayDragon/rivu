import type { CSSProperties, ReactNode } from 'react';
import type { RivuKernel } from 'rivu-kernel';

import { useKernelState } from '../use-kernel-state.js';
import { MessageBubble, type MessageBubbleSlots } from './message-bubble.js';

export type MessageListSlots = {
  Message?: (args: { messageId: string }) => ReactNode;
  MessageBubble?: MessageBubbleSlots;
};

export type MessageListProps = {
  kernel: RivuKernel;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  slots?: MessageListSlots | undefined;
};

export function MessageList(props: MessageListProps) {
  const snapshot = useKernelState(props.kernel, (s) => ({
    messageOrder: s.messageOrder,
    messages: s.messages,
  }));

  const rootStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--rivu-space-3, 12px)',
    ...props.style,
  };

  return (
    <div className={props.className} style={rootStyle} aria-label="Message list">
      {snapshot.messageOrder.map((messageId) => {
        const message = snapshot.messages[messageId];
        if (!message) return null;
        if (props.slots?.Message) return <div key={messageId}>{props.slots.Message({ messageId })}</div>;
        return <MessageBubble key={messageId} message={message} slots={props.slots?.MessageBubble} />;
      })}
    </div>
  );
}
