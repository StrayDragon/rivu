import { z } from 'zod';

import { uiDatasetV1Schema } from './ui-datasets.js';

const nonEmptyString = z.string().min(1);

export const chartMarkV1Schema = z.enum(['bar', 'line', 'pie']);
export type ChartMarkV1 = z.output<typeof chartMarkV1Schema>;

export const chartEncodingV1Schema = z
  .object({
    x: nonEmptyString.optional(),
    y: nonEmptyString.optional(),
    series: nonEmptyString.optional(),
    label: nonEmptyString.optional(),
    value: nonEmptyString.optional(),
  })
  .strict();

export type ChartEncodingV1 = z.output<typeof chartEncodingV1Schema>;

export const chartOptionsV1Schema = z
  .object({
    title: nonEmptyString.optional(),
    unit: nonEmptyString.optional(),
    height: z.number().int().min(1).max(2000).optional(),
  })
  .strict();

export type ChartOptionsV1 = z.output<typeof chartOptionsV1Schema>;

export const chartPropsV1Schema = z
  .object({
    mark: chartMarkV1Schema,
    data: uiDatasetV1Schema,
    encoding: chartEncodingV1Schema,
    options: chartOptionsV1Schema.optional(),
  })
  .strict()
  .superRefine((props, ctx) => {
    const columns = new Set(props.data.columns);

    const requireEncoding = (key: keyof ChartEncodingV1) => {
      if (!props.encoding[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `encoding.${String(key)} is required for mark=${props.mark}`,
          path: ['encoding', key],
        });
      }
    };

    const requireColumn = (key: keyof ChartEncodingV1) => {
      const col = props.encoding[key];
      if (!col) return;
      if (!columns.has(col)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `encoding.${String(key)} must reference an existing data.columns entry`,
          path: ['encoding', key],
        });
      }
    };

    if (props.mark === 'bar' || props.mark === 'line') {
      requireEncoding('x');
      requireEncoding('y');
      requireColumn('x');
      requireColumn('y');
      requireColumn('series');
      return;
    }

    if (props.mark === 'pie') {
      requireEncoding('label');
      requireEncoding('value');
      requireColumn('label');
      requireColumn('value');
      requireColumn('series');
    }
  });

export type ChartPropsV1 = z.output<typeof chartPropsV1Schema>;
