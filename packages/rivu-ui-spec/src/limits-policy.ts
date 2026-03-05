import { uiStateV1Schema } from './state-ui.js';
import { uiV1CustomEventSchema } from './ui-v1-event.js';
import type { UiInputLimitsV1 } from './limits.js';

export type LimitExceededErrorV1 = {
  code: 'LIMIT_EXCEEDED';
  limit: string;
  max: number;
  observed: number;
  path?: string;
};

export type LimitsCheckResult = { ok: true } | { ok: false; error: LimitExceededErrorV1 };

function limitExceeded(params: Omit<LimitExceededErrorV1, 'code'>): LimitsCheckResult {
  return { ok: false, error: { code: 'LIMIT_EXCEEDED', ...params } };
}

export function checkUiV1EventLimitsV1(params: {
  limits: UiInputLimitsV1 | null | undefined;
  input: unknown;
}): LimitsCheckResult {
  const maxPayloadKeys = params.limits?.uiEvent?.maxPayloadKeys;
  if (maxPayloadKeys == null) return { ok: true };

  const parsed = uiV1CustomEventSchema.safeParse(params.input);
  if (!parsed.success) return { ok: true };

  const payload = parsed.data.value.payload;
  const observed = Object.keys(payload).length;
  if (observed <= maxPayloadKeys) return { ok: true };

  return limitExceeded({
    limit: 'uiEvent.maxPayloadKeys',
    max: maxPayloadKeys,
    observed,
  });
}

export function checkJsonPatchLimitsV1(params: {
  limits: UiInputLimitsV1 | null | undefined;
  input: unknown;
}): LimitsCheckResult {
  const maxOps = params.limits?.jsonPatch?.maxOps;
  if (maxOps == null) return { ok: true };

  if (!Array.isArray(params.input)) return { ok: true };
  const observed = params.input.length;
  if (observed <= maxOps) return { ok: true };

  return limitExceeded({
    limit: 'jsonPatch.maxOps',
    max: maxOps,
    observed,
  });
}

export function checkUiStateLimitsV1(params: {
  limits: UiInputLimitsV1 | null | undefined;
  input: unknown;
}): LimitsCheckResult {
  const maxComponents = params.limits?.uiState?.maxComponents;
  if (maxComponents == null) return { ok: true };

  const shared = params.input;
  const uiRaw = (shared as any)?.ui as unknown;

  const parsed = uiStateV1Schema.safeParse(uiRaw);
  if (!parsed.success) return { ok: true };

  const observed = Object.keys(parsed.data.components).length;
  if (observed <= maxComponents) return { ok: true };

  return limitExceeded({
    limit: 'uiState.maxComponents',
    max: maxComponents,
    observed,
  });
}

