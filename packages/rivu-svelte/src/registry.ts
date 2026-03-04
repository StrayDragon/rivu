import type { ZodType } from 'zod';
import type { Component } from 'svelte';
import type { RivuKernel } from 'rivu-kernel';

import { mergeRenderHooks, type RivuRenderHooks } from './render-hooks.js';
import type { RivuSlotProps } from './slot-props.js';

export type RivuSvelteHost = {
  registry: RivuSvelteComponentRegistry;
  renderHooks: RivuRenderHooks;
  slotProps: RivuSlotProps;
};

export type RivuSvelteComponentProps<TProps, TState> = {
  host: RivuSvelteHost;
  kernel?: RivuKernel;
  componentId: string;
  revision: number;
  hasState: boolean;
  props: TProps;
  state: TState | undefined;
};

export type RivuSvelteComponentRegistration<TProps = unknown, TState = unknown> = {
  schemaVersion: number;
  propsSchema: ZodType<TProps>;
  stateSchema?: ZodType<TState>;
  Component: Component<RivuSvelteComponentProps<TProps, TState>>;
};

export type RivuSvelteComponentRegistry = Record<string, RivuSvelteComponentRegistration<any, any>>;

export function createRegistry(registry: RivuSvelteComponentRegistry): RivuSvelteComponentRegistry {
  return registry;
}

export function createHost(params: {
  registry: RivuSvelteComponentRegistry;
  renderHooks?: Partial<RivuRenderHooks>;
  slotProps?: RivuSlotProps;
}): RivuSvelteHost {
  return {
    registry: params.registry,
    renderHooks: mergeRenderHooks(params.renderHooks),
    slotProps: params.slotProps ?? {},
  };
}
