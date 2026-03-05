import type { CSSProperties, ReactNode } from 'react';
import type { RivuKernel } from 'rivu-kernel';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useKernelState } from '../use-kernel-state.js';
import type { RivuComponentRegistry } from '../registry.js';
import type { RivuRenderHooks } from '../render-hooks.js';
import type { RivuSlotProps } from '../slot-props.js';

import { ToolCallCard, type ToolCallCardSlots } from '../tool-cards/tool-call-card.js';
import { ToolResultCard, type ToolResultCardSlots } from '../tool-cards/tool-result-card.js';
import { MessageBubble, type MessageBubbleSlots } from './message-bubble.js';
import { Mounts } from './mounts.js';
import { RunStatus } from './run-status.js';

export type ThreadViewSlots = {
  MessageBubble?: MessageBubbleSlots;
  ToolCallCard?: ToolCallCardSlots;
  ToolResultCard?: ToolResultCardSlots;
  InlineMounts?: (args: { messageId: string; children: ReactNode }) => ReactNode;
  SidebarMounts?: (args: { messageId: string; children: ReactNode }) => ReactNode;
};

export type ThreadViewProps = {
  kernel: RivuKernel;
  registry: RivuComponentRegistry;
  renderHooks?: Partial<RivuRenderHooks> | undefined;
  slotProps?: RivuSlotProps | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  sidebar?: boolean | undefined;
  selectedMessageId?: string | undefined;
  onSelectMessageId?: ((messageId: string) => void) | undefined;
  slots?: ThreadViewSlots | undefined;
};

export function ThreadView(props: ThreadViewProps) {
  const snapshot = useKernelState(props.kernel, (s) => ({
    messageOrder: s.messageOrder,
    messages: s.messages,
    toolCalls: s.toolCalls,
    toolCallOrder: s.toolCallOrder,
  }));

  const [uncontrolledSelected, setUncontrolledSelected] = useState<string | null>(null);

  const latestMessageId = snapshot.messageOrder.length ? snapshot.messageOrder[snapshot.messageOrder.length - 1]! : null;
  const selectedMessageId = props.selectedMessageId ?? uncontrolledSelected ?? latestMessageId;

  useEffect(() => {
    if (props.selectedMessageId) return;
    if (!selectedMessageId || !snapshot.messages[selectedMessageId]) {
      setUncontrolledSelected(latestMessageId);
    }
  }, [latestMessageId, props.selectedMessageId, selectedMessageId, snapshot.messages]);

  const onSelectMessageId = useCallback(
    (messageId: string) => {
      if (props.onSelectMessageId) props.onSelectMessageId(messageId);
      else setUncontrolledSelected(messageId);
    },
    [props.onSelectMessageId],
  );

  const toolCallsByParent = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const toolCallId of snapshot.toolCallOrder) {
      const toolCall = snapshot.toolCalls[toolCallId];
      if (!toolCall?.parentMessageId) continue;
      const list = map.get(toolCall.parentMessageId) ?? [];
      list.push(toolCallId);
      map.set(toolCall.parentMessageId, list);
    }
    return map;
  }, [snapshot.toolCallOrder, snapshot.toolCalls]);

  const toolResultMessageIds = useMemo(() => {
    const ids = new Set<string>();
    for (const toolCallId of snapshot.toolCallOrder) {
      const toolCall = snapshot.toolCalls[toolCallId];
      if (toolCall?.resultMessageId) ids.add(toolCall.resultMessageId);
    }
    return ids;
  }, [snapshot.toolCallOrder, snapshot.toolCalls]);

  const orphanToolCallIds = useMemo(() => {
    const ids: string[] = [];
    for (const toolCallId of snapshot.toolCallOrder) {
      const toolCall = snapshot.toolCalls[toolCallId];
      if (!toolCall?.parentMessageId) ids.push(toolCallId);
    }
    return ids;
  }, [snapshot.toolCallOrder, snapshot.toolCalls]);

  const rootStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: props.sidebar ? 'minmax(0, 1fr) 360px' : 'minmax(0, 1fr)',
    gap: 'var(--rivu-space-4, 14px)',
    alignItems: 'start',
    ...props.style,
  };

  const main = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rivu-space-3, 12px)' }}>
      <RunStatus kernel={props.kernel} />
      {snapshot.messageOrder.map((messageId) => {
        const message = snapshot.messages[messageId];
        if (!message) return null;
        if (message.role === 'tool' && toolResultMessageIds.has(messageId)) return null;
        const toolCallIdsForMessage = toolCallsByParent.get(messageId) ?? [];
        const isSelected = !!selectedMessageId && messageId === selectedMessageId;
        return (
          <div key={messageId} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rivu-space-3, 12px)' }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelectMessageId(messageId)}
              style={{
                outline: 'none',
                borderRadius: 'var(--rivu-radius, 12px)',
                boxShadow: isSelected ? '0 0 0 2px var(--rivu-border, #d1d5db)' : undefined,
              }}
            >
              <MessageBubble message={message} slots={props.slots?.MessageBubble} />
            </div>

            <Mounts
              kernel={props.kernel}
              registry={props.registry}
              renderHooks={props.renderHooks}
              slotProps={props.slotProps}
              messageId={messageId}
              slot="inline"
              slots={
                props.slots?.InlineMounts
                  ? {
                      Container: ({ children }) => props.slots!.InlineMounts!({ messageId, children }),
                    }
                  : undefined
              }
            />

            {toolCallIdsForMessage.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rivu-space-3, 12px)' }}>
                {toolCallIdsForMessage.map((toolCallId) => (
                  <div key={toolCallId} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rivu-space-3, 12px)' }}>
                    <ToolCallCard kernel={props.kernel} toolCallId={toolCallId} slots={props.slots?.ToolCallCard} />
                    <ToolResultCard kernel={props.kernel} toolCallId={toolCallId} slots={props.slots?.ToolResultCard} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      {orphanToolCallIds.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rivu-space-3, 12px)' }}>
          {orphanToolCallIds.map((toolCallId) => (
            <div key={toolCallId} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rivu-space-3, 12px)' }}>
              <ToolCallCard kernel={props.kernel} toolCallId={toolCallId} slots={props.slots?.ToolCallCard} />
              <ToolResultCard kernel={props.kernel} toolCallId={toolCallId} slots={props.slots?.ToolResultCard} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );

  const sidebar = props.sidebar ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rivu-space-3, 12px)' }}>
      <div style={{ fontWeight: 750, fontSize: 'var(--rivu-font-size-sm, 12px)', color: 'var(--rivu-fg-muted, #374151)' }}>Sidebar mounts</div>
      {selectedMessageId ? (
        <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: 'var(--rivu-fg-muted, #374151)' }}>{selectedMessageId}</div>
      ) : null}
      {selectedMessageId ? (
        <Mounts
          kernel={props.kernel}
          registry={props.registry}
          renderHooks={props.renderHooks}
          slotProps={props.slotProps}
          messageId={selectedMessageId}
          slot="sidebar"
          slots={
            props.slots?.SidebarMounts
              ? {
                  Container: ({ children }) => props.slots!.SidebarMounts!({ messageId: selectedMessageId, children }),
                }
              : undefined
          }
        />
      ) : (
        <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: 'var(--rivu-fg-muted, #374151)' }}>No messages.</div>
      )}
    </div>
  ) : null;

  return (
    <div className={props.className} style={rootStyle}>
      {main}
      {sidebar ?? null}
    </div>
  );
}
