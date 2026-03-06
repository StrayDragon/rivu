import { z } from 'zod';

const nonEmptyString = z.string().min(1);

export const diffViewModeV1Schema = z.enum(['unified', 'split']);
export type DiffViewModeV1 = z.output<typeof diffViewModeV1Schema>;

export const diffViewLimitsV1Schema = z
  .object({
    maxChars: z.number().int().min(1).optional(),
    maxLines: z.number().int().min(1).optional(),
  })
  .strict();

export type DiffViewLimitsV1 = z.output<typeof diffViewLimitsV1Schema>;

export const diffViewPropsV1Schema = z
  .object({
    title: nonEmptyString.optional(),
    beforeLabel: nonEmptyString.optional(),
    afterLabel: nonEmptyString.optional(),
    before: z.string(),
    after: z.string(),
    mode: diffViewModeV1Schema.optional(),
    limits: diffViewLimitsV1Schema.optional(),
  })
  .strict();

export type DiffViewPropsV1 = z.output<typeof diffViewPropsV1Schema>;

