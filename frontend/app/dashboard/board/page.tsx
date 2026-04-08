'use client';

import { useState, useMemo, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { DataTable, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/DataTable';
import { Pill } from '@/components/ui/Pill';
import { useDashboardData, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent, getDateRange, parseISODateToLocal, CHART_TOOLTIP_STYLE } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

const BOARD_REPORTS = [
  { id: 1, name: 'Monthly Board Pack', frequency: 'Monthly', lastRun: '2024-07-01', status: 'completed' },
  { id: 2, name: 'Quarterly Governance Report', frequency: 'Quarterly', lastRun: '2024-06-30', status: 'completed' },
  { id: 3, name: 'Risk Committee Report', frequency: 'Monthly', lastRun: '2024-06-28', status: 'completed' },
  { id: 4, name: 'Audit Committee Pack', frequency: 'Quarterly', lastRun: '2024-06-15', status: 'completed' },
  { id: 5, name: 'Annual Strategic Review', frequency: 'Annual', lastRun: '2023-12-31', status: 'completed' },
];

export default function BoardDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filters, setFilters] = useState<DashboardFilters>({ ...getDateRange('ALL') });

  const { data, isLoading } = useDashboardData(filters);
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

  const summary = data?.summary;
  const trend = data?.trend ?? [];
  const topBranches = (data?.by_branch ?? []).slice(0, 5);
  const topProvinces = (data?.by_province ?? []).slice(0, 7);

  return (
    <>
      <TopBar
        title="Board & Executive Packs"
        subtitle="Strategic overview & governance reporting"
        period={period}
        onPeriodChange={(p) => setPeriod(p as DashboardPeriod)}
        customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }}
        minDate={filterStats?.date_range?.min || undefined}
        maxDate={filterStats?.date_range?.max || undefined}
      />
      <div className="flex flex-col gap-4 p-6">
        {/* Executive KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total Transaction Volume" value={formatNPR(summary?.total_amount ?? 0)} highlighted iconBg="var(--accent-blue-dim)" />
          <KPICard label="Total Transactions" value={(summary?.total_count ?? 0).toLocaleString()} iconBg="var(--accent-green-dim)" />
          <KPICard label="Unique Customers" value={(summary?.unique_customers ?? 0).toLocaleString()} iconBg="var(--accent-purple-dim)" />
          <KPICard label="Active Accounts" value={(summary?.unique_accounts ?? 0).toLocaleString()} iconBg="var(--accent-teal-dim)" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Credit Inflow" value={formatNPR(summary?.credit_amount ?? 0)} iconBg="var(--accent-green-dim)" />
          <KPICard label="Debit Outflow" value={formatNPR(summary?.debit_amount ?? 0)} iconBg="var(--accent-red-dim)" />
          <KPICard label="Net Flow" value={formatNPR(summary?.net_flow ?? 0)} iconBg={(summary?.net_flow ?? 0) >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'} />
          <KPICard label="Avg Transaction" value={formatNPR(summary?.avg_transaction_size ?? 0)} iconBg="var(--accent-amber-dim)" />
        </div>

        {/* Trend and Province */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Transaction Volume Trend" subtitle="Daily transaction volume">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend.slice(-60)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" style={{ fontSize: '10px' }} tickFormatter={(v) => v.slice(5)} />
                <YAxis stroke="var(--text-muted)" style={{ fontSize: '11px' }} tickFormatter={(v) => formatNPR(v)} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatNPR(v), 'Amount']} />
                <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Province Performance" subtitle="Volume by province">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProvinces}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="province" stroke="var(--text-muted)" style={{ fontSize: '10px' }} />
                <YAxis stroke="var(--text-muted)" style={{ fontSize: '11px' }} tickFormatter={(v) => formatNPR(v)} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number) => [formatNPR(v), 'Volume']} />
                <Bar dataKey="total_amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Top Branches */}
        {topBranches.length > 0 && (
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-[13px] font-semibold">Top Performing Branches</div>
              <div className="text-[11px] text-text-muted">Ranked by transaction volume</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-bg-base">
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium w-8">#</th>
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">Branch</th>
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">Province</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Volume</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Transactions</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Accounts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topBranches.map((b, idx) => (
                    <tr key={idx} className="hover:bg-bg-input transition-colors">
                      <td className="px-4 py-2.5">
                        <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold ${idx === 0 ? 'bg-amber-500/20 text-amber-400' : idx === 1 ? 'bg-slate-400/20 text-slate-400' : idx === 2 ? 'bg-orange-400/20 text-orange-400' : 'bg-bg-input text-text-muted'}`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{b.branch_code}</td>
                      <td className="px-4 py-2.5 text-text-secondary capitalize">{b.province}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatNPR(b.total_amount)}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">{b.transaction_count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">{b.unique_accounts.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Governance Reports */}
        <DataTable title="Governance Reports" subtitle={`${BOARD_REPORTS.length} reports available`}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Report Name</TableHeader>
                <TableHeader>Frequency</TableHeader>
                <TableHeader>Last Generated</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {BOARD_REPORTS.map((report) => (
                <TableRow key={report.id}>
                  <TableCell><strong className="text-text-primary">{report.name}</strong></TableCell>
                  <TableCell><Pill variant="blue">{report.frequency}</Pill></TableCell>
                  <TableCell>{report.lastRun}</TableCell>
                  <TableCell><Pill variant="green">Completed</Pill></TableCell>
                  <TableCell>
                    <button className="text-accent-blue text-xs hover:underline">Download</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTable>
      </div>
    </>
  );
}
