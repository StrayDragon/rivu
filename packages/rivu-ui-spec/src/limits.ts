import { z } from 'zod';

const positiveInt = z.number().int().min(1);
const nonEmptyString = z.string().min(1);

export const uiInputDecodeLimitsV1Schema = z
  .object({
    maxBytes: positiveInt,
    maxDepth: positiveInt,
    maxStringLength: positiveInt,
  })
  .partial()
  .strict();

export type UiInputDecodeLimitsV1 = z.output<typeof uiInputDecodeLimitsV1Schema>;

export const uiInputUiEventLimitsV1Schema = z
  .object({
    maxPayloadKeys: positiveInt,
  })
  .partial()
  .strict();

export type UiInputUiEventLimitsV1 = z.output<typeof uiInputUiEventLimitsV1Schema>;

export const uiInputUiStateLimitsV1Schema = z
  .object({
    maxComponents: positiveInt,
    maxMountsTotal: positiveInt,
    maxDatasets: positiveInt,
    maxDatasetRows: positiveInt,
    maxDatasetColumns: positiveInt,
  })
  .partial()
  .strict();

export type UiInputUiStateLimitsV1 = z.output<typeof uiInputUiStateLimitsV1Schema>;

export const uiInputJsonPatchLimitsV1Schema = z
  .object({
    maxOps: positiveInt,
    maxPathLength: positiveInt,
    allowedPathPrefixes: z.array(nonEmptyString),
  })
  .partial()
  .strict();

export type UiInputJsonPatchLimitsV1 = z.output<typeof uiInputJsonPatchLimitsV1Schema>;

export const uiInputLimitsV1Schema = z
  .object({
    decode: uiInputDecodeLimitsV1Schema.optional(),
    uiEvent: uiInputUiEventLimitsV1Schema.optional(),
    uiState: uiInputUiStateLimitsV1Schema.optional(),
    jsonPatch: uiInputJsonPatchLimitsV1Schema.optional(),
  })
  .strict();

export type UiInputLimitsV1 = z.output<typeof uiInputLimitsV1Schema>;

export const viewerDefaults = {
  decode: {
    maxBytes: 1_048_576,
    maxDepth: 32,
    maxStringLength: 100_000,
  },
  uiEvent: {
    maxPayloadKeys: 32,
  },
  uiState: {
    maxComponents: 500,
    maxMountsTotal: 5_000,
    maxDatasets: 50,
    maxDatasetRows: 10_000,
    maxDatasetColumns: 50,
  },
  jsonPatch: {
    maxOps: 2_000,
    maxPathLength: 256,
    allowedPathPrefixes: ['/ui'],
  },
} as const satisfies UiInputLimitsV1;

export const workflowDefaults = {
  decode: {
    maxBytes: 262_144,
    maxDepth: 24,
    maxStringLength: 50_000,
  },
  uiEvent: {
    maxPayloadKeys: 16,
  },
  uiState: {
    maxComponents: 200,
    maxMountsTotal: 2_000,
    maxDatasets: 20,
    maxDatasetRows: 2_000,
    maxDatasetColumns: 50,
  },
  jsonPatch: {
    maxOps: 500,
    maxPathLength: 256,
    allowedPathPrefixes: ['/ui'],
  },
} as const satisfies UiInputLimitsV1;
