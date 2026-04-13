'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import {
  BarChart   as EBar,
  LineChart  as ELine,
  ScatterChart as EScatter,
  PieChart   as EPie,
  RadarChart as ERadar,
} from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  DataZoomComponent,
  RadarComponent,
  GraphicComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ECharts, EChartsCoreOption as EChartsOption } from 'echarts/core';
import { formatNPR } from '@/lib/formatters';

// ─── Register once ────────────────────────────────────────────────────────────
echarts.use([
  EBar, ELine, EScatter, EPie, ERadar,
  GridComponent, TooltipComponent, LegendComponent,
  MarkLineComponent, DataZoomComponent, RadarComponent,
  GraphicComponent,
  CanvasRenderer,
]);

// ─── Design tokens ────────────────────────────────────────────────────────────
export const COLORS = {
  blue:   '#3b82f6',
  green:  '#10b981',
  red:    '#ef4444',
  amber:  '#f59e0b',
  purple: '#8b5cf6',
  teal:   '#06b6d4',
};
export const CHART_COLORS = COLORS;
export const DEFAULT_PALETTE = [
  COLORS.blue, COLORS.green, COLORS.purple,
  COLORS.amber, COLORS.teal, COLORS.red,
];

function css(v: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback;
}
function resolveColor(c: unknown): string {
  if (typeof c !== 'string') return String(c || '');
  if (c.startsWith('var(')) {
    const match = c.match(/var\((--[^)]+)\)/);
    if (match && match[1]) {
      const val = css(match[1], '').trim();
      if (val) return val;
    }
  }
  return c;
}
function theme() {
  return {
    textMuted:     css('--text-muted',      '#555d75'),
    textSecondary: css('--text-secondary',  '#8b92a9'),
    textPrimary:   css('--text-primary',    '#f0f2f8'),
    border:        css('--border',          'rgba(255,255,255,0.07)'),
    bgCard:        css('--bg-card',         '#1a1e2e'),
    chartGrid:     css('--chart-grid',      'rgba(255,255,255,0.08)'),
    tooltipBg:     css('--chart-tooltip-bg',     'rgba(26,30,46,0.95)'),
    tooltipBorder: css('--chart-tooltip-border', 'rgba(255,255,255,0.14)'),
  };
}

// ─── Shared ECharts config builders ───────────────────────────────────────────
function axisLabel(t: ReturnType<typeof theme>) {
  return { color: t.textMuted, fontSize: 10, fontFamily: "var(--font-sans, 'Inter', system-ui, sans-serif)" };
}
function splitLine(t: ReturnType<typeof theme>) {
  return { lineStyle: { color: t.chartGrid, type: 'dashed' as const } };
}
function noAxisLine() {
  return { axisLine: { show: false }, axisTick: { show: false } };
}
function tooltipBase(t: ReturnType<typeof theme>) {
  return {
    backgroundColor: t.tooltipBg,
    borderColor: t.tooltipBorder,
    borderWidth: 1,
    padding: [8, 12] as [number, number],
    textStyle: { color: t.textPrimary, fontSize: 11, fontFamily: "var(--font-sans, 'Inter', system-ui, sans-serif)" },
    extraCssText: 'border-radius:10px;box-shadow:0 18px 40px rgba(0,0,0,0.35);backdrop-filter:blur(8px);',
  };
}

type TooltipParam = {
  axisValueLabel?: string;
  name?:           string;
  seriesName?:     string;
  value:           unknown;
  color:           unknown;
};

function tooltipFormatter(
  formatValue: (v: number) => string,
  formatX?: (v: string) => string,
) {
  return (params: TooltipParam | TooltipParam[]) => {
    const items = Array.isArray(params) ? params : [params];
    if (!items.length) return '';
    const rawLabel = items[0].axisValueLabel || items[0].name || '';
    const label = formatX ? formatX(String(rawLabel)) : String(rawLabel);

    const rows = items.map((p) => {
      const val  = Array.isArray(p.value)
        ? Number((p.value as unknown[])[1] ?? 0)
        : Number(p.value ?? 0);
      const col  = resolveColor(String(p.color || '#3b82f6'));
      const name = String(p.seriesName || '');
      return `<div style="display:flex;align-items:center;gap:8px;padding:2px 0">
        <span style="width:7px;height:7px;border-radius:50%;background:${col};flex-shrink:0;box-shadow:0 0 5px ${col}40"></span>
        <span style="color:var(--text-secondary);flex:1;font-size:10px">${name}</span>
        <span style="color:var(--text-primary);font-weight:600;font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:10px">${formatValue(val)}</span>
      </div>`;
    }).join('');

    return `<div>
      ${label ? `<div style="color:var(--text-secondary);font-size:10px;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:5px;padding-bottom:5px;border-bottom:1px solid var(--border);font-weight:500">${label}</div>` : ''}
      ${rows}
    </div>`;
  };
}

