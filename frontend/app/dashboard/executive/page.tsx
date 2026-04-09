'use client';

import { useState, useEffect, useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { useDashboardData, useFilterStatistics, useDemographics } from '@/lib/hooks/useDashboardData';
import { formatChannelLabel, formatNPR, formatProvinceLabel, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters, BranchMetrics, ProvinceMetrics, ChannelMetrics, TrendData } from '@/types';
import { SparkLine, PremiumLineChart, PremiumBarChart } from '@/components/ui/PremiumCharts';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import Link from 'next/link';
import ReactECharts from 'echarts-for-react';
import type { ProvinceMetrics as PM } from '@/types';

// ── Apache ECharts: Province horizontal bar + transaction count line ──
function ProvinceBarChart({ data }: { data: PM[] }) {
  const sorted = [...data].sort((a, b) => a.total_amount - b.total_amount);
  const labels  = sorted.map(p => formatProvinceLabel(p.province));
  const amounts = sorted.map(p => +(p.total_amount / 1e7).toFixed(2));
  const counts  = sorted.map(p => p.transaction_count);
  const maxAmt  = Math.max(...amounts, 1);

  const t = {
    bg:        'transparent',
    tooltipBg: css('--chart-tooltip-bg',     '#1a1e2e'),
    tooltipBd: css('--chart-tooltip-border', 'rgba(255,255,255,0.14)'),
    textPri:   css('--text-primary',  '#f0f2f8'),
    textMuted: css('--text-muted',    '#555d75'),
    textSec:   css('--text-secondary','#8b92a9'),
    grid:      css('--chart-grid',    'rgba(255,255,255,0.08)'),
    axisLine:  css('--border',        'rgba(255,255,255,0.07)'),
  };

  const option = {
    backgroundColor: t.bg,
    grid: { left: 90, right: 60, top: 10, bottom: 30 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBd,
      textStyle: { color: t.textPri, fontSize: 11 },
      formatter: (params: { seriesName: string; value: number }[]) =>
        params.map(p =>
          `<span style="color:${p.seriesName === 'Volume' ? '#3b82f6' : '#10b981'}">${p.seriesName}</span>: ${
            p.seriesName === 'Volume' ? `Rs. ${p.value}Cr` : p.value.toLocaleString()
          }`
        ).join('<br/>'),
    },
    legend: {
      data: ['Volume', 'Transactions'],
      textStyle: { color: t.textSec, fontSize: 10 },
      top: 0, right: 0,
    },
    xAxis: [
      {
        type: 'value',
        name: 'Rs. Cr',
        nameTextStyle: { color: t.textMuted, fontSize: 9 },
        axisLabel: { color: t.textMuted, fontSize: 9, formatter: (v: number) => `${v}Cr` },
        splitLine: { lineStyle: { color: t.grid } },
        axisLine: { show: false },
        max: Math.ceil(maxAmt * 1.1),
      },
      {
        type: 'value',
        name: 'Txns',
        nameTextStyle: { color: t.textMuted, fontSize: 9 },
        axisLabel: { color: t.textMuted, fontSize: 9, formatter: (v: number) => `${(v/1000).toFixed(0)}K` },
        splitLine: { show: false },
        axisLine: { show: false },
      },
    ],
    yAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: t.textSec, fontSize: 10 },
      axisLine: { lineStyle: { color: t.axisLine } },
      axisTick: { show: false },
    },
    series: [
      {
        name: 'Volume',
        type: 'bar',
        xAxisIndex: 0,
        data: amounts.map((v, i) => ({
          value: v,
          itemStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.5)' }, { offset: 1, color: '#3b82f6' }] },
            borderRadius: [0, 4, 4, 0],
          },
          label: {
            show: i === amounts.length - 1,
            position: 'right',
            formatter: `Rs. ${v}Cr`,
            color: t.textMuted,
            fontSize: 9,
          },
        })),
        barMaxWidth: 18,
        emphasis: { itemStyle: { color: '#60a5fa' } },
      },
      {
        name: 'Transactions',
        type: 'line',
        xAxisIndex: 1,
        data: counts,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#10b981', width: 2 },
        itemStyle: { color: '#10b981' },
        areaStyle: { color: 'rgba(16,185,129,0.08)' },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 240 }} notMerge />;
}

