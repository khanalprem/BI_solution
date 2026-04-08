'use client';

import { useState, useEffect, useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { useDashboardData, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, getDateRange, parseISODateToLocal } from '@/lib/formatters';
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
    <div style={{
      background: highlighted ? `linear-gradient(135deg, ${dimColor} 0%, var(--bg-card) 60%)` : 'var(--bg-card)',
      border: `1px solid ${highlighted ? color + '33' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      padding: '14px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</span>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: dimColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>{value}</div>
      <div style={{ height: 36, margin: '2px -2px' }}>
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
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filters, setFilters] = useState<DashboardFilters>({ ...getDateRange('ALL') });
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

  const tooltipStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--text-primary)',
  };

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
      />

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Dynamic Filters (Province, Branch, Channel, Product, etc.) ── */}
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
        />

        {/* ── Error ── */}
        {error && (
          <div style={{ background: 'var(--accent-red-dim)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red)', padding: '12px 16px', borderRadius: 'var(--radius)', fontSize: 13 }}>
            Error loading data. Ensure backend is running on port 3001.
          </div>
        )}

        {/* ── KPI Cards (6 — derived from CR/DR data) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 10 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Daily Transaction Trend</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Transaction amount over time (NPR)</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Amount','Count'].map((c, i) => (
                  <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? '#3b82f6' : '#10b981' }} />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data?.trend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" style={{ fontSize: 10 }} tickFormatter={(v: string) => v?.slice(5) || v} />
                <YAxis stroke="var(--text-muted)" style={{ fontSize: 10 }} tickFormatter={(v: number) => formatNPR(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [n === 'amount' ? formatNPR(v) : v.toLocaleString(), n === 'amount' ? 'Amount' : 'Count']} />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Transaction by Channel</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Breakdown by tran source</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(data?.by_channel || [] as ChannelMetrics[]).filter((c: ChannelMetrics) => c.channel).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="channel" stroke="var(--text-muted)" style={{ fontSize: 10 }} />
                <YAxis stroke="var(--text-muted)" style={{ fontSize: 10 }} tickFormatter={v => formatNPR(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatNPR(v), 'Amount']} />
                <Bar dataKey="total_amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 4 Derived Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
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
            <div key={card.title} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{card.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{card.sub}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: card.color, margin: '8px 0 4px', textTransform: 'capitalize', lineHeight: 1.2 }}>{card.value}</div>
              <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-input)', margin: '6px 0' }}>
                <div style={{ width: `${card.bar}%`, height: '100%', borderRadius: 2, background: card.color, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{card.detail}</div>
            </div>
          ))}
        </div>

        {/* ── Nepal Province Map ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Nepal Province Performance Map</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Transaction volume by province · hover for details</div>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <svg viewBox="0 0 880 280" preserveAspectRatio="xMidYMid meet"
              style={{ width: '100%', display: 'block', maxHeight: 240 }}
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
                      style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
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
                        style={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 500, pointerEvents: 'none' }}>
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
              {CITIES.map(city => (
                <circle key={city.name} cx={city.cx} cy={city.cy} r={city.r}
                  fill={city.color} stroke="var(--bg-card)" strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={e => {
                    const rect = (e.target as SVGElement).closest('svg')!.getBoundingClientRect();
                    setMapTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top - 10, text: city.name });
                  }}
                />
              ))}
            </svg>
            {mapTooltip && (
              <div style={{
                position: 'absolute', left: mapTooltip.x + 8, top: mapTooltip.y,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'var(--text-primary)',
                pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10,
              }}>{mapTooltip.text}</div>
            )}
          </div>

          {/* Map Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              { bg: 'rgba(16,185,129,0.13)', border: '#10b981', label: 'Lower volume' },
              { bg: 'rgba(245,158,11,0.18)', border: '#f59e0b', label: 'Medium volume' },
              { bg: 'rgba(59,130,246,0.25)', border: '#3b82f6', label: 'High volume' },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.bg, border: `1px solid ${l.border}` }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Province Performance Bar ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Province Performance</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Transaction breakdown by province</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.by_province || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" stroke="var(--text-muted)" style={{ fontSize: 10 }} tickFormatter={v => formatNPR(v)} />
              <YAxis type="category" dataKey="province" stroke="var(--text-muted)" style={{ fontSize: 11, textTransform: 'capitalize' }} width={90} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatNPR(v), 'Total Amount']} />
              <Bar dataKey="total_amount" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Branch League Table ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Branch Performance League</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Top branches by transaction volume</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>Sort</button>
              <button style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>Export CSV</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Branch','Province','Total Amount','Transactions','Accounts','Avg/Txn','Performance'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Branch' ? 'left' : 'right', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.by_branch || [] as BranchMetrics[]).slice(0, 15).map((branch: BranchMetrics, i: number) => {
                  const topAmt = data?.by_branch?.[0]?.total_amount || 1;
                  const pct = (branch.total_amount / topAmt) * 100;
                  const rankColor = i === 0 ? '#f59e0b' : i === 1 ? '#9ba3bc' : i === 2 ? '#cd7c39' : 'var(--text-muted)';
                  return (
                    <tr key={branch.branch_code} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: 4, fontSize: 10, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: i < 3 ? `${rankColor}22` : 'var(--bg-input)',
                            color: i < 3 ? rankColor : 'var(--text-muted)',
                          }}>{i + 1}</div>
                          <span style={{ fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{branch.branch_code}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{branch.province}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{formatNPR(branch.total_amount)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{branch.transaction_count.toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{branch.unique_accounts.toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatNPR(branch.avg_transaction)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          <div style={{ width: 60, height: 5, borderRadius: 3, background: 'var(--bg-input)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pct.toFixed(0)}%</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>

          {/* Risk Exposure Monitor */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Risk Exposure Monitor</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Normalized 0–100 risk score</div>
              </div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-amber-dim)', color: 'var(--accent-amber)', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 600 }}>3 Alerts</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {RISK_ITEMS.map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 90, flexShrink: 0 }}>{item.label}</span>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--bg-input)', overflow: 'hidden' }}>
                    <div style={{ width: `${item.score}%`, height: '100%', background: item.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: item.color, width: 26, textAlign: 'right', flexShrink: 0 }}>{item.score}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Regulatory & Alerts Feed */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Regulatory & Alerts Feed</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Live monitoring events</div>
              </div>
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)', border: '1px solid rgba(59,130,246,0.3)', fontWeight: 500 }}>Live</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ALERTS.map((alert, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: alert.color, marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{alert.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{alert.desc}</div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{alert.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Supplementary KPIs */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Supplementary KPIs</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>Transaction decomposition</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Credit (CR)',       value: formatNPR(data?.summary?.credit_amount || 0),         color: 'var(--accent-blue)',   sub: `${(data?.summary?.credit_count||0).toLocaleString()} txns` },
                { label: 'Debit (DR)',         value: formatNPR(data?.summary?.debit_amount || 0),          color: 'var(--accent-red)',    sub: `${(data?.summary?.debit_count||0).toLocaleString()} txns` },
                { label: 'Net Flow',           value: formatNPR(Math.abs(data?.summary?.net_flow || 0)),    color: (data?.summary?.net_flow||0)>=0?'var(--accent-green)':'var(--accent-red)', sub: (data?.summary?.net_flow||0)>=0?'Positive':'Negative' },
                { label: 'Credit Ratio',       value: `${(data?.summary?.credit_ratio||0).toFixed(1)}%`,   color: 'var(--accent-teal)',   sub: 'CR / Total' },
                { label: 'Unique Accounts',    value: (data?.summary?.unique_accounts||0).toLocaleString(), color: 'var(--accent-purple)', sub: 'Active accts' },
                { label: 'Unique Customers',   value: (data?.summary?.unique_customers||0).toLocaleString(), color: 'var(--accent-amber)', sub: 'Total CIF' },
                { label: 'Avg Transaction',    value: formatNPR(data?.summary?.avg_transaction_size||0),    color: 'var(--text-primary)',  sub: 'Per txn' },
                { label: 'Top Channel',        value: topChannel?.channel || 'Branch',                     color: 'var(--accent-teal)',   sub: 'By volume' },
              ].map(item => (
                <div key={item.label} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: item.color, textTransform: 'capitalize' }}>{item.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </>
  );
}
