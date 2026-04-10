'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { useEmployerSummary, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { PremiumBarChart } from '@/components/ui/PremiumCharts';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

export default function EmployerDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({ startDate: '2021-02-18', endDate: '2024-07-01' });

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

  type UserRow = { user: string; amount: number; count: number; accounts: number; credit: number };
  const userTotalAmount = useMemo(() => byUser.reduce((s, u) => s + u.amount, 0), [byUser]);
  const userColumns = useMemo<ColumnDef<UserRow>[]>(() => [
    {
      accessorKey: 'user',
      header: 'User ID',
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
      cell: ({ row }) => (
        <Link href={`/dashboard/employer/${encodeURIComponent(row.original.user)}`} className="font-semibold text-accent-blue hover:underline">
          {row.original.user}
        </Link>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Total Volume',
      enableSorting: true, sortDescFirst: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => <strong className="font-mono text-[11px]">{formatNPR(row.original.amount)}</strong>,
    },
    {
      accessorKey: 'count',
      header: 'Transactions',
      enableSorting: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.count.toLocaleString(),
    },
    {
      accessorKey: 'accounts',
      header: 'Accounts',
      enableSorting: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.accounts.toLocaleString(),
    },
    {
      accessorKey: 'credit',
      header: 'Credit (CR)',
      enableSorting: true, sortDescFirst: true,
      cell: ({ row }) => <span className="font-mono text-[11px] text-accent-green">{formatNPR(row.original.credit)}</span>,
    },
    {
      id: 'debit',
      header: 'Debit (DR)',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.amount - a.original.credit) - (b.original.amount - b.original.credit),
      cell: ({ row }) => <span className="font-mono text-[11px] text-accent-red">{formatNPR(row.original.amount - row.original.credit)}</span>,
    },
    {
      id: 'credit_ratio',
      header: 'CR Ratio',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.amount > 0 ? a.original.credit / a.original.amount : 0) - (b.original.amount > 0 ? b.original.credit / b.original.amount : 0),
      cell: ({ row }) => {
        const r = row.original.amount > 0 ? (row.original.credit / row.original.amount) * 100 : 0;
        return <span className={r > 50 ? 'text-accent-green' : 'text-accent-red'}>{r.toFixed(1)}%</span>;
      },
    },
    {
      id: 'avg_txn',
      header: 'Avg Txn',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.count > 0 ? a.original.amount / a.original.count : 0) - (b.original.count > 0 ? b.original.amount / b.original.count : 0),
      cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.count > 0 ? formatNPR(row.original.amount / row.original.count) : '—'}</span>,
    },
    {
      id: 'share',
      header: '% of Total',
      enableSorting: true,
      sortingFn: (a, b) => a.original.amount - b.original.amount,
      cell: ({ row }) => {
        const pct = userTotalAmount > 0 ? (row.original.amount / userTotalAmount) * 100 : 0;
        return (
          <div className="flex items-center gap-2 min-w-[70px]">
            <div className="flex-1 h-1.5 rounded-full bg-bg-input overflow-hidden">
              <div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${Math.min(pct * 3, 100)}%` }} />
            </div>
            <span className="text-[9.5px] text-text-muted w-8 text-right">{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
    {
      id: 'action',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <Link href={`/dashboard/employer/${encodeURIComponent(row.original.user)}`} className="text-[10px] text-text-muted hover:text-accent-blue transition-colors">
          View →
        </Link>
      ),
    },
  ], [userTotalAmount]);

  type BranchRow = { branch: string; province: string; users: number; amount: number; count: number };
  const branchTotalAmount = useMemo(() => byBranch.reduce((s, b) => s + b.amount, 0), [byBranch]);
  const branchColumns = useMemo<ColumnDef<BranchRow>[]>(() => [
    {
      accessorKey: 'branch',
      header: 'Branch',
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
      cell: ({ row }) => <span className="font-medium text-text-primary">{row.original.branch}</span>,
    },
    {
      accessorKey: 'province',
      header: 'Province',
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
      cell: ({ row }) => <span className="capitalize text-text-secondary">{row.original.province}</span>,
    },
    {
      accessorKey: 'users',
      header: 'Users',
      enableSorting: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.users.toLocaleString(),
    },
    {
      accessorKey: 'amount',
      header: 'Total Volume',
      enableSorting: true, sortDescFirst: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => <strong className="font-mono text-[11px]">{formatNPR(row.original.amount)}</strong>,
    },
    {
      accessorKey: 'count',
      header: 'Transactions',
      enableSorting: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.count.toLocaleString(),
    },
    {
      id: 'avg_txn',
      header: 'Avg Txn',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.count > 0 ? a.original.amount / a.original.count : 0) - (b.original.count > 0 ? b.original.amount / b.original.count : 0),
      cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.count > 0 ? formatNPR(row.original.amount / row.original.count) : '—'}</span>,
    },
    {
      id: 'vol_per_user',
      header: 'Vol / User',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.users > 0 ? a.original.amount / a.original.users : 0) - (b.original.users > 0 ? b.original.amount / b.original.users : 0),
      cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.users > 0 ? formatNPR(row.original.amount / row.original.users) : '—'}</span>,
    },
    {
      id: 'txn_per_user',
      header: 'Txns / User',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.users > 0 ? a.original.count / a.original.users : 0) - (b.original.users > 0 ? b.original.count / b.original.users : 0),
      cell: ({ row }) => (row.original.users > 0 ? (row.original.count / row.original.users).toFixed(1) : '—'),
    },
    {
      id: 'share',
      header: '% of Total',
      enableSorting: true,
      sortingFn: (a, b) => a.original.amount - b.original.amount,
      cell: ({ row }) => {
        const pct = branchTotalAmount > 0 ? (row.original.amount / branchTotalAmount) * 100 : 0;
        return (
          <div className="flex items-center gap-2 min-w-[70px]">
            <div className="flex-1 h-1.5 rounded-full bg-bg-input overflow-hidden">
              <div className="h-full rounded-full bg-accent-green transition-all" style={{ width: `${Math.min(pct * 3, 100)}%` }} />
            </div>
            <span className="text-[9.5px] text-text-muted w-8 text-right">{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
  ], [branchTotalAmount]);

  if (isLoading) {
    return (
      <>
        <TopBar title="Staff & Operations" subtitle="Employee activity and branch operations" period={period} onPeriodChange={(p) => setPeriod(p as DashboardPeriod)} customRange={{ startDate: filters.startDate, endDate: filters.endDate }} onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }} minDate={filterStats?.date_range?.min || undefined} maxDate={filterStats?.date_range?.max || undefined} />
        <StandardDashboardSkeleton />
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
      <div className="flex flex-col gap-[14px] px-5 py-4">
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
          <KPICard label="Active Branches" value={(data?.total_branches ?? 0).toLocaleString()} iconBg="var(--accent-purple-dim)" sparkData={byBranch.slice(0, 12).map(b => b.amount)} />
          <KPICard label="Total Volume" value={formatNPR(data?.total_amount ?? 0)} highlighted iconBg="var(--accent-teal-dim)" sparkData={topUsers.map(u => u.amount)} />
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
              <PremiumBarChart
                data={topUsers}
                xAxisKey="user"
                series={[{ dataKey: 'amount', name: 'Volume', color: '#3b82f6' }]}
                layout="horizontal"
                formatValue={formatNPR}
                yAxisWidth={90}
                height={280}
              />
            </ChartCard>
          )}

          {byBranch.length > 0 && (
            <ChartCard title="Branch Operations" subtitle="Users and volume by branch">
              <PremiumBarChart
                data={byBranch.slice(0, 10)}
                xAxisKey="branch"
                series={[{ dataKey: 'amount', name: 'Volume', color: '#10b981' }]}
                layout="horizontal"
                formatValue={formatNPR}
                yAxisWidth={80}
                height={280}
              />
            </ChartCard>
          )}
        </div>

        {/* User Detail Table */}
        {byUser.length > 0 && (
          <AdvancedDataTable
            title="Entry User Activity"
            subtitle={`${byUser.length} active users — click name to drill down · use Columns to show/hide fields`}
            data={byUser as UserRow[]}
            columns={userColumns}
            pageSize={15}
            initialHidden={{ debit: true, credit_ratio: true, avg_txn: true, share: true }}
          />
        )}

        {/* Branch Detail Table */}
        {byBranch.length > 0 && (
          <AdvancedDataTable
            title="Branch Operations Summary"
            subtitle={`${byBranch.length} active branches — use Columns to show/hide fields`}
            data={byBranch as BranchRow[]}
            columns={branchColumns}
            pageSize={15}
            initialHidden={{ avg_txn: true, vol_per_user: true, txn_per_user: true, share: true }}
          />
        )}
      </div>
    </>
  );
}
