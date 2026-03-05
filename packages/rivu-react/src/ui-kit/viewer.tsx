import type { CSSProperties } from 'react';
import type { ReactNode } from 'react';
import { z } from 'zod';

import type { RivuComponentRegistration, RivuComponentRegistry } from '../registry.js';

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

export function ReportSection(props: ReportSectionPropsV1 & { children?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <section
      className={props.className}
      style={{ border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 14, background: theme.bg, boxShadow: theme.shadow, ...props.style }}
    >
      <div style={{ fontWeight: 650, fontSize: 14, color: theme.fg }}>{props.title}</div>
      {props.description ? (
        <div style={{ marginTop: 6, fontSize: 12, color: theme.fgMuted, lineHeight: 1.5 }}>{props.description}</div>
      ) : null}
      {props.children ? <div style={{ marginTop: 10 }}>{props.children}</div> : null}
    </section>
  );
}

export const reportSectionRegistrationV1: RivuComponentRegistration<ReportSectionPropsV1> = {
  schemaVersion: REPORT_SECTION_SCHEMA_VERSION,
  propsSchema: reportSectionPropsV1Schema,
  render: ({ props }) => <ReportSection {...props} />,
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

export function MetricCard(props: MetricCardPropsV1 & { className?: string; style?: CSSProperties }) {
  const change =
    typeof props.changePercent === 'number'
      ? `${props.changePercent > 0 ? '+' : ''}${props.changePercent.toFixed(2)}%`
      : null;
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
      style={{ border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 14, background: theme.bg, boxShadow: theme.shadow, ...props.style }}
    >
      <div style={{ fontSize: 12, color: theme.fgMuted }}>{props.label}</div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: theme.fg }}>
          {typeof props.value === 'number' ? props.value.toLocaleString() : props.value}
        </div>
        {props.unit ? <div style={{ fontSize: 12, color: theme.muted }}>{props.unit}</div> : null}
        {change ? (
          <div style={{ marginLeft: 'auto', fontSize: 12, padding: '2px 8px', borderRadius: 999, background: changeBg, color: changeColor }}>
            {change}
          </div>
        ) : null}
      </div>
      {props.note ? <div style={{ marginTop: 8, fontSize: 12, color: theme.muted, lineHeight: 1.4 }}>{props.note}</div> : null}
    </div>
  );
}

export const metricCardRegistrationV1: RivuComponentRegistration<MetricCardPropsV1> = {
  schemaVersion: METRIC_CARD_SCHEMA_VERSION,
  propsSchema: metricCardPropsV1Schema,
  render: ({ props }) => <MetricCard {...props} />,
};

