'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard, ChartEmptyState } from '@/components/ui/ChartCard';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { useBranchPerformance, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { PremiumBarChart, PremiumScatterChart } from '@/components/ui/PremiumCharts';
import { BranchDashboardSkeleton } from '@/components/ui/DashboardSkeleton';

interface BranchData {
  branch_code: string;
  province: string;
  total_amount: number;
  transaction_count: number;
  unique_accounts: number;
  avg_transaction: number;
}

interface ProvinceData {
  province: string;
  branch_count: number;
  total_amount: number;
  transaction_count: number;
  unique_accounts: number;
  avg_per_branch: number;
}

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

export default function BranchDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    ...getDateRange('ALL'),
  });
  
  const { data, isLoading } = useBranchPerformance(filters);
  const { data: filterStats } = useFilterStatistics();

  const referenceDate = useMemo(() => {
    return parseISODateToLocal(filterStats?.date_range?.max) || new Date();
  }, [filterStats?.date_range?.max]);

  const minReferenceDate = useMemo(() => (
    parseISODateToLocal(filterStats?.date_range?.min)
  ), [filterStats?.date_range?.min]);

  useEffect(() => {
    if (period === 'CUSTOM') return;
    const dateRange = getDateRange(period, referenceDate, minReferenceDate || undefined);
    setFilters((prev) => (
      prev.startDate === dateRange.startDate && prev.endDate === dateRange.endDate
        ? prev
        : { ...prev, ...dateRange }
    ));
  }, [period, referenceDate, minReferenceDate]);
  
  const handleClearFilters = () => {
    if (period === 'CUSTOM') {
      setFilters((prev) => ({ startDate: prev.startDate, endDate: prev.endDate }));
      return;
    }
    const dateRange = getDateRange(period, referenceDate, minReferenceDate || undefined);
    setFilters(dateRange);
  };

  const handlePeriodChange = (nextPeriod: DashboardPeriod) => {
    setPeriod(nextPeriod);
  };

  const handleCustomRangeChange = (range: { startDate: string; endDate: string }) => {
    setPeriod('CUSTOM');
    setFilters((prev) => ({ ...prev, ...range }));
  };

  const totalNetworkAmount = data?.total_amount || 0;
  
  // Branch columns with ALL production fields
  const branchColumns = useMemo<ColumnDef<BranchData>[]>(
    () => [
      {
        accessorKey: 'branch_code',
        header: 'Branch',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold ${row.index < 3 ? 'bg-accent-amber-dim text-accent-amber' : 'bg-bg-input text-text-muted'}`}>
              {row.index + 1}
            </div>
            <Link href={`/dashboard/branch/${encodeURIComponent(row.original.branch_code)}`} className="font-medium text-text-primary hover:text-accent-blue transition-colors">
              {row.original.branch_code}
            </Link>
          </div>
        ),
        enableSorting: true, enableColumnFilter: true, filterFn: 'arrayFilter', meta: { filterType: 'select' },
      },
      {
        accessorKey: 'province',
        header: 'Province',
        cell: (info) => info.getValue(),
        enableSorting: true, enableColumnFilter: true, filterFn: 'arrayFilter', meta: { filterType: 'select' },
      },
      {
        accessorKey: 'total_amount',
        header: 'Total Amount',
        cell: ({ row }) => <strong className="text-text-primary">{formatNPR(row.original.total_amount)}</strong>,
        enableSorting: true, sortDescFirst: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        accessorKey: 'transaction_count',
        header: 'Transactions',
        cell: ({ row }) => row.original.transaction_count.toLocaleString(),
        enableSorting: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        accessorKey: 'unique_accounts',
        header: 'Accounts',
        cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
        enableSorting: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        accessorKey: 'avg_transaction',
        header: 'Avg / Txn',
        cell: ({ row }) => formatNPR(row.original.avg_transaction),
        enableSorting: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
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
        cell: ({ row }) => formatNPR(row.original.unique_accounts > 0 ? row.original.total_amount / row.original.unique_accounts : 0),
      },
      {
        id: 'share',
        header: 'Network Share',
        enableSorting: true,
        sortingFn: (a, b) => a.original.total_amount - b.original.total_amount,
        cell: ({ row }) => `${totalNetworkAmount > 0 ? ((row.original.total_amount / totalNetworkAmount) * 100).toFixed(1) : '0.0'}%`,
      },
    ],
    [totalNetworkAmount]
  );

  // Province columns with ALL production fields
  const provinceColumns = useMemo<ColumnDef<ProvinceData>[]>(
    () => [
      {
        accessorKey: 'province',
        header: 'Province',
        cell: (info) => <strong className="text-text-primary">{info.getValue() as string}</strong>,
        enableSorting: true, enableColumnFilter: true, filterFn: 'arrayFilter', meta: { filterType: 'select' },
      },
      {
        accessorKey: 'branch_count',
        header: 'Branches',
        cell: (info) => info.getValue(),
        enableSorting: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        accessorKey: 'total_amount',
        header: 'Total Amount',
        cell: ({ row }) => <strong className="text-text-primary">{formatNPR(row.original.total_amount)}</strong>,
        enableSorting: true, sortDescFirst: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        accessorKey: 'transaction_count',
        header: 'Transactions',
        cell: ({ row }) => row.original.transaction_count.toLocaleString(),
        enableSorting: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        accessorKey: 'unique_accounts',
        header: 'Accounts',
        cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
        enableSorting: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        accessorKey: 'avg_per_branch',
        header: 'Avg / Branch',
        cell: ({ row }) => formatNPR(row.original.avg_per_branch),
        enableSorting: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        id: 'avg_per_account',
        header: 'Avg / Account',
        enableSorting: true,
        sortingFn: (a, b) => (a.original.unique_accounts > 0 ? a.original.total_amount / a.original.unique_accounts : 0) - (b.original.unique_accounts > 0 ? b.original.total_amount / b.original.unique_accounts : 0),
        cell: ({ row }) => formatNPR(row.original.unique_accounts > 0 ? row.original.total_amount / row.original.unique_accounts : 0),
      },
      {
        id: 'txn_per_branch',
        header: 'Txns / Branch',
        enableSorting: true,
        sortingFn: (a, b) => (a.original.branch_count > 0 ? a.original.transaction_count / a.original.branch_count : 0) - (b.original.branch_count > 0 ? b.original.transaction_count / b.original.branch_count : 0),
        cell: ({ row }) => (row.original.branch_count > 0 ? Math.round(row.original.transaction_count / row.original.branch_count).toLocaleString() : '—'),
      },
      {
        id: 'share',
        header: 'Network Share',
        enableSorting: true,
        sortingFn: (a, b) => a.original.total_amount - b.original.total_amount,
        cell: ({ row }) => `${totalNetworkAmount > 0 ? ((row.original.total_amount / totalNetworkAmount) * 100).toFixed(1) : '0.0'}%`,
      },
    ],
    [totalNetworkAmount]
  );
  
  if (isLoading) {
    return (
      <>
        <TopBar
          title="Branch & Regional Performance"
          period={period}
          onPeriodChange={handlePeriodChange}
          customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
          onCustomRangeChange={handleCustomRangeChange}
          minDate={filterStats?.date_range?.min || undefined}
          maxDate={filterStats?.date_range?.max || undefined}
          onToggleFilters={() => setFiltersOpen((current) => !current)}
          filtersOpen={filtersOpen}
        />
        <BranchDashboardSkeleton />
      </>
    );
  }
  
  const topBranches = data?.branches?.slice(0, 5) || [];
  const allBranches = data?.branches || [];
  
  return (
    <>
      <TopBar
          title="Branch & Regional Performance"
          subtitle="Branch-level insights"
          period={period}
          onPeriodChange={handlePeriodChange}
          customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
          onCustomRangeChange={handleCustomRangeChange}
          minDate={filterStats?.date_range?.min || undefined}
          maxDate={filterStats?.date_range?.max || undefined}
        />
        
        <div className="flex flex-col gap-3.5 p-5">
          {/* Advanced Filters */}
          <AdvancedFilters
            filters={filters}
            onChange={setFilters}
            onClear={handleClearFilters}
            advancedOpen={filtersOpen}
            onAdvancedOpenChange={setFiltersOpen}
          />
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <KPICard
              label="Active Branches"
              value={allBranches.length}
              change={2.4}
              changeType="up"
              iconBg="var(--accent-blue-dim)"
            />
            <KPICard
              label="Total Amount"
              value={formatNPR(data?.total_amount || 0)}
              change={7.2}
              changeType="up"
              iconBg="var(--accent-green-dim)"
            />
            <KPICard
              label="Avg per Branch"
              value={formatNPR((data?.total_amount || 0) / (allBranches.length || 1))}
              subtitle="Average"
              iconBg="var(--accent-purple-dim)"
            />
            <KPICard
              label="Top Branch"
              value={topBranches[0]?.branch_code || '-'}
              subtitle={formatNPR(topBranches[0]?.total_amount || 0)}
              iconBg="var(--accent-amber-dim)"
            />
            <KPICard
              label="Province Count"
              value={data?.provinces?.length || 0}
              subtitle="Coverage"
              iconBg="var(--accent-teal-dim)"
            />
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard
              title="Top 10 Branches by Amount"
              subtitle="Highest performing branches"
            >
              {allBranches.length === 0 ? (
                <ChartEmptyState title="No branch performance data" />
              ) : (
                <PremiumBarChart
                  data={allBranches.slice(0, 10)}
                  xAxisKey="branch_code"
                  series={[{ dataKey: 'total_amount', name: 'Amount', color: '#3b82f6' }]}
                  layout="horizontal"
                  formatValue={formatNPR}
                  yAxisWidth={72}
                  height={280}
                />
              )}
            </ChartCard>
            
            <ChartCard
              title="Branch Scatter: Amount vs Count"
              subtitle="Bubble size = unique accounts"
            >
              {allBranches.length === 0 ? (
                <ChartEmptyState title="No branch scatter data" />
              ) : (
                <PremiumScatterChart
                  data={allBranches}
                  xKey="transaction_count"
                  yKey="total_amount"
                  sizeKey="unique_accounts"
                  nameKey="branch_code"
                  color="#10b981"
                  formatX={(v) => v.toLocaleString()}
                  formatY={formatNPR}
                  xLabel="Transactions"
                  yLabel="Amount"
                  height={280}
                />
              )}
            </ChartCard>
          </div>
          
          {/* Province Performance Table with TanStack */}
          <AdvancedDataTable
            title="Province Performance"
            subtitle={`${data?.provinces?.length || 0} provinces · use Columns to show/hide fields`}
            data={data?.provinces || []}
            columns={provinceColumns}
            pageSize={10}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={false}
            initialHidden={{ avg_per_account: true, txn_per_branch: true }}
          />
          
          <AdvancedDataTable
            title="All Branches"
            subtitle={`${allBranches.length} branches · Click branch code for full detail`}
            data={allBranches}
            columns={branchColumns}
            pageSize={20}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={true}
            initialHidden={{ txn_per_account: true, vol_per_account: true }}
            actions={
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-medium hover:opacity-90 transition-opacity">
                ⬇ Export
              </button>
            }
          />
        </div>
    </>
  );
}
