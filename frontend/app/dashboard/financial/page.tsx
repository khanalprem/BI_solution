'use client';

import { useState, useMemo, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard, ChartLegendItem } from '@/components/ui/ChartCard';
import { useFinancialSummary, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent, getDateRange, parseISODateToLocal, CHART_TOOLTIP_STYLE } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine,
} from 'recharts';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

export default function FinancialDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({ ...getDateRange('ALL') });

  const { data, isLoading } = useFinancialSummary(filters);
  const { data: filterStats } = useFilterStatistics();

  const referenceDate = useMemo(() => parseISODateToLocal(filterStats?.date_range?.max) || new Date(), [filterStats?.date_range?.max]);
  const minReferenceDate = useMemo(() => parseISODateToLocal(filterStats?.date_range?.min), [filterStats?.date_range?.min]);

  useEffect(() => {
    if (period === 'CUSTOM') return;
    const dateRange = getDateRange(period, referenceDate, minReferenceDate || undefined);
    setFilters((prev) =>
      prev.startDate === dateRange.startDate && prev.endDate === dateRange.endDate ? prev : { ...prev, ...dateRange }
    );
  }, [period, referenceDate, minReferenceDate]);

  const handleClearFilters = () => {
    if (period === 'CUSTOM') { setFilters((prev) => ({ startDate: prev.startDate, endDate: prev.endDate })); return; }
    setFilters(getDateRange(period, referenceDate, minReferenceDate || undefined));
  };

  const creditRatio = data?.credit_ratio ?? 0;
  const netFlow = data?.net_flow ?? 0;
  const creditAmount = data?.credit_amount ?? 0;
  const debitAmount = data?.debit_amount ?? 0;
  const totalAmount = data?.total_amount ?? 0;
  const avgCredit = data?.avg_credit ?? 0;
  const avgDebit = data?.avg_debit ?? 0;
  const monthlyTrend = data?.monthly_trend ?? [];
  const byGl = useMemo(() => data?.by_gl ?? [], [data?.by_gl]);

  // Separate CR and DR GL entries
  const glCr = useMemo(() => byGl.filter((g) => g.type === 'CR').slice(0, 8), [byGl]);
  const glDr = useMemo(() => byGl.filter((g) => g.type === 'DR').slice(0, 8), [byGl]);

  if (isLoading) {
    return (
      <>
        <TopBar title="Financial Summary" subtitle="Credit, debit & net flow analysis" period={period} onPeriodChange={(p) => setPeriod(p as DashboardPeriod)} customRange={{ startDate: filters.startDate, endDate: filters.endDate }} onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }} minDate={filterStats?.date_range?.min || undefined} maxDate={filterStats?.date_range?.max || undefined} />
        <div className="p-6 text-text-secondary">Loading...</div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Financial Summary"
        subtitle="Credit, debit & net flow analysis"
        period={period}
        onPeriodChange={(p) => setPeriod(p as DashboardPeriod)}
        customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }}
        minDate={filterStats?.date_range?.min || undefined}
        maxDate={filterStats?.date_range?.max || undefined}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        filtersOpen={filtersOpen}
      />
      <div className="flex flex-col gap-3.5 p-5">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total Volume" value={formatNPR(totalAmount)} highlighted iconBg="var(--accent-blue-dim)" />
          <KPICard label="Credit Inflow (CR)" value={formatNPR(creditAmount)} iconBg="var(--accent-green-dim)" />
          <KPICard label="Debit Outflow (DR)" value={formatNPR(debitAmount)} iconBg="var(--accent-red-dim)" />
          <KPICard
            label="Net Flow"
            value={formatNPR(netFlow)}
            subtitle={netFlow >= 0 ? 'Net positive' : 'Net negative'}
            iconBg={netFlow >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Credit Ratio" value={formatPercent(creditRatio)} subtitle="% of total volume" iconBg="var(--accent-purple-dim)" />
          <KPICard label="Avg Credit Txn" value={formatNPR(avgCredit)} iconBg="var(--accent-teal-dim)" />
          <KPICard label="Avg Debit Txn" value={formatNPR(avgDebit)} iconBg="var(--accent-amber-dim)" />
          <KPICard label="CR Transactions" value={(data?.credit_count ?? 0).toLocaleString()} subtitle={`${(data?.debit_count ?? 0).toLocaleString()} DR`} iconBg="var(--accent-blue-dim)" />
        </div>

        {/* Monthly Trend */}
        <ChartCard
          title="Monthly Credit vs Debit Trend"
          subtitle="Month-over-month inflow and outflow"
          legend={
            <>
              <ChartLegendItem color="#10b981" label="Credit (CR)" />
              <ChartLegendItem color="#ef4444" label="Debit (DR)" />
              <ChartLegendItem color="#3b82f6" label="Net Flow" />
            </>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 9 }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={(v) => formatNPR(v)} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatNPR(v), '']} />
              <ReferenceLine y={0} stroke="var(--border-strong)" />
              <Line type="monotone" dataKey="credit" stroke="#10b981" strokeWidth={2} dot={false} name="Credit" />
              <Line type="monotone" dataKey="debit" stroke="#ef4444" strokeWidth={2} dot={false} name="Debit" />
              <Line type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="5 3" name="Net" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Monthly bar chart */}
        <ChartCard title="Monthly Volume Bar Chart" subtitle="Credit and debit volumes by month">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--text-muted)" tick={{ fontSize: 9 }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={(v) => formatNPR(v)} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatNPR(v), '']} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="credit" name="Credit (CR)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="debit" name="Debit (DR)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* GL Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Top GL Codes — Credit (CR)" subtitle="Largest inflow GL sub-heads">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={glCr} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={(v) => formatNPR(v)} />
                <YAxis type="category" dataKey="gl_code" stroke="var(--text-muted)" tick={{ fontSize: 9 }} width={70} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatNPR(v), 'Amount']} />
                <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Top GL Codes — Debit (DR)" subtitle="Largest outflow GL sub-heads">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={glDr} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={(v) => formatNPR(v)} />
                <YAxis type="category" dataKey="gl_code" stroke="var(--text-muted)" tick={{ fontSize: 9 }} width={70} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatNPR(v), 'Amount']} />
                <Bar dataKey="amount" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* GL detail table */}
        {byGl.length > 0 && (
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border">
              <div className="text-[12px] font-semibold">GL Sub-Head Breakdown</div>
              <div className="text-[10px] text-text-muted">All GL codes with CR/DR split</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border bg-bg-base">
                    <th className="text-left px-4 py-2 text-text-muted font-medium text-[10px]">GL Code</th>
                    <th className="text-left px-4 py-2 text-text-muted font-medium text-[10px]">Type</th>
                    <th className="text-right px-4 py-2 text-text-muted font-medium text-[10px]">Amount</th>
                    <th className="text-right px-4 py-2 text-text-muted font-medium text-[10px]">Transactions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {byGl.map((gl, idx) => (
                    <tr key={idx} className="hover:bg-bg-input transition-colors">
                      <td className="px-4 py-2 font-mono text-text-primary">{gl.gl_code}</td>
                      <td className="px-4 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${gl.type === 'CR' ? 'bg-accent-green-dim text-accent-green' : 'bg-accent-red-dim text-accent-red'}`}>
                          {gl.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">{formatNPR(gl.amount)}</td>
                      <td className="px-4 py-2 text-right text-text-secondary">{gl.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
