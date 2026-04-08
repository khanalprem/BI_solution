'use client';

import { useState, useMemo, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { useEmployerSummary, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent, getDateRange, parseISODateToLocal, CHART_TOOLTIP_STYLE } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

export default function EmployerDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({ ...getDateRange('ALL') });

  const { data, isLoading } = useEmployerSummary(filters);
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

  const byUser = data?.by_user ?? [];
  const byBranch = data?.by_branch ?? [];
  const topUsers = byUser.slice(0, 10);

  if (isLoading) {
    return (
      <>
        <TopBar title="Staff & Operations" subtitle="Employee activity and branch operations" period={period} onPeriodChange={(p) => setPeriod(p as DashboardPeriod)} customRange={{ startDate: filters.startDate, endDate: filters.endDate }} onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }} minDate={filterStats?.date_range?.min || undefined} maxDate={filterStats?.date_range?.max || undefined} />
        <div className="p-6 text-text-secondary">Loading...</div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Staff & Operations"
        subtitle="Employee activity and branch operations"
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Entry Users" value={(data?.total_entry_users ?? 0).toLocaleString()} iconBg="var(--accent-blue-dim)" />
          <KPICard label="VFD Users" value={(data?.total_vfd_users ?? 0).toLocaleString()} iconBg="var(--accent-green-dim)" />
          <KPICard label="Active Branches" value={(data?.total_branches ?? 0).toLocaleString()} iconBg="var(--accent-purple-dim)" />
          <KPICard label="Total Volume" value={formatNPR(data?.total_amount ?? 0)} highlighted iconBg="var(--accent-teal-dim)" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[12px] text-text-muted mb-1">Total Transactions</div>
            <div className="text-[26px] font-bold tracking-tight text-accent-blue">{(data?.total_count ?? 0).toLocaleString()}</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[12px] text-text-muted mb-1">Avg per Entry User</div>
            <div className="text-[26px] font-bold tracking-tight text-accent-green">
              {data?.total_entry_users ? formatNPR((data.total_amount ?? 0) / data.total_entry_users) : '-'}
            </div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[12px] text-text-muted mb-1">Avg per Branch</div>
            <div className="text-[26px] font-bold tracking-tight text-accent-amber">
              {data?.total_branches ? formatNPR((data.total_amount ?? 0) / data.total_branches) : '-'}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {topUsers.length > 0 && (
            <ChartCard title="Top Entry Users by Volume" subtitle="Users ranked by total transaction amount">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topUsers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--text-muted)" style={{ fontSize: '11px' }} tickFormatter={(v) => formatNPR(v)} />
                  <YAxis type="category" dataKey="user" stroke="var(--text-muted)" style={{ fontSize: '10px' }} width={90} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === 'amount' ? formatNPR(v) : v.toLocaleString(), name === 'amount' ? 'Volume' : 'Transactions']} />
                  <Bar dataKey="amount" name="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {byBranch.length > 0 && (
            <ChartCard title="Branch Operations" subtitle="Users and volume by branch">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byBranch.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--text-muted)" style={{ fontSize: '11px' }} tickFormatter={(v) => formatNPR(v)} />
                  <YAxis type="category" dataKey="branch" stroke="var(--text-muted)" style={{ fontSize: '10px' }} width={80} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v: number, name: string) => [name === 'amount' ? formatNPR(v) : v.toLocaleString(), '']} />
                  <Bar dataKey="amount" name="amount" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>

        {/* User Detail Table */}
        {byUser.length > 0 && (
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-[13px] font-semibold">Entry User Activity</div>
                <div className="text-[11px] text-text-muted">{byUser.length} active users</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-bg-base">
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium w-8">#</th>
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">User</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Volume</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Transactions</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Accounts</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {byUser.map((user, idx) => (
                    <tr key={idx} className="hover:bg-bg-input transition-colors">
                      <td className="px-4 py-2.5">
                        <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold ${idx < 3 ? 'bg-amber-500/20 text-amber-400' : 'bg-bg-input text-text-muted'}`}>
                          {idx + 1}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{user.user}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatNPR(user.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">{user.count.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">{user.accounts.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right text-accent-green">{formatNPR(user.credit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Branch Detail Table */}
        {byBranch.length > 0 && (
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <div className="text-[13px] font-semibold">Branch Operations Summary</div>
              <div className="text-[11px] text-text-muted">{byBranch.length} active branches</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-bg-base">
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">Branch</th>
                    <th className="text-left px-4 py-2.5 text-text-muted font-medium">Province</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Users</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Volume</th>
                    <th className="text-right px-4 py-2.5 text-text-muted font-medium">Transactions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {byBranch.map((branch, idx) => (
                    <tr key={idx} className="hover:bg-bg-input transition-colors">
                      <td className="px-4 py-2.5 font-medium">{branch.branch}</td>
                      <td className="px-4 py-2.5 text-text-secondary capitalize">{branch.province}</td>
                      <td className="px-4 py-2.5 text-right">{branch.users}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatNPR(branch.amount)}</td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">{branch.count.toLocaleString()}</td>
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
