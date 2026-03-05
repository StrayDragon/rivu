import { z } from 'zod';

const nonEmptyString = z.string().min(1);
const nonNegativeInt = z.number().int().min(0);

export const chartSelectionKindV1Schema = z.enum(['none', 'point', 'range', 'series']);
export type ChartSelectionKindV1 = z.output<typeof chartSelectionKindV1Schema>;

export const chartSelectionV1Schema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('none') }).strict(),
  z.object({ kind: z.literal('point'), rowIndex: nonNegativeInt }).strict(),
  z
    .object({
      kind: z.literal('range'),
      column: nonEmptyString,
      from: z.union([z.string(), z.number(), z.null()]),
      to: z.union([z.string(), z.number(), z.null()]),
    })
    .strict(),
  z.object({ kind: z.literal('series'), value: z.union([z.string(), z.number()]) }).strict(),
]);

export type ChartSelectionV1 = z.output<typeof chartSelectionV1Schema>;

export const chartSelectionStateV1Schema = z.object({ selection: chartSelectionV1Schema.optional() }).passthrough();
export type ChartSelectionStateV1 = z.output<typeof chartSelectionStateV1Schema>;

export const chartSetSelectionPayloadV1Schema = z.object({ selection: chartSelectionV1Schema }).passthrough();
export type ChartSetSelectionPayloadV1 = z.output<typeof chartSetSelectionPayloadV1Schema>;

export const chartClearSelectionPayloadV1Schema = z.object({}).passthrough();
export type ChartClearSelectionPayloadV1 = z.output<typeof chartClearSelectionPayloadV1Schema>;

export const chartInteractionEventNameV1Schema = z.enum(['chart.setSelection', 'chart.clearSelection']);
export type ChartInteractionEventNameV1 = z.output<typeof chartInteractionEventNameV1Schema>;