function barGradient(color: string) {
  const c = resolveColor(color);
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0,   color: c },
    { offset: 1,   color: `${c}88` },
  ]);
}
function areaGradient(color: string) {
  const c = resolveColor(color);
  return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
    { offset: 0,   color: `${c}55` },
    { offset: 0.5, color: `${c}1a` },
    { offset: 1,   color: `${c}00` },
  ]);
}

// ─── Core hook ────────────────────────────────────────────────────────────────
export function useEChart(
  buildOption: () => EChartsOption,
  deps: unknown[],
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<ECharts | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!chartRef.current || chartRef.current.isDisposed()) {
      chartRef.current = echarts.init(el, null, { renderer: 'canvas' });
    }
    
    let isMounted = true;
    const option = buildOption();

    // Defer setOption to avoid "setOption should not be called during main process"
    // when React synchronously renders a state change triggered by an ECharts event.
    const timeoutId = setTimeout(() => {
      if (isMounted && chartRef.current && !chartRef.current.isDisposed()) {
        chartRef.current.setOption(option, { notMerge: true, silent: true });
      }
    }, 0);

    const ro = new ResizeObserver(() => {
      if (isMounted && chartRef.current && !chartRef.current.isDisposed()) {
        requestAnimationFrame(() => chartRef.current?.resize());
      }
    });
    ro.observe(el);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => () => { chartRef.current?.dispose(); }, []);
  return containerRef;
}

// ─── Shared series interface ───────────────────────────────────────────────────
export interface ChartSeries {
  dataKey: string;
  name?:   string;
  color?:  string;
  dashed?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// PremiumBarChart
// ──────────────────────────────────────────────────────────────────────────────
export interface PremiumBarChartProps {
  data:          Record<string, unknown>[];
  xAxisKey:      string;
  /** Pass a single-element array for a simple bar chart */
  series:        ChartSeries[];
  /** 'vertical' = vertical bars (default) | 'horizontal' = horizontal bars */
  layout?:       'vertical' | 'horizontal';
  height?:       number;
  showGrid?:     boolean;
  formatValue?:  (v: number) => string;
  formatXAxis?:  (v: string) => string;
  yAxisWidth?:   number;
  /** Per-bar item colors (equivalent to Recharts <Cell>) */
  itemColors?:   string[];
  // legacy compat (single-series shorthand)
  dataKey?:      string;
  color?:        string;
}

export function PremiumBarChart({
  data, xAxisKey, series: seriesProp,
  dataKey, color,
  layout = 'vertical', height = 260, showGrid = true,
  formatValue = formatNPR, formatXAxis, yAxisWidth = 80, itemColors,
}: PremiumBarChartProps) {
  // Support legacy single-series shorthand
  const series: ChartSeries[] = seriesProp?.length
    ? seriesProp
    : [{ dataKey: dataKey || 'value', color: color || COLORS.blue }];

  const isHorizontal = layout === 'horizontal';

  const ref = useEChart(() => {
    const t = theme();
    const xLabels = data.map((d) => String(d[xAxisKey] ?? ''));

    const eSeries = series.map((s, si) => {
      const c = s.color || DEFAULT_PALETTE[si % DEFAULT_PALETTE.length];
      const values = data.map((d, di) => {
        const v = Number(d[s.dataKey] ?? 0);
        if (itemColors && series.length === 1) {
          const ic = itemColors[di % itemColors.length];
          return {
            value: v,
            itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: ic },
              { offset: 1, color: `${ic}88` },
            ]) },
          };
        }
        return v;
      });
      return {
        name: s.name || s.dataKey,
        type: 'bar' as const,
        data: isHorizontal ? values.slice().reverse() : values,
        barMaxWidth: 40,
        itemStyle: {
          borderRadius: isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
          color: itemColors && series.length === 1
            ? undefined
            : barGradient(c),
        },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: `${c}55` } },
        animationDuration: 700,
        animationEasing: 'cubicOut' as const,
      };
    });

    return {
      animation: true,
      grid: { left: isHorizontal ? 8 : 8, right: 8, top: 10, bottom: 20, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(t),
        formatter: tooltipFormatter(formatValue, formatXAxis),
      },
      xAxis: isHorizontal
        ? { type: 'value', ...noAxisLine(), axisLabel: { ...axisLabel(t), formatter: (v: number) => formatValue(v) }, splitLine: splitLine(t) }
        : { type: 'category', data: xLabels, ...noAxisLine(), axisLabel: { ...axisLabel(t), formatter: formatXAxis ? (v: string) => formatXAxis(v) : (v: string) => String(v).slice(0, 12), overflow: 'truncate' }, splitLine: { show: false } },
      yAxis: isHorizontal
        ? { type: 'category', data: xLabels.slice().reverse(), ...noAxisLine(), axisLabel: { ...axisLabel(t), width: yAxisWidth - 8, overflow: 'truncate' }, splitLine: { show: false } }
        : { type: 'value', ...noAxisLine(), axisLabel: { ...axisLabel(t), formatter: (v: number) => formatValue(v) }, splitLine: showGrid ? splitLine(t) : { show: false } },
      series: eSeries,
    } as EChartsOption;
  }, [data, xAxisKey, JSON.stringify(series), layout, formatValue?.toString(), formatXAxis?.toString(), itemColors]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

