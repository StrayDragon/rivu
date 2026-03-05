import { z } from 'zod';

import { uiDataRefV1Schema, uiDatasetV1Schema } from './ui-datasets.js';

const nonEmptyString = z.string().min(1);

export const heatmapEncodingV1Schema = z
  .object({
    x: nonEmptyString,
    y: nonEmptyString,
    value: nonEmptyString,
  })
  .strict();

export type HeatmapEncodingV1 = z.output<typeof heatmapEncodingV1Schema>;

export const heatmapOptionsV1Schema = z
  .object({
    title: nonEmptyString.optional(),
    unit: nonEmptyString.optional(),
    height: z.number().int().min(1).max(2000).optional(),
  })
  .strict();

export type HeatmapOptionsV1 = z.output<typeof heatmapOptionsV1Schema>;

export const heatmapPropsV1Schema = z
  .object({
    dataRef: uiDataRefV1Schema.optional(),
    data: uiDatasetV1Schema.optional(),
    encoding: heatmapEncodingV1Schema,
    options: heatmapOptionsV1Schema.optional(),
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
    const referenced = [props.encoding.x, props.encoding.y, props.encoding.value];
    for (const name of referenced) {
      if (!columns.has(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'encoding columns must exist in data.columns',
          path: ['encoding'],
        });
        return;
      }
    }

    const valueIndex = props.data.columns.indexOf(props.encoding.value);
    for (const [rowIndex, row] of props.data.rows.entries()) {
      const cell = row[valueIndex] ?? null;
      if (cell === null) continue;
      if (typeof cell === 'number' && Number.isFinite(cell)) continue;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'encoding.value column must be number|null when using inline data',
        path: ['data', 'rows', rowIndex, valueIndex],
      });
      return;
    }
  });

export type HeatmapPropsV1 = z.output<typeof heatmapPropsV1Schema>;

