import { createContext, useContext, type ReactNode } from 'react';

import type { RivuKernel } from 'rivu-kernel';

import type { RivuComponentRegistry } from './registry.js';

type RivuContextValue = {
  kernel: RivuKernel;
  registry: RivuComponentRegistry;
};

const RivuContext = createContext<RivuContextValue | null>(null);

export type RivuProviderProps = RivuContextValue & { children: ReactNode };

export function RivuProvider(props: RivuProviderProps) {
  return (
    <RivuContext.Provider value={{ kernel: props.kernel, registry: props.registry }}>
      {props.children}
    </RivuContext.Provider>
  );
}

export function useRivuContext(): RivuContextValue {
  const value = useContext(RivuContext);
  if (!value) {
    throw new Error('RivuProvider is missing');
  }
  return value;
}