// ──────────────────────────────────────────────────────────────────────────────
// PremiumLineChart
// ──────────────────────────────────────────────────────────────────────────────
export interface PremiumLineChartProps {
  data:           Record<string, unknown>[];
  xAxisKey:       string;
  series:         ChartSeries[];
  height?:        number;
  showGrid?:      boolean;
  formatValue?:   (v: number) => string;
  formatXAxis?:   (v: string) => string;
  showDots?:      boolean;
  referenceLine?: number;
  /** Dual Y-axis: series matching these dataKeys use yAxisIndex=1 (right axis) */
  rightAxisKeys?: string[];
  rightFormatValue?: (v: number) => string;
  // legacy compat
  dataKey?: string;
  color?:   string;
  showDot?: boolean;
}

export function PremiumLineChart({
  data, xAxisKey, series: seriesProp,
  dataKey, color,
  height = 260, showGrid = true,
  formatValue = formatNPR, formatXAxis,
  showDots = false, showDot,
  referenceLine, rightAxisKeys, rightFormatValue,
}: PremiumLineChartProps) {
  const series: ChartSeries[] = seriesProp?.length
    ? seriesProp
    : [{ dataKey: dataKey || 'value', color: color || COLORS.blue }];

  const dots = showDots || showDot || false;

  const ref = useEChart(() => {
    const t = theme();
    const xLabels = data.map((d) => String(d[xAxisKey] ?? ''));
    const hasRight = rightAxisKeys && rightAxisKeys.length > 0;

    const eSeries = series.map((s, si) => {
      const c = s.color || DEFAULT_PALETTE[si % DEFAULT_PALETTE.length];
      const isRight = hasRight && rightAxisKeys!.includes(s.dataKey);
      return {
        name: s.name || s.dataKey,
        type: 'line' as const,
        data: data.map((d) => Number(d[s.dataKey] ?? 0)),
        yAxisIndex: isRight ? 1 : 0,
        smooth: 0.2,
        symbol: dots ? 'circle' : 'none',
        symbolSize: 5,
        lineStyle: {
          width: 2,
          color: c,
          type: s.dashed ? 'dashed' as const : 'solid' as const,
        },
        itemStyle: { color: c },
        emphasis: { lineStyle: { width: 3 } },
        animationDuration: 800,
        animationEasing: 'cubicOut' as const,
        ...(referenceLine !== undefined ? {
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: t.border, width: 1, type: 'solid' as const },
            data: [{ yAxis: referenceLine }],
            label: { show: false },
          },
        } : {}),
      };
    });

    const yAxes: EChartsOption['yAxis'] = hasRight ? [
      { type: 'value', ...noAxisLine(), axisLabel: { ...axisLabel(t), formatter: (v: number) => formatValue(v) }, splitLine: showGrid ? splitLine(t) : { show: false } },
      { type: 'value', ...noAxisLine(), axisLabel: { ...axisLabel(t), formatter: (v: number) => (rightFormatValue || ((x: number) => String(x)))(v) }, splitLine: { show: false } },
    ] : { type: 'value', ...noAxisLine(), axisLabel: { ...axisLabel(t), formatter: (v: number) => formatValue(v) }, splitLine: showGrid ? splitLine(t) : { show: false } };

    return {
      animation: true,
      grid: { left: 8, right: hasRight ? 8 : 8, top: 10, bottom: 20, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', crossStyle: { color: t.textMuted, width: 1 } },
        ...tooltipBase(t),
        formatter: tooltipFormatter(formatValue, formatXAxis),
      },
      xAxis: {
        type: 'category', data: xLabels,
        ...noAxisLine(),
        axisLabel: { ...axisLabel(t), formatter: formatXAxis ? (v: string) => formatXAxis(v) : (v: string) => String(v).slice(0, 10) },
        splitLine: { show: false },
      },
      yAxis: yAxes,
      series: eSeries,
    } as EChartsOption;
  }, [data, xAxisKey, JSON.stringify(series), formatValue?.toString(), formatXAxis?.toString(), showGrid, dots, referenceLine]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

