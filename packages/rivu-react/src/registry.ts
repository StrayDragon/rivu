import type { ZodType } from 'zod';
import type { ReactNode } from 'react';
import type { RivuKernel } from 'rivu-kernel';

import { mergeRenderHooks, type RivuRenderHooks } from './render-hooks.js';
import type { RivuSlotProps } from './slot-props.js';

export type RivuHost = {
  registry: RivuComponentRegistry;
  renderHooks: RivuRenderHooks;
  slotProps: RivuSlotProps;
};

export type RivuComponentRegistration<TProps = unknown, TState = unknown> = {
  schemaVersion: number;
  propsSchema: ZodType<TProps>;
  stateSchema?: ZodType<TState>;
  render: (params: {
    kernel: RivuKernel;
    host: RivuHost;
    componentId: string;
    componentType: string;
    schemaVersion: number;
    revision: number;
    props: TProps;
    state: TState | undefined;
  }) => ReactNode;
};

export type RivuComponentRegistry = Record<string, RivuComponentRegistration<any, any>>;

export function createRegistry(registry: RivuComponentRegistry): RivuComponentRegistry {
  return registry;
}

export function createHost(params: {
  registry: RivuComponentRegistry;
  renderHooks?: Partial<RivuRenderHooks>;
  slotProps?: RivuSlotProps;
}): RivuHost {
  return {
    registry: params.registry,
    renderHooks: mergeRenderHooks(params.renderHooks),
    slotProps: params.slotProps ?? {},
  };
}
