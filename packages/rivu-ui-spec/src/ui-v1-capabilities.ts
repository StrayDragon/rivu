import { z } from 'zod';

export const UI_V1_CAPABILITIES_NAME = 'ui.v1.capabilities' as const;

const nonEmptyString = z.string().min(1);
const positiveInt = z.number().int().min(1);

export const uiV1CapabilitiesComponentV1Schema = z
  .object({
    minSchemaVersion: positiveInt,
    maxSchemaVersion: positiveInt,
  })
  .strict()
  .superRefine((range, ctx) => {
    if (range.maxSchemaVersion < range.minSchemaVersion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'maxSchemaVersion must be >= minSchemaVersion',
      });
    }
  });

export type UiV1CapabilitiesComponentV1 = z.output<typeof uiV1CapabilitiesComponentV1Schema>;

export const uiV1CapabilitiesChartFeaturesV1Schema = z
  .object({
    marks: z.array(z.string()).optional(),
    interactions: z.array(z.string()).optional(),
  })
  .passthrough();

export type UiV1CapabilitiesChartFeaturesV1 = z.output<typeof uiV1CapabilitiesChartFeaturesV1Schema>;

export const uiV1CapabilitiesExportFeaturesV1Schema = z
  .object({
    formats: z.array(z.string()).optional(),
  })
  .passthrough();

export type UiV1CapabilitiesExportFeaturesV1 = z.output<typeof uiV1CapabilitiesExportFeaturesV1Schema>;

export const uiV1CapabilitiesFeaturesV1Schema = z
  .object({
    datasets: z.boolean().optional(),
    lifecycle: z.boolean().optional(),
    chart: uiV1CapabilitiesChartFeaturesV1Schema.optional(),
    export: uiV1CapabilitiesExportFeaturesV1Schema.optional(),
  })
  .passthrough();

export type UiV1CapabilitiesFeaturesV1 = z.output<typeof uiV1CapabilitiesFeaturesV1Schema>;

export const uiV1CapabilitiesValueV1Schema = z
  .object({
    v: z.literal(1),
    components: z.record(nonEmptyString, uiV1CapabilitiesComponentV1Schema),
    features: uiV1CapabilitiesFeaturesV1Schema.optional(),
    client: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    for (const componentType of Object.keys(value.components)) {
      if (!componentType.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'components keys must be non-empty',
        });
        return;
      }
    }
  });

export type UiV1CapabilitiesValueV1 = z.output<typeof uiV1CapabilitiesValueV1Schema>;

export const uiV1CapabilitiesCustomEventSchema = z
  .object({
    type: z.literal('CUSTOM'),
    name: z.literal(UI_V1_CAPABILITIES_NAME),
    value: uiV1CapabilitiesValueV1Schema,
    timestamp: z.number().optional(),
    rawEvent: z.unknown().optional(),
  })
  .passthrough();

export type UiV1CapabilitiesCustomEvent = z.output<typeof uiV1CapabilitiesCustomEventSchema>;

export function safeParseUiV1CapabilitiesValueV1(input: unknown) {
  return uiV1CapabilitiesValueV1Schema.safeParse(input);
}

export function safeParseUiV1CapabilitiesCustomEvent(input: unknown) {
  return uiV1CapabilitiesCustomEventSchema.safeParse(input);
}
