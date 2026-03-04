export const RIVU_REACT_VERSION = 1 as const;

export type { RivuComponentRegistration, RivuComponentRegistry, RivuHost } from './registry.js';
export { createHost, createRegistry } from './registry.js';

export type { RivuComponentMeta, RivuCodeMeta, RivuFormatMeta, RivuMarkdownMeta, RivuRenderHooks } from './render-hooks.js';
export { defaultRenderHooks, mergeRenderHooks } from './render-hooks.js';

export type { RivuSlotPropOverrides, RivuSlotProps } from './slot-props.js';
export { applySlotProps } from './slot-props.js';

export type { UseKernelStateSelector } from './use-kernel-state.js';
export { useKernelState } from './use-kernel-state.js';

export type { ComponentRendererProps } from './component-renderer.js';
export { ComponentRenderer } from './component-renderer.js';

export type { ComponentSkeletonProps } from './component-skeleton.js';
export { ComponentSkeleton } from './component-skeleton.js';

export type { ComponentErrorCardProps, ComponentErrorV1 } from './component-error-card.js';
export { ComponentErrorCard } from './component-error-card.js';

export type { ProtocolInspectorProps } from './protocol-inspector.js';
export { ProtocolInspector } from './protocol-inspector.js';

export type { UnknownComponentCardProps } from './unknown-component-card.js';
export { UnknownComponentCard } from './unknown-component-card.js';

export type { RivuProviderProps } from './provider.js';
export { RivuProvider, useRivuContext } from './provider.js';

export { createClientRequestId } from './client-request-id.js';

export { buildUiV1Capabilities } from './ui-v1-capabilities.js';

export type { RivuExportMessageV1, RivuExportSnapshotV1, RivuExportToolCallV1 } from './viewer-export.js';
export { exportChartSvgsV1, exportHtmlV1 } from './viewer-export.js';
export { exportPdfV1 } from './viewer-export-pdf.js';

export * from './ui-kit/viewer.js';
export * from './ui-kit/workflow.js';
