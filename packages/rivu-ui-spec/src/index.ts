export const RIVU_UI_SPEC_VERSION = 1 as const;

export type { UiComponentV1, UiMountV1, UiStateV1 } from './state-ui.js';
export { uiComponentV1Schema, uiMountV1Schema, uiStateV1Schema } from './state-ui.js';

export type { UiV1CustomEvent, UiV1EventValue } from './ui-v1-event.js';
export {
  UI_V1_EVENT_NAME,
  uiV1CustomEventSchema,
  uiV1EventValueSchema,
  safeParseUiV1CustomEvent,
  safeParseUiV1EventValue,
} from './ui-v1-event.js';

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
  uiInputLimitsV1JsonSchema,
  uiV1CustomEventJsonSchema,
  uiV1EventValueJsonSchema,
} from './json-schema.generated.js';

export type { LimitExceededErrorV1, LimitsCheckResult } from './limits-policy.js';
export { checkJsonPatchLimitsV1, checkUiStateLimitsV1, checkUiV1EventLimitsV1 } from './limits-policy.js';
