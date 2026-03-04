import { z } from 'zod';

const nonEmptyString = z.string().min(1);
const nonNegativeInt = z.number().int().min(0);
const positiveInt = z.number().int().min(1);

export const uiMountV1Schema = z
  .object({
    messageId: nonEmptyString,
    slot: nonEmptyString,
    order: z.number().int(),
  })
  .strict();

export type UiMountV1 = z.output<typeof uiMountV1Schema>;

export const uiComponentV1Schema = z
  .object({
    type: nonEmptyString,
    schemaVersion: positiveInt,
    props: z.record(z.string(), z.unknown()),
    state: z.record(z.string(), z.unknown()).optional(),
    revision: nonNegativeInt,
    mounts: z.array(uiMountV1Schema),
  })
  .passthrough();

export type UiComponentV1 = z.output<typeof uiComponentV1Schema>;

export const uiStateV1Schema = z
  .object({
    v: z.literal(1),
    components: z
      .record(z.string(), uiComponentV1Schema)
      .superRefine((components, ctx) => {
        for (const id of Object.keys(components)) {
          if (!id.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'componentId must be non-empty',
            });
            return;
          }
        }
      }),
  })
  .passthrough();

export type UiStateV1 = z.output<typeof uiStateV1Schema>;
