import { z } from 'zod';

const nonEmptyString = z.string().min(1);

export const multiStepWizardFieldTypeV1Schema = z.enum(['text', 'textarea', 'number', 'select']);
export type MultiStepWizardFieldTypeV1 = z.output<typeof multiStepWizardFieldTypeV1Schema>;

export const multiStepWizardFieldOptionV1Schema = z
  .object({
    label: nonEmptyString,
    value: nonEmptyString,
  })
  .strict();

export type MultiStepWizardFieldOptionV1 = z.output<typeof multiStepWizardFieldOptionV1Schema>;

export const multiStepWizardFieldV1Schema = z
  .object({
    id: nonEmptyString,
    label: nonEmptyString,
    type: multiStepWizardFieldTypeV1Schema,
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
    options: z.array(multiStepWizardFieldOptionV1Schema).optional(),
  })
  .strict()
  .superRefine((field, ctx) => {
    if (field.type === 'select' && (!field.options || field.options.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'select field must have options' });
    }
  });

export type MultiStepWizardFieldV1 = z.output<typeof multiStepWizardFieldV1Schema>;

export const multiStepWizardStepV1Schema = z
  .object({
    id: nonEmptyString,
    title: nonEmptyString,
    description: z.string().optional(),
    fields: z.array(multiStepWizardFieldV1Schema).min(1),
  })
  .strict();

export type MultiStepWizardStepV1 = z.output<typeof multiStepWizardStepV1Schema>;

export const multiStepWizardPropsV1Schema = z
  .object({
    title: nonEmptyString,
    description: z.string().optional(),
    submitLabel: z.string().optional(),
    steps: z.array(multiStepWizardStepV1Schema).min(1),
  })
  .strict();

export type MultiStepWizardPropsV1 = z.output<typeof multiStepWizardPropsV1Schema>;

const wizardValueV1Schema = z.union([z.string(), z.number().finite(), z.null()]);

export const multiStepWizardStateV1Schema = z
  .object({
    currentStepId: nonEmptyString,
    values: z.record(nonEmptyString, wizardValueV1Schema).default({}),
    errors: z.record(nonEmptyString, nonEmptyString).optional(),
    disabled: z.boolean().optional(),
    status: z.enum(['idle', 'submitting', 'submitted', 'error']).optional(),
  })
  .passthrough();

export type MultiStepWizardStateV1 = z.output<typeof multiStepWizardStateV1Schema>;

export const wizardEventNameV1Schema = z.enum(['wizard.setField', 'wizard.next', 'wizard.prev', 'wizard.submit', 'wizard.reset']);
export type WizardEventNameV1 = z.output<typeof wizardEventNameV1Schema>;

export const wizardSetFieldPayloadV1Schema = z
  .object({
    fieldId: nonEmptyString,
    value: wizardValueV1Schema,
  })
  .strict();

export type WizardSetFieldPayloadV1 = z.output<typeof wizardSetFieldPayloadV1Schema>;

const emptyPayloadV1Schema = z.object({}).strict();

export const wizardEventPayloadV1Schema = z.discriminatedUnion('eventName', [
  z.object({ eventName: z.literal('wizard.setField'), payload: wizardSetFieldPayloadV1Schema }).strict(),
  z.object({ eventName: z.literal('wizard.next'), payload: emptyPayloadV1Schema }).strict(),
  z.object({ eventName: z.literal('wizard.prev'), payload: emptyPayloadV1Schema }).strict(),
  z.object({ eventName: z.literal('wizard.submit'), payload: emptyPayloadV1Schema }).strict(),
  z.object({ eventName: z.literal('wizard.reset'), payload: emptyPayloadV1Schema }).strict(),
]);

export type WizardEventPayloadV1 = z.output<typeof wizardEventPayloadV1Schema>;

