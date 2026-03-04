import { derived, type Readable } from 'svelte/store';

import type { RivuKernel } from 'rivu-kernel';

import type { RivuSvelteHost } from './registry.js';
import { kernelStore } from './kernel-store.js';
import { resolveUiComponentV1, type ResolveUiComponentResult } from './resolve.js';

export function componentRendererStore(params: {
  kernel: RivuKernel;
  host: RivuSvelteHost;
  componentId: string;
}): Readable<ResolveUiComponentResult> {
  const stateStore = kernelStore(params.kernel);
  return derived(stateStore, (state) =>
    resolveUiComponentV1({
      state,
      host: params.host,
      componentId: params.componentId,
    }),
  );
}