// ──────────────────────────────────────────────────────────────────────────────
// PremiumAreaChart
// ──────────────────────────────────────────────────────────────────────────────
export interface PremiumAreaChartProps {
  data:          Record<string, unknown>[];
  xAxisKey:      string;
  series:        ChartSeries[];
  height?:       number;
  showGrid?:     boolean;
  formatValue?:  (v: number) => string;
  formatXAxis?:  (v: string) => string;
  // legacy compat
  dataKey?:   string;
  color?:     string;
  gradientId?: string;
}

export function PremiumAreaChart({
  data, xAxisKey, series: seriesProp,
  dataKey, color,
  height = 260, showGrid = true,
  formatValue = formatNPR, formatXAxis,
}: PremiumAreaChartProps) {
  const series: ChartSeries[] = seriesProp?.length
    ? seriesProp
    : [{ dataKey: dataKey || 'value', color: color || COLORS.blue }];

  const ref = useEChart(() => {
    const t = theme();
    const xLabels = data.map((d) => String(d[xAxisKey] ?? ''));

    const eSeries = series.map((s, si) => {
      const c = s.color || DEFAULT_PALETTE[si % DEFAULT_PALETTE.length];
      return {
        name: s.name || s.dataKey,
        type: 'line' as const,
        data: data.map((d) => Number(d[s.dataKey] ?? 0)),
        smooth: 0.3,
        symbol: 'none',
        lineStyle: { width: 2, color: c },
        itemStyle: { color: c },
        areaStyle: { color: areaGradient(c), opacity: 1 },
        emphasis: { lineStyle: { width: 3 } },
        animationDuration: 800,
        animationEasing: 'cubicOut' as const,
      };
    });

    return {
      animation: true,
      grid: { left: 8, right: 8, top: 10, bottom: 20, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', crossStyle: { color: t.textMuted, width: 1 } },
        ...tooltipBase(t),
        formatter: tooltipFormatter(formatValue, formatXAxis),
      },
      xAxis: {
        type: 'category', data: xLabels,
        ...noAxisLine(),
        axisLabel: { ...axisLabel(t), formatter: formatXAxis ? (v: string) => formatXAxis(v) : (v: string) => String(v).slice(0, 10) },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        ...noAxisLine(),
        axisLabel: { ...axisLabel(t), formatter: (v: number) => formatValue(v) },
        splitLine: showGrid ? splitLine(t) : { show: false },
      },
      series: eSeries,
    } as EChartsOption;
  }, [data, xAxisKey, JSON.stringify(series), formatValue?.toString(), formatXAxis?.toString(), showGrid]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

// ──────────────────────────────────────────────────────────────────────────────
// PremiumComposedChart — bars + lines, optional dual Y-axis
// ──────────────────────────────────────────────────────────────────────────────
export interface ComposedSeries extends ChartSeries {
  yAxisIndex?: number;
}
export interface PremiumComposedChartProps {
  data:          Record<string, unknown>[];
  xAxisKey:      string;
  bars?:         ComposedSeries[];
  lines?:        ComposedSeries[];
  height?:       number;
  formatValue?:  (v: number) => string;
  rightFormatValue?: (v: number) => string;
  formatXAxis?:  (v: string) => string;
  showDots?:     boolean;
}

export function PremiumComposedChart({
  data, xAxisKey,
  bars = [], lines = [],
  height = 260, formatValue = formatNPR, rightFormatValue, formatXAxis, showDots = true,
}: PremiumComposedChartProps) {
  const hasRight = [...bars, ...lines].some((s) => s.yAxisIndex === 1);

  const ref = useEChart(() => {
    const t = theme();
    const xLabels = data.map((d) => String(d[xAxisKey] ?? ''));

    const barSeries = bars.map((s, si) => {
      const c = s.color || DEFAULT_PALETTE[si % DEFAULT_PALETTE.length];
      return {
        name: s.name || s.dataKey,
        type: 'bar' as const,
        yAxisIndex: s.yAxisIndex ?? 0,
        data: data.map((d) => Number(d[s.dataKey] ?? 0)),
        barMaxWidth: 36,
        itemStyle: { borderRadius: [4, 4, 0, 0], color: barGradient(c) },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: `${c}55` } },
        animationDuration: 700,
        animationEasing: 'cubicOut' as const,
      };
    });

    const lineSeries = lines.map((s, si) => {
      const c = s.color || DEFAULT_PALETTE[(bars.length + si) % DEFAULT_PALETTE.length];
      return {
        name: s.name || s.dataKey,
        type: 'line' as const,
        yAxisIndex: s.yAxisIndex ?? 0,
        data: data.map((d) => Number(d[s.dataKey] ?? 0)),
        smooth: 0.2,
        symbol: showDots ? 'circle' : 'none',
        symbolSize: 5,
        lineStyle: { width: 2.5, color: c },
        itemStyle: { color: c },
        z: 5,
        animationDuration: 900,
        animationEasing: 'cubicOut' as const,
      };
    });

    const yAxes: EChartsOption['yAxis'] = hasRight ? [
      { type: 'value', ...noAxisLine(), axisLabel: { ...axisLabel(t), formatter: (v: number) => formatValue(v) }, splitLine: splitLine(t) },
      { type: 'value', ...noAxisLine(), axisLabel: { ...axisLabel(t), formatter: (v: number) => (rightFormatValue || ((x: number) => String(x)))(v) }, splitLine: { show: false } },
    ] : { type: 'value', ...noAxisLine(), axisLabel: { ...axisLabel(t), formatter: (v: number) => formatValue(v) }, splitLine: splitLine(t) };

    return {
      animation: true,
      grid: { left: 8, right: 8, top: 10, bottom: 20, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        ...tooltipBase(t),
        formatter: tooltipFormatter(formatValue, formatXAxis),
      },
      xAxis: {
        type: 'category', data: xLabels,
        ...noAxisLine(),
        axisLabel: { ...axisLabel(t), formatter: formatXAxis ? (v: string) => formatXAxis(v) : (v: string) => String(v).slice(0, 10) },
        splitLine: { show: false },
      },
      yAxis: yAxes,
      series: [...barSeries, ...lineSeries],
    } as EChartsOption;
  }, [data, xAxisKey, JSON.stringify(bars), JSON.stringify(lines), formatValue?.toString(), rightFormatValue?.toString(), formatXAxis?.toString()]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

// ──────────────────────────────────────────────────────────────────────────────
// PremiumDonutChart  (replaces PremiumPieChart)
// ──────────────────────────────────────────────────────────────────────────────
export interface PremiumDonutChartProps {
  data:          Array<{ name: string; value: number; fill?: string }>;
  colors?:       string[];
  height?:       number;
  innerRadius?:  string | number;
  outerRadius?:  string | number;
  formatValue?:  (v: number) => string;
  centerLabel?:  string;
  centerValue?:  string;
}

export function PremiumDonutChart({
  data, colors = DEFAULT_PALETTE,
  height = 260, innerRadius = '52%', outerRadius = '72%',
  formatValue = formatNPR, centerLabel, centerValue,
}: PremiumDonutChartProps) {
  const ref = useEChart(() => {
    const t = theme();

    return {
      animation: true,
      tooltip: {
        trigger: 'item',
        ...tooltipBase(t),
        formatter: (p: { name: string; value: number; color: string; percent: number } | unknown) => {
          const param = p as { name: string; value: number; color: string; percent: number };
          return `<div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="width:7px;height:7px;border-radius:50%;background:${param.color};flex-shrink:0;box-shadow:0 0 5px ${param.color}40"></span>
              <span style="color:var(--text-secondary);font-size:10px">${param.name}</span>
            </div>
            <div style="color:var(--text-primary);font-weight:600;font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:11px;margin-top:4px">
              ${formatValue(param.value)} <span style="color:var(--text-muted);font-size:9px">(${param.percent.toFixed(1)}%)</span>
            </div>
          </div>`;
        },
      },
      graphic: centerValue ? [
        {
          type: 'text',
          left: 'center', top: 'middle',
          style: {
            text: centerValue,
            textAlign: 'center',
            fill: t.textPrimary,
            font: "bold 14px var(--font-sans, 'Inter', system-ui, sans-serif)",
          },
        },
        ...(centerLabel ? [{
          type: 'text',
          left: 'center',
          top: `calc(50% + 16px)`,
          style: {
            text: centerLabel,
            textAlign: 'center',
            fill: t.textMuted,
            font: "10px var(--font-sans, 'Inter', system-ui, sans-serif)",
          },
        }] : []),
      ] : [],
      series: [{
        type: 'pie' as const,
        radius: [innerRadius, outerRadius],
        padAngle: 2,
        itemStyle: { borderRadius: 4, borderColor: t.bgCard, borderWidth: 2 },
        label: { show: false },
        data: data.map((d, i) => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.fill || colors[i % colors.length] },
        })),
        emphasis: {
          itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.3)' },
          scale: true,
          scaleSize: 5,
        },
        animationType: 'expansion' as const,
        animationDuration: 700,
      }],
    } as EChartsOption;
  }, [data, colors, formatValue?.toString(), centerLabel, centerValue, innerRadius, outerRadius]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

