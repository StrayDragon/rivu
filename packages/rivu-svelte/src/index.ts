export const RIVU_SVELTE_VERSION = 1 as const;

export { kernelStore } from './kernel-store.js';

export type { ProtocolInspectorSnapshot, ProtocolInspectorStoreOptions } from './protocol-inspector-store.js';
export { protocolInspectorStore } from './protocol-inspector-store.js';

export { createClientRequestId } from './client-request-id.js';

export type { RivuSvelteComponentProps, RivuSvelteComponentRegistration, RivuSvelteComponentRegistry } from './registry.js';
export { createRegistry } from './registry.js';

export { componentRendererStore } from './component-renderer-store.js';

export { buildUiV1Capabilities } from './ui-v1-capabilities.js';

export type { ResolveUiComponentResult } from './resolve.js';
export { resolveUiComponentV1 } from './resolve.js';

export { CHART_COMPONENT_TYPE, CHART_SCHEMA_VERSION, chartRegistrationV1, Chart } from './ui-kit/chart.js';
