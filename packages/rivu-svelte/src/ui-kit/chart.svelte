<script lang="ts">
  import { onDestroy, onMount } from 'svelte';

  import { max } from 'd3-array';
  import { scaleBand, scaleLinear, scalePoint, type ScaleBand, type ScaleLinear, type ScalePoint } from 'd3-scale';
  import { arc, line, pie, curveMonotoneX, type PieArcDatum } from 'd3-shape';

  import type { RivuKernel } from 'rivu-kernel';
  import { UI_V1_EVENT_NAME, type ChartPropsV1, type ChartSelectionStateV1, type ChartSelectionV1, type UiV1CustomEvent } from 'rivu-ui-spec';

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

  type TooltipState =
    | { visible: false }
    | {
        visible: true;
        x: number;
        y: number;
        title: string;
        lines: string[];
      };

  type LegendEntry = { label: string; color: string };

  type CartesianDatum = { rowIndex: number; x: string; y: number; series: string };

  type BarRect = {
    key: string;
    rowIndex: number;
    xLabel: string;
    yValue: number;
    series: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    opacity: number;
    stroke: string;
    strokeWidth: number;
    tooltipTitle: string;
    tooltipLines: string[];
  };

  type LinePoint = {
    key: string;
    rowIndex: number;
    xLabel: string;
    yValue: number;
    series: string;
    cx: number;
    cy: number;
    fill: string;
    opacity: number;
    stroke: string;
    strokeWidth: number;
    tooltipTitle: string;
    tooltipLines: string[];
  };

  type LineSeries = {
    key: string;
    series: string;
    color: string;
    path: string;
    opacity: number;
    points: LinePoint[];
  };

  type PieSlice = {
    key: string;
    rowIndex: number;
    label: string;
    value: number;
    series: string | null;
    path: string;
    fill: string;
    opacity: number;
    strokeWidth: number;
    tooltipTitle: string;
    tooltipLines: string[];
  };

  export let kernel: RivuKernel | undefined = undefined;
  export let componentId: string;
  export let revision: number;
  export let hasState: boolean;
  export let props: ChartPropsV1;
  export let state: ChartSelectionStateV1 | undefined = undefined;
  export let interactive: boolean | undefined = undefined;

  const containerPadding = 14;

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

  const palette = theme.chart;
  const colorAt = (index: number) => palette[index % palette.length] ?? palette[0] ?? 'var(--rivu-chart-1, #2563eb)';

  let node: HTMLDivElement | null = null;
  let width = 0;

  const updateWidth = () => {
    if (!node) return;
    width = node.clientWidth;
  };

  let ro: ResizeObserver | null = null;
  let observedNode: HTMLDivElement | null = null;

  const refreshObserver = () => {
    if (!ro || !node) return;
    if (observedNode === node) return;
    ro.disconnect();
    ro.observe(node);
    observedNode = node;
    updateWidth();
  };

  onMount(() => {
    updateWidth();
    if (typeof ResizeObserver === 'undefined') return;
    ro = new ResizeObserver(updateWidth);
    refreshObserver();
  });

  $: refreshObserver();

  onDestroy(() => {
    ro?.disconnect();
    ro = null;
    observedNode = null;
  });

  $: title = chartTitle(props.options);
  $: height = chartHeight(props.options);
  $: unit = props.options?.unit;
  $: selection = (state?.selection ?? { kind: 'none' }) as ChartSelectionV1;
  $: isInteractive = interactive === true ? true : interactive === false ? false : hasState;

  $: w = width > 0 ? width : 520;
  $: margin = { top: title ? 34 : 14, right: 18, bottom: 34, left: 44 };
  $: innerW = Math.max(0, w - margin.left - margin.right);
  $: innerH = Math.max(0, height - margin.top - margin.bottom);

  $: columns = props.data.columns;
  $: columnIndex = new Map(columns.map((c, i) => [c, i] as const));
  const encode = (key: string | undefined) => (key ? columnIndex.get(key) : undefined);

  let tooltip: TooltipState = { visible: false };
  let localError: string | null = null;
  let brush: { startX: number; currentX: number } | null = null;

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

  const sendSelection = async (next: ChartSelectionV1) => {
    if (!isInteractive) return;

    if (!kernel) {
      localError = 'Chart interactive mode requires a kernel with send() support';
      return;
    }

    localError = null;

    const action: UiV1CustomEvent = {
      type: 'CUSTOM',
      name: UI_V1_EVENT_NAME,
      value: {
        componentId,
        eventName: 'chart.setSelection',
        payload: { selection: next as any },
        clientRequestId: createClientRequestId(),
        baseRevision: revision,
      },
    };

    try {
      await kernel.send(action);
    } catch (err) {
      localError = err instanceof Error ? err.message : String(err);
    }
  };

  const clearSelection = async () => {
    if (!isInteractive) return;

    if (!kernel) {
      localError = 'Chart interactive mode requires a kernel with send() support';
      return;
    }

    localError = null;

    const action: UiV1CustomEvent = {
      type: 'CUSTOM',
      name: UI_V1_EVENT_NAME,
      value: {
        componentId,
        eventName: 'chart.clearSelection',
        payload: {},
        clientRequestId: createClientRequestId(),
        baseRevision: revision,
      },
    };

    try {
      await kernel.send(action);
    } catch (err) {
      localError = err instanceof Error ? err.message : String(err);
    }
  };

  // Computed render data
  let legendEntries: LegendEntry[] = [];
  let mode: 'empty' | 'bar' | 'line' | 'pie' = 'empty';

  let yScale: ScaleLinear<number, number> | null = null;
  let yTicks: number[] = [];

  let barX0: ScaleBand<string> | null = null;
  let barRects: BarRect[] = [];

  let lineX: ScalePoint<string> | null = null;
  let lineSeries: LineSeries[] = [];

  let pieCx = 0;
  let pieCy = 0;
  let pieSlices: PieSlice[] = [];

  $: {
    legendEntries = [];
    mode = 'empty';

    yScale = null;
    yTicks = [];
    barX0 = null;
    barRects = [];
    lineX = null;
    lineSeries = [];
    pieCx = 0;
    pieCy = 0;
    pieSlices = [];

    if (props.data.rows.length === 0) {
      mode = 'empty';
    } else if (props.mark === 'bar' || props.mark === 'line') {
      const xIdx = encode(props.encoding.x);
      const yIdx = encode(props.encoding.y);
      if (typeof xIdx !== 'number' || typeof yIdx !== 'number') {
        mode = 'empty';
      } else {
        const seriesIdx = encode(props.encoding.series);

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
          .filter((d): d is { rowIndex: number; x: string; y: number; series: string } => typeof d.x === 'string' && d.x.trim() !== '' && typeof d.y === 'number');

        if (raw.length === 0) {
          mode = 'empty';
        } else {
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
          yScale = scaleLinear().domain([0, yMax]).nice().range([innerH, 0]);
          yTicks = yScale.ticks(5);

          if (props.mark === 'bar') {
            mode = 'bar';
            barX0 = scaleBand<string>().domain(xDomain).range([0, innerW]).padding(0.2);
            const hasSeries = seriesDomain.length > 1;
            const x1 = hasSeries ? scaleBand<string>().domain(seriesDomain).range([0, barX0.bandwidth()]).padding(0.1) : null;
            legendEntries = hasSeries ? seriesDomain.map((s, i) => ({ label: s, color: colorAt(i) })) : [];

            barRects = raw.map((d, i) => {
              const x = barX0!(d.x);
              if (x == null) return null;
              const series = d.series ?? '';
              const dx = x1 ? x1(series) ?? 0 : 0;
              const bw = x1 ? x1.bandwidth() : barX0!.bandwidth();
              const y = yScale!(d.y);
              const h = innerH - y;
              const seriesColorIndex = seriesDomain.indexOf(series);
              const color = colorAt(seriesColorIndex < 0 ? 0 : seriesColorIndex);

              const isPointSelected = selection.kind === 'point' && selection.rowIndex === d.rowIndex;
              const isSeriesSelected = selectedSeries !== null && series === selectedSeries;
              const isRangeSelected = selectedXDomain !== null && selectedXDomain.has(d.x);
              const isActive =
                selection.kind === 'none'
                  ? true
                  : selection.kind === 'point'
                    ? isPointSelected
                    : selection.kind === 'series'
                      ? isSeriesSelected
                      : isRangeSelected;

              const opacity = isActive ? 1 : selection.kind === 'none' ? 1 : 0.35;
              const stroke = isPointSelected ? theme.fg : 'transparent';
              const strokeWidth = isPointSelected ? 2 : 0;
              const tooltipTitle = d.x;
              const tooltipLines = [
                seriesDomain.length > 1 ? `series: ${series}` : '',
                `${props.encoding.y ?? 'value'}: ${formatNumber(d.y, unit)}`,
              ].filter(Boolean);

              return {
                key: `${i}`,
                rowIndex: d.rowIndex,
                xLabel: d.x,
                yValue: d.y,
                series,
                x: x + dx,
                y,
                width: bw,
                height: h,
                fill: color,
                opacity,
                stroke,
                strokeWidth,
                tooltipTitle,
                tooltipLines,
              } satisfies BarRect;
            }).filter((r): r is BarRect => r !== null);
          } else {
            mode = 'line';

            lineX = scalePoint<string>().domain(xDomain).range([0, innerW]).padding(0.4);

            const bySeries = seriesDomain.length > 1 ? seriesDomain : [''];
            legendEntries = bySeries.length > 1 ? bySeries.map((s, i) => ({ label: s, color: colorAt(i) })) : [];

            const makeLine = line<{ x: string; y: number }>()
              .x((d) => lineX!(d.x) ?? 0)
              .y((d) => yScale!(d.y))
              .curve(curveMonotoneX);

            lineSeries = bySeries.map((s, i) => {
              const color = colorAt(i);
              const points = raw.filter((d) => (d.series ?? '') === s);
              const seriesOpacity = selectedSeries !== null && s !== selectedSeries ? 0.35 : 1;
              const pathPoints = points.map((p) => ({ x: p.x, y: p.y }));
              const path = makeLine(pathPoints) ?? '';

              const linePoints = points.map((p, j) => {
                const isPointSelected = selection.kind === 'point' && selection.rowIndex === p.rowIndex;
                const isRangeSelected = selectedXDomain !== null && selectedXDomain.has(p.x);
                const isActive =
                  selection.kind === 'none'
                    ? true
                    : selection.kind === 'point'
                      ? isPointSelected
                      : selection.kind === 'series'
                        ? s === selectedSeries
                        : isRangeSelected;

                const opacity = seriesOpacity * (isActive ? 1 : selection.kind === 'none' ? 1 : 0.35);
                const stroke = isPointSelected ? theme.fg : 'transparent';
                const strokeWidth = isPointSelected ? 2 : 0;
                const tooltipTitle = p.x;
                const tooltipLines = [
                  bySeries.length > 1 ? `series: ${s}` : '',
                  `${props.encoding.y ?? 'value'}: ${formatNumber(p.y, unit)}`,
                ].filter(Boolean);

                return {
                  key: `${s || '<default>'}_${j}`,
                  rowIndex: p.rowIndex,
                  xLabel: p.x,
                  yValue: p.y,
                  series: s,
                  cx: lineX!(p.x) ?? 0,
                  cy: yScale!(p.y),
                  fill: color,
                  opacity,
                  stroke,
                  strokeWidth,
                  tooltipTitle,
                  tooltipLines,
                } satisfies LinePoint;
              });

              return {
                key: s || '<default>',
                series: s,
                color,
                path,
                opacity: seriesOpacity,
                points: linePoints,
              } satisfies LineSeries;
            });
          }
        }
      }
    } else if (props.mark === 'pie') {
      const labelIdx = encode(props.encoding.label);
      const valueIdx = encode(props.encoding.value);
      if (typeof labelIdx !== 'number' || typeof valueIdx !== 'number') {
        mode = 'empty';
      } else {
        const seriesIdx = encode(props.encoding.series);
        const values = props.data.rows
          .map((row, rowIndex) => ({
            rowIndex,
            label: row[labelIdx],
            value: row[valueIdx],
            series: typeof seriesIdx === 'number' ? row[seriesIdx] : null,
          }))
          .filter(
            (d): d is { rowIndex: number; label: string; value: number; series: unknown } =>
              typeof d.label === 'string' && d.label.trim() !== '' && typeof d.value === 'number' && Number.isFinite(d.value) && d.value >= 0,
          )
          .map((d) => ({ rowIndex: d.rowIndex, label: d.label, value: d.value, series: d.series === null ? null : String(d.series) }));

        if (values.length === 0) {
          mode = 'empty';
        } else {
          mode = 'pie';

          const r = Math.min(innerW, innerH) / 2;
          pieCx = margin.left + innerW / 2;
          pieCy = margin.top + innerH / 2;

          const p = pie<{ label: string; value: number }>().value((d) => d.value);
          const arcs = p(values);
          const makeArc = arc<PieArcDatum<{ label: string; value: number }>>().innerRadius(0).outerRadius(r);

          legendEntries = values.map((v, i) => ({ label: v.label, color: colorAt(i) }));

          pieSlices = arcs.map((a, i) => {
            const color = colorAt(i);
            const path = makeArc(a) ?? '';
            const rowIndex = values[i]!.rowIndex;
            const isPointSelected = selection.kind === 'point' && selection.rowIndex === rowIndex;
            const isSeriesSelected = selection.kind === 'series' && values[i]!.series !== null && values[i]!.series === String(selection.value);
            const isActive = selection.kind === 'none' ? true : selection.kind === 'point' ? isPointSelected : isSeriesSelected;

            const opacity = isActive ? 1 : selection.kind === 'none' ? 1 : 0.35;
            const strokeWidth = isPointSelected ? 3 : 1;
            const tooltipTitle = values[i]!.label;
            const tooltipLines = [`${props.encoding.value ?? 'value'}: ${formatNumber(values[i]!.value, unit)}`];

            return {
              key: `${i}`,
              rowIndex,
              label: values[i]!.label,
              value: values[i]!.value,
              series: values[i]!.series,
              path,
              fill: color,
              opacity,
              strokeWidth,
              tooltipTitle,
              tooltipLines,
            } satisfies PieSlice;
          });
        }
      }
    }
  }

  $: selectionLabel = (() => {
    if (selection.kind === 'none') return null;
    if (selection.kind === 'point') return `Selected rowIndex=${selection.rowIndex}`;
    if (selection.kind === 'series') return `Selected series=${String(selection.value)}`;
    if (selection.kind === 'range') return `Selected range ${selection.column}: ${String(selection.from)}..${String(selection.to)}`;
    return null;
  })();
