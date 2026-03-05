import type { CSSProperties, ReactNode } from 'react';
import { Component, useEffect, useMemo, useState } from 'react';

import { max } from 'd3-array';
import { scaleBand, scaleLinear, scalePoint } from 'd3-scale';
import { arc, line, pie, curveMonotoneX } from 'd3-shape';

import { selectUiComponentV1, type RivuKernel } from 'rivu-kernel';
import {
  UI_V1_EVENT_NAME,
  chartPropsV1Schema,
  chartSelectionStateV1Schema,
  type ChartPropsV1,
  type ChartSelectionStateV1,
  type ChartSelectionV1,
  type UiV1CustomEvent,
} from 'rivu-ui-spec';

import type { RivuComponentRegistration } from '../registry.js';
import { ComponentErrorCard } from '../component-error-card.js';
import { createClientRequestId } from '../client-request-id.js';

const theme = {
  bg: 'var(--rivu-bg, #fff)',
  bgMuted: 'var(--rivu-bg-muted, #fafafa)',
  fg: 'var(--rivu-fg, #111827)',
  fgMuted: 'var(--rivu-fg-muted, #374151)',
  muted: 'var(--rivu-muted, #6b7280)',
  border: 'var(--rivu-border, #e5e7eb)',
  borderMuted: 'var(--rivu-border-muted, #f3f4f6)',
  radius: 'var(--rivu-radius, 14px)',
  radiusSm: 'var(--rivu-radius-sm, 10px)',
  shadow: 'var(--rivu-shadow, none)',
  chart: [
    'var(--rivu-chart-1, #2563eb)',
    'var(--rivu-chart-2, #065f46)',
    'var(--rivu-chart-3, #f59e0b)',
    'var(--rivu-chart-4, #991b1b)',
    'var(--rivu-chart-5, #8b5cf6)',
    'var(--rivu-chart-6, #06b6d4)',
  ],
} as const;

export const CHART_COMPONENT_TYPE = 'Chart' as const;
export const CHART_SCHEMA_VERSION = 1 as const;

type TooltipState =
  | { visible: false }
  | {
      visible: true;
      x: number;
      y: number;
      title: string;
      lines: string[];
    };

function useResizeObserver() {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  // Simple, viewer-safe ResizeObserver hook.
  // If ResizeObserver is unavailable, we fall back to a fixed width.
  useEffect(() => {
    if (!node) return;

    const update = () => setWidth(node.clientWidth);
    update();

    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);

  return { ref: (el: HTMLDivElement | null) => setNode(el), width, node };
}

function chartTitle(options: ChartPropsV1['options'] | undefined) {
  const title = options?.title?.trim();
  return title ? title : undefined;
}

function chartHeight(options: ChartPropsV1['options'] | undefined) {
  const h = options?.height;
  return typeof h === 'number' && Number.isFinite(h) && h > 0 ? h : 220;
}

function formatNumber(value: number, unit?: string) {
  const base = value.toLocaleString();
  return unit ? `${base} ${unit}` : base;
}

function ChartEmptyState(props: { title?: string | undefined; className?: string | undefined; style?: CSSProperties | undefined }) {
  return (
    <div
      className={props.className}
      style={{
        border: `1px solid ${theme.borderMuted}`,
        borderRadius: theme.radius,
        padding: 14,
        background: theme.bgMuted,
        boxShadow: theme.shadow,
        color: theme.muted,
        fontSize: 12,
        ...props.style,
      }}
    >
      <div style={{ fontWeight: 650, color: theme.fg }}>{props.title ?? 'Chart'}</div>
      <div style={{ marginTop: 8 }}>No data</div>
    </div>
  );
}

function Legend(props: { entries: Array<{ label: string; color: string }>; className?: string | undefined; style?: CSSProperties | undefined }) {
  if (props.entries.length <= 1) return null;
  return (
    <div
      className={props.className}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
        color: theme.fgMuted,
        fontSize: 12,
        ...props.style,
      }}
    >
      {props.entries.map((e) => (
        <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: e.color, display: 'inline-block' }} />
          <span>{e.label}</span>
        </div>
      ))}
    </div>
  );
}

