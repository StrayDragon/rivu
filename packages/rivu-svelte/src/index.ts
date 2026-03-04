export const RIVU_SVELTE_VERSION = 1 as const;

export { kernelStore } from './kernel-store.js';

export type { ProtocolInspectorSnapshot, ProtocolInspectorStoreOptions } from './protocol-inspector-store.js';
export { protocolInspectorStore } from './protocol-inspector-store.js';

export type { RivuSvelteComponentProps, RivuSvelteComponentRegistration, RivuSvelteComponentRegistry } from './registry.js';
export { createRegistry } from './registry.js';

export { componentRendererStore } from './component-renderer-store.js';

export type { ResolveUiComponentResult } from './resolve.js';
export { resolveUiComponentV1 } from './resolve.js';
