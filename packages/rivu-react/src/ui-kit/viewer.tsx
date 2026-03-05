import type { CSSProperties } from 'react';
import type { ReactNode } from 'react';
import { z } from 'zod';

import { selectUiDatasetV1 } from 'rivu-kernel';
import { heatmapPropsV1Schema, pivotTablePropsV1Schema, uiDataRefV1Schema, type HeatmapPropsV1, type PivotTablePropsV1 } from 'rivu-ui-spec';

import type { RivuComponentRegistration, RivuComponentRegistry, RivuHost } from '../registry.js';
import { defaultRenderHooks } from '../render-hooks.js';
import { applySlotProps } from '../slot-props.js';
import { UnknownComponentCard } from '../unknown-component-card.js';
export { CHART_COMPONENT_TYPE, CHART_SCHEMA_VERSION, chartRegistrationV1, Chart } from './chart.js';
import { CHART_COMPONENT_TYPE, chartRegistrationV1 } from './chart.js';

const theme = {
  bg: 'var(--rivu-bg, #fff)',
  bgMuted: 'var(--rivu-bg-muted, #fafafa)',
  bgSubtle: 'var(--rivu-bg-subtle, #f3f4f6)',
  fg: 'var(--rivu-fg, #111827)',
  fgMuted: 'var(--rivu-fg-muted, #4b5563)',
  muted: 'var(--rivu-muted, #6b7280)',
  border: 'var(--rivu-border, #e5e7eb)',
  borderMuted: 'var(--rivu-border-muted, #f3f4f6)',
  radius: 'var(--rivu-radius, 14px)',
  radiusSm: 'var(--rivu-radius-sm, 10px)',
  shadow: 'var(--rivu-shadow, none)',
  chart1: 'var(--rivu-chart-1, #2563eb)',
  chart2: 'var(--rivu-chart-2, #065f46)',
  chart4: 'var(--rivu-chart-4, #991b1b)',
} as const;

export const REPORT_SECTION_COMPONENT_TYPE = 'ReportSection' as const;
export const REPORT_SECTION_SCHEMA_VERSION = 1 as const;
export const reportSectionPropsV1Schema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional(),
  })
  .strict();
export type ReportSectionPropsV1 = z.output<typeof reportSectionPropsV1Schema>;

export function ReportSection(
  props: ReportSectionPropsV1 & {
    host?: RivuHost;
    componentId?: string;
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
  },
) {
  const hooks = props.host?.renderHooks ?? defaultRenderHooks;
  const meta = { componentId: props.componentId ?? 'unknown', componentType: REPORT_SECTION_COMPONENT_TYPE };

  return (
    <section
      className={props.className}
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding: 'var(--rivu-space-4, 14px)',
        background: theme.bg,
        boxShadow: theme.shadow,
        ...props.style,
      }}
    >
      <div style={{ fontWeight: 650, fontSize: 'var(--rivu-font-size-base, 14px)', color: theme.fg }}>{props.title}</div>
      {props.description ? (
        <div style={{ marginTop: 6, fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.fgMuted, lineHeight: 1.5 }}>
          {hooks.renderMarkdown(props.description, { ...meta, path: 'description' })}
        </div>
      ) : null}
      {props.children ? <div style={{ marginTop: 10 }}>{props.children}</div> : null}
    </section>
  );
}

export const reportSectionRegistrationV1: RivuComponentRegistration<ReportSectionPropsV1> = {
  schemaVersion: REPORT_SECTION_SCHEMA_VERSION,
  propsSchema: reportSectionPropsV1Schema,
  render: ({ host, componentId, props }) => <ReportSection host={host} componentId={componentId} {...props} />,
};

export const METRIC_CARD_COMPONENT_TYPE = 'MetricCard' as const;
export const METRIC_CARD_SCHEMA_VERSION = 1 as const;
export const metricCardPropsV1Schema = z
  .object({
    label: z.string().min(1),
    value: z.union([z.number().finite(), z.string().min(1)]),
    unit: z.string().optional(),
    changePercent: z.number().finite().optional(),
    note: z.string().optional(),
  })
  .strict();
export type MetricCardPropsV1 = z.output<typeof metricCardPropsV1Schema>;

export function MetricCard(props: MetricCardPropsV1 & { host?: RivuHost; componentId?: string; className?: string; style?: CSSProperties }) {
  const hooks = props.host?.renderHooks ?? defaultRenderHooks;
  const meta = { componentId: props.componentId ?? 'unknown', componentType: METRIC_CARD_COMPONENT_TYPE };

  const valueText =
    typeof props.value === 'number'
      ? hooks.formatNumber(props.value, { ...meta, path: 'value', ...(props.unit ? { unit: props.unit } : {}) })
      : hooks.formatValue(props.value, { ...meta, path: 'value', ...(props.unit ? { unit: props.unit } : {}) });

  const change = typeof props.changePercent === 'number' ? hooks.formatPercent(props.changePercent, { ...meta, path: 'changePercent', unit: '%' }) : null;
  const changeColor =
    typeof props.changePercent === 'number'
      ? props.changePercent > 0
        ? theme.chart2
        : props.changePercent < 0
          ? theme.chart4
          : 'var(--rivu-fg-muted, #374151)'
      : 'var(--rivu-fg-muted, #374151)';
  const changeBg =
    typeof props.changePercent === 'number'
      ? props.changePercent > 0
        ? 'var(--rivu-positive-bg, #ecfdf5)'
        : props.changePercent < 0
          ? 'var(--rivu-negative-bg, #fef2f2)'
          : theme.bgSubtle
      : theme.bgSubtle;

  return (
    <div
      className={props.className}
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding: 'var(--rivu-space-4, 14px)',
        background: theme.bg,
        boxShadow: theme.shadow,
        ...props.style,
      }}
    >
      <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.fgMuted }}>{props.label}</div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: theme.fg }}>{valueText}</div>
        {props.unit ? <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.muted }}>{props.unit}</div> : null}
        {change ? (
          <div style={{ marginLeft: 'auto', fontSize: 'var(--rivu-font-size-sm, 12px)', padding: '2px 8px', borderRadius: 999, background: changeBg, color: changeColor }}>
            {change}
          </div>
        ) : null}
      </div>
      {props.note ? (
        <div style={{ marginTop: 8, fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.muted, lineHeight: 1.4 }}>
          {hooks.renderMarkdown(props.note, { ...meta, path: 'note' })}
        </div>
      ) : null}
    </div>
  );
}

export const metricCardRegistrationV1: RivuComponentRegistration<MetricCardPropsV1> = {
  schemaVersion: METRIC_CARD_SCHEMA_VERSION,
  propsSchema: metricCardPropsV1Schema,
  render: ({ host, componentId, props }) => <MetricCard host={host} componentId={componentId} {...props} />,
};

export const DATA_TABLE_COMPONENT_TYPE = 'DataTable' as const;
export const DATA_TABLE_SCHEMA_VERSION = 1 as const;
const dataTableAlignSchema = z.enum(['left', 'center', 'right']);
export const dataTablePropsV1Schema = z
  .object({
    caption: z.string().optional(),
    dataRef: uiDataRefV1Schema.optional(),
    columns: z
      .array(
        z
          .object({
            key: z.string().min(1),
            label: z.string().min(1),
            align: dataTableAlignSchema.optional(),
          })
          .strict(),
      )
      .min(1),
    rows: z.array(z.record(z.string(), z.union([z.string(), z.number().finite(), z.null()]))),
  })
  .strict();