// ── Apache ECharts: Province radar ──
function ProvinceRadarChart({ data }: { data: PM[] }) {
  if (!data.length) return null;
  const maxAmt    = Math.max(...data.map(p => p.total_amount), 1);
  const maxCount  = Math.max(...data.map(p => p.transaction_count), 1);
  const maxAccts  = Math.max(...data.map(p => p.unique_accounts), 1);
  const maxBranch = Math.max(...data.map(p => p.branch_count), 1);

  const t = {
    tooltipBg: css('--chart-tooltip-bg',     '#1a1e2e'),
    tooltipBd: css('--chart-tooltip-border', 'rgba(255,255,255,0.14)'),
    textPri:   css('--text-primary',  '#f0f2f8'),
    textSec:   css('--text-secondary','#8b92a9'),
    grid:      css('--chart-grid',    'rgba(255,255,255,0.08)'),
  };

  const indicators = [
    { name: 'Volume',     max: 100 },
    { name: 'Txns',       max: 100 },
    { name: 'Accounts',   max: 100 },
    { name: 'Branches',   max: 100 },
    { name: 'Avg/Branch', max: 100 },
  ];

  const seriesData = data.map(p => ({
    name: formatProvinceLabel(p.province),
    value: [
      +((p.total_amount / maxAmt) * 100).toFixed(1),
      +((p.transaction_count / maxCount) * 100).toFixed(1),
      +((p.unique_accounts / maxAccts) * 100).toFixed(1),
      +((p.branch_count / maxBranch) * 100).toFixed(1),
      +((p.avg_per_branch / (maxAmt / maxBranch)) * 100).toFixed(1),
    ],
  }));

  const PALETTE = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ef4444','#ec4899'];

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBd,
      textStyle: { color: t.textPri, fontSize: 11 },
    },
    legend: {
      data: seriesData.map(s => s.name),
      textStyle: { color: t.textSec, fontSize: 9 },
      bottom: 0, itemWidth: 8, itemHeight: 8,
    },
    radar: {
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 4,
      center: ['50%', '46%'],
      radius: '62%',
      axisName: { color: t.textSec, fontSize: 10 },
      splitLine: { lineStyle: { color: t.grid } },
      splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.01)'] } },
      axisLine: { lineStyle: { color: t.grid } },
    },
    series: [{
      type: 'radar',
      data: seriesData.map((s, i) => ({
        name: s.name,
        value: s.value,
        lineStyle: { color: PALETTE[i % PALETTE.length], width: 1.5 },
        itemStyle: { color: PALETTE[i % PALETTE.length] },
        areaStyle: { color: `${PALETTE[i % PALETTE.length]}18` },
        symbol: 'circle', symbolSize: 4,
      })),
    }],
  };

  return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}

function css(v: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback;
}

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

const RISK_ITEMS = [
  { label: 'Credit Risk',   score: 62, color: 'var(--accent-amber)' },
  { label: 'Market Risk',   score: 38, color: 'var(--accent-green)' },
  { label: 'Liquidity',     score: 24, color: 'var(--accent-green)' },
  { label: 'Operational',   score: 71, color: 'var(--accent-red)' },
  { label: 'Compliance',    score: 19, color: 'var(--accent-green)' },
  { label: 'Cyber Risk',    score: 83, color: 'var(--accent-red)' },
  { label: 'Interest Rate', score: 45, color: 'var(--accent-amber)' },
];

const ALERTS = [
  { color: 'var(--accent-red)',   title: 'Cyber Risk Threshold Breach',  desc: 'Score 83/100 · High-risk clusters detected', time: '06:02' },
  { color: 'var(--accent-amber)', title: 'NPL Spike — High Risk Branch',  desc: 'NPL ratio >2.5% → NRB review required',     time: '05:44' },
  { color: 'var(--accent-amber)', title: 'Cost-to-Income Warning',        desc: 'Branch exceeded 55% threshold',              time: '04:31' },
  { color: 'var(--accent-green)', title: 'LCR Compliance Confirmed',      desc: 'All entities ≥ 100% · Basel III met',        time: '03:15' },
  { color: 'var(--accent-blue)',  title: 'Board Report Generated',         desc: 'Monthly report ready for review',            time: '02:00' },
];

