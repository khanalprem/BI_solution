'use client';

import { useState, useMemo, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { Pill } from '@/components/ui/Pill';
import { useRiskSummary, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent, getDateRange, parseISODateToLocal, CHART_TOOLTIP_STYLE } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

export default function RiskDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filters, setFilters] = useState<DashboardFilters>({ ...getDateRange('ALL') });

  const { data, isLoading } = useRiskSummary(filters);
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

  const byGl = data?.by_gl ?? [];
  const byProvince = data?.by_province ?? [];
  const totalAmount = data?.total_amount ?? 0;
  const creditAmount = data?.credit_amount ?? 0;
  const debitAmount = data?.debit_amount ?? 0;
  const netFlow = data?.net_flow ?? 0;
  const highValueCount = data?.high_value_count ?? 0;
  const top3BranchShare = data?.top3_branch_share ?? 0;
  const monthlyVolatility = data?.monthly_volatility ?? 0;
  const avgMonthlyVolume = data?.avg_monthly_volume ?? 0;

  const getRiskLevel = (share: number) => {
    if (share > 60) return 'red';
    if (share > 40) return 'amber';
    return 'green';
  };

  if (isLoading) {
    return (
      <>
        <TopBar title="Risk & Exposure" subtitle="Transaction risk analysis" period={period} onPeriodChange={(p) => setPeriod(p as DashboardPeriod)} customRange={{ startDate: filters.startDate, endDate: filters.endDate }} onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }} minDate={filterStats?.date_range?.min || undefined} maxDate={filterStats?.date_range?.max || undefined} />
        <div className="p-6 text-text-secondary">Loading...</div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Risk & Exposure"
        subtitle="Transaction risk analysis"
        period={period}
        onPeriodChange={(p) => setPeriod(p as DashboardPeriod)}
        customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }}
        minDate={filterStats?.date_range?.min || undefined}
        maxDate={filterStats?.date_range?.max || undefined}
      />
      <div className="flex flex-col gap-4 p-6">
        <AdvancedFilters filters={filters} onChange={setFilters} onClear={handleClearFilters} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total Volume" value={formatNPR(totalAmount)} highlighted iconBg="var(--accent-blue-dim)" />
          <KPICard
            label="High-Value Txns"
            value={highValueCount.toLocaleString()}
            subtitle={`Above ${formatNPR(data?.high_value_threshold ?? 0)}`}
            iconBg="var(--accent-red-dim)"
          />
          <KPICard
            label="Top 3 Branch Concentration"
            value={formatPercent(top3BranchShare)}
            subtitle={top3BranchShare > 50 ? 'Concentrated' : 'Diversified'}
            iconBg={top3BranchShare > 50 ? 'var(--accent-red-dim)' : 'var(--accent-green-dim)'}
          />
          <KPICard
            label="Monthly Volatility"
            value={formatPercent(monthlyVolatility)}
            subtitle="Std dev / mean"
            iconBg="var(--accent-amber-dim)"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Credit Inflow" value={formatNPR(creditAmount)} iconBg="var(--accent-green-dim)" />
          <KPICard label="Debit Outflow" value={formatNPR(debitAmount)} iconBg="var(--accent-red-dim)" />
          <KPICard label="Net Flow" value={formatNPR(netFlow)} iconBg={netFlow >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'} />
          <KPICard label="Avg Monthly Volume" value={formatNPR(avgMonthlyVolume)} iconBg="var(--accent-teal-dim)" />
        </div>

        {/* Risk Indicators */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Concentration Risk */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[13px] font-semibold mb-1">Branch Concentration Risk</div>
            <div className="text-[11px] text-text-muted mb-4">Top 3 branches share of total volume</div>
            <div className="text-[32px] font-bold tracking-tight mb-2" style={{ color: top3BranchShare > 50 ? 'var(--accent-red)' : top3BranchShare > 30 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
              {formatPercent(top3BranchShare)}
            </div>
            <div className="h-2 rounded-full bg-bg-input overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(top3BranchShare, 100)}%`, background: top3BranchShare > 50 ? 'var(--accent-red)' : top3BranchShare > 30 ? 'var(--accent-amber)' : 'var(--accent-green)' }} />
            </div>
            <Pill variant={getRiskLevel(top3BranchShare)}>
              {top3BranchShare > 60 ? 'High Concentration' : top3BranchShare > 40 ? 'Moderate' : 'Well Distributed'}
            </Pill>
          </div>

          {/* Volatility Risk */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[13px] font-semibold mb-1">Volume Volatility</div>
            <div className="text-[11px] text-text-muted mb-4">Coefficient of variation (monthly)</div>
            <div className="text-[32px] font-bold tracking-tight mb-2" style={{ color: monthlyVolatility > 50 ? 'var(--accent-red)' : monthlyVolatility > 25 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
              {formatPercent(monthlyVolatility)}
            </div>
            <div className="h-2 rounded-full bg-bg-input overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(monthlyVolatility, 100)}%`, background: monthlyVolatility > 50 ? 'var(--accent-red)' : monthlyVolatility > 25 ? 'var(--accent-amber)' : 'var(--accent-green)' }} />
            </div>
            <Pill variant={monthlyVolatility > 50 ? 'red' : monthlyVolatility > 25 ? 'amber' : 'green'}>
              {monthlyVolatility > 50 ? 'High Volatility' : monthlyVolatility > 25 ? 'Moderate' : 'Stable'}
            </Pill>
          </div>

          {/* High Value Risk */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[13px] font-semibold mb-1">High-Value Transaction Exposure</div>
            <div className="text-[11px] text-text-muted mb-4">Transactions above threshold</div>
            <div className="text-[32px] font-bold tracking-tight mb-2 text-accent-amber">
              {highValueCount.toLocaleString()}
            </div>
            <div className="text-[12px] text-text-secondary mb-3">
              Threshold: {formatNPR(data?.high_value_threshold ?? 0)}
            </div>
            <Pill variant={highValueCount > 100 ? 'amber' : 'green'}>
              {highValueCount > 100 ? 'Monitor Required' : 'Within Normal'}
            </Pill>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="GL Code Risk Exposure" subtitle="Top GL sub-heads by volume">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byGl.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-muted)" style={{ fontSize: '11px' }} tickFormatter={(v) => formatNPR(v)} />
                <YAxis type="category" dataKey="gl_code" stroke="var(--text-muted)" style={{ fontSize: '10px' }} width={80} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatNPR(v), 'Amount']} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {byGl.slice(0, 8).map((entry, idx) => (
                    <Cell key={idx} fill={idx === 0 ? '#ef4444' : idx === 1 ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Province Risk Distribution" subtitle="Transaction volume by province">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byProvince}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="province" stroke="var(--text-muted)" style={{ fontSize: '10px' }} />
                <YAxis stroke="var(--text-muted)" style={{ fontSize: '11px' }} tickFormatter={(v) => formatNPR(v)} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatNPR(v), '']} />
                <Bar dataKey="amount" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="debit_amount" name="Debit" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Province Risk Table */}
        {byProvince.length > 0 && (
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-[13px] font-semibold">Province Risk Summary</div>
              <div className="text-[11px] text-text-muted">Volume, accounts, and debit exposure by province</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-bg-base">
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">Province</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Total Amount</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Accounts</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Debit Exposure</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Debit %</th>
                    <th className="px-4 py-2.5 text-text-muted font-medium">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {byProvince.map((prov, idx) => {
                    const debitPct = prov.amount > 0 ? (prov.debit_amount / prov.amount) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-bg-input transition-colors">
                        <td className="px-4 py-2.5 capitalize font-medium">{prov.province}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{formatNPR(prov.amount)}</td>
                        <td className="px-4 py-2.5 text-right text-text-secondary">{prov.accounts.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-accent-red">{formatNPR(prov.debit_amount)}</td>
                        <td className="px-4 py-2.5 text-right">{formatPercent(debitPct)}</td>
                        <td className="px-4 py-2.5">
                          <Pill variant={debitPct > 60 ? 'red' : debitPct > 45 ? 'amber' : 'green'}>
                            {debitPct > 60 ? 'High' : debitPct > 45 ? 'Medium' : 'Low'}
                          </Pill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
