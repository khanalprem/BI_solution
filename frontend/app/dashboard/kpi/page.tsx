'use client';

import { useState, useMemo, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { useKpiSummary, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent, getDateRange, parseISODateToLocal, CHART_TOOLTIP_STYLE } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

const QUARTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function KPIDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({ ...getDateRange('ALL') });

  const { data, isLoading } = useKpiSummary(filters);
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

  const byQuarter = data?.by_quarter ?? [];
  const byProduct = data?.by_product ?? [];
  const byService = data?.by_service ?? [];

  if (isLoading) {
    return (
      <>
        <TopBar title="KPI Summary" subtitle="Key performance indicators & metrics" period={period} onPeriodChange={(p) => setPeriod(p as DashboardPeriod)} customRange={{ startDate: filters.startDate, endDate: filters.endDate }} onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }} minDate={filterStats?.date_range?.min || undefined} maxDate={filterStats?.date_range?.max || undefined} />
        <div className="p-6 text-text-secondary">Loading...</div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="KPI Summary"
        subtitle="Key performance indicators & metrics"
        period={period}
        onPeriodChange={(p) => setPeriod(p as DashboardPeriod)}
        customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }}
        minDate={filterStats?.date_range?.min || undefined}
        maxDate={filterStats?.date_range?.max || undefined}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        filtersOpen={filtersOpen}
      />
      <div className="flex flex-col gap-4 p-6">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        {/* Primary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total Volume" value={formatNPR(data?.total_amount ?? 0)} highlighted iconBg="var(--accent-blue-dim)" />
          <KPICard label="Total Transactions" value={(data?.total_count ?? 0).toLocaleString()} iconBg="var(--accent-green-dim)" />
          <KPICard label="Unique Accounts" value={(data?.unique_accounts ?? 0).toLocaleString()} iconBg="var(--accent-purple-dim)" />
          <KPICard label="Unique Customers" value={(data?.unique_customers ?? 0).toLocaleString()} iconBg="var(--accent-teal-dim)" />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Avg Transaction" value={formatNPR(data?.avg_transaction ?? 0)} iconBg="var(--accent-amber-dim)" />
          <KPICard label="Credit Ratio" value={formatPercent(data?.credit_ratio ?? 0)} iconBg="var(--accent-green-dim)" />
          <KPICard label="Txns per Account" value={(data?.txn_per_account ?? 0).toFixed(1)} iconBg="var(--accent-blue-dim)" />
          <KPICard label="Volume per Account" value={formatNPR(data?.vol_per_account ?? 0)} iconBg="var(--accent-teal-dim)" />
        </div>

        {/* Coverage KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[12px] text-text-muted mb-1">Branch Coverage</div>
            <div className="text-[26px] font-bold tracking-tight text-accent-blue">{(data?.unique_branches ?? 0).toLocaleString()}</div>
            <div className="text-[11px] text-text-secondary mt-1">Active branches</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[12px] text-text-muted mb-1">Province Coverage</div>
            <div className="text-[26px] font-bold tracking-tight text-accent-green">{data?.unique_provinces ?? 0} / 7</div>
            <div className="text-[11px] text-text-secondary mt-1">Provinces active</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[12px] text-text-muted mb-1">Net Flow</div>
            <div className={`text-[26px] font-bold tracking-tight ${(data?.net_flow ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {formatNPR(data?.net_flow ?? 0)}
            </div>
            <div className="text-[11px] text-text-secondary mt-1">CR minus DR</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[12px] text-text-muted mb-1">Credit Amount</div>
            <div className="text-[26px] font-bold tracking-tight text-accent-green">{formatNPR(data?.credit_amount ?? 0)}</div>
            <div className="text-[11px] text-text-secondary mt-1">{formatNPR(data?.debit_amount ?? 0)} debit</div>
          </div>
        </div>

        {/* Quarterly Trend */}
        {byQuarter.length > 0 && (
          <ChartCard title="Quarterly Performance" subtitle="Volume and transaction count by quarter">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byQuarter}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="period" stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
                <YAxis stroke="var(--text-muted)" style={{ fontSize: '11px' }} tickFormatter={(v) => formatNPR(v)} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === 'amount' ? formatNPR(v) : v.toLocaleString(), name === 'amount' ? 'Volume' : 'Transactions']} />
                <Bar dataKey="amount" name="amount" radius={[4, 4, 0, 0]}>
                  {byQuarter.map((_, idx) => <Cell key={idx} fill={QUARTER_COLORS[idx % QUARTER_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Product & Service Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {byProduct.length > 0 && (
            <ChartCard title="Volume by Product" subtitle="Transaction volume per product type">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byProduct.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--text-muted)" style={{ fontSize: '11px' }} tickFormatter={(v) => formatNPR(v)} />
                  <YAxis type="category" dataKey="product" stroke="var(--text-muted)" style={{ fontSize: '10px' }} width={100} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatNPR(v), 'Amount']} />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {byService.length > 0 && (
            <ChartCard title="Volume by Service" subtitle="Transaction volume per service type">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byService.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--text-muted)" style={{ fontSize: '11px' }} tickFormatter={(v) => formatNPR(v)} />
                  <YAxis type="category" dataKey="service" stroke="var(--text-muted)" style={{ fontSize: '10px' }} width={100} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatNPR(v), 'Amount']} />
                  <Bar dataKey="amount" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>

        {/* Quarterly detail table */}
        {byQuarter.length > 0 && (
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-[13px] font-semibold">Quarterly Breakdown</div>
              <div className="text-[11px] text-text-muted">Volume, transactions, and accounts per quarter</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-bg-base">
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">Period</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Volume</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Transactions</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Accounts</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Avg Txn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {byQuarter.map((q, idx) => (
                    <tr key={idx} className="hover:bg-bg-input transition-colors">
                      <td className="px-4 py-2.5 font-semibold">{q.period}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-text-primary">{formatNPR(q.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">{q.count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">{q.accounts.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">{q.count > 0 ? formatNPR(q.amount / q.count) : '-'}</td>
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
