import { useRef, useSyncExternalStore } from 'react';

import type { RivuKernel, RivuKernelState } from 'rivu-kernel';

export type UseKernelStateSelector<T> = (state: RivuKernelState) => T;

export function useKernelState<T>(kernel: RivuKernel, selector: UseKernelStateSelector<T>): T {
  const cacheRef = useRef<{ state: RivuKernelState; selected: T } | null>(null);

  const getSnapshot = () => {
    const nextState = kernel.getState();
    const cached = cacheRef.current;
    if (cached && cached.state === nextState) return cached.selected;
    const selected = selector(nextState);
    cacheRef.current = { state: nextState, selected };
    return selected;
  };

  return useSyncExternalStore(
    kernel.subscribe,
    getSnapshot,
    getSnapshot,
  );
}
