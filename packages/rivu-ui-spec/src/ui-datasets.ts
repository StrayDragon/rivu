import { z } from 'zod';

const nonEmptyString = z.string().min(1);

export const uiDatasetCellV1Schema = z.union([z.string(), z.number().finite(), z.null()]);
export type UiDatasetCellV1 = z.output<typeof uiDatasetCellV1Schema>;

export const uiDatasetV1Schema = z
  .object({
    columns: z.array(nonEmptyString).min(1),
    rows: z.array(z.array(uiDatasetCellV1Schema)),
  })
  .passthrough()
  .superRefine((dataset, ctx) => {
    for (const [rowIndex, row] of dataset.rows.entries()) {
      if (row.length !== dataset.columns.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'dataset.rows[i] length must match columns length',
          path: ['rows', rowIndex],
        });
      }
    }
  });

export type UiDatasetV1 = z.output<typeof uiDatasetV1Schema>;

export const uiDataRefV1Schema = z
  .object({
    datasetId: nonEmptyString,
  })
  .strict()
  .superRefine((dataRef, ctx) => {
    if (!dataRef.datasetId.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'dataRef.datasetId must be non-empty',
        path: ['datasetId'],
      });
    }
  });

export type UiDataRefV1 = z.output<typeof uiDataRefV1Schema>;
