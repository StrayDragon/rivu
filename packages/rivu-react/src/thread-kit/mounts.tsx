import type { CSSProperties, ReactNode } from 'react';
import type { RivuKernel } from 'rivu-kernel';

import { selectMountedUiComponentsV1 } from 'rivu-kernel';
import { useMemo } from 'react';

import type { RivuComponentRegistry } from '../registry.js';
import { createHost } from '../registry.js';
import { ComponentRenderer } from '../component-renderer.js';
import { useKernelState } from '../use-kernel-state.js';
import type { RivuRenderHooks } from '../render-hooks.js';
import type { RivuSlotProps } from '../slot-props.js';

export type MountsSlots = {
  Container?: (args: { children: ReactNode; messageId: string; slot: 'inline' | 'sidebar' }) => ReactNode;
};

export type MountsProps = {
  kernel: RivuKernel;
  registry: RivuComponentRegistry;
  renderHooks?: Partial<RivuRenderHooks> | undefined;
  slotProps?: RivuSlotProps | undefined;
  messageId: string;
  slot: 'inline' | 'sidebar';
  className?: string | undefined;
  style?: CSSProperties | undefined;
  slots?: MountsSlots | undefined;
};

export function Mounts(props: MountsProps) {
  const mountedIds = useKernelState(props.kernel, (state) =>
    selectMountedUiComponentsV1({ state, messageId: props.messageId, slot: props.slot }).map((m) => m.componentId),
  );
  const host = useMemo(
    () =>
      createHost({
        registry: props.registry,
        renderHooks: props.renderHooks,
        slotProps: props.slotProps,
      }),
    [props.registry, props.renderHooks, props.slotProps],
  );

  const rootStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--rivu-space-3, 12px)',
    ...props.style,
  };

  const body = mountedIds.length ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--rivu-space-3, 12px)' }}>
      {mountedIds.map((componentId) => (
        <ComponentRenderer key={componentId} kernel={props.kernel} host={host} componentId={componentId} />
      ))}
    </div>
  ) : null;

  return (
    <div className={props.className} style={rootStyle}>
      {body
        ? props.slots?.Container
          ? props.slots.Container({ children: body, messageId: props.messageId, slot: props.slot })
          : body
        : null}
    </div>
  );
}
