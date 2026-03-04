import { readable, type Readable } from 'svelte/store';

import type { RivuKernel, RivuKernelState } from 'rivu-kernel';

export function kernelStore(kernel: RivuKernel): Readable<RivuKernelState> {
  return readable(kernel.getState(), (set) => kernel.subscribe(() => set(kernel.getState())));
}