export type DataTablePropsV1 = z.output<typeof dataTablePropsV1Schema>;

export type DataTableSlots = {
  Cell?: (args: {
    value: string | number | null;
    column: DataTablePropsV1['columns'][number];
    row: DataTablePropsV1['rows'][number];
    rowIndex: number;
    columnIndex: number;
  }) => ReactNode;
  EmptyState?: (args: { caption?: string; columns: DataTablePropsV1['columns'] }) => ReactNode;
};

export function DataTable(
  props: DataTablePropsV1 & { host?: RivuHost; componentId?: string; className?: string; style?: CSSProperties; slots?: DataTableSlots },
) {
  const hooks = props.host?.renderHooks ?? defaultRenderHooks;
  const slotProps = props.host?.slotProps?.DataTable;
  const meta = { componentId: props.componentId ?? 'unknown', componentType: DATA_TABLE_COMPONENT_TYPE };

  const rootSlot = applySlotProps(
    {
      className: props.className,
      style: {
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        overflow: 'hidden',
        background: theme.bg,
        boxShadow: theme.shadow,
        ...props.style,
      },
    },
    slotProps?.root,
  );
  const { className: rootClassName, style: rootStyle, ...rootAttrs } = rootSlot;

  return (
    <div
      className={rootClassName}
      style={rootStyle}
      {...(rootAttrs as any)}
    >
      {props.caption ? (
        <div
          {...(() => {
            const captionSlot = applySlotProps(
              {
                style: {
                  padding: `10px var(--rivu-space-3, 12px)`,
                  fontSize: 'var(--rivu-font-size-sm, 12px)',
                  color: theme.fgMuted,
                  borderBottom: `1px solid ${theme.borderMuted}`,
                },
              },
              slotProps?.caption,
            );
            const { className, style, ...attrs } = captionSlot;
            return { className, style, ...attrs };
          })()}
        >
          {hooks.renderMarkdown(props.caption, { ...meta, path: 'caption' })}
        </div>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table
          {...(() => {
            const tableSlot = applySlotProps(
              { style: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.fg } },
              slotProps?.table,
            );
            const { className, style, ...attrs } = tableSlot;
            return { className, style, ...attrs };
          })()}
        >
          <thead
            {...(() => {
              const theadSlot = applySlotProps({}, slotProps?.thead);
              const { className, style, ...attrs } = theadSlot;
              return { className, style, ...attrs };
            })()}
          >
            <tr
              {...(() => {
                const trSlot = applySlotProps({}, slotProps?.tr);
                const { className, style, ...attrs } = trSlot;
                return { className, style, ...attrs };
              })()}
            >
              {props.columns.map((col) => (
                <th
                  key={col.key}
                  {...(() => {
                    const thSlot = applySlotProps(
                      {
                        scope: 'col',
                        style: {
                          textAlign: col.align ?? 'left',
                          padding: `10px var(--rivu-space-3, 12px)`,
                          background: theme.bgMuted,
                          borderBottom: `1px solid ${theme.border}`,
                          color: 'var(--rivu-fg-muted, #374151)',
                          fontWeight: 650,
                          whiteSpace: 'nowrap',
                        },
                      },
                      slotProps?.th,
                    );
                    const { className, style, ...attrs } = thSlot;
                    return { className, style, ...attrs };
                  })()}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            {...(() => {
              const tbodySlot = applySlotProps({}, slotProps?.tbody);
              const { className, style, ...attrs } = tbodySlot;
              return { className, style, ...attrs };
            })()}
          >
            {props.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                {...(() => {
                  const trSlot = applySlotProps({}, slotProps?.tr);
                  const { className, style, ...attrs } = trSlot;
                  return { className, style, ...attrs };
                })()}
              >
                {props.columns.map((col, columnIndex) => (
                  <td
                    key={col.key}
                    {...(() => {
                      const tdSlot = applySlotProps(
                        {
                          style: {
                            textAlign: col.align ?? 'left',
                            padding: `10px var(--rivu-space-3, 12px)`,
                            borderBottom: `1px solid ${theme.borderMuted}`,
                            whiteSpace: 'nowrap',
                            color: theme.fg,
                          },
                        },
                        slotProps?.td,
                      );
                      const { className, style, ...attrs } = tdSlot;
                      return { className, style, ...attrs };
                    })()}
                  >
                    {props.slots?.Cell
                      ? props.slots.Cell({
                          value: (row[col.key] as any) ?? null,
                          column: col,
                          row,
                          rowIndex,
                          columnIndex,
                        })
                      : (() => {
                          const raw = (row[col.key] as any) ?? null;
                          const path = `rows[${rowIndex}].${col.key}`;
                          if (raw === null) return '';
                          if (typeof raw === 'number') return hooks.formatNumber(raw, { ...meta, path });
                          if (typeof raw === 'string') return hooks.formatValue(raw, { ...meta, path });
                          return hooks.formatValue(raw, { ...meta, path });
                        })()}
                  </td>
                ))}
              </tr>
            ))}
            {props.rows.length === 0 ? (
              <tr
                {...(() => {
                  const trSlot = applySlotProps({}, slotProps?.tr);
                  const { className, style, ...attrs } = trSlot;
                  return { className, style, ...attrs };
                })()}
              >
                <td
                  colSpan={props.columns.length}
                  {...(() => {
                    const emptySlot = applySlotProps(
                      { style: { padding: `var(--rivu-space-4, 14px) var(--rivu-space-3, 12px)`, color: theme.muted, textAlign: 'center' } },
                      slotProps?.emptyState,
                    );
                    const { className, style, ...attrs } = emptySlot;
                    return { className, style, ...attrs };
                  })()}
                >
                  {props.slots?.EmptyState
                    ? props.slots.EmptyState(
                        typeof props.caption === 'string' ? { caption: props.caption, columns: props.columns } : { columns: props.columns },
                      )
                    : 'No data'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const dataTableRegistrationV1: RivuComponentRegistration<DataTablePropsV1> = {
  schemaVersion: DATA_TABLE_SCHEMA_VERSION,
  propsSchema: dataTablePropsV1Schema,
  render: ({ kernel, host, componentId, componentType, schemaVersion, props }) => {
    if (props.dataRef) {
      const datasetId = props.dataRef.datasetId;
      const dataset = selectUiDatasetV1(kernel.getState(), datasetId);
      if (!dataset) {
        return (
          <UnknownComponentCard
            title="Dataset not found"
            componentId={componentId}
            componentType={componentType}
            schemaVersion={schemaVersion}
            details={{ datasetId }}
          />
        );
      }

      const indexes = new Map(dataset.columns.map((name, i) => [name, i] as const));
      const missingColumns = props.columns.filter((col) => !indexes.has(col.key)).map((col) => col.key);
      if (missingColumns.length > 0) {
        return (
          <UnknownComponentCard
            title="Dataset column mismatch"
            componentId={componentId}
            componentType={componentType}
            schemaVersion={schemaVersion}
            details={{ datasetId, missingColumns, datasetColumns: dataset.columns }}
          />
        );
      }

      const resolvedRows = dataset.rows.map((row) => {
        const out: Record<string, string | number | null> = {};
        for (const col of props.columns) {
          out[col.key] = (row[indexes.get(col.key)!] as any) ?? null;
        }
        return out;
      });

      return <DataTable host={host} componentId={componentId} {...props} rows={resolvedRows} />;
    }

    return <DataTable host={host} componentId={componentId} {...props} />;
  },
};

export const PIVOT_TABLE_COMPONENT_TYPE = 'PivotTable' as const;
export const PIVOT_TABLE_SCHEMA_VERSION = 1 as const;

export type PivotTableSlots = {
  Title?: (args: { title?: string; unit?: string }) => ReactNode;
  HeaderCell?: (args: { kind: 'corner' | 'row' | 'column' | 'total'; label: string }) => ReactNode;
  Cell?: (args: { value: number | null; formatted: string; rowIndex: number; columnIndex: number; isTotal: boolean }) => ReactNode;
};

type PivotAccumulator = { kind: 'count'; count: number } | { kind: 'sum'; sum: number } | { kind: 'avg'; sum: number; count: number } | { kind: 'min'; value: number } | { kind: 'max'; value: number };

function pivotAdd(acc: PivotAccumulator | null, agg: PivotTablePropsV1['agg'], cell: unknown): PivotAccumulator | { error: string } {
  if (cell === null || cell === undefined) {
    if (!acc) {
      if (agg === 'count') return { kind: 'count', count: 0 };
      if (agg === 'sum') return { kind: 'sum', sum: 0 };
      if (agg === 'avg') return { kind: 'avg', sum: 0, count: 0 };
      if (agg === 'min') return { kind: 'min', value: Number.POSITIVE_INFINITY };
      return { kind: 'max', value: Number.NEGATIVE_INFINITY };
    }
    return acc;
  }

  if (agg === 'count') {
    const next = acc && acc.kind === 'count' ? acc : { kind: 'count' as const, count: 0 };
    return { kind: 'count', count: next.count + 1 };
  }

  if (typeof cell !== 'number' || !Number.isFinite(cell)) {
    return { error: 'value column must be number|null for agg!=count' };
  }

  if (agg === 'sum') {
    const next = acc && acc.kind === 'sum' ? acc : { kind: 'sum' as const, sum: 0 };
    return { kind: 'sum', sum: next.sum + cell };
  }
  if (agg === 'avg') {
    const next = acc && acc.kind === 'avg' ? acc : { kind: 'avg' as const, sum: 0, count: 0 };
    return { kind: 'avg', sum: next.sum + cell, count: next.count + 1 };
  }
  if (agg === 'min') {
    const next = acc && acc.kind === 'min' ? acc : { kind: 'min' as const, value: Number.POSITIVE_INFINITY };
    return { kind: 'min', value: Math.min(next.value, cell) };
  }
  const next = acc && acc.kind === 'max' ? acc : { kind: 'max' as const, value: Number.NEGATIVE_INFINITY };
  return { kind: 'max', value: Math.max(next.value, cell) };
}

function pivotMerge(acc: PivotAccumulator | null, next: PivotAccumulator | null): PivotAccumulator | null {
  if (!next) return acc;
  if (!acc) return next;
  if (acc.kind === 'count' && next.kind === 'count') return { kind: 'count', count: acc.count + next.count };
  if (acc.kind === 'sum' && next.kind === 'sum') return { kind: 'sum', sum: acc.sum + next.sum };
  if (acc.kind === 'avg' && next.kind === 'avg') return { kind: 'avg', sum: acc.sum + next.sum, count: acc.count + next.count };
  if (acc.kind === 'min' && next.kind === 'min') return { kind: 'min', value: Math.min(acc.value, next.value) };
  if (acc.kind === 'max' && next.kind === 'max') return { kind: 'max', value: Math.max(acc.value, next.value) };
  return acc;
}

function pivotFinalize(acc: PivotAccumulator | null, agg: PivotTablePropsV1['agg']): number | null {
  if (!acc) return null;
  if (acc.kind === 'count') return acc.count;
  if (acc.kind === 'sum') return acc.sum;
  if (acc.kind === 'avg') return acc.count > 0 ? acc.sum / acc.count : null;
  if (acc.kind === 'min') return Number.isFinite(acc.value) ? acc.value : null;
  if (acc.kind === 'max') return Number.isFinite(acc.value) ? acc.value : null;
  return null;
}

export function PivotTable(
  props: PivotTablePropsV1 & { host?: RivuHost; componentId?: string; className?: string; style?: CSSProperties; slots?: PivotTableSlots },
) {
  const hooks = props.host?.renderHooks ?? defaultRenderHooks;
  const slotProps = props.host?.slotProps?.PivotTable;
  const componentId = props.componentId ?? 'unknown';
  const meta = { componentId, componentType: PIVOT_TABLE_COMPONENT_TYPE };

  const dataset = props.data;
  if (!dataset) {
    return (
      <UnknownComponentCard
        title="Missing data"
        componentId={componentId}
        componentType={PIVOT_TABLE_COMPONENT_TYPE}
        schemaVersion={PIVOT_TABLE_SCHEMA_VERSION}
        details={{ hint: 'Provide props.dataRef.datasetId or props.data.' }}
      />
    );
  }

  const indexByName = new Map(dataset.columns.map((name, i) => [name, i] as const));
  const rowDimIndexes = props.rows.map((name) => indexByName.get(name)).filter((x) => typeof x === 'number') as number[];
  const colDimIndex = indexByName.get(props.columns);
  const valueIndex = indexByName.get(props.value);

  if (rowDimIndexes.length !== props.rows.length || typeof colDimIndex !== 'number' || typeof valueIndex !== 'number') {
    return (
      <UnknownComponentCard
        title="Dataset column mismatch"
        componentId={componentId}
        componentType={PIVOT_TABLE_COMPONENT_TYPE}
        schemaVersion={PIVOT_TABLE_SCHEMA_VERSION}
        details={{ requiredColumns: { rows: props.rows, columns: props.columns, value: props.value }, datasetColumns: dataset.columns }}
      />
    );
  }

  const rowOrder: string[] = [];
  const colOrder: string[] = [];
  const rowValuesByKey = new Map<string, Array<string | number | null>>();
  const colValuesByKey = new Map<string, string | number | null>();
  const matrix = new Map<string, Map<string, PivotAccumulator>>();

  for (const [rowIndex, row] of dataset.rows.entries()) {
    const rowDims = rowDimIndexes.map((i) => (row[i] as any) ?? null) as Array<string | number | null>;
    const colDim = ((row[colDimIndex] as any) ?? null) as string | number | null;
    const valueCell = (row[valueIndex] as any) ?? null;

    const rowKey = JSON.stringify(rowDims);
    const colKey = JSON.stringify(colDim);

    if (!rowValuesByKey.has(rowKey)) {
      rowValuesByKey.set(rowKey, rowDims);
      rowOrder.push(rowKey);
    }
    if (!colValuesByKey.has(colKey)) {
      colValuesByKey.set(colKey, colDim);
      colOrder.push(colKey);
    }

    const rowMap = matrix.get(rowKey) ?? new Map<string, PivotAccumulator>();
    const prev = rowMap.get(colKey) ?? null;
    const next = pivotAdd(prev, props.agg, valueCell);
    if ('error' in next) {
      return (
        <UnknownComponentCard
          title="PivotTable aggregation failed"
          componentId={componentId}
          componentType={PIVOT_TABLE_COMPONENT_TYPE}
          schemaVersion={PIVOT_TABLE_SCHEMA_VERSION}
          details={{ agg: props.agg, value: props.value, rowIndex, error: next.error }}
        />
      );
    }
    rowMap.set(colKey, next);
    matrix.set(rowKey, rowMap);
  }

  const showTotals = props.options?.showTotals ?? false;
  const unit = props.options?.unit;

  const rootSlot = applySlotProps(
    {
      className: props.className,
      style: {
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        overflow: 'hidden',
        background: theme.bg,
        boxShadow: theme.shadow,
        ...props.style,
      },
    },
    slotProps?.root,
  );
  const { className: rootClassName, style: rootStyle, ...rootAttrs } = rootSlot;

  return (
    <div
      className={rootClassName}
      style={rootStyle}
      {...(rootAttrs as any)}
    >
      {props.options?.title ? (
        <div
          {...(() => {
            const titleSlot = applySlotProps(
              {
                style: {
                  padding: `10px var(--rivu-space-3, 12px)`,
                  fontSize: 'var(--rivu-font-size-base, 14px)',
                  fontWeight: 750,
                  color: theme.fg,
                  borderBottom: `1px solid ${theme.borderMuted}`,
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                },
              },
              slotProps?.title,
            );
            const { className, style, ...attrs } = titleSlot;
            return { className, style, ...attrs };
          })()}
        >
          {props.slots?.Title ? (
            props.slots.Title(unit ? { title: props.options.title, unit } : { title: props.options.title })
          ) : (
            <>
              <span>{hooks.renderMarkdown(props.options.title, { ...meta, path: 'options.title' })}</span>
              {unit ? <span style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.muted }}>{unit}</span> : null}
            </>
          )}
        </div>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <table
          {...(() => {
            const tableSlot = applySlotProps(
              { style: { width: '100%', borderCollapse: 'collapse', fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.fg } },
              slotProps?.table,
            );
            const { className, style, ...attrs } = tableSlot;
            return { className, style, ...attrs };
          })()}
        >
          <thead
            {...(() => {
              const theadSlot = applySlotProps({}, slotProps?.thead);
              const { className, style, ...attrs } = theadSlot;
              return { className, style, ...attrs };
            })()}
          >
            <tr
              {...(() => {
                const trSlot = applySlotProps({}, slotProps?.tr);
                const { className, style, ...attrs } = trSlot;
                return { className, style, ...attrs };
              })()}
            >
              {props.rows.map((dim) => (
                <th
                  key={dim}
                  {...(() => {
                    const thSlot = applySlotProps(
                      {
                        scope: 'col',
                        style: {
                          textAlign: 'left',
                          padding: `10px var(--rivu-space-3, 12px)`,
                          background: theme.bgMuted,
                          borderBottom: `1px solid ${theme.border}`,
                          color: theme.fgMuted,
                          fontWeight: 650,
                          whiteSpace: 'nowrap',
                        },
                      },
                      slotProps?.th,
                    );
                    const { className, style, ...attrs } = thSlot;
                    return { className, style, ...attrs };
                  })()}
                >
                  {props.slots?.HeaderCell ? props.slots.HeaderCell({ kind: 'row', label: dim }) : dim}
                </th>
              ))}

              {colOrder.map((colKey) => {
                const value = colValuesByKey.get(colKey) ?? null;
                const label =
                  value === null
                    ? ''
                    : typeof value === 'number'
                      ? hooks.formatNumber(value, { ...meta, path: `columns[${colKey}]` })
                      : hooks.formatValue(value, { ...meta, path: `columns[${colKey}]` });
                return (
                  <th
                    key={colKey}
                    {...(() => {
                      const thSlot = applySlotProps(
                        {
                          scope: 'col',
                          style: {
                            textAlign: 'right',
                            padding: `10px var(--rivu-space-3, 12px)`,
                            background: theme.bgMuted,
                            borderBottom: `1px solid ${theme.border}`,
                            color: theme.fgMuted,
                            fontWeight: 650,
                            whiteSpace: 'nowrap',
                          },
                        },
                        slotProps?.th,
                      );
                      const { className, style, ...attrs } = thSlot;
                      return { className, style, ...attrs };
                    })()}
                  >
                    {props.slots?.HeaderCell ? props.slots.HeaderCell({ kind: 'column', label }) : label}
                  </th>
                );
              })}

              {showTotals ? (
                <th
                  {...(() => {
                    const thSlot = applySlotProps(
                      {
                        scope: 'col',
                        style: {
                          textAlign: 'right',
                          padding: `10px var(--rivu-space-3, 12px)`,
                          background: theme.bgMuted,
                          borderBottom: `1px solid ${theme.border}`,
                          color: theme.fgMuted,
                          fontWeight: 650,
                          whiteSpace: 'nowrap',
                        },
                      },
                      slotProps?.th,
                    );
                    const { className, style, ...attrs } = thSlot;
                    return { className, style, ...attrs };
                  })()}
                >
                  {props.slots?.HeaderCell ? props.slots.HeaderCell({ kind: 'total', label: 'Total' }) : 'Total'}
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody
            {...(() => {
              const tbodySlot = applySlotProps({}, slotProps?.tbody);
              const { className, style, ...attrs } = tbodySlot;
              return { className, style, ...attrs };
            })()}
          >
            {rowOrder.map((rowKey, rowIndex) => {
              const rowDims = rowValuesByKey.get(rowKey)!;
              const rowMap = matrix.get(rowKey) ?? new Map<string, PivotAccumulator>();

              const rowCellsAcc = colOrder.map((colKey) => rowMap.get(colKey) ?? null);
              const rowCells = rowCellsAcc.map((acc) => pivotFinalize(acc, props.agg));
              const rowTotalAcc = showTotals ? Array.from(rowMap.values()).reduce((acc, next) => pivotMerge(acc, next), null as PivotAccumulator | null) : null;
              const rowTotal = showTotals ? pivotFinalize(rowTotalAcc, props.agg) : null;

              return (
                <tr
                  key={rowKey}
                  {...(() => {
                    const trSlot = applySlotProps({}, slotProps?.tr);
                    const { className, style, ...attrs } = trSlot;
                    return { className, style, ...attrs };
                  })()}
                >
                  {rowDims.map((dimValue, dimIndex) => {
                    const label =
                      dimValue === null
                        ? ''
                        : typeof dimValue === 'number'
                          ? hooks.formatNumber(dimValue, { ...meta, path: `rows[${rowIndex}].dims[${dimIndex}]` })
                          : hooks.formatValue(dimValue, { ...meta, path: `rows[${rowIndex}].dims[${dimIndex}]` });
                    return (
                      <th
                        key={`${rowKey}:${dimIndex}`}
                        {...(() => {
                          const thSlot = applySlotProps(
                            {
                              scope: 'row',
                              style: {
                                textAlign: 'left',
                                padding: `10px var(--rivu-space-3, 12px)`,
                                borderBottom: `1px solid ${theme.borderMuted}`,
                                background: dimIndex === props.rows.length - 1 ? theme.bg : theme.bgSubtle,
                                color: theme.fg,
                                fontWeight: 650,
                                whiteSpace: 'nowrap',
                              },
                            },
                            slotProps?.th,
                          );
                          const { className, style, ...attrs } = thSlot;
                          return { className, style, ...attrs };
                        })()}
                      >
                        {props.slots?.HeaderCell ? props.slots.HeaderCell({ kind: 'row', label }) : label}
                      </th>
                    );
                  })}

                  {rowCells.map((value, columnIndex) => {
                    const formatted =
                      value === null
                        ? ''
                        : hooks.formatNumber(value, {
                            ...meta,
                            path: `pivot[${rowIndex}][${columnIndex}]`,
                            ...(unit ? { unit } : {}),
                          });
                    const isTotal = false;
                    return (
                      <td
                        key={`${rowKey}:${columnIndex}`}
                        {...(() => {
                          const tdSlot = applySlotProps(
                            {
                              style: {
                                textAlign: 'right',
                                padding: `10px var(--rivu-space-3, 12px)`,
                                borderBottom: `1px solid ${theme.borderMuted}`,
                                whiteSpace: 'nowrap',
                                color: theme.fg,
                                fontVariantNumeric: 'tabular-nums',
                              },
                            },
                            slotProps?.td,
                          );
                          const { className, style, ...attrs } = tdSlot;
                          return { className, style, ...attrs };
                        })()}
                      >
                        {props.slots?.Cell ? props.slots.Cell({ value, formatted, rowIndex, columnIndex, isTotal }) : formatted}
                      </td>
                    );
                  })}

                  {showTotals ? (
                    <td
                      {...(() => {
                        const tdSlot = applySlotProps(
                          {
                            style: {
                              textAlign: 'right',
                              padding: `10px var(--rivu-space-3, 12px)`,
                              borderBottom: `1px solid ${theme.borderMuted}`,
                              whiteSpace: 'nowrap',
                              color: theme.fg,
                              fontVariantNumeric: 'tabular-nums',
                              fontWeight: 650,
                            },
                          },
                          slotProps?.td,
                        );
                        const { className, style, ...attrs } = tdSlot;
                        return { className, style, ...attrs };
                      })()}
                    >
                      {(() => {
                        const formatted =
                          rowTotal === null
                            ? ''
                            : hooks.formatNumber(rowTotal, { ...meta, path: `totals.row[${rowIndex}]`, ...(unit ? { unit } : {}) });
                        const isTotal = true;
                        return props.slots?.Cell ? props.slots.Cell({ value: rowTotal, formatted, rowIndex, columnIndex: colOrder.length, isTotal }) : formatted;
                      })()}
                    </td>
                  ) : null}
                </tr>
              );
            })}

            {showTotals ? (
              <tr
                {...(() => {
                  const trSlot = applySlotProps({}, slotProps?.tr);
                  const { className, style, ...attrs } = trSlot;
                  return { className, style, ...attrs };
                })()}
              >
                <th
                  colSpan={props.rows.length}
                  {...(() => {
                    const thSlot = applySlotProps(
                      {
                        scope: 'row',
                        style: {
                          textAlign: 'left',
                          padding: `10px var(--rivu-space-3, 12px)`,
                          borderTop: `1px solid ${theme.border}`,
                          background: theme.bgMuted,
                          color: theme.fgMuted,
                          fontWeight: 750,
                          whiteSpace: 'nowrap',
                        },
                      },
                      slotProps?.th,
                    );
                    const { className, style, ...attrs } = thSlot;
                    return { className, style, ...attrs };
                  })()}
                >
                  {props.slots?.HeaderCell ? props.slots.HeaderCell({ kind: 'total', label: 'Total' }) : 'Total'}
                </th>

                {colOrder.map((colKey, columnIndex) => {
                  const totalAcc = rowOrder.reduce((acc, rowKey) => pivotMerge(acc, matrix.get(rowKey)?.get(colKey) ?? null), null as PivotAccumulator | null);
                  const total = pivotFinalize(totalAcc, props.agg);
                  const formatted =
                    total === null ? '' : hooks.formatNumber(total, { ...meta, path: `totals.col[${columnIndex}]`, ...(unit ? { unit } : {}) });
                  const isTotal = true;
                  return (
                    <td
                      key={`total:${colKey}`}
                      {...(() => {
                        const tdSlot = applySlotProps(
                          {
                            style: {
                              textAlign: 'right',
                              padding: `10px var(--rivu-space-3, 12px)`,
                              borderTop: `1px solid ${theme.border}`,
                              background: theme.bgMuted,
                              color: theme.fg,
                              fontWeight: 750,
                              whiteSpace: 'nowrap',
                              fontVariantNumeric: 'tabular-nums',
                            },
                          },
                          slotProps?.td,
                        );
                        const { className, style, ...attrs } = tdSlot;
                        return { className, style, ...attrs };
                      })()}
                    >
                      {props.slots?.Cell ? props.slots.Cell({ value: total, formatted, rowIndex: rowOrder.length, columnIndex, isTotal }) : formatted}
                    </td>
                  );
                })}

                <td
                  {...(() => {
                    const tdSlot = applySlotProps(
                      {
                        style: {
                          textAlign: 'right',
                          padding: `10px var(--rivu-space-3, 12px)`,
                          borderTop: `1px solid ${theme.border}`,
                          background: theme.bgMuted,
                          color: theme.fg,
                          fontWeight: 750,
                          whiteSpace: 'nowrap',
                          fontVariantNumeric: 'tabular-nums',
                        },
                      },
                      slotProps?.td,
                    );
                    const { className, style, ...attrs } = tdSlot;
                    return { className, style, ...attrs };
                  })()}
                >
                  {(() => {
                    const totalAcc = rowOrder.reduce((acc, rowKey) => {
                      const rowMap = matrix.get(rowKey);
                      if (!rowMap) return acc;
                      for (const cellAcc of rowMap.values()) acc = pivotMerge(acc, cellAcc);
                      return acc;
                    }, null as PivotAccumulator | null);
                    const total = pivotFinalize(totalAcc, props.agg);
                    const formatted =
                      total === null ? '' : hooks.formatNumber(total, { ...meta, path: `totals.grand`, ...(unit ? { unit } : {}) });
                    const isTotal = true;
                    return props.slots?.Cell
                      ? props.slots.Cell({ value: total, formatted, rowIndex: rowOrder.length, columnIndex: colOrder.length, isTotal })
                      : formatted;
                  })()}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const pivotTableRegistrationV1: RivuComponentRegistration<PivotTablePropsV1> = {
  schemaVersion: PIVOT_TABLE_SCHEMA_VERSION,
  propsSchema: pivotTablePropsV1Schema,
  render: ({ kernel, host, componentId, componentType, schemaVersion, props }) => {
    if (props.dataRef) {
      const datasetId = props.dataRef.datasetId;
      const dataset = selectUiDatasetV1(kernel.getState(), datasetId);
      if (!dataset) {
        return (
          <UnknownComponentCard
            title="Dataset not found"
            componentId={componentId}
            componentType={componentType}
            schemaVersion={schemaVersion}
            details={{ datasetId }}
          />
        );
      }

      const columns = new Set(dataset.columns);
      const required = [...props.rows, props.columns, props.value];
      const missingColumns = required.filter((name) => !columns.has(name));
      if (missingColumns.length > 0) {
        return (
          <UnknownComponentCard
            title="Dataset column mismatch"
            componentId={componentId}
            componentType={componentType}
            schemaVersion={schemaVersion}
            details={{ datasetId, missingColumns, datasetColumns: dataset.columns }}
          />
        );
      }

      return <PivotTable host={host} componentId={componentId} {...props} data={dataset as any} />;
    }

    return <PivotTable host={host} componentId={componentId} {...props} />;
  },
};

export const HEATMAP_COMPONENT_TYPE = 'Heatmap' as const;
export const HEATMAP_SCHEMA_VERSION = 1 as const;

export type HeatmapSlots = {
  Title?: (args: { title?: string; unit?: string }) => ReactNode;
  HeaderCell?: (args: { kind: 'x' | 'y' | 'corner'; label: string }) => ReactNode;
  Cell?: (args: { value: number | null; formatted: string; xIndex: number; yIndex: number }) => ReactNode;
};

export function Heatmap(
  props: HeatmapPropsV1 & { host?: RivuHost; componentId?: string; className?: string; style?: CSSProperties; slots?: HeatmapSlots },
) {
  const hooks = props.host?.renderHooks ?? defaultRenderHooks;
  const slotProps = props.host?.slotProps?.Heatmap;
  const componentId = props.componentId ?? 'unknown';
  const meta = { componentId, componentType: HEATMAP_COMPONENT_TYPE };

  const dataset = props.data;
  if (!dataset) {
    return (
      <UnknownComponentCard
        title="Missing data"
        componentId={componentId}
        componentType={HEATMAP_COMPONENT_TYPE}
        schemaVersion={HEATMAP_SCHEMA_VERSION}
        details={{ hint: 'Provide props.dataRef.datasetId or props.data.' }}
      />
    );
  }

  const xIndex = dataset.columns.indexOf(props.encoding.x);
  const yIndex = dataset.columns.indexOf(props.encoding.y);
  const valueIndex = dataset.columns.indexOf(props.encoding.value);
  if (xIndex < 0 || yIndex < 0 || valueIndex < 0) {
    return (
      <UnknownComponentCard
        title="Dataset column mismatch"
        componentId={componentId}
        componentType={HEATMAP_COMPONENT_TYPE}
        schemaVersion={HEATMAP_SCHEMA_VERSION}
        details={{ encoding: props.encoding, datasetColumns: dataset.columns }}
      />
    );
  }

  const xOrder: string[] = [];
  const yOrder: string[] = [];
  const xValueByKey = new Map<string, string | number | null>();
  const yValueByKey = new Map<string, string | number | null>();
  const cellByKey = new Map<string, number | null>();

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const [rowIndex, row] of dataset.rows.entries()) {
    const x = ((row[xIndex] as any) ?? null) as string | number | null;
    const y = ((row[yIndex] as any) ?? null) as string | number | null;
    const raw = (row[valueIndex] as any) ?? null;

    const xKey = JSON.stringify(x);
    const yKey = JSON.stringify(y);
    if (!xValueByKey.has(xKey)) {
      xValueByKey.set(xKey, x);
      xOrder.push(xKey);
    }
    if (!yValueByKey.has(yKey)) {
      yValueByKey.set(yKey, y);
      yOrder.push(yKey);
    }

    if (raw === null) {
      cellByKey.set(`${xKey}|${yKey}`, null);
      continue;
    }

    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return (
        <UnknownComponentCard
          title="Heatmap value must be numeric"
          componentId={componentId}
          componentType={HEATMAP_COMPONENT_TYPE}
          schemaVersion={HEATMAP_SCHEMA_VERSION}
          details={{ value: props.encoding.value, rowIndex, gotType: typeof raw }}
        />
      );
    }

    cellByKey.set(`${xKey}|${yKey}`, raw);
    min = Math.min(min, raw);
    max = Math.max(max, raw);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 0;
  }

  const height = props.options?.height;
  const unit = props.options?.unit;

  const rootSlot = applySlotProps(
    {
      className: props.className,
      style: {
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        overflow: 'hidden',
        background: theme.bg,
        boxShadow: theme.shadow,
        ...props.style,
      },
    },
    slotProps?.root,
  );
  const { className: rootClassName, style: rootStyle, ...rootAttrs } = rootSlot;

  const scrollSlot = applySlotProps({ style: { overflowX: 'auto', ...(typeof height === 'number' ? { maxHeight: height, overflowY: 'auto' as const } : {}) } }, slotProps?.grid);
  const { className: gridClassName, style: gridStyle, ...gridAttrs } = scrollSlot;

  return (
    <div
      className={rootClassName}
      style={rootStyle}
      {...(rootAttrs as any)}
    >
      {props.options?.title ? (
        <div
          {...(() => {
            const titleSlot = applySlotProps(
              {
                style: {
                  padding: `10px var(--rivu-space-3, 12px)`,
                  fontSize: 'var(--rivu-font-size-base, 14px)',
                  fontWeight: 750,
                  color: theme.fg,
                  borderBottom: `1px solid ${theme.borderMuted}`,
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                },
              },
              slotProps?.title,
            );
            const { className, style, ...attrs } = titleSlot;
            return { className, style, ...attrs };
          })()}
        >
          {props.slots?.Title ? (
            props.slots.Title(unit ? { title: props.options.title, unit } : { title: props.options.title })
          ) : (
            <>
              <span>{hooks.renderMarkdown(props.options.title, { ...meta, path: 'options.title' })}</span>
              {unit ? <span style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.muted }}>{unit}</span> : null}
            </>
          )}
        </div>
      ) : null}

      <div
        className={gridClassName}
        style={gridStyle}
        {...(gridAttrs as any)}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.fg }}>
          <thead>
            <tr>
              <th
                {...(() => {
                  const thSlot = applySlotProps(
                    {
                      scope: 'col',
                      style: {
                        textAlign: 'left',
                        padding: `10px var(--rivu-space-3, 12px)`,
                        background: theme.bgMuted,
                        borderBottom: `1px solid ${theme.border}`,
                        color: theme.fgMuted,
                        fontWeight: 650,
                        whiteSpace: 'nowrap',
                      },
                    },
                    slotProps?.th,
                  );
                  const { className, style, ...attrs } = thSlot;
                  return { className, style, ...attrs };
                })()}
              >
                {props.slots?.HeaderCell ? props.slots.HeaderCell({ kind: 'corner', label: '' }) : ''}
              </th>
              {xOrder.map((xKey) => {
                const value = xValueByKey.get(xKey) ?? null;
                const label =
                  value === null
                    ? ''
                    : typeof value === 'number'
                      ? hooks.formatNumber(value, { ...meta, path: `x[${xKey}]` })
                      : hooks.formatValue(value, { ...meta, path: `x[${xKey}]` });
                return (
                  <th
                    key={xKey}
                    {...(() => {
                      const thSlot = applySlotProps(
                        {
                          scope: 'col',
                          style: {
                            textAlign: 'left',
                            padding: `10px var(--rivu-space-3, 12px)`,
                            background: theme.bgMuted,
                            borderBottom: `1px solid ${theme.border}`,
                            color: theme.fgMuted,
                            fontWeight: 650,
                            whiteSpace: 'nowrap',
                          },
                        },
                        slotProps?.th,
                      );
                      const { className, style, ...attrs } = thSlot;
                      return { className, style, ...attrs };
                    })()}
                  >
                    {props.slots?.HeaderCell ? props.slots.HeaderCell({ kind: 'x', label }) : label}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {yOrder.map((yKey, yIndexOut) => {
              const yValue = yValueByKey.get(yKey) ?? null;
              const yLabel =
                yValue === null
                  ? ''
                  : typeof yValue === 'number'
                    ? hooks.formatNumber(yValue, { ...meta, path: `y[${yKey}]` })
                    : hooks.formatValue(yValue, { ...meta, path: `y[${yKey}]` });

              return (
                <tr key={yKey}>
                  <th
                    {...(() => {
                      const thSlot = applySlotProps(
                        {
                          scope: 'row',
                          style: {
                            textAlign: 'left',
                            padding: `10px var(--rivu-space-3, 12px)`,
                            borderBottom: `1px solid ${theme.borderMuted}`,
                            background: theme.bgSubtle,
                            color: theme.fg,
                            fontWeight: 650,
                            whiteSpace: 'nowrap',
                          },
                        },
                        slotProps?.th,
                      );
                      const { className, style, ...attrs } = thSlot;
                      return { className, style, ...attrs };
                    })()}
                  >
                    {props.slots?.HeaderCell ? props.slots.HeaderCell({ kind: 'y', label: yLabel }) : yLabel}
                  </th>

                  {xOrder.map((xKey, xIndexOut) => {
                    const value = cellByKey.get(`${xKey}|${yKey}`) ?? null;
                    const t = value === null || max === min ? (value === null ? 0 : 1) : Math.max(0, Math.min(1, (value - min) / (max - min)));
                    const formatted =
                      value === null
                        ? ''
                        : hooks.formatNumber(value, { ...meta, path: `heatmap[${xIndexOut}][${yIndexOut}]`, ...(unit ? { unit } : {}) });

                    return (
                      <td
                        key={`${xKey}|${yKey}`}
                        {...(() => {
                          const tdSlot = applySlotProps(
                            {
                              style: {
                                padding: 0,
                                borderBottom: `1px solid ${theme.borderMuted}`,
                                borderLeft: `1px solid ${theme.borderMuted}`,
                                whiteSpace: 'nowrap',
                              },
                            },
                            slotProps?.td,
                          );
                          const { className, style, ...attrs } = tdSlot;
                          return { className, style, ...attrs };
                        })()}
                      >
                        <div
                          {...(() => {
                            const cellSlot = applySlotProps(
                              {
                                style: {
                                  position: 'relative',
                                  padding: `8px var(--rivu-space-3, 12px)`,
                                  minWidth: 88,
                                  fontVariantNumeric: 'tabular-nums',
                                  textAlign: 'right',
                                },
                              },
                              slotProps?.cell,
                            );
                            const { className, style, ...attrs } = cellSlot;
                            return { className, style, ...attrs };
                          })()}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: value === null ? theme.bgSubtle : theme.chart2,
                            }}
                          />
                          {value === null ? null : (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: theme.chart1,
                                opacity: t,
                              }}
                            />
                          )}
                          <div style={{ position: 'relative' }}>
                            {props.slots?.Cell ? props.slots.Cell({ value, formatted, xIndex: xIndexOut, yIndex: yIndexOut }) : formatted}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const heatmapRegistrationV1: RivuComponentRegistration<HeatmapPropsV1> = {
  schemaVersion: HEATMAP_SCHEMA_VERSION,
  propsSchema: heatmapPropsV1Schema,
  render: ({ kernel, host, componentId, componentType, schemaVersion, props }) => {
    if (props.dataRef) {
      const datasetId = props.dataRef.datasetId;
      const dataset = selectUiDatasetV1(kernel.getState(), datasetId);
      if (!dataset) {
        return (
          <UnknownComponentCard
            title="Dataset not found"
            componentId={componentId}
            componentType={componentType}
            schemaVersion={schemaVersion}
            details={{ datasetId }}
          />
        );
      }

      const required = [props.encoding.x, props.encoding.y, props.encoding.value];
      const columns = new Set(dataset.columns);
      const missingColumns = required.filter((name) => !columns.has(name));
      if (missingColumns.length > 0) {
        return (
          <UnknownComponentCard
            title="Dataset column mismatch"
            componentId={componentId}
            componentType={componentType}
            schemaVersion={schemaVersion}
            details={{ datasetId, missingColumns, datasetColumns: dataset.columns }}
          />
        );
      }

      const valueIndex = dataset.columns.indexOf(props.encoding.value);
      for (const [rowIndex, row] of dataset.rows.entries()) {
        const cell = (row[valueIndex] as any) ?? null;
        if (cell === null) continue;
        if (typeof cell === 'number' && Number.isFinite(cell)) continue;
        return (
          <UnknownComponentCard
            title="Heatmap value must be numeric"
            componentId={componentId}
            componentType={componentType}
            schemaVersion={schemaVersion}
            details={{ datasetId, value: props.encoding.value, rowIndex, gotType: typeof cell }}
          />
        );
      }

      return <Heatmap host={host} componentId={componentId} {...props} data={dataset as any} />;
    }

    return <Heatmap host={host} componentId={componentId} {...props} />;
  },
};

export const BAR_CHART_COMPONENT_TYPE = 'BarChart' as const;
export const BAR_CHART_SCHEMA_VERSION = 1 as const;
export const barChartPropsV1Schema = z
  .object({
    title: z.string().optional(),
    unit: z.string().optional(),
    dataRef: uiDataRefV1Schema.optional(),
    items: z.array(z.object({ label: z.string().min(1), value: z.number().finite() }).strict()),
  })
  .strict();
export type BarChartPropsV1 = z.output<typeof barChartPropsV1Schema>;

export function BarChart(props: BarChartPropsV1 & { host?: RivuHost; componentId?: string; className?: string; style?: CSSProperties }) {
  const hooks = props.host?.renderHooks ?? defaultRenderHooks;
  const meta = { componentId: props.componentId ?? 'unknown', componentType: BAR_CHART_COMPONENT_TYPE };

  const max = Math.max(0, ...props.items.map((i) => i.value));
  return (
    <div
      className={props.className}
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding: 'var(--rivu-space-4, 14px)',
        background: theme.bg,
        boxShadow: theme.shadow,
        ...props.style,
      }}
    >
      {props.title ? <div style={{ fontWeight: 650, fontSize: 13, color: theme.fg }}>{hooks.renderMarkdown(props.title, { ...meta, path: 'title' })}</div> : null}
      <div style={{ marginTop: props.title ? 10 : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {props.items.map((item, idx) => {
          const pct = max > 0 ? Math.max(0, Math.min(1, item.value / max)) : 0;
          const valueText = hooks.formatNumber(item.value, { ...meta, path: `items[${idx}].value`, ...(props.unit ? { unit: props.unit } : {}) });
          return (
            <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: 'var(--rivu-fg-muted, #374151)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </div>
              <div style={{ height: 10, borderRadius: 999, background: theme.bgSubtle, overflow: 'hidden' }}>
                <div style={{ width: `${pct * 100}%`, height: '100%', background: theme.chart1 }} />
              </div>
              <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.fg, fontVariantNumeric: 'tabular-nums' }}>
                {valueText}
                {props.unit ? <span style={{ color: theme.muted }}> {props.unit}</span> : null}
              </div>
            </div>
          );
        })}
        {props.items.length === 0 ? <div style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.muted }}>No data</div> : null}
      </div>
    </div>
  );
}

export const barChartRegistrationV1: RivuComponentRegistration<BarChartPropsV1> = {
  schemaVersion: BAR_CHART_SCHEMA_VERSION,
  propsSchema: barChartPropsV1Schema,
  render: ({ kernel, host, componentId, componentType, schemaVersion, props }) => {
    if (props.dataRef) {
      const datasetId = props.dataRef.datasetId;
      const dataset = selectUiDatasetV1(kernel.getState(), datasetId);
      if (!dataset) {
        return (
          <UnknownComponentCard
            title="Dataset not found"
            componentId={componentId}
            componentType={componentType}
            schemaVersion={schemaVersion}
            details={{ datasetId }}
          />
        );
      }

      const labelIndex = dataset.columns.indexOf('label');
      const valueIndex = dataset.columns.indexOf('value');
      if (labelIndex < 0 || valueIndex < 0) {
        return (
          <UnknownComponentCard
            title="Dataset column mismatch"
            componentId={componentId}
            componentType={componentType}
            schemaVersion={schemaVersion}
            details={{ datasetId, requiredColumns: ['label', 'value'], datasetColumns: dataset.columns }}
          />
        );
      }

      const items = dataset.rows
        .map((row) => ({ label: row[labelIndex], value: row[valueIndex] }))
        .filter((item): item is { label: string; value: number } => typeof item.label === 'string' && item.label.trim() !== '' && typeof item.value === 'number' && Number.isFinite(item.value))
        .map((item) => ({ label: item.label, value: item.value }));

      return <BarChart host={host} componentId={componentId} {...props} items={items} />;
    }

    return <BarChart host={host} componentId={componentId} {...props} />;
  },
};

export const LINE_CHART_COMPONENT_TYPE = 'LineChart' as const;
export const LINE_CHART_SCHEMA_VERSION = 1 as const;
export const lineChartPropsV1Schema = z
  .object({
    title: z.string().optional(),
    unit: z.string().optional(),
    points: z.array(z.object({ x: z.string().min(1), y: z.number().finite() }).strict()).min(2),
  })
  .strict();
export type LineChartPropsV1 = z.output<typeof lineChartPropsV1Schema>;

function linePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return '';
  return points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

export function LineChart(props: LineChartPropsV1 & { host?: RivuHost; componentId?: string; className?: string; style?: CSSProperties }) {
  const hooks = props.host?.renderHooks ?? defaultRenderHooks;
  const meta = { componentId: props.componentId ?? 'unknown', componentType: LINE_CHART_COMPONENT_TYPE };

  const width = 520;
  const height = 160;
  const pad = 18;
  const minY = Math.min(...props.points.map((p) => p.y));
  const maxY = Math.max(...props.points.map((p) => p.y));
  const range = maxY - minY || 1;

  const pts = props.points.map((p, idx) => {
    const t = props.points.length === 1 ? 0 : idx / (props.points.length - 1);
    const x = pad + t * (width - pad * 2);
    const y = pad + (1 - (p.y - minY) / range) * (height - pad * 2);
    return { x, y };
  });

  return (
    <div
      className={props.className}
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding: 'var(--rivu-space-4, 14px)',
        background: theme.bg,
        boxShadow: theme.shadow,
        ...props.style,
      }}
    >
      {props.title ? <div style={{ fontWeight: 650, fontSize: 13, color: theme.fg }}>{hooks.renderMarkdown(props.title, { ...meta, path: 'title' })}</div> : null}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ marginTop: props.title ? 10 : 0, display: 'block' }}
        role="img"
        aria-label={props.title ?? 'Line chart'}
      >
        <path d={linePath(pts)} fill="none" stroke={theme.chart1} strokeWidth={2.5} />
        {pts.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r={3} fill={theme.chart1} />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: theme.muted }}>
        <span>{props.points[0]?.x}</span>
        <span>{props.points[props.points.length - 1]?.x}</span>
      </div>
      <div style={{ marginTop: 4, fontSize: 11, color: theme.muted }}>
        range: {hooks.formatNumber(minY, { ...meta, path: 'range.min', ...(props.unit ? { unit: props.unit } : {}) })} - {hooks.formatNumber(maxY, { ...meta, path: 'range.max', ...(props.unit ? { unit: props.unit } : {}) })}
        {props.unit ? ` ${props.unit}` : ''}
      </div>
    </div>
  );
}

export const lineChartRegistrationV1: RivuComponentRegistration<LineChartPropsV1> = {
  schemaVersion: LINE_CHART_SCHEMA_VERSION,
  propsSchema: lineChartPropsV1Schema,
  render: ({ host, componentId, props }) => <LineChart host={host} componentId={componentId} {...props} />,
};

export const CITATION_LIST_COMPONENT_TYPE = 'CitationList' as const;
export const CITATION_LIST_SCHEMA_VERSION = 1 as const;
export const citationListPropsV1Schema = z
  .object({
    title: z.string().optional(),
    items: z.array(
      z
        .object({
          title: z.string().min(1),
          url: z.string().min(1).optional(),
          snippet: z.string().optional(),
        })
        .strict(),
    ),
  })
  .strict();
export type CitationListPropsV1 = z.output<typeof citationListPropsV1Schema>;

export function CitationList(props: CitationListPropsV1 & { host?: RivuHost; componentId?: string; className?: string; style?: CSSProperties }) {
  const hooks = props.host?.renderHooks ?? defaultRenderHooks;
  const meta = { componentId: props.componentId ?? 'unknown', componentType: CITATION_LIST_COMPONENT_TYPE };

  return (
    <div
      className={props.className}
      style={{
        border: `1px solid ${theme.border}`,
        borderRadius: theme.radius,
        padding: 'var(--rivu-space-4, 14px)',
        background: theme.bg,
        boxShadow: theme.shadow,
        ...props.style,
      }}
    >
      <div style={{ fontWeight: 650, fontSize: 13, color: theme.fg }}>
        {props.title ? hooks.renderMarkdown(props.title, { ...meta, path: 'title' }) : 'Citations'}
      </div>
      <ol style={{ marginTop: 10, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {props.items.map((item, idx) => {
          const href = item.url ? hooks.sanitizeUrl(item.url) : null;
          return (
            <li key={idx} style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.fg }}>
              <div style={{ fontWeight: 600 }}>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: `var(--rivu-chart-1, #1d4ed8)`, textDecoration: 'none' }}
                  >
                    {item.title}
                  </a>
                ) : (
                  <span>{item.title}</span>
                )}
              </div>
              {item.snippet ? (
                <div style={{ marginTop: 4, color: theme.fgMuted, lineHeight: 1.4 }}>
                  {hooks.renderMarkdown(item.snippet, { ...meta, path: `items[${idx}].snippet` })}
                </div>
              ) : null}
              {item.url && !href ? (
                <div style={{ marginTop: 4, color: theme.chart4 }}>Blocked URL</div>
              ) : null}
            </li>
          );
        })}
        {props.items.length === 0 ? <li style={{ fontSize: 'var(--rivu-font-size-sm, 12px)', color: theme.muted }}>No citations</li> : null}
      </ol>
    </div>
  );
}

export const citationListRegistrationV1: RivuComponentRegistration<CitationListPropsV1> = {
  schemaVersion: CITATION_LIST_SCHEMA_VERSION,
  propsSchema: citationListPropsV1Schema,
  render: ({ host, componentId, props }) => <CitationList host={host} componentId={componentId} {...props} />,
};

export const viewerRegistryV1 = {
  [REPORT_SECTION_COMPONENT_TYPE]: reportSectionRegistrationV1,
  [METRIC_CARD_COMPONENT_TYPE]: metricCardRegistrationV1,
  [DATA_TABLE_COMPONENT_TYPE]: dataTableRegistrationV1,
  [PIVOT_TABLE_COMPONENT_TYPE]: pivotTableRegistrationV1,
  [HEATMAP_COMPONENT_TYPE]: heatmapRegistrationV1,
  [CHART_COMPONENT_TYPE]: chartRegistrationV1,
  [BAR_CHART_COMPONENT_TYPE]: barChartRegistrationV1,
  [LINE_CHART_COMPONENT_TYPE]: lineChartRegistrationV1,
  [CITATION_LIST_COMPONENT_TYPE]: citationListRegistrationV1,
} satisfies RivuComponentRegistry;
