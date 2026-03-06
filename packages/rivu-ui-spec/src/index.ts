export const RIVU_UI_SPEC_VERSION = 1 as const;

export type { UiComponentV1, UiMountV1, UiStateV1 } from './state-ui.js';
export { uiComponentV1Schema, uiMountV1Schema, uiStateV1Schema } from './state-ui.js';

export type { UiDataRefV1, UiDatasetV1 } from './ui-datasets.js';
export { uiDataRefV1Schema, uiDatasetV1Schema } from './ui-datasets.js';

export type { A2uiCreateOpV1, A2uiMountOpV1, A2uiMountV1, A2uiOpV1, A2uiRemoveOpV1, A2uiUnmountOpV1, A2uiUpdateOpV1, A2uiV1 } from './a2ui-v1.js';
export { a2uiOpV1Schema, a2uiV1Schema } from './a2ui-v1.js';

export type { ChartEncodingV1, ChartMarkV1, ChartOptionsV1, ChartPropsV1 } from './ui-chart.js';
export { chartEncodingV1Schema, chartMarkV1Schema, chartOptionsV1Schema, chartPropsV1Schema } from './ui-chart.js';

export type { PivotTableAggV1, PivotTableOptionsV1, PivotTablePropsV1 } from './ui-pivot-table.js';
export { pivotTableAggV1Schema, pivotTableOptionsV1Schema, pivotTablePropsV1Schema } from './ui-pivot-table.js';

export type { HeatmapEncodingV1, HeatmapOptionsV1, HeatmapPropsV1 } from './ui-heatmap.js';
export { heatmapEncodingV1Schema, heatmapOptionsV1Schema, heatmapPropsV1Schema } from './ui-heatmap.js';

export type { DiffViewLimitsV1, DiffViewModeV1, DiffViewPropsV1 } from './ui-diff-view.js';
export { diffViewLimitsV1Schema, diffViewModeV1Schema, diffViewPropsV1Schema } from './ui-diff-view.js';

export type {
  MultiStepWizardFieldOptionV1,
  MultiStepWizardFieldTypeV1,
  MultiStepWizardFieldV1,
  MultiStepWizardPropsV1,
  MultiStepWizardStateV1,
  MultiStepWizardStepV1,
  WizardEventNameV1,
  WizardEventPayloadV1,
  WizardSetFieldPayloadV1,
} from './ui-multi-step-wizard.js';
export {
  multiStepWizardFieldOptionV1Schema,
  multiStepWizardFieldTypeV1Schema,
  multiStepWizardFieldV1Schema,
  multiStepWizardPropsV1Schema,
  multiStepWizardStateV1Schema,
  multiStepWizardStepV1Schema,
  wizardEventNameV1Schema,
  wizardEventPayloadV1Schema,
  wizardSetFieldPayloadV1Schema,
} from './ui-multi-step-wizard.js';

export type {
  FileUploadCardAddPayloadV1,
  FileUploadCardEventNameV1,
  FileUploadCardEventPayloadV1,
  FileUploadCardPropsV1,
  FileUploadCardRemovePayloadV1,
  FileUploadCardStateV1,
  UploadedFileRefV1,
} from './ui-file-upload-card.js';
export {
  fileUploadCardAddPayloadV1Schema,
  fileUploadCardEventNameV1Schema,
  fileUploadCardEventPayloadV1Schema,
  fileUploadCardPropsV1Schema,
  fileUploadCardRemovePayloadV1Schema,
  fileUploadCardStateV1Schema,
  uploadedFileRefV1Schema,
} from './ui-file-upload-card.js';

export type {
  ChartInteractionEventNameV1,
  ChartSelectionKindV1,
  ChartSelectionV1,
  ChartSelectionStateV1,
  ChartSetSelectionPayloadV1,
  ChartClearSelectionPayloadV1,
} from './chart-interactions.js';
export {
  chartInteractionEventNameV1Schema,
  chartSelectionKindV1Schema,
  chartSelectionV1Schema,
  chartSelectionStateV1Schema,
  chartSetSelectionPayloadV1Schema,
  chartClearSelectionPayloadV1Schema,
} from './chart-interactions.js';

export type { UiV1CustomEvent, UiV1EventValue } from './ui-v1-event.js';
export {
  UI_V1_EVENT_NAME,
  uiV1CustomEventSchema,
  uiV1EventValueSchema,
  safeParseUiV1CustomEvent,
  safeParseUiV1EventValue,
} from './ui-v1-event.js';

export type {
  UiV1CapabilitiesChartFeaturesV1,
  UiV1CapabilitiesComponentV1,
  UiV1CapabilitiesCustomEvent,
  UiV1CapabilitiesExportFeaturesV1,
  UiV1CapabilitiesFeaturesV1,
  UiV1CapabilitiesValueV1,
} from './ui-v1-capabilities.js';
export {
  UI_V1_CAPABILITIES_NAME,
  uiV1CapabilitiesChartFeaturesV1Schema,
  uiV1CapabilitiesComponentV1Schema,
  uiV1CapabilitiesCustomEventSchema,
  uiV1CapabilitiesExportFeaturesV1Schema,
  uiV1CapabilitiesFeaturesV1Schema,
  uiV1CapabilitiesValueV1Schema,
  safeParseUiV1CapabilitiesCustomEvent,
  safeParseUiV1CapabilitiesValueV1,
} from './ui-v1-capabilities.js';

export type {
  UiInputDecodeLimitsV1,
  UiInputJsonPatchLimitsV1,
  UiInputLimitsV1,
  UiInputUiEventLimitsV1,
  UiInputUiStateLimitsV1,
} from './limits.js';
export {
  uiInputDecodeLimitsV1Schema,
  uiInputJsonPatchLimitsV1Schema,
  uiInputLimitsV1Schema,
  uiInputUiEventLimitsV1Schema,
  uiInputUiStateLimitsV1Schema,
  viewerDefaults,
  workflowDefaults,
} from './limits.js';

export {
  uiStateV1JsonSchema,
  uiDatasetV1JsonSchema,
  uiDataRefV1JsonSchema,
  a2uiV1JsonSchema,
  chartPropsV1JsonSchema,
  pivotTablePropsV1JsonSchema,
  heatmapPropsV1JsonSchema,
  diffViewPropsV1JsonSchema,
  multiStepWizardPropsV1JsonSchema,
  multiStepWizardStateV1JsonSchema,
  uploadedFileRefV1JsonSchema,
  fileUploadCardPropsV1JsonSchema,
  fileUploadCardStateV1JsonSchema,
  uiInputLimitsV1JsonSchema,
  uiV1CustomEventJsonSchema,
  uiV1EventValueJsonSchema,
  uiV1CapabilitiesValueV1JsonSchema,
  uiV1CapabilitiesCustomEventJsonSchema,
} from './json-schema.generated.js';

export type { LimitExceededErrorV1, LimitsCheckResult } from './limits-policy.js';
export { checkJsonPatchLimitsV1, checkUiStateLimitsV1, checkUiV1EventLimitsV1 } from './limits-policy.js';