</script>

{#if props.data.rows.length === 0 || mode === 'empty'}
  <div
    bind:this={node}
    style={`border:1px solid ${theme.borderMuted};border-radius:${theme.radius};padding:14px;background:${theme.bgMuted};box-shadow:${theme.shadow};color:${theme.muted};font-size:12px;`}
  >
    <div style={`font-weight:650;color:${theme.fg};`}>{title ?? 'Chart'}</div>
    <div style="margin-top:8px;">No data</div>
  </div>
{:else}
  <div
    bind:this={node}
    style={`position:relative;border:1px solid ${theme.border};border-radius:${theme.radius};padding:${containerPadding}px;background:${theme.bg};box-shadow:${theme.shadow};`}
  >
    {#if mode === 'bar'}
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={title ?? 'Bar chart'}
        on:mouseleave={() => (tooltip = { visible: false })}
      >
        {#if title}
          <text x={margin.left} y={18} style={`fill:${theme.fg};font-size:13px;font-weight:650;`}>{title}</text>
        {/if}

        <g transform={`translate(${margin.left},${margin.top})`}>
          {#if isInteractive}
            <rect
              x={0}
              y={0}
              width={innerW}
              height={innerH}
              fill="transparent"
              role="presentation"
              aria-label="Brush selection"
              on:mousedown={(e) => {
                if (e.button !== 0) return;
                const p = localPoint(e.clientX, e.clientY);
                const xSvg = p.x - containerPadding;
                brush = { startX: xSvg - margin.left, currentX: xSvg - margin.left };
              }}
              on:mousemove={(e) => {
                if (!brush) return;
                const p = localPoint(e.clientX, e.clientY);
                const xSvg = p.x - containerPadding;
                brush = { ...brush, currentX: xSvg - margin.left };
              }}
              on:mouseup={() => {
                if (!brush || !barX0) return;
                const nearestX = (px: number) => {
                  let best: string | null = null;
                  let bestDist = Number.POSITIVE_INFINITY;
                  for (const label of barX0.domain()) {
                    const v = barX0(label);
                    if (typeof v !== 'number') continue;
                    const center = v + barX0.bandwidth() / 2;
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
                brush = null;
                if (!from || !to) return;
                if (!props.encoding.x) return;
                void sendSelection({ kind: 'range', column: props.encoding.x, from, to });
              }}
              on:mouseleave={() => (brush = null)}
            />
            {#if brush}
              <rect
                x={Math.min(brush.startX, brush.currentX)}
                y={0}
                width={Math.abs(brush.currentX - brush.startX)}
                height={innerH}
                fill="rgba(37,99,235,0.10)"
                stroke="rgba(37,99,235,0.35)"
                pointer-events="none"
              />
            {/if}
          {/if}

          {#each yTicks as t, i (i)}
            <g transform={`translate(0,${yScale ? yScale(t) : 0})`}>
              <line x1={0} x2={innerW} y1={0} y2={0} stroke={theme.borderMuted} />
              <text x={-10} y={0} dy="0.32em" text-anchor="end" style={`fill:${theme.fgMuted};font-size:11px;`}>{formatNumber(t, unit)}</text>
            </g>
          {/each}

          {#if barX0}
            {#each barX0.domain() as xLabel (xLabel)}
              <text
                x={(barX0(xLabel) ?? 0) + barX0.bandwidth() / 2}
                y={innerH + 18}
                text-anchor="middle"
                style={`fill:${theme.fgMuted};font-size:11px;`}
              >
                {xLabel}
              </text>
            {/each}
          {/if}

          {#each barRects as r (r.key)}
            <rect
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              rx={6}
              fill={r.fill}
              opacity={r.opacity}
              stroke={r.stroke}
              stroke-width={r.strokeWidth}
              tabindex="0"
              role="button"
              aria-label={`Select ${r.tooltipTitle}`}
              on:click={() => {
                if (!isInteractive) return;
                void sendSelection({ kind: 'point', rowIndex: r.rowIndex });
              }}
              on:keydown={(e) => {
                if (!isInteractive) return;
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                void sendSelection({ kind: 'point', rowIndex: r.rowIndex });
              }}
              on:focus={(e) => {
                const rect = (e.target as SVGRectElement).getBoundingClientRect();
                const p0 = localPointFromTargetRect(rect);
                tooltip = { visible: true, x: p0.x, y: p0.y, title: r.tooltipTitle, lines: r.tooltipLines };
              }}
              on:blur={() => (tooltip = { visible: false })}
              on:mousemove={(e) => {
                const p0 = localPoint(e.clientX, e.clientY);
                tooltip = { visible: true, x: p0.x, y: p0.y, title: r.tooltipTitle, lines: r.tooltipLines };
              }}
            />
          {/each}
        </g>
      </svg>
    {:else if mode === 'line'}
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={title ?? 'Line chart'}
        on:mouseleave={() => (tooltip = { visible: false })}
      >
        {#if title}
          <text x={margin.left} y={18} style={`fill:${theme.fg};font-size:13px;font-weight:650;`}>{title}</text>
        {/if}

        <g transform={`translate(${margin.left},${margin.top})`}>
          {#if isInteractive}
            <rect
              x={0}
              y={0}
              width={innerW}
              height={innerH}
              fill="transparent"
              role="presentation"
              aria-label="Brush selection"
              on:mousedown={(e) => {
                if (e.button !== 0) return;
                const p = localPoint(e.clientX, e.clientY);
                const xSvg = p.x - containerPadding;
                brush = { startX: xSvg - margin.left, currentX: xSvg - margin.left };
              }}
              on:mousemove={(e) => {
                if (!brush) return;
                const p = localPoint(e.clientX, e.clientY);
                const xSvg = p.x - containerPadding;
                brush = { ...brush, currentX: xSvg - margin.left };
              }}
              on:mouseup={() => {
                if (!brush || !lineX) return;
                const nearestX = (px: number) => {
                  let best: string | null = null;
                  let bestDist = Number.POSITIVE_INFINITY;
                  for (const label of lineX.domain()) {
                    const v = lineX(label);
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
                brush = null;
                if (!from || !to) return;
                if (!props.encoding.x) return;
                void sendSelection({ kind: 'range', column: props.encoding.x, from, to });
              }}
              on:mouseleave={() => (brush = null)}
            />
            {#if brush}
              <rect
                x={Math.min(brush.startX, brush.currentX)}
                y={0}
                width={Math.abs(brush.currentX - brush.startX)}
                height={innerH}
                fill="rgba(37,99,235,0.10)"
                stroke="rgba(37,99,235,0.35)"
                pointer-events="none"
              />
            {/if}
          {/if}

          {#each yTicks as t, i (i)}
            <g transform={`translate(0,${yScale ? yScale(t) : 0})`}>
              <line x1={0} x2={innerW} y1={0} y2={0} stroke={theme.borderMuted} />
              <text x={-10} y={0} dy="0.32em" text-anchor="end" style={`fill:${theme.fgMuted};font-size:11px;`}>{formatNumber(t, unit)}</text>
            </g>
          {/each}

          {#if lineX}
            {#each lineX.domain() as xLabel (xLabel)}
              <text x={lineX(xLabel) ?? 0} y={innerH + 18} text-anchor="middle" style={`fill:${theme.fgMuted};font-size:11px;`}>{xLabel}</text>
            {/each}
          {/if}

          {#each lineSeries as s (s.key)}
            <g>
              <path d={s.path} fill="none" stroke={s.color} stroke-width={2.5} opacity={s.opacity} />
              {#each s.points as p (p.key)}
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={3}
                  fill={p.fill}
                  opacity={p.opacity}
                  stroke={p.stroke}
                  stroke-width={p.strokeWidth}
                  tabindex="0"
                  role="button"
                  aria-label={`Select ${p.tooltipTitle}`}
                  on:click={() => {
                    if (!isInteractive) return;
                    void sendSelection({ kind: 'point', rowIndex: p.rowIndex });
                  }}
                  on:keydown={(e) => {
                    if (!isInteractive) return;
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    e.preventDefault();
                    void sendSelection({ kind: 'point', rowIndex: p.rowIndex });
                  }}
                  on:focus={(e) => {
                    const rect = (e.target as SVGCircleElement).getBoundingClientRect();
                    const p0 = localPointFromTargetRect(rect);
                    tooltip = { visible: true, x: p0.x, y: p0.y, title: p.tooltipTitle, lines: p.tooltipLines };
                  }}
                  on:blur={() => (tooltip = { visible: false })}
                  on:mousemove={(e) => {
                    const p0 = localPoint(e.clientX, e.clientY);
                    tooltip = { visible: true, x: p0.x, y: p0.y, title: p.tooltipTitle, lines: p.tooltipLines };
                  }}
                />
              {/each}
            </g>
          {/each}
        </g>
      </svg>
    {:else if mode === 'pie'}
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label={title ?? 'Pie chart'}
        on:mouseleave={() => (tooltip = { visible: false })}
      >
        {#if title}
          <text x={margin.left} y={18} style={`fill:${theme.fg};font-size:13px;font-weight:650;`}>{title}</text>
        {/if}
        <g transform={`translate(${pieCx},${pieCy})`}>
          {#each pieSlices as s (s.key)}
            <path
              d={s.path}
              fill={s.fill}
              opacity={s.opacity}
              stroke={theme.bg}
              stroke-width={s.strokeWidth}
              tabindex="0"
              role="button"
              aria-label={`Select ${s.tooltipTitle}`}
              on:click={() => {
                if (!isInteractive) return;
                void sendSelection({ kind: 'point', rowIndex: s.rowIndex });
              }}
              on:keydown={(e) => {
                if (!isInteractive) return;
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                void sendSelection({ kind: 'point', rowIndex: s.rowIndex });
              }}
              on:focus={(e) => {
                const rect = (e.target as SVGPathElement).getBoundingClientRect();
                const p0 = localPointFromTargetRect(rect);
                tooltip = { visible: true, x: p0.x, y: p0.y, title: s.tooltipTitle, lines: s.tooltipLines };
              }}
              on:blur={() => (tooltip = { visible: false })}
              on:mousemove={(e) => {
                const p0 = localPoint(e.clientX, e.clientY);
                tooltip = { visible: true, x: p0.x, y: p0.y, title: s.tooltipTitle, lines: s.tooltipLines };
              }}
            />
          {/each}
        </g>
      </svg>
    {/if}

    {#if legendEntries.length > 1}
      <div style={`display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;color:${theme.fgMuted};font-size:12px;`}>
        {#each legendEntries as e (e.label)}
          <div style="display:flex;align-items:center;gap:6px;">
            <span style={`width:10px;height:10px;border-radius:3px;background:${e.color};display:inline-block;`}></span>
            <span>{e.label}</span>
          </div>
        {/each}
      </div>
    {/if}

    {#if tooltip.visible}
      <div
        style={`position:absolute;left:${tooltip.x}px;top:${tooltip.y}px;transform:translate(10px, 10px);pointer-events:none;max-width:260px;padding:8px 10px;border-radius:${theme.radiusSm};border:1px solid ${theme.borderMuted};background:${theme.bg};box-shadow:${theme.shadow};color:${theme.fg};font-size:12px;line-height:1.35;z-index:10;`}
        role="tooltip"
      >
        <div style="font-weight:650;">{tooltip.title}</div>
        {#each tooltip.lines as lineText, i (i)}
          <div style={`margin-top:${i === 0 ? 6 : 2}px;color:${theme.fgMuted};`}>{lineText}</div>
        {/each}
      </div>
    {/if}

    {#if selectionLabel}
      <div
        style={`position:absolute;right:10px;top:10px;display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;border:1px solid ${theme.borderMuted};background:${theme.bg};color:${theme.fgMuted};font-size:12px;max-width:80%;user-select:none;`}
      >
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{selectionLabel}</span>
        {#if isInteractive}
          <button
            type="button"
            on:click={() => void clearSelection()}
            style={`border:1px solid ${theme.borderMuted};background:${theme.bgMuted};border-radius:999px;font-size:11px;padding:3px 8px;cursor:pointer;`}
          >
            Clear
          </button>
        {/if}
      </div>
    {/if}

    {#if localError}
      <div style={`position:absolute;left:10px;bottom:10px;color:var(--rivu-chart-4, #991b1b);font-size:12px;`}>
        {localError}
      </div>
    {/if}
  </div>
{/if}