function Tooltip(props: { state: TooltipState }) {
  if (!props.state.visible) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: props.state.x,
        top: props.state.y,
        transform: 'translate(10px, 10px)',
        pointerEvents: 'none',
        maxWidth: 260,
        padding: '8px 10px',
        borderRadius: theme.radiusSm,
        border: `1px solid ${theme.borderMuted}`,
        background: theme.bg,
        boxShadow: theme.shadow,
        color: theme.fg,
        fontSize: 12,
        lineHeight: 1.35,
        zIndex: 10,
      }}
      role="tooltip"
    >
      <div style={{ fontWeight: 650 }}>{props.state.title}</div>
      {props.state.lines.map((line, i) => (
        <div key={i} style={{ marginTop: i === 0 ? 6 : 2, color: theme.fgMuted }}>
          {line}
        </div>
      ))}
    </div>
  );
}

function ChartInner(
  props: ChartPropsV1 & {
    kernel?: RivuKernel;
    componentId?: string;
    revision?: number;
    state?: ChartSelectionStateV1 | undefined;
    interactive?: boolean;
    className?: string;
    style?: CSSProperties;
  },
) {
  const title = chartTitle(props.options);
  const height = chartHeight(props.options);
  const unit = props.options?.unit;

  const interactive = props.interactive === true;
  const selection: ChartSelectionV1 = props.state?.selection ?? { kind: 'none' };
  const [localError, setLocalError] = useState<string | null>(null);

  const { ref, width, node } = useResizeObserver();
  const w = width > 0 ? width : 520;

  const margin = { top: title ? 34 : 14, right: 18, bottom: 34, left: 44 };
  const innerW = Math.max(0, w - margin.left - margin.right);
  const innerH = Math.max(0, height - margin.top - margin.bottom);

  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false });
  const [brush, setBrush] = useState<{ startX: number; currentX: number } | null>(null);

  const sendSelection = async (next: ChartSelectionV1) => {
    if (!interactive) return;
    if (!props.kernel) {
      setLocalError('Chart interactive mode requires a kernel with send() support');
      return;
    }
    if (typeof props.componentId !== 'string' || !props.componentId.trim()) {
      setLocalError('Chart interactive mode requires componentId');
      return;
    }
    if (typeof props.revision !== 'number' || !Number.isFinite(props.revision)) {
      setLocalError('Chart interactive mode requires a finite revision number');
      return;
    }
    setLocalError(null);

    const action: UiV1CustomEvent = {
      type: 'CUSTOM',
      name: UI_V1_EVENT_NAME,
      value: {
        componentId: props.componentId,
        eventName: 'chart.setSelection',
        payload: { selection: next as any },
        clientRequestId: createClientRequestId(),
        baseRevision: props.revision,
      },
    };

    try {
      await props.kernel.send(action);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  };

  const clearSelection = async () => {
    if (!interactive) return;
    if (!props.kernel) {
      setLocalError('Chart interactive mode requires a kernel with send() support');
      return;
    }
    if (typeof props.componentId !== 'string' || !props.componentId.trim()) {
      setLocalError('Chart interactive mode requires componentId');
      return;
    }
    if (typeof props.revision !== 'number' || !Number.isFinite(props.revision)) {
      setLocalError('Chart interactive mode requires a finite revision number');
      return;
    }
    setLocalError(null);

    const action: UiV1CustomEvent = {
      type: 'CUSTOM',
      name: UI_V1_EVENT_NAME,
      value: {
        componentId: props.componentId,
        eventName: 'chart.clearSelection',
        payload: {},
        clientRequestId: createClientRequestId(),
        baseRevision: props.revision,
      },
    };

    try {
      await props.kernel.send(action);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  };

  const localPoint = (clientX: number, clientY: number) => {
    const rect = node?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const localPointFromTargetRect = (targetRect: DOMRect) => {
    const rect = node?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: targetRect.left - rect.left + targetRect.width / 2,
      y: targetRect.top - rect.top,
    };
  };

  const columns = props.data.columns;
  const columnIndex = useMemo(() => new Map(columns.map((c, i) => [c, i] as const)), [columns]);

  const encode = (key: string | undefined) => (key ? columnIndex.get(key) : undefined);

  const seriesKey = props.encoding.series;
  const seriesIdx = encode(seriesKey);

  if (props.data.rows.length === 0) {
    return <ChartEmptyState title={title} className={props.className} style={props.style} />;
  }

  const palette = theme.chart;
  const colorAt = (index: number) => palette[index % palette.length] ?? palette[0] ?? 'var(--rivu-chart-1, #2563eb)';

  const containerStyle: CSSProperties = {
    position: 'relative',
    border: `1px solid ${theme.border}`,
    borderRadius: theme.radius,
    padding: 14,
    background: theme.bg,
    boxShadow: theme.shadow,
    ...props.style,
  };

  const svg = (() => {
    if (props.mark === 'bar' || props.mark === 'line') {
      const xIdx = encode(props.encoding.x);
      const yIdx = encode(props.encoding.y);
      if (typeof xIdx !== 'number' || typeof yIdx !== 'number') {
        return null;
      }

      type CartesianDatum = { rowIndex: number; x: string; y: number; series: string };

      const raw = props.data.rows
        .map((row, rowIndex) => {
          const x = row[xIdx];
          const y = row[yIdx];
          const s = typeof seriesIdx === 'number' ? row[seriesIdx] : null;
          return {
            rowIndex,
            x: x === null ? null : String(x),
            y: typeof y === 'number' && Number.isFinite(y) ? y : null,
            series: s === null ? '' : String(s),
          };
        })
        .filter((d): d is CartesianDatum => typeof d.x === 'string' && d.x.trim() !== '' && typeof d.y === 'number');

      if (raw.length === 0) return null;

      const xDomain = Array.from(new Set(raw.map((d) => d.x)));
      const seriesDomain = Array.from(new Set(raw.map((d) => d.series)));

      const selectedSeries = selection.kind === 'series' ? String(selection.value) : null;
      const selectedXDomain: Set<string> | null = (() => {
        if (selection.kind !== 'range') return null;
        if (selection.from === null || selection.to === null) return null;
        const fromLabel = typeof selection.from === 'string' || typeof selection.from === 'number' ? String(selection.from) : null;
        const toLabel = typeof selection.to === 'string' || typeof selection.to === 'number' ? String(selection.to) : null;
        if (!fromLabel || !toLabel) return null;
        const a = xDomain.indexOf(fromLabel);
        const b = xDomain.indexOf(toLabel);
        if (a < 0 || b < 0) return null;
        const [fromIdx, toIdx] = a <= b ? [a, b] : [b, a];
        return new Set(xDomain.slice(fromIdx, toIdx + 1));
      })();

      const yMax = max(raw, (d) => d.y) ?? 0;

      const yScale = scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);

      const tickCount = 5;
      const yTicks = yScale.ticks(tickCount);

      if (props.mark === 'bar') {
        const x0 = scaleBand<string>().domain(xDomain).range([0, innerW]).padding(0.2);
        const hasSeries = seriesDomain.length > 1;
        const x1 = hasSeries
          ? scaleBand<string>().domain(seriesDomain).range([0, x0.bandwidth()]).padding(0.1)
          : null;

        const legendEntries = hasSeries
          ? seriesDomain.map((s, i) => ({ label: s, color: colorAt(i) }))
          : [];

        return (
          <>
            <svg
              viewBox={`0 0 ${w} ${height}`}
              width="100%"
              height={height}
              role="img"
              aria-label={title ?? 'Bar chart'}
              onMouseLeave={() => setTooltip({ visible: false })}
            >
              {title ? (
                <text x={margin.left} y={18} style={{ fill: theme.fg, fontSize: 13, fontWeight: 650 }}>
                  {title}
                </text>
              ) : null}

              <g transform={`translate(${margin.left},${margin.top})`}>
                {interactive ? (
                  <>
                    <rect
                      x={0}
                      y={0}
                      width={innerW}
                      height={innerH}
                      fill="transparent"
                      onMouseDown={(e) => {
                        if (e.button !== 0) return;
                        const p = localPoint(e.clientX, e.clientY);
                        const xSvg = p.x - 14;
                        setBrush({ startX: xSvg - margin.left, currentX: xSvg - margin.left });
                      }}
                      onMouseMove={(e) => {
                        if (!brush) return;
                        const p = localPoint(e.clientX, e.clientY);
                        const xSvg = p.x - 14;
                        setBrush({ ...brush, currentX: xSvg - margin.left });
                      }}
                      onMouseUp={() => {
                        if (!brush) return;
                        const nearestX = (px: number) => {
                          let best: string | null = null;
                          let bestDist = Number.POSITIVE_INFINITY;
                          for (const label of xDomain) {
                            const v = x0(label);
                            if (typeof v !== 'number') continue;
                            const center = v + x0.bandwidth() / 2;
                            const dist = Math.abs(center - px);
                            if (dist < bestDist) {
                              bestDist = dist;
                              best = label;
                            }
                          }
                          return best;
                        };
                        const from = nearestX(brush.startX);
                        const to = nearestX(brush.currentX);
                        setBrush(null);
                        if (!from || !to) return;
                        if (!props.encoding.x) return;
                        void sendSelection({ kind: 'range', column: props.encoding.x, from, to });
                      }}
                      onMouseLeave={() => setBrush(null)}
                    />
                    {brush ? (
                      <rect
                        x={Math.min(brush.startX, brush.currentX)}
                        y={0}
                        width={Math.abs(brush.currentX - brush.startX)}
                        height={innerH}
                        fill="rgba(37,99,235,0.10)"
                        stroke="rgba(37,99,235,0.35)"
                        pointerEvents="none"
                      />
                    ) : null}
                  </>
                ) : null}
                {yTicks.map((t, i) => (
                  <g key={i} transform={`translate(0,${yScale(t)})`}>
                    <line x1={0} x2={innerW} y1={0} y2={0} stroke={theme.borderMuted} />
                    <text x={-10} y={0} dy="0.32em" textAnchor="end" style={{ fill: theme.fgMuted, fontSize: 11 }}>
                      {formatNumber(t, unit)}
                    </text>
                  </g>
                ))}

                {/* x-axis labels */}
                {xDomain.map((x) => (
                  <text
                    key={x}
                    x={(x0(x) ?? 0) + x0.bandwidth() / 2}
                    y={innerH + 18}
                    textAnchor="middle"
                    style={{ fill: theme.fgMuted, fontSize: 11 }}
                  >
                    {x}
                  </text>
                ))}

                {/* bars */}
                {raw.map((d, i) => {
                  const x = x0(d.x);
                  if (x == null) return null;
                  const series = d.series ?? '';
                  const dx = x1 ? x1(series) ?? 0 : 0;
                  const bw = x1 ? x1.bandwidth() : x0.bandwidth();
                  const y = yScale(d.y);
                  const h = innerH - y;
                  const seriesColorIndex = seriesDomain.indexOf(series);
                  const color = colorAt(seriesColorIndex < 0 ? 0 : seriesColorIndex);

                  const isPointSelected = selection.kind === 'point' && selection.rowIndex === d.rowIndex;
                  const isSeriesSelected = selectedSeries !== null && series === selectedSeries;
                  const isRangeSelected = selectedXDomain !== null && selectedXDomain.has(d.x);
                  const isActive =
                    selection.kind === 'none' ? true : selection.kind === 'point' ? isPointSelected : selection.kind === 'series' ? isSeriesSelected : isRangeSelected;

                  return (
                    <rect
                      key={i}
                      x={x + dx}
                      y={y}
                      width={bw}
                      height={h}
                      rx={6}
                      fill={color}
                      opacity={isActive ? 1 : selection.kind === 'none' ? 1 : 0.35}
                      stroke={isPointSelected ? theme.fg : 'transparent'}
                      strokeWidth={isPointSelected ? 2 : 0}
                      tabIndex={0}
                      onClick={() => {
                        if (!interactive) return;
                        void sendSelection({ kind: 'point', rowIndex: d.rowIndex });
                      }}
                      onFocus={(e) => {
                        const rect = (e.target as SVGRectElement).getBoundingClientRect();
                        const p = localPointFromTargetRect(rect);
                        setTooltip({
                          visible: true,
                          x: p.x,
                          y: p.y,
                          title: d.x,
                          lines: [
                            seriesDomain.length > 1 ? `series: ${series}` : '',
                            `${props.encoding.y ?? 'value'}: ${formatNumber(d.y, unit)}`,
                          ].filter(Boolean),
                        });
                      }}
                      onBlur={() => setTooltip({ visible: false })}
                      onMouseMove={(e) => {
                        const p = localPoint(e.clientX, e.clientY);
                        setTooltip({
                          visible: true,
                          x: p.x,
                          y: p.y,
                          title: d.x,
                          lines: [
                            seriesDomain.length > 1 ? `series: ${series}` : '',
                            `${props.encoding.y ?? 'value'}: ${formatNumber(d.y, unit)}`,
                          ].filter(Boolean),
                        });
                      }}
                    />
                  );
                })}
              </g>
            </svg>
            <Legend entries={legendEntries} />
          </>
        );
      }

      // line
      const x = scalePoint<string>().domain(xDomain).range([0, innerW]).padding(0.4);
      const bySeries = seriesDomain.length > 1 ? seriesDomain : [''];
      const legendEntries = bySeries.length > 1 ? bySeries.map((s, i) => ({ label: s, color: colorAt(i) })) : [];

      const grouped = bySeries.map((s) => ({
        series: s,
        points: raw.filter((d) => (d.series ?? '') === s),
      }));

      const makeLine = line<{ x: string; y: number }>()
        .x((d) => x(d.x) ?? 0)
        .y((d) => yScale(d.y))
        .curve(curveMonotoneX);

      return (
        <>
          <svg
            viewBox={`0 0 ${w} ${height}`}
            width="100%"
            height={height}
            role="img"
            aria-label={title ?? 'Line chart'}
            onMouseLeave={() => setTooltip({ visible: false })}
          >
            {title ? (
              <text x={margin.left} y={18} style={{ fill: theme.fg, fontSize: 13, fontWeight: 650 }}>
                {title}
              </text>
            ) : null}

            <g transform={`translate(${margin.left},${margin.top})`}>
              {interactive ? (
                <>
                  <rect
                    x={0}
                    y={0}
                    width={innerW}
                    height={innerH}
                    fill="transparent"
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      const p = localPoint(e.clientX, e.clientY);
                      const xSvg = p.x - 14;
                      setBrush({ startX: xSvg - margin.left, currentX: xSvg - margin.left });
                    }}
                    onMouseMove={(e) => {
                      if (!brush) return;
                      const p = localPoint(e.clientX, e.clientY);
                      const xSvg = p.x - 14;
                      setBrush({ ...brush, currentX: xSvg - margin.left });
                    }}
                    onMouseUp={() => {
                      if (!brush) return;
                      const nearestX = (px: number) => {
                        let best: string | null = null;
                        let bestDist = Number.POSITIVE_INFINITY;
                        for (const label of xDomain) {
                          const v = x(label);
                          if (typeof v !== 'number') continue;
                          const dist = Math.abs(v - px);
                          if (dist < bestDist) {
                            bestDist = dist;
                            best = label;
                          }
                        }
                        return best;
                      };
                      const from = nearestX(brush.startX);
                      const to = nearestX(brush.currentX);
                      setBrush(null);
                      if (!from || !to) return;
                      if (!props.encoding.x) return;
                      void sendSelection({ kind: 'range', column: props.encoding.x, from, to });
                    }}
                    onMouseLeave={() => setBrush(null)}
                  />
                  {brush ? (
                    <rect
                      x={Math.min(brush.startX, brush.currentX)}
                      y={0}
                      width={Math.abs(brush.currentX - brush.startX)}
                      height={innerH}
                      fill="rgba(37,99,235,0.10)"
                      stroke="rgba(37,99,235,0.35)"
                      pointerEvents="none"
                    />
                  ) : null}
                </>
              ) : null}
              {yTicks.map((t, i) => (
                <g key={i} transform={`translate(0,${yScale(t)})`}>
                  <line x1={0} x2={innerW} y1={0} y2={0} stroke={theme.borderMuted} />
                  <text x={-10} y={0} dy="0.32em" textAnchor="end" style={{ fill: theme.fgMuted, fontSize: 11 }}>
                    {formatNumber(t, unit)}
                  </text>
                </g>
              ))}

              {xDomain.map((label) => (
                <text key={label} x={x(label) ?? 0} y={innerH + 18} textAnchor="middle" style={{ fill: theme.fgMuted, fontSize: 11 }}>
                  {label}
                </text>
              ))}

              {grouped.map((g, i) => {
                const color = colorAt(i);
                const points = g.points;
                const pathPoints = points.map((p) => ({ x: p.x, y: p.y })).filter((p) => typeof p.x === 'string' && typeof p.y === 'number');
                const path = makeLine(pathPoints) ?? '';
                const seriesOpacity = selectedSeries !== null && g.series !== selectedSeries ? 0.35 : 1;
                return (
                  <g key={g.series || '<default>'}>
                    <path d={path} fill="none" stroke={color} strokeWidth={2.5} opacity={seriesOpacity} />
                    {points.map((p, j) => {
                      const isPointSelected = selection.kind === 'point' && selection.rowIndex === p.rowIndex;
                      const isRangeSelected = selectedXDomain !== null && selectedXDomain.has(p.x);
                      const isActive =
                        selection.kind === 'none'
                          ? true
                          : selection.kind === 'point'
                            ? isPointSelected
                            : selection.kind === 'series'
                              ? g.series === selectedSeries
                              : isRangeSelected;
                      return (
                      <circle
                        key={j}
                        cx={x(p.x) ?? 0}
                        cy={yScale(p.y)}
                        r={3}
                        fill={color}
                        opacity={seriesOpacity * (isActive ? 1 : selection.kind === 'none' ? 1 : 0.35)}
                        stroke={isPointSelected ? theme.fg : 'transparent'}
                        strokeWidth={isPointSelected ? 2 : 0}
                      tabIndex={0}
                      onClick={() => {
                        if (!interactive) return;
                        void sendSelection({ kind: 'point', rowIndex: p.rowIndex });
                      }}
                      onFocus={(e) => {
                        const rect = (e.target as SVGCircleElement).getBoundingClientRect();
                          const p0 = localPointFromTargetRect(rect);
                          setTooltip({
                            visible: true,
                            x: p0.x,
                            y: p0.y,
                            title: p.x,
                            lines: [
                              bySeries.length > 1 ? `series: ${g.series}` : '',
                              `${props.encoding.y ?? 'value'}: ${formatNumber(p.y, unit)}`,
                            ].filter(Boolean),
                          });
                        }}
                        onBlur={() => setTooltip({ visible: false })}
                        onMouseMove={(e) => {
                          const p0 = localPoint(e.clientX, e.clientY);
                          setTooltip({
                            visible: true,
                            x: p0.x,
                            y: p0.y,
                            title: p.x,
                            lines: [
                              bySeries.length > 1 ? `series: ${g.series}` : '',
                              `${props.encoding.y ?? 'value'}: ${formatNumber(p.y, unit)}`,
                            ].filter(Boolean),
                          });
                        }}
                      />
                      );
                    })}
                  </g>
                );
              })}
            </g>
          </svg>
          <Legend entries={legendEntries} />
        </>
      );
    }

    // pie
    const labelIdx = encode(props.encoding.label);
    const valueIdx = encode(props.encoding.value);
    if (typeof labelIdx !== 'number' || typeof valueIdx !== 'number') return null;

    type PieDatum = { rowIndex: number; label: string; value: number; series: string | null };

    const values: PieDatum[] = [];
    for (const [rowIndex, row] of props.data.rows.entries()) {
      const label = row[labelIdx];
      const value = row[valueIdx];
      if (typeof label !== 'string' || label.trim() === '') continue;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue;
      const seriesCell = typeof seriesIdx === 'number' ? row[seriesIdx] : null;
      values.push({ rowIndex, label, value, series: seriesCell === null ? null : String(seriesCell) });
    }

    if (values.length === 0) return null;

    const r = Math.min(innerW, innerH) / 2;
    const cx = margin.left + innerW / 2;
    const cy = margin.top + innerH / 2;

    const p = pie<PieDatum>().value((d) => d.value);
    const arcs = p(values);
    const makeArc = arc<any>().innerRadius(0).outerRadius(r);

    const legendEntries = values.map((v, i) => ({ label: v.label, color: colorAt(i) }));

    return (
      <>
        <svg
          viewBox={`0 0 ${w} ${height}`}
          width="100%"
          height={height}
          role="img"
          aria-label={title ?? 'Pie chart'}
          onMouseLeave={() => setTooltip({ visible: false })}
        >
          {title ? (
            <text x={margin.left} y={18} style={{ fill: theme.fg, fontSize: 13, fontWeight: 650 }}>
              {title}
            </text>
          ) : null}
          <g transform={`translate(${cx},${cy})`}>
            {arcs.map((a, i) => {
              const color = colorAt(i);
              const path = makeArc(a) ?? '';
              const rowIndex = values[i]!.rowIndex;
              const isPointSelected = selection.kind === 'point' && selection.rowIndex === rowIndex;
              const isSeriesSelected = selection.kind === 'series' && values[i]!.series !== null && values[i]!.series === String(selection.value);
              const isActive = selection.kind === 'none' ? true : selection.kind === 'point' ? isPointSelected : isSeriesSelected;
              return (
                <path
                  key={i}
                  d={path}
                  fill={color}
                  opacity={isActive ? 1 : selection.kind === 'none' ? 1 : 0.35}
                  stroke={theme.bg}
                  strokeWidth={isPointSelected ? 3 : 1}
                  tabIndex={0}
                  onClick={() => {
                    if (!interactive) return;
                    void sendSelection({ kind: 'point', rowIndex });
                  }}
                  onFocus={(e) => {
                    const rect = (e.target as SVGPathElement).getBoundingClientRect();
                    const p0 = localPointFromTargetRect(rect);
                    setTooltip({
                      visible: true,
                      x: p0.x,
                      y: p0.y,
                      title: values[i]!.label,
                      lines: [`${props.encoding.value ?? 'value'}: ${formatNumber(values[i]!.value, unit)}`],
                    });
                  }}
                  onBlur={() => setTooltip({ visible: false })}
                  onMouseMove={(e) => {
                    const p0 = localPoint(e.clientX, e.clientY);
                    setTooltip({
                      visible: true,
                      x: p0.x,
                      y: p0.y,
                      title: values[i]!.label,
                      lines: [`${props.encoding.value ?? 'value'}: ${formatNumber(values[i]!.value, unit)}`],
                    });
                  }}
                />
              );
            })}
          </g>
        </svg>
        <Legend entries={legendEntries} />
      </>
    );
  })();

  if (!svg) {
    return <ChartEmptyState title={title} className={props.className} style={props.style} />;
  }

  const selectionLabel = (() => {
    if (selection.kind === 'none') return null;
    if (selection.kind === 'point') return `Selected rowIndex=${selection.rowIndex}`;
    if (selection.kind === 'series') return `Selected series=${String(selection.value)}`;
    if (selection.kind === 'range') return `Selected range ${selection.column}: ${String(selection.from)}..${String(selection.to)}`;
    return null;
  })();

  return (
    <div ref={ref} className={props.className} style={containerStyle}>
      {svg}
      <Tooltip state={tooltip} />
      {selectionLabel ? (
        <div
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            borderRadius: 999,
            border: `1px solid ${theme.borderMuted}`,
            background: theme.bg,
            color: theme.fgMuted,
            fontSize: 12,
            maxWidth: '80%',
            userSelect: 'none',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectionLabel}</span>
          {interactive ? (
            <button
              type="button"
              onClick={() => void clearSelection()}
              style={{
                border: `1px solid ${theme.borderMuted}`,
                background: theme.bgMuted,
                borderRadius: 999,
                fontSize: 11,
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
      {localError ? (
        <div style={{ position: 'absolute', left: 10, bottom: 10, color: 'var(--rivu-chart-4, #991b1b)', fontSize: 12 }}>
          {localError}
        </div>
      ) : null}
    </div>
  );
}

class ChartErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };

  override componentDidCatch(error: Error) {
    this.setState({ error });
  }

  override render() {
    if (this.state.error) {
      return (
        <ComponentErrorCard
          title="Chart render error"
          error={{ code: 'CHART_RENDER_ERROR', message: this.state.error.message }}
        />
      );
    }
    return this.props.children;
  }
}

export function Chart(
  props: ChartPropsV1 & {
    kernel?: RivuKernel;
    componentId?: string;
    revision?: number;
    state?: ChartSelectionStateV1 | undefined;
    interactive?: boolean;
    className?: string;
    style?: CSSProperties;
  },
) {
  return (
    <ChartErrorBoundary>
      <ChartInner {...props} />
    </ChartErrorBoundary>
  );
}

export const chartRegistrationV1: RivuComponentRegistration<ChartPropsV1, ChartSelectionStateV1> = {
  schemaVersion: CHART_SCHEMA_VERSION,
  propsSchema: chartPropsV1Schema,
  stateSchema: chartSelectionStateV1Schema,
  render: ({ kernel, componentId, revision, props, state }) => {
    const raw = selectUiComponentV1(kernel.getState(), componentId);
    const interactive = raw?.state != null;
    return <Chart {...props} kernel={kernel} componentId={componentId} revision={revision} state={state} interactive={interactive} />;
  },
};