// Keep old name as alias
export const PremiumPieChart = PremiumDonutChart;

// ──────────────────────────────────────────────────────────────────────────────
// PremiumScatterChart
// ──────────────────────────────────────────────────────────────────────────────
export interface PremiumScatterChartProps {
  data:       Record<string, unknown>[];
  xKey:       string;
  yKey:       string;
  sizeKey?:   string;
  nameKey?:   string;
  color?:     string;
  height?:    number;
  formatX?:   (v: number) => string;
  formatY?:   (v: number) => string;
  xLabel?:    string;
  yLabel?:    string;
  minSize?:   number;
  maxSize?:   number;
}

export function PremiumScatterChart({
  data, xKey, yKey, sizeKey, nameKey,
  color = COLORS.teal,
  height = 280,
  formatX = (v) => v.toLocaleString(),
  formatY = formatNPR,
  xLabel, yLabel,
  minSize = 8, maxSize = 36,
}: PremiumScatterChartProps) {
  const ref = useEChart(() => {
    const t = theme();
    const sizes = sizeKey ? data.map((d) => Number(d[sizeKey] ?? 0)) : [];
    const maxS = Math.max(1, ...sizes);

    const scatterData = data.map((d) => ({
      value: [
        Number(d[xKey] ?? 0),
        Number(d[yKey] ?? 0),
        sizeKey ? minSize + (Number(d[sizeKey] ?? 0) / maxS) * (maxSize - minSize) : 14,
      ],
      name: nameKey ? String(d[nameKey] ?? '') : '',
    }));

    return {
      animation: true,
      grid: { left: 8, right: 8, top: 10, bottom: 20, containLabel: true },
      tooltip: {
        trigger: 'item',
        ...tooltipBase(t),
        formatter: (p: { value: number[]; name: string } | unknown) => {
          const param = p as { value: number[]; name: string };
          return `<div>
            ${param.name ? `<div style="color:var(--text-secondary);font-size:10px;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:5px;padding-bottom:5px;border-bottom:1px solid var(--border)">${param.name}</div>` : ''}
            <div style="display:flex;flex-direction:column;gap:3px">
              <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:var(--text-secondary);font-size:10px">${xLabel || xKey}</span><span style="color:var(--text-primary);font-weight:600;font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:10px">${formatX(param.value[0])}</span></div>
              <div style="display:flex;justify-content:space-between;gap:12px"><span style="color:var(--text-secondary);font-size:10px">${yLabel || yKey}</span><span style="color:var(--text-primary);font-weight:600;font-family:var(--font-mono,'JetBrains Mono',monospace);font-size:10px">${formatY(param.value[1])}</span></div>
            </div>
          </div>`;
        },
      },
      xAxis: {
        type: 'value',
        name: xLabel, nameLocation: 'end', nameTextStyle: { color: t.textMuted, fontSize: 10 },
        ...noAxisLine(),
        axisLabel: { ...axisLabel(t), formatter: (v: number) => formatX(v) },
        splitLine: splitLine(t),
      },
      yAxis: {
        type: 'value',
        name: yLabel, nameLocation: 'end', nameTextStyle: { color: t.textMuted, fontSize: 10 },
        ...noAxisLine(),
        axisLabel: { ...axisLabel(t), formatter: (v: number) => formatY(v) },
        splitLine: splitLine(t),
      },
      series: [{
        type: 'scatter' as const,
        data: scatterData,
        symbolSize: (d: number[]) => d[2] || 14,
        itemStyle: {
          color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [
            { offset: 0, color: `${resolveColor(color)}dd` },
            { offset: 1, color: `${resolveColor(color)}88` },
          ]),
          shadowBlur: 8,
          shadowColor: `${resolveColor(color)}44`,
          borderColor: `${resolveColor(color)}66`,
          borderWidth: 1,
        },
        emphasis: { itemStyle: { shadowBlur: 16, shadowColor: `${resolveColor(color)}66` } },
        animationDuration: 800,
      }],
    } as EChartsOption;
  }, [data, xKey, yKey, sizeKey, nameKey, color, formatX?.toString(), formatY?.toString()]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

// ──────────────────────────────────────────────────────────────────────────────
// SparkLine  — tiny inline area chart for KPI cards / stat cards
// ──────────────────────────────────────────────────────────────────────────────
export interface SparkLineProps {
  data:    number[];
  color?:  string;
  width?:  number;
  height?: number;
}

export function SparkLine({ data, color = COLORS.blue, height = 32 }: SparkLineProps) {
  const ref = useEChart(() => {
    return {
      animation: false,
      grid: { left: 0, right: 0, top: 2, bottom: 2 },
      xAxis: { type: 'category', show: false },
      yAxis: { type: 'value',    show: false },
      series: [{
        type: 'line' as const,
        data,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { width: 1.5, color },
        itemStyle: { color },
        areaStyle: { color: areaGradient(color), opacity: 1 },
      }],
    } as EChartsOption;
  }, [data, color]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}

// ──────────────────────────────────────────────────────────────────────────────
// MiniBarChart — pure CSS, no chart lib (unchanged)
// ──────────────────────────────────────────────────────────────────────────────
export interface MiniBarChartProps {
  data:      Array<{ label: string; value: number; color?: string }>;
  height?:   number;
}

export function MiniBarChart({ data, height = 24 }: MiniBarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-0.5">
      {data.map((item, i) => (
        <div
          key={i}
          className="rounded-t-sm transition-all duration-300"
          style={{
            height: `${(item.value / maxValue) * height}px`,
            width:  '4px',
            background: item.color || COLORS.blue,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
}

// Re-export multi-line as alias of PremiumLineChart (same component, series array handles it)
export const PremiumMultiLineChart = PremiumLineChart;