export const DATA_TABLE_COMPONENT_TYPE = 'DataTable' as const;
export const DATA_TABLE_SCHEMA_VERSION = 1 as const;
const dataTableAlignSchema = z.enum(['left', 'center', 'right']);
export const dataTablePropsV1Schema = z
  .object({
    caption: z.string().optional(),
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

function cellText(value: string | number | null) {
  if (value === null) return '';
  return typeof value === 'number' ? value.toLocaleString() : value;
}

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

export function DataTable(props: DataTablePropsV1 & { className?: string; style?: CSSProperties; slots?: DataTableSlots }) {
  return (
    <div
      className={props.className}
      style={{ border: `1px solid ${theme.border}`, borderRadius: theme.radius, overflow: 'hidden', background: theme.bg, boxShadow: theme.shadow, ...props.style }}
    >
      {props.caption ? (
        <div style={{ padding: '10px 12px', fontSize: 12, color: theme.fgMuted, borderBottom: `1px solid ${theme.borderMuted}` }}>
          {props.caption}
        </div>
      ) : null}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: theme.fg }}>
          <thead>
            <tr>
              {props.columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: col.align ?? 'left',
                    padding: '10px 12px',
                    background: theme.bgMuted,
                    borderBottom: `1px solid ${theme.border}`,
                    color: 'var(--rivu-fg-muted, #374151)',
                    fontWeight: 650,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {props.columns.map((col, columnIndex) => (
                  <td
                    key={col.key}
                    style={{
                      textAlign: col.align ?? 'left',
                      padding: '10px 12px',
                      borderBottom: `1px solid ${theme.borderMuted}`,
                      whiteSpace: 'nowrap',
                      color: theme.fg,
                    }}
                  >
                    {props.slots?.Cell
                      ? props.slots.Cell({
                          value: (row[col.key] as any) ?? null,
                          column: col,
                          row,
                          rowIndex,
                          columnIndex,
                        })
                      : cellText((row[col.key] as any) ?? null)}
                  </td>
                ))}
              </tr>
            ))}
            {props.rows.length === 0 ? (
              <tr>
                <td colSpan={props.columns.length} style={{ padding: '14px 12px', color: theme.muted, textAlign: 'center' }}>
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
  render: ({ props }) => <DataTable {...props} />,
};

export const BAR_CHART_COMPONENT_TYPE = 'BarChart' as const;
export const BAR_CHART_SCHEMA_VERSION = 1 as const;
export const barChartPropsV1Schema = z
  .object({
    title: z.string().optional(),
    unit: z.string().optional(),
    items: z.array(z.object({ label: z.string().min(1), value: z.number().finite() }).strict()),
  })
  .strict();
export type BarChartPropsV1 = z.output<typeof barChartPropsV1Schema>;

export function BarChart(props: BarChartPropsV1 & { className?: string; style?: CSSProperties }) {
  const max = Math.max(0, ...props.items.map((i) => i.value));
  return (
    <div
      className={props.className}
      style={{ border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 14, background: theme.bg, boxShadow: theme.shadow, ...props.style }}
    >
      {props.title ? <div style={{ fontWeight: 650, fontSize: 13, color: theme.fg }}>{props.title}</div> : null}
      <div style={{ marginTop: props.title ? 10 : 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {props.items.map((item) => {
          const pct = max > 0 ? Math.max(0, Math.min(1, item.value / max)) : 0;
          return (
            <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 10, alignItems: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--rivu-fg-muted, #374151)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </div>
              <div style={{ height: 10, borderRadius: 999, background: theme.bgSubtle, overflow: 'hidden' }}>
                <div style={{ width: `${pct * 100}%`, height: '100%', background: theme.chart1 }} />
              </div>
              <div style={{ fontSize: 12, color: theme.fg, fontVariantNumeric: 'tabular-nums' }}>
                {item.value.toLocaleString()}
                {props.unit ? <span style={{ color: theme.muted }}> {props.unit}</span> : null}
              </div>
            </div>
          );
        })}
        {props.items.length === 0 ? <div style={{ fontSize: 12, color: theme.muted }}>No data</div> : null}
      </div>
    </div>
  );
}

export const barChartRegistrationV1: RivuComponentRegistration<BarChartPropsV1> = {
  schemaVersion: BAR_CHART_SCHEMA_VERSION,
  propsSchema: barChartPropsV1Schema,
  render: ({ props }) => <BarChart {...props} />,
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

export function LineChart(props: LineChartPropsV1 & { className?: string; style?: CSSProperties }) {
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
      style={{ border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 14, background: theme.bg, boxShadow: theme.shadow, ...props.style }}
    >
      {props.title ? <div style={{ fontWeight: 650, fontSize: 13, color: theme.fg }}>{props.title}</div> : null}
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
        range: {minY.toLocaleString()} - {maxY.toLocaleString()}
        {props.unit ? ` ${props.unit}` : ''}
      </div>
    </div>
  );
}

export const lineChartRegistrationV1: RivuComponentRegistration<LineChartPropsV1> = {
  schemaVersion: LINE_CHART_SCHEMA_VERSION,
  propsSchema: lineChartPropsV1Schema,
  render: ({ props }) => <LineChart {...props} />,
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

function safeUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const protocol = url.protocol.toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:' && protocol !== 'mailto:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function CitationList(props: CitationListPropsV1 & { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={props.className}
      style={{ border: `1px solid ${theme.border}`, borderRadius: theme.radius, padding: 14, background: theme.bg, boxShadow: theme.shadow, ...props.style }}
    >
      <div style={{ fontWeight: 650, fontSize: 13, color: theme.fg }}>{props.title ?? 'Citations'}</div>
      <ol style={{ marginTop: 10, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {props.items.map((item, idx) => {
          const href = item.url ? safeUrl(item.url) : null;
          return (
            <li key={idx} style={{ fontSize: 12, color: theme.fg }}>
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
              {item.snippet ? <div style={{ marginTop: 4, color: theme.fgMuted, lineHeight: 1.4 }}>{item.snippet}</div> : null}
              {item.url && !href ? (
                <div style={{ marginTop: 4, color: theme.chart4 }}>Blocked URL</div>
              ) : null}
            </li>
          );
        })}
        {props.items.length === 0 ? <li style={{ fontSize: 12, color: theme.muted }}>No citations</li> : null}
      </ol>
    </div>
  );
}

export const citationListRegistrationV1: RivuComponentRegistration<CitationListPropsV1> = {
  schemaVersion: CITATION_LIST_SCHEMA_VERSION,
  propsSchema: citationListPropsV1Schema,
  render: ({ props }) => <CitationList {...props} />,
};

export const viewerRegistryV1 = {
  [REPORT_SECTION_COMPONENT_TYPE]: reportSectionRegistrationV1,
  [METRIC_CARD_COMPONENT_TYPE]: metricCardRegistrationV1,
  [DATA_TABLE_COMPONENT_TYPE]: dataTableRegistrationV1,
  [BAR_CHART_COMPONENT_TYPE]: barChartRegistrationV1,
  [LINE_CHART_COMPONENT_TYPE]: lineChartRegistrationV1,
  [CITATION_LIST_COMPONENT_TYPE]: citationListRegistrationV1,
} satisfies RivuComponentRegistry;
