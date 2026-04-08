'use client';

import { useState, useEffect, useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { useDashboardData, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatChannelLabel, formatNPR, formatProvinceLabel, getDateRange, parseISODateToLocal , CHART_TOOLTIP_STYLE} from '@/lib/formatters';
import type { DashboardFilters, BranchMetrics, ProvinceMetrics, ChannelMetrics, TrendData } from '@/types';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

const PROVINCE_MAP: Record<string, string> = {
  'province 1': 'koshi',
  'province 2': 'madhesh',
  'province 3': 'bagmati',
  'province 4': 'gandaki',
  'province 5': 'lumbini',
  'province 6': 'karnali',
  'province 7': 'sudurpashchim',
};

const PROVINCE_PATHS = [
  { id: 'sudurpashchim', d: 'M18,44 Q79,38 140,40 L143,232 L18,238 Z', label: ['Sudur', 'Paschim'], lx: 79, ly: [152, 164] },
  { id: 'karnali',       d: 'M140,40 Q209,33 278,36 L281,236 L143,232 Z', label: ['Karnali'], lx: 209, ly: [158] },
  { id: 'lumbini',       d: 'M278,36 Q343,44 408,50 L411,244 L281,236 Z', label: ['Lumbini'], lx: 343, ly: [164] },
  { id: 'gandaki',       d: 'M408,50 Q451,45 494,47 L497,237 L411,244 Z', label: ['Gandaki'], lx: 451, ly: [160] },
  { id: 'bagmati',       d: 'M494,47 Q536,52 578,54 L581,232 L497,237 Z', label: ['Bagmati'], lx: 536, ly: [155] },
  { id: 'madhesh',       d: 'M578,54 Q629,57 680,60 L683,246 L581,232 Z', label: ['Madhesh'], lx: 629, ly: [162] },
  { id: 'koshi',         d: 'M680,60 Q771,62 862,65 L862,250 L683,246 Z', label: ['Koshi'], lx: 769, ly: [170] },
];

const CITIES = [
  { cx: 65,  cy: 204, r: 3.5, color: 'var(--accent-green)', name: 'Dhangadhi · Sudurpashchim' },
  { cx: 195, cy: 118, r: 3,   color: 'var(--accent-green)', name: 'Birendranagar · Karnali' },
  { cx: 315, cy: 215, r: 3.5, color: 'var(--accent-amber)', name: 'Nepalgunj · Lumbini' },
  { cx: 442, cy: 128, r: 4,   color: 'var(--accent-amber)', name: 'Pokhara · Gandaki' },
  { cx: 532, cy: 134, r: 6,   color: 'var(--accent-blue)',  name: 'Kathmandu (HQ) · Bagmati' },
  { cx: 623, cy: 217, r: 3.5, color: 'var(--accent-red)',   name: 'Janakpur · Madhesh' },
  { cx: 778, cy: 208, r: 4,   color: 'var(--accent-amber)', name: 'Biratnagar · Koshi' },
];

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
  const chartData = sparkData.map((v, i) => ({ i, v }));
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
        <ResponsiveContainer width="100%" height={36}>
          <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={`sg-${label.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sg-${label.replace(/\s/g,'')})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
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
  const [mapTooltip, setMapTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const { data, isLoading, error } = useDashboardData(filters);
  const { data: filterStats } = useFilterStatistics();

  const referenceDate = useMemo(() => parseISODateToLocal(filterStats?.date_range?.max) || new Date(), [filterStats?.date_range?.max]);
  const minReferenceDate = useMemo(() => parseISODateToLocal(filterStats?.date_range?.min) ?? undefined, [filterStats?.date_range?.min]);

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

  // Province amount map for coloring
  const provinceAmountMap = useMemo(() => {
    const m: Record<string, number> = {};
    (data?.by_province || [] as ProvinceMetrics[]).forEach((p: ProvinceMetrics) => {
      const key = (p.province || '').toLowerCase();
      m[key] = p.total_amount;
      const mapped = PROVINCE_MAP[key];
      if (mapped) m[mapped] = p.total_amount;
    });
    return m;
  }, [data?.by_province]);

  const maxProvinceAmount = useMemo(() => Math.max(1, ...Object.values(provinceAmountMap)), [provinceAmountMap]);

  function getProvinceColor(id: string) {
    const amt = provinceAmountMap[id] || 0;
    const ratio = amt / maxProvinceAmount;
    if (ratio > 0.6) return { fill: 'rgba(59,130,246,0.25)', stroke: '#3b82f6' };
    if (ratio > 0.3) return { fill: 'rgba(245,158,11,0.18)', stroke: '#f59e0b' };
    return { fill: 'rgba(16,185,129,0.13)', stroke: '#10b981' };
  }

  const topBranch = data?.by_branch?.[0] as BranchMetrics | undefined;
  const topProvince = data?.by_province?.[0] as ProvinceMetrics | undefined;
  const topChannel = (data?.by_channel || [] as ChannelMetrics[]).find((c: ChannelMetrics) => c.channel);

  const tooltipStyle = CHART_TOOLTIP_STYLE;

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
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={(v: string) => v?.slice(5) || v} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={(v: number) => formatNPR(v)} />
                <YAxis yAxisId="count" orientation="right" stroke="var(--text-muted)" tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [n === 'amount' ? formatNPR(v) : v.toLocaleString(), n === 'amount' ? 'Amount' : 'Transactions']} />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line yAxisId="count" type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2.5">
              <div>
                <div className="text-[12px] font-semibold text-text-primary">Transaction by Channel</div>
                <div className="text-[10px] text-text-muted mt-0.5">Breakdown by tran source</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(data?.by_channel || [] as ChannelMetrics[]).filter((c: ChannelMetrics) => c.channel).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="channel" stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={(value) => formatChannelLabel(String(value))} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={v => formatNPR(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatNPR(v), 'Amount']} labelFormatter={(value) => formatChannelLabel(String(value))} />
                <Bar dataKey="total_amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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

        {/* ── Nepal Province Map ── */}
        <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="text-[12px] font-semibold text-text-primary">Nepal Province Performance Map</div>
              <div className="text-[10px] text-text-muted mt-0.5">Transaction volume by province · hover for details</div>
            </div>
          </div>

          <div className="relative">
            <svg viewBox="0 0 880 280" preserveAspectRatio="xMidYMid meet"
              className="w-full block max-h-[240px]"
              onMouseLeave={() => setMapTooltip(null)}
            >
              {PROVINCE_PATHS.map(prov => {
                const { fill, stroke } = getProvinceColor(prov.id);
                const amt = provinceAmountMap[prov.id] || 0;
                return (
                  <g key={prov.id}>
                    <path
                      d={prov.d}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth="1.2"
                      className="cursor-pointer transition-colors duration-200"
                      onMouseEnter={e => {
                        const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
                        setMapTooltip({
                          x: e.clientX - rect.left,
                          y: e.clientY - rect.top - 10,
                          text: `${prov.id.charAt(0).toUpperCase() + prov.id.slice(1)}: ${amt ? formatNPR(amt) : 'No data'}`,
                        });
                      }}
                    />
                    {prov.label.map((line, li) => (
                      <text key={li} x={prov.lx} y={prov.ly[li]} textAnchor="middle"
                        className="text-[9px] fill-text-muted font-medium pointer-events-none">
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
              {CITIES.map(city => (
                <circle key={city.name} cx={city.cx} cy={city.cy} r={city.r}
                  fill={city.color} stroke="var(--bg-card)" strokeWidth="2"
                  className="cursor-pointer"
                  onMouseEnter={e => {
                    const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
                    setMapTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10, text: city.name });
                  }}
                />
              ))}
            </svg>
            {mapTooltip && (
              <div 
                className="absolute bg-bg-surface border border-border rounded-md px-2.5 py-1 text-[10px] text-text-primary whitespace-nowrap z-10 pointer-events-none"
                style={{ left: mapTooltip.x + 8, top: mapTooltip.y }}
              >{mapTooltip.text}</div>
            )}
          </div>

          {/* Map Legend */}
          <div className="flex gap-4 mt-2 flex-wrap">
            {[
              { bg: 'rgba(16,185,129,0.13)', border: '#10b981', label: 'Lower volume' },
              { bg: 'rgba(245,158,11,0.18)', border: '#f59e0b', label: 'Medium volume' },
              { bg: 'rgba(59,130,246,0.25)', border: '#3b82f6', label: 'High volume' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.bg, border: `1px solid ${l.border}` }} />
                <span className="text-[10px] text-text-muted">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Province Performance Bar ── */}
        <div className="bg-bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="text-[12px] font-semibold text-text-primary mb-1">Province Performance</div>
          <div className="text-[10px] text-text-muted mb-3">Transaction breakdown by province</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.by_province || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={v => formatNPR(v)} />
              <YAxis type="category" dataKey="province" stroke="var(--text-muted)" tick={{ fontSize: 9 }} width={80} tickFormatter={(value) => formatProvinceLabel(String(value))} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatNPR(v), 'Total Amount']} />
              <Bar dataKey="total_amount" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Branch League Table ── */}
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="flex justify-between items-center px-4 py-3 border-b border-border">
            <div>
              <div className="text-[12px] font-semibold text-text-primary">Branch Performance League</div>
              <div className="text-[10px] text-text-muted mt-0.5">Top branches by transaction volume</div>
            </div>
            <div className="flex gap-2">
              <button className="text-[10px] px-2.5 py-1 rounded-md bg-bg-input text-text-muted border border-border hover:bg-bg-card-hover transition-colors">Sort</button>
              <button className="text-[10px] px-2.5 py-1 rounded-md bg-bg-input text-text-muted border border-border hover:bg-bg-card-hover transition-colors">Export CSV</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-border bg-bg-base">
                  {['Branch','Province','Total Amount','Transactions','Accounts','Avg/Txn','Performance'].map(h => (
                    <th key={h} className={`px-3 py-2 ${h === 'Branch' ? 'text-left' : 'text-right'} text-[10px] font-semibold text-text-muted uppercase tracking-[0.4px] whitespace-nowrap`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.by_branch || [] as BranchMetrics[]).slice(0, 15).map((branch: BranchMetrics, i: number) => {
                  const topAmt = data?.by_branch?.[0]?.total_amount || 1;
                  const pct = (branch.total_amount / topAmt) * 100;
                  const rankColor = i === 0 ? '#f59e0b' : i === 1 ? '#9ba3bc' : i === 2 ? '#cd7c39' : 'var(--text-muted)';
                  return (
                    <tr key={branch.branch_code} className="hover:bg-bg-input/50 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                            style={{ background: i < 3 ? `${rankColor}22` : 'var(--bg-input)', color: i < 3 ? rankColor : 'var(--text-muted)' }}
                          >{i + 1}</div>
                          <span className="font-medium text-text-primary capitalize">{branch.branch_code}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-secondary capitalize">{branch.province}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-text-primary">{formatNPR(branch.total_amount)}</td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">{branch.transaction_count.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">{branch.unique_accounts.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right text-text-secondary">{formatNPR(branch.avg_transaction)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-[60px] h-1.5 rounded-sm bg-bg-input overflow-hidden">
                            <div className="h-full rounded-sm bg-accent-blue" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[9px] text-text-muted">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
