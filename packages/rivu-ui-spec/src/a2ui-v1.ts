import { z } from 'zod';

const nonEmptyString = z.string().min(1);
const positiveInt = z.number().int().min(1);

const a2uiKeyV1Schema = nonEmptyString.superRefine((key, ctx) => {
  if (!key.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'op.key must be non-empty' });
  }
});

const a2uiMountV1Schema = z
  .object({
    messageId: nonEmptyString,
    slot: nonEmptyString,
    order: z.number().int().optional(),
  })
  .passthrough()
  .superRefine((mount, ctx) => {
    if (!mount.messageId.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'mount.messageId must be non-empty' });
    }
    if (!mount.slot.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'mount.slot must be non-empty' });
    }
  });

export type A2uiMountV1 = z.output<typeof a2uiMountV1Schema>;

const a2uiCreateOpV1Schema = z
  .object({
    op: z.literal('create'),
    key: a2uiKeyV1Schema,
    type: nonEmptyString,
    schemaVersion: positiveInt,
    props: z.record(z.string(), z.unknown()),
    state: z.record(z.string(), z.unknown()).optional(),
    mount: a2uiMountV1Schema.optional(),
  })
  .passthrough()
  .superRefine((op, ctx) => {
    if (!op.type.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'op.type must be non-empty' });
    }
  });

export type A2uiCreateOpV1 = z.output<typeof a2uiCreateOpV1Schema>;

const a2uiUpdateOpV1Schema = z
  .object({
    op: z.literal('update'),
    key: a2uiKeyV1Schema,
    props: z.record(z.string(), z.unknown()).optional(),
    state: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .superRefine((op, ctx) => {
    if (!op.props && !op.state) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'update op must include props and/or state' });
    }
  });

export type A2uiUpdateOpV1 = z.output<typeof a2uiUpdateOpV1Schema>;

const a2uiMountOpV1Schema = z
  .object({
    op: z.literal('mount'),
    key: a2uiKeyV1Schema,
    messageId: nonEmptyString,
    slot: nonEmptyString,
    order: z.number().int().optional(),
  })
  .passthrough()
  .superRefine((op, ctx) => {
    if (!op.messageId.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'mount op.messageId must be non-empty' });
    }
    if (!op.slot.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'mount op.slot must be non-empty' });
    }
  });

export type A2uiMountOpV1 = z.output<typeof a2uiMountOpV1Schema>;

const a2uiUnmountOpV1Schema = z
  .object({
    op: z.literal('unmount'),
    key: a2uiKeyV1Schema,
    messageId: nonEmptyString,
    slot: nonEmptyString,
  })
  .passthrough()
  .superRefine((op, ctx) => {
    if (!op.messageId.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'unmount op.messageId must be non-empty' });
    }
    if (!op.slot.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'unmount op.slot must be non-empty' });
    }
  });

export type A2uiUnmountOpV1 = z.output<typeof a2uiUnmountOpV1Schema>;

const a2uiRemoveOpV1Schema = z
  .object({
    op: z.literal('remove'),
    key: a2uiKeyV1Schema,
  })
  .passthrough();

export type A2uiRemoveOpV1 = z.output<typeof a2uiRemoveOpV1Schema>;

export const a2uiOpV1Schema = z.discriminatedUnion('op', [
  a2uiCreateOpV1Schema,
  a2uiUpdateOpV1Schema,
  a2uiMountOpV1Schema,
  a2uiUnmountOpV1Schema,
  a2uiRemoveOpV1Schema,
]);

export type A2uiOpV1 = z.output<typeof a2uiOpV1Schema>;

export const a2uiV1Schema = z
  .object({
    v: z.literal(1),
    ops: z.array(a2uiOpV1Schema),
  })
  .passthrough();

export type A2uiV1 = z.output<typeof a2uiV1Schema>;