function SparkCard({
  label, value, sub, color, dimColor, icon, sparkData, highlighted = false,
}: {
  label: string; value: string; sub: string; color: string; dimColor: string;
  icon: React.ReactNode; sparkData: number[]; highlighted?: boolean;
}) {
  return (
    <div
      className={`bg-bg-card rounded-xl p-3.5 flex flex-col gap-1 border ${highlighted ? 'border-[rgba(59,130,246,0.3)]' : 'border-border'}`}
      style={highlighted ? { background: `linear-gradient(135deg, ${dimColor} 0%, var(--bg-card) 60%)` } : {}}
    >
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-text-muted font-medium uppercase tracking-[0.4px]">{label}</span>
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: dimColor }}
        >
          {icon}
        </div>
      </div>
      <div className="text-[20px] font-bold text-text-primary leading-tight">{value}</div>
      <div className="h-9 -mx-0.5 my-0.5">
        <SparkLine data={sparkData} color={color} height={36} />
      </div>
      <div className="text-[10px] text-text-muted">{sub}</div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filters, setFilters] = useState<DashboardFilters>({ ...getDateRange('ALL') });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { data, isLoading, error } = useDashboardData(filters);
  const { data: filterStats } = useFilterStatistics();
  const { data: demographics } = useDemographics();

  const referenceDate = useMemo(() => parseISODateToLocal(filterStats?.date_range?.max) || new Date(), [filterStats?.date_range?.max]);
  const minReferenceDate = useMemo(() => parseISODateToLocal(filterStats?.date_range?.min) ?? undefined, [filterStats?.date_range?.min]);

  // ── Branch table columns ──
  const branchColumns = useMemo<ColumnDef<BranchMetrics>[]>(() => [
    {
      accessorKey: 'branch_code',
      header: 'Branch',
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
      cell: ({ row }) => (
        <Link href={`/dashboard/branch/${encodeURIComponent(row.original.branch_code)}`} className="font-semibold text-accent-blue hover:underline">
          {row.original.branch_code}
        </Link>
      ),
    },
    { accessorKey: 'province', header: 'Province', enableColumnFilter: true, filterFn: 'arrayFilter', meta: { filterType: 'select' } },
    {
      accessorKey: 'total_amount',
      header: 'Total Volume',
      enableSorting: true, sortDescFirst: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => <strong className="text-text-primary font-mono text-[11px]">{formatNPR(row.original.total_amount)}</strong>,
    },
    {
      accessorKey: 'transaction_count',
      header: 'Transactions',
      enableSorting: true, sortDescFirst: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.transaction_count.toLocaleString(),
    },
    {
      accessorKey: 'unique_accounts',
      header: 'Accounts',
      enableSorting: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
    },
    {
      accessorKey: 'avg_transaction',
      header: 'Avg Txn',
      enableSorting: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => <span className="font-mono text-[11px]">{formatNPR(row.original.avg_transaction)}</span>,
    },
    {
      id: 'txn_per_account',
      header: 'Txns / Account',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.unique_accounts > 0 ? a.original.transaction_count / a.original.unique_accounts : 0) - (b.original.unique_accounts > 0 ? b.original.transaction_count / b.original.unique_accounts : 0),
      cell: ({ row }) => (row.original.unique_accounts > 0 ? (row.original.transaction_count / row.original.unique_accounts).toFixed(1) : '—'),
    },
    {
      id: 'vol_per_account',
      header: 'Vol / Account',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.unique_accounts > 0 ? a.original.total_amount / a.original.unique_accounts : 0) - (b.original.unique_accounts > 0 ? b.original.total_amount / b.original.unique_accounts : 0),
      cell: ({ row }) => <span className="font-mono text-[11px]">{formatNPR(row.original.unique_accounts > 0 ? row.original.total_amount / row.original.unique_accounts : 0)}</span>,
    },
    {
      id: 'performance',
      header: 'Network Share',
      enableSorting: true,
      sortingFn: (a, b) => a.original.total_amount - b.original.total_amount,
      cell: ({ row, table: t }) => {
        const rows = t.getCoreRowModel().rows;
        const total = rows.reduce((s, r) => s + (r.original as BranchMetrics).total_amount, 0) || 1;
        const pct = (row.original.total_amount / total) * 100;
        return (
          <div className="flex items-center gap-2 min-w-[80px]">
            <div className="flex-1 h-1.5 rounded-full bg-bg-input overflow-hidden">
              <div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${Math.min(pct * 5, 100)}%` }} />
            </div>
            <span className="text-[9.5px] text-text-muted w-9 text-right">{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
  ], []);

  // ── Age group table columns ──
  type AgeGroup = { age_group: string; customers: number; accounts?: number; total_amount: number; transaction_count: number; credit_amount: number; debit_amount: number };
  const ageColumns = useMemo<ColumnDef<AgeGroup>[]>(() => [
    {
      accessorKey: 'age_group',
      header: 'Age Group',
      enableColumnFilter: true, filterFn: 'arrayFilter', meta: { filterType: 'select' },
      cell: ({ row }) => <strong className="text-text-primary">{row.original.age_group}</strong>,
    },
    {
      accessorKey: 'customers',
      header: 'Customers',
      enableSorting: true, sortDescFirst: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.customers.toLocaleString(),
    },
    {
      accessorKey: 'total_amount',
      header: 'Total Volume',
      enableSorting: true, sortDescFirst: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => <strong className="text-text-primary font-mono text-[11px]">{formatNPR(row.original.total_amount)}</strong>,
    },
    {
      accessorKey: 'transaction_count',
      header: 'Transactions',
      enableSorting: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.transaction_count.toLocaleString(),
    },
    {
      accessorKey: 'credit_amount',
      header: 'Credit (CR)',
      enableSorting: true, sortDescFirst: true,
      cell: ({ row }) => <span className="text-accent-green font-mono text-[11px]">{formatNPR(row.original.credit_amount)}</span>,
    },
    {
      accessorKey: 'debit_amount',
      header: 'Debit (DR)',
      enableSorting: true, sortDescFirst: true,
      cell: ({ row }) => <span className="text-accent-red font-mono text-[11px]">{formatNPR(row.original.debit_amount)}</span>,
    },
    {
      id: 'net_flow',
      header: 'Net Flow',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.credit_amount - a.original.debit_amount) - (b.original.credit_amount - b.original.debit_amount),
      cell: ({ row }) => {
        const net = row.original.credit_amount - row.original.debit_amount;
        return <span className={`font-mono text-[11px] ${net >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{formatNPR(net)}</span>;
      },
    },
    {
      id: 'credit_ratio',
      header: 'Credit Ratio',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.total_amount > 0 ? a.original.credit_amount / a.original.total_amount : 0) - (b.original.total_amount > 0 ? b.original.credit_amount / b.original.total_amount : 0),
      cell: ({ row }) => {
        const ratio = row.original.total_amount > 0 ? (row.original.credit_amount / row.original.total_amount) * 100 : 0;
        return <span>{ratio.toFixed(1)}%</span>;
      },
    },
    {
      id: 'avg_txn',
      header: 'Avg Txn',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.transaction_count > 0 ? a.original.total_amount / a.original.transaction_count : 0) - (b.original.transaction_count > 0 ? b.original.total_amount / b.original.transaction_count : 0),
      cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.transaction_count > 0 ? formatNPR(row.original.total_amount / row.original.transaction_count) : '—'}</span>,
    },
    {
      id: 'txn_per_customer',
      header: 'Txns / Customer',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.customers > 0 ? a.original.transaction_count / a.original.customers : 0) - (b.original.customers > 0 ? b.original.transaction_count / b.original.customers : 0),
      cell: ({ row }) => (row.original.customers > 0 ? (row.original.transaction_count / row.original.customers).toFixed(1) : '—'),
    },
    {
      id: 'vol_per_customer',
      header: 'Vol / Customer',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.customers > 0 ? a.original.total_amount / a.original.customers : 0) - (b.original.customers > 0 ? b.original.total_amount / b.original.customers : 0),
      cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.customers > 0 ? formatNPR(row.original.total_amount / row.original.customers) : '—'}</span>,
    },
  ], []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (period === 'CUSTOM') return;
    const dr = getDateRange(period, referenceDate, minReferenceDate);
    setFilters(prev => prev.startDate === dr.startDate && prev.endDate === dr.endDate ? prev : { ...prev, ...dr });
  }, [period, referenceDate, minReferenceDate]);

  const handlePeriodChange = (p: DashboardPeriod) => setPeriod(p);
  const handleCustomRangeChange = (r: { startDate: string; endDate: string }) => { setPeriod('CUSTOM'); setFilters(prev => ({ ...prev, ...r })); };
  const handleClearFilters = () => {
    const dr = getDateRange(period, referenceDate, minReferenceDate);
    setFilters(period === 'CUSTOM' ? prev => ({ startDate: prev.startDate, endDate: prev.endDate }) : dr);
  };

  // Build sparkline data from trend
  const trendAmounts = useMemo(() => (data?.trend || [] as TrendData[]).map((t: TrendData) => t.amount), [data?.trend]);
  const trendCounts  = useMemo(() => (data?.trend || [] as TrendData[]).map((t: TrendData) => t.count),  [data?.trend]);
  const padSpark = (arr: number[], n = 12) => {
    if (arr.length >= n) return arr.slice(-n);
    return [...Array(n - arr.length).fill(arr[0] || 0), ...arr];
  };

  const topBranch = data?.by_branch?.[0] as BranchMetrics | undefined;
  const topProvince = data?.by_province?.[0] as ProvinceMetrics | undefined;
  const topChannel = (data?.by_channel || [] as ChannelMetrics[]).find((c: ChannelMetrics) => c.channel);

  if (!mounted) return null;

  return (
    <>
      <TopBar
        title="Executive Overview"
        subtitle={`Last refreshed ${new Date().toLocaleTimeString('en-NP')} NPT`}
        period={period}
        onPeriodChange={handlePeriodChange}
        customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onCustomRangeChange={handleCustomRangeChange}
        minDate={filterStats?.date_range?.min ?? undefined}
        maxDate={filterStats?.date_range?.max ?? undefined}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        filtersOpen={filtersOpen}
      />

      <div className="p-5 flex flex-col gap-3.5">

        {/* ── Dynamic Filters (Province, Branch, Channel, Product, etc.) ── */}
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        {/* ── Error ── */}
        {error && (
          <div className="bg-accent-red-dim border border-accent-red/20 text-accent-red px-4 py-3 rounded-xl text-[12px]">
            Error loading data. Ensure backend is running on port 3001.
          </div>
        )}

        {/* ── KPI Cards (6 — derived from CR/DR data) ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {/* 1. Total Volume (= Net Revenue equivalent) */}
          <SparkCard
            label="Total Volume" highlighted
            value={formatNPR(data?.summary?.total_amount || 0)}
            sub={`${(data?.summary?.total_count || 0).toLocaleString()} txns`}
            color="var(--accent-blue)" dimColor="var(--accent-blue-dim)"
            sparkData={padSpark(trendAmounts)}
            icon={<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M4 9l3 3 3-3M2 5h10" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          {/* 2. Credit Inflow */}
          <SparkCard
            label="Credit Inflow (CR)"
            value={formatNPR(data?.summary?.credit_amount || 0)}
            sub={`${(data?.summary?.credit_count || 0).toLocaleString()} CR txns`}
            color="var(--accent-green)" dimColor="var(--accent-green-dim)"
            sparkData={padSpark(trendAmounts.map((v: number) => v * ((data?.summary?.credit_ratio || 50) / 100)))}
            icon={<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="var(--accent-green)" strokeWidth="1.4"/><path d="M5 7.5l1.5 1.5L9.5 5.5" stroke="var(--accent-green)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          {/* 3. Debit Outflow */}
          <SparkCard
            label="Debit Outflow (DR)"
            value={formatNPR(data?.summary?.debit_amount || 0)}
            sub={`${(data?.summary?.debit_count || 0).toLocaleString()} DR txns`}
            color="var(--accent-purple)" dimColor="var(--accent-purple-dim)"
            sparkData={padSpark(trendAmounts.map((v: number) => v * (1 - (data?.summary?.credit_ratio || 50) / 100)))}
            icon={<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="4.5" width="11" height="7" rx="1.5" stroke="var(--accent-purple)" strokeWidth="1.4"/><path d="M4.5 4.5V3a2.5 2.5 0 015 0v1.5" stroke="var(--accent-purple)" strokeWidth="1.4"/></svg>}
          />
          {/* 4. Net Flow (CR - DR) */}
          <SparkCard
            label="Net Flow (CR−DR)"
            value={formatNPR(data?.summary?.net_flow || 0)}
            sub={`${(data?.summary?.credit_ratio || 0).toFixed(1)}% credit ratio`}
            color="var(--accent-teal)" dimColor="var(--accent-teal-dim)"
            sparkData={padSpark(trendAmounts.map((v: number, i: number) => Math.abs(v * 0.004 * Math.sin(i))))}
            icon={<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 10V5a1 1 0 011-1h8a1 1 0 011 1v5" stroke="var(--accent-teal)" strokeWidth="1.4"/><path d="M1 10h12" stroke="var(--accent-teal)" strokeWidth="1.4" strokeLinecap="round"/></svg>}
          />
          {/* 5. Avg Transaction */}
          <SparkCard
            label="Avg Transaction"
            value={formatNPR(data?.summary?.avg_transaction_size || 0)}
            sub="Per transaction"
            color="var(--accent-amber)" dimColor="var(--accent-amber-dim)"
            sparkData={padSpark(trendAmounts.map((v: number, idx: number) => v / Math.max(1, trendCounts[idx] || 1)))}
            icon={<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 10l3-3 2.5 2L11 4" stroke="var(--accent-amber)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
          {/* 6. Unique Customers */}
          <SparkCard
            label="Unique Customers"
            value={(data?.summary?.unique_customers || 0).toLocaleString()}
            sub={`${(data?.summary?.unique_accounts || 0).toLocaleString()} accounts`}
            color="var(--accent-red)" dimColor="var(--accent-red-dim)"
            sparkData={padSpark(trendCounts)}
            icon={<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 2v5M7 10v.5" stroke="var(--accent-red)" strokeWidth="1.8" strokeLinecap="round"/><circle cx="7" cy="7" r="5.5" stroke="var(--accent-red)" strokeWidth="1.4"/></svg>}
          />
        </div>

        {/* ── Revenue Trend + Channel Breakdown ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-2.5">
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <div className="text-[12px] font-semibold text-text-primary">Daily Transaction Trend</div>
                <div className="text-[10px] text-text-muted mt-0.5">Transaction amount over time (NPR)</div>
              </div>
              <div className="flex gap-1.5">
                {['Amount','Count'].map((c, i) => (
                  <div key={c} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-accent-blue' : 'bg-accent-green'}`} />
                    <span className="text-[10px] text-text-muted">{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <PremiumLineChart
              data={(data?.trend || []) as unknown as Record<string, unknown>[]}
              xAxisKey="date"
              series={[
                { dataKey: 'amount', name: 'Amount',       color: '#3b82f6' },
                { dataKey: 'count',  name: 'Transactions', color: '#10b981' },
              ]}
              rightAxisKeys={['count']}
              rightFormatValue={(v) => v.toLocaleString()}
              formatValue={formatNPR}
              formatXAxis={(v) => v?.slice(5) || v}
              height={200}
            />
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <div className="text-[12px] font-semibold text-text-primary">Transaction by Channel</div>
                <div className="text-[10px] text-text-muted mt-0.5">Breakdown by tran source</div>
              </div>
            </div>
            <PremiumBarChart
              data={((data?.by_channel || []) as ChannelMetrics[]).filter((c) => c.channel).slice(0, 8) as unknown as Record<string, unknown>[]}
              xAxisKey="channel"
              series={[{ dataKey: 'total_amount', name: 'Amount', color: '#8b5cf6' }]}
              formatValue={formatNPR}
              formatXAxis={formatChannelLabel}
              height={200}
            />
          </div>
        </div>

        {/* ── 4 Derived Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[
            {
              title: 'Credit Ratio', sub: 'CR / Total volume',
              value: `${(data?.summary?.credit_ratio || 0).toFixed(1)}%`,
              detail: `CR: ${formatNPR(data?.summary?.credit_amount || 0)}`,
              color: 'var(--accent-blue)',
              bar: data?.summary?.credit_ratio || 0,
            },
            {
              title: 'Net Flow (CR−DR)', sub: 'Inflow minus outflow',
              value: formatNPR(Math.abs(data?.summary?.net_flow || 0)),
              detail: (data?.summary?.net_flow || 0) >= 0 ? '▲ Net positive' : '▼ Net negative',
              color: (data?.summary?.net_flow || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
              bar: Math.min(100, Math.abs(data?.summary?.net_flow || 0) / Math.max(1, data?.summary?.total_amount || 1) * 200),
            },
            {
              title: 'Top Province', sub: 'Highest volume',
              value: topProvince?.province || '—',
              detail: topProvince ? `${formatNPR(topProvince.total_amount)} · ${topProvince.branch_count} branches` : '—',
              color: 'var(--accent-teal)',
              bar: 100,
            },
            {
              title: 'Top Branch', sub: 'Highest volume',
              value: topBranch?.branch_code || '—',
              detail: topBranch ? `${formatNPR(topBranch.total_amount)} · ${topBranch.province}` : '—',
              color: 'var(--accent-amber)',
              bar: 100,
            },
          ].map(card => (
            <div key={card.title} className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="text-[10px] text-text-muted font-semibold uppercase tracking-[0.4px]">{card.title}</div>
              <div className="text-[10px] text-text-muted mt-0.5">{card.sub}</div>
              <div className="text-xl font-bold my-2 capitalize leading-tight" style={{ color: card.color }}>{card.value}</div>
              <div className="h-1 rounded-sm bg-bg-input my-1.5">
                <div className="h-full rounded-sm transition-[width] duration-700 hover:opacity-90" style={{ width: `${card.bar}%`, background: card.color }} />
              </div>
              <div className="text-[10px] text-text-muted capitalize">{card.detail}</div>
            </div>
          ))}
        </div>

        {/* ── Province Performance — Apache ECharts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-2.5">

          {/* Horizontal bar + line composed */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="text-[12px] font-semibold text-text-primary mb-0.5">Province Performance</div>
            <div className="text-[10px] text-text-muted mb-3">Transaction volume &amp; count by province</div>
            <ProvinceBarChart data={data?.by_province || []} />
          </div>

          {/* Radar */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="text-[12px] font-semibold text-text-primary mb-0.5">Province Radar</div>
            <div className="text-[10px] text-text-muted mb-3">Multi-metric comparison</div>
            <ProvinceRadarChart data={data?.by_province || []} />
          </div>
        </div>

        {/* ── Branch League Table ── */}
        <AdvancedDataTable
          title="Branch Performance League"
          subtitle="All branches ranked by transaction volume — use Columns to show/hide fields"
          data={(data?.by_branch || []) as BranchMetrics[]}
          columns={branchColumns}
          pageSize={10}
          initialHidden={{ txn_per_account: true, vol_per_account: true }}
        />

        {/* ── Customer Age Group Demographics ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          {/* Age Group Bar Chart */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="text-[12px] font-semibold text-text-primary mb-0.5">Customer Age Distribution</div>
            <div className="text-[10px] text-text-muted mb-3">Transaction volume by age group · via customers.date_of_birth</div>
            <PremiumBarChart
              data={(demographics?.age_groups || []) as unknown as Record<string, unknown>[]}
              xAxisKey="age_group"
              series={[
                { dataKey: 'total_amount',  name: 'Total Amount',  color: '#3b82f6' },
                { dataKey: 'credit_amount', name: 'Credit (CR)',   color: '#10b981' },
                { dataKey: 'debit_amount',  name: 'Debit (DR)',    color: '#8b5cf6' },
              ]}
              formatValue={formatNPR}
              height={220}
            />
          </div>

          {/* Age Group Table */}
          <AdvancedDataTable
            title="Age Group Breakdown"
            subtitle={`${demographics?.total_customers?.toLocaleString() || '—'} customers · use Columns to show/hide fields`}
            data={(demographics?.age_groups || []) as AgeGroup[]}
            columns={ageColumns}
            pageSize={10}
            enablePagination={false}
            initialHidden={{ net_flow: true, credit_ratio: true, txn_per_customer: true, vol_per_customer: true }}
          />
        </div>

        {/* ── Bottom Row: Risk Monitor + Alerts + Supplementary KPIs ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">

          {/* Risk Exposure Monitor */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3.5">
              <div>
                <div className="text-[12px] font-semibold text-text-primary">Risk Exposure Monitor</div>
                <div className="text-[10px] text-text-muted mt-0.5">Normalized 0–100 risk score</div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent-amber-dim text-accent-amber border border-accent-amber/30 font-semibold">3 Alerts</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {RISK_ITEMS.map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted w-[85px] flex-shrink-0">{item.label}</span>
                  <div className="flex-1 h-1.5 rounded-sm bg-bg-input overflow-hidden">
                    <div className="h-full rounded-sm transition-[width] duration-700" style={{ width: `${item.score}%`, background: item.color }} />
                  </div>
                  <span className="text-[10px] font-semibold w-6 text-right flex-shrink-0" style={{ color: item.color }}>{item.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Regulatory & Alerts Feed */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3.5">
              <div>
                <div className="text-[12px] font-semibold text-text-primary">Regulatory & Alerts Feed</div>
                <div className="text-[10px] text-text-muted mt-0.5">Live monitoring events</div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent-blue-dim text-accent-blue border border-accent-blue/30 font-medium">Live</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {ALERTS.map((alert, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: alert.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-text-primary">{alert.title}</div>
                    <div className="text-[10px] text-text-muted mt-0.5">{alert.desc}</div>
                  </div>
                  <span className="text-[9px] text-text-muted flex-shrink-0">{alert.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supplementary KPIs */}
          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="text-[12px] font-semibold text-text-primary mb-1">Supplementary KPIs</div>
            <div className="text-[10px] text-text-muted mb-3.5">Transaction decomposition</div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Credit (CR)',       value: formatNPR(data?.summary?.credit_amount || 0),         color: 'text-accent-blue',   sub: `${(data?.summary?.credit_count||0).toLocaleString()} txns` },
                { label: 'Debit (DR)',         value: formatNPR(data?.summary?.debit_amount || 0),          color: 'text-accent-red',    sub: `${(data?.summary?.debit_count||0).toLocaleString()} txns` },
                { label: 'Net Flow',           value: formatNPR(Math.abs(data?.summary?.net_flow || 0)),    color: (data?.summary?.net_flow||0)>=0?'text-accent-green':'text-accent-red', sub: (data?.summary?.net_flow||0)>=0?'Positive':'Negative' },
                { label: 'Credit Ratio',       value: `${(data?.summary?.credit_ratio||0).toFixed(1)}%`,   color: 'text-accent-teal',   sub: 'CR / Total' },
                { label: 'Unique Accounts',    value: (data?.summary?.unique_accounts||0).toLocaleString(), color: 'text-accent-purple', sub: 'Active accts' },
                { label: 'Unique Customers',   value: (data?.summary?.unique_customers||0).toLocaleString(), color: 'text-accent-amber', sub: 'Total CIF' },
                { label: 'Avg Transaction',    value: formatNPR(data?.summary?.avg_transaction_size||0),    color: 'text-text-primary',  sub: 'Per txn' },
                { label: 'Top Channel',        value: topChannel?.channel || 'Branch',                     color: 'text-accent-teal',   sub: 'By volume' },
              ].map(item => (
                <div key={item.label} className="py-1.5 border-b border-border">
                  <div className="text-[9px] text-text-muted mb-0.5">{item.label}</div>
                  <div className={`text-[11px] font-semibold capitalize ${item.color}`}>{item.value}</div>
                  <div className="text-[9px] text-text-muted">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
