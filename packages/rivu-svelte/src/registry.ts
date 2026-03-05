import type { ZodType } from 'zod';
import type { Component } from 'svelte';
import type { RivuKernel } from 'rivu-kernel';

export type RivuSvelteComponentProps<TProps, TState> = {
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
