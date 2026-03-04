import { z } from 'zod';

export const UI_V1_EVENT_NAME = 'ui.v1.event' as const;

const nonEmptyString = z.string().min(1);
const nonNegativeInt = z.number().int().min(0);

export const uiV1EventValueSchema = z
  .object({
    componentId: nonEmptyString,
    eventName: nonEmptyString,
    payload: z.record(z.string(), z.unknown()),
    clientRequestId: nonEmptyString,
    baseRevision: nonNegativeInt,
  })
  .strict();

export type UiV1EventValue = z.output<typeof uiV1EventValueSchema>;

export const uiV1CustomEventSchema = z
  .object({
    type: z.literal('CUSTOM'),
    name: z.literal(UI_V1_EVENT_NAME),
    value: uiV1EventValueSchema,
    timestamp: z.number().optional(),
    rawEvent: z.unknown().optional(),
  })
  .passthrough();

export type UiV1CustomEvent = z.output<typeof uiV1CustomEventSchema>;

export function safeParseUiV1EventValue(input: unknown) {
  return uiV1EventValueSchema.safeParse(input);
}

export function safeParseUiV1CustomEvent(input: unknown) {
  return uiV1CustomEventSchema.safeParse(input);
}
