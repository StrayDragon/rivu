import { z } from 'zod';

import { uiDataRefV1Schema, uiDatasetV1Schema } from './ui-datasets.js';

const nonEmptyString = z.string().min(1);

export const pivotTableAggV1Schema = z.enum(['sum', 'count', 'avg', 'min', 'max']);
export type PivotTableAggV1 = z.output<typeof pivotTableAggV1Schema>;

export const pivotTableOptionsV1Schema = z
  .object({
    title: nonEmptyString.optional(),
    unit: nonEmptyString.optional(),
    showTotals: z.boolean().optional(),
  })
  .strict();

export type PivotTableOptionsV1 = z.output<typeof pivotTableOptionsV1Schema>;

export const pivotTablePropsV1Schema = z
  .object({
    dataRef: uiDataRefV1Schema.optional(),
    data: uiDatasetV1Schema.optional(),
    rows: z.array(nonEmptyString).min(1),
    columns: nonEmptyString,
    value: nonEmptyString,
    agg: pivotTableAggV1Schema,
    options: pivotTableOptionsV1Schema.optional(),
  })
  .strict()
  .superRefine((props, ctx) => {
    if (!props.dataRef && !props.data) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'either dataRef or data must be set',
        path: ['dataRef'],
      });
      return;
    }

    if (!props.data) return;

    const columns = new Set(props.data.columns);
    const referenced = [...props.rows, props.columns, props.value];
    for (const name of referenced) {
      if (!columns.has(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'referenced column must exist in data.columns',
          path: ['data', 'columns'],
        });
        return;
      }
    }
  });

export type PivotTablePropsV1 = z.output<typeof pivotTablePropsV1Schema>;

