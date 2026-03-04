import type { ZodType } from 'zod';
import type { ReactNode } from 'react';
import type { RivuKernel } from 'rivu-kernel';

export type RivuComponentRegistration<TProps = unknown, TState = unknown> = {
  schemaVersion: number;
  propsSchema: ZodType<TProps>;
  stateSchema?: ZodType<TState>;
  render: (params: {
    kernel: RivuKernel;
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
