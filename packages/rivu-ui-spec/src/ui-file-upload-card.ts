import { z } from 'zod';

const nonEmptyString = z.string().min(1);
const nonNegativeInt = z.number().int().min(0);
const positiveInt = z.number().int().min(1);

export const uploadedFileRefV1Schema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    sizeBytes: nonNegativeInt,
    mimeType: nonEmptyString.optional(),
    url: nonEmptyString.optional(),
  })
  .strict();

export type UploadedFileRefV1 = z.output<typeof uploadedFileRefV1Schema>;

export const fileUploadCardPropsV1Schema = z
  .object({
    title: nonEmptyString,
    description: z.string().optional(),
    accept: z.string().optional(),
    maxFiles: positiveInt.optional(),
    maxFileSizeBytes: positiveInt.optional(),
    submitLabel: z.string().optional(),
  })
  .strict();

export type FileUploadCardPropsV1 = z.output<typeof fileUploadCardPropsV1Schema>;

export const fileUploadCardStateV1Schema = z
  .object({
    files: z.array(uploadedFileRefV1Schema).default([]),
    disabled: z.boolean().optional(),
    status: z.enum(['idle', 'uploading', 'submitted', 'error']).optional(),
    message: z.string().optional(),
  })
  .passthrough();

export type FileUploadCardStateV1 = z.output<typeof fileUploadCardStateV1Schema>;

export const fileUploadCardEventNameV1Schema = z.enum(['file.add', 'file.remove', 'file.submit']);
export type FileUploadCardEventNameV1 = z.output<typeof fileUploadCardEventNameV1Schema>;

export const fileUploadCardAddPayloadV1Schema = z
  .object({
    file: uploadedFileRefV1Schema,
  })
  .strict();

export type FileUploadCardAddPayloadV1 = z.output<typeof fileUploadCardAddPayloadV1Schema>;

export const fileUploadCardRemovePayloadV1Schema = z
  .object({
    fileId: nonEmptyString,
  })
  .strict();

export type FileUploadCardRemovePayloadV1 = z.output<typeof fileUploadCardRemovePayloadV1Schema>;

const emptyPayloadV1Schema = z.object({}).strict();

export const fileUploadCardEventPayloadV1Schema = z.discriminatedUnion('eventName', [
  z.object({ eventName: z.literal('file.add'), payload: fileUploadCardAddPayloadV1Schema }).strict(),
  z.object({ eventName: z.literal('file.remove'), payload: fileUploadCardRemovePayloadV1Schema }).strict(),
  z.object({ eventName: z.literal('file.submit'), payload: emptyPayloadV1Schema }).strict(),
]);

export type FileUploadCardEventPayloadV1 = z.output<typeof fileUploadCardEventPayloadV1Schema>;

