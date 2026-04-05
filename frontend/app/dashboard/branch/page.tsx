'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { Pill } from '@/components/ui/Pill';
import { useBranchPerformance, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';

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
  
  // Branch columns with ALL filters available
  const branchColumns = useMemo<ColumnDef<BranchData>[]>(
    () => [
      {
        accessorKey: 'branch_code',
        header: 'Branch Code',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div
              className={`
                w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold
                ${row.index < 3 ? 'bg-accent-amber-dim text-accent-amber' : 'bg-bg-input text-text-muted'}
              `}
            >
              {row.index + 1}
            </div>
            <Link
              href={`/dashboard/branch/${encodeURIComponent(row.original.branch_code)}`}
              className="font-medium text-text-primary hover:text-accent-blue transition-colors"
            >
              {row.original.branch_code}
            </Link>
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'arrayFilter',
        meta: { filterType: 'select' }
      },
      {
        accessorKey: 'province',
        header: 'Province',
        cell: (info) => info.getValue(),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'arrayFilter',
        meta: { filterType: 'select' }
      },
      {
        accessorKey: 'total_amount',
        header: 'Total Amount',
        cell: ({ row }) => <strong className="text-text-primary">{formatNPR(row.original.total_amount)}</strong>,
        enableSorting: true,
        sortDescFirst: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        accessorKey: 'transaction_count',
        header: 'Transactions',
        cell: ({ row }) => row.original.transaction_count.toLocaleString(),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        accessorKey: 'unique_accounts',
        header: 'Accounts',
        cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        accessorKey: 'avg_transaction',
        header: 'Avg/Txn',
        cell: ({ row }) => formatNPR(row.original.avg_transaction),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        id: 'status',
        header: 'Status',
        cell: () => <Pill variant="green">Active</Pill>,
        enableColumnFilter: false,
        enableSorting: false,
      },
    ],
    []
  );
  
  // Province columns with ALL filters
  const provinceColumns = useMemo<ColumnDef<ProvinceData>[]>(
    () => [
      {
        accessorKey: 'province',
        header: 'Province',
        cell: (info) => <strong className="text-text-primary">{info.getValue() as string}</strong>,
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'arrayFilter',
        meta: { filterType: 'select' }
      },
      {
        accessorKey: 'branch_count',
        header: 'Branches',
        cell: (info) => info.getValue(),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        accessorKey: 'total_amount',
        header: 'Total Amount',
        cell: ({ row }) => <strong className="text-text-primary">{formatNPR(row.original.total_amount)}</strong>,
        enableSorting: true,
        sortDescFirst: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        accessorKey: 'transaction_count',
        header: 'Transactions',
        cell: ({ row }) => row.original.transaction_count.toLocaleString(),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        accessorKey: 'unique_accounts',
        header: 'Accounts',
        cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        accessorKey: 'avg_per_branch',
        header: 'Avg/Branch',
        cell: ({ row }) => formatNPR(row.original.avg_per_branch),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
    ],
    []
  );
  
  if (isLoading) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="ml-[220px] flex-1">
          <TopBar
            title="Branch & Regional Performance"
            period={period}
            onPeriodChange={handlePeriodChange}
            customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
            onCustomRangeChange={handleCustomRangeChange}
            minDate={filterStats?.date_range?.min || undefined}
            maxDate={filterStats?.date_range?.max || undefined}
          />
          <div className="p-6"><div className="text-text-secondary">Loading...</div></div>
        </main>
      </div>
    );
  }
  
  const topBranches = data?.branches?.slice(0, 5) || [];
  const allBranches = data?.branches || [];
  
  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />
      
      <main className="ml-[220px] flex-1 flex flex-col min-w-0">
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
        
        <div className="flex flex-col gap-4 p-6">
          {/* Advanced Filters */}
          <AdvancedFilters
            filters={filters}
            onChange={setFilters}
            onClear={handleClearFilters}
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
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={allBranches.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
                  <YAxis 
                    type="category" 
                    dataKey="branch_code" 
                    stroke="var(--text-muted)" 
                    style={{ fontSize: '10px' }}
                    width={70}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="total_amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            
            <ChartCard
              title="Branch Scatter: Amount vs Count"
              subtitle="Bubble size = unique accounts"
            >
              <ResponsiveContainer width="100%" height={280}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    type="number" 
                    dataKey="transaction_count" 
                    name="Transactions" 
                    stroke="var(--text-muted)" 
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="total_amount" 
                    name="Amount" 
                    stroke="var(--text-muted)" 
                    style={{ fontSize: '11px' }}
                  />
                  <ZAxis 
                    type="number" 
                    dataKey="unique_accounts" 
                    name="Accounts" 
                    range={[50, 400]} 
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Scatter data={allBranches} fill="#10b981" />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          
          {/* Province Performance Table with TanStack */}
          <AdvancedDataTable
            title="Province Performance"
            subtitle={`${data?.provinces?.length || 0} provinces • Filter, sort, and search`}
            data={data?.provinces || []}
            columns={provinceColumns}
            pageSize={10}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={false}
          />
          
          {/* All Branches Table with TanStack */}
          <AdvancedDataTable
            title="All Branches"
            subtitle={`${allBranches.length} branches • Click branch code for full detail`}
            data={allBranches}
            columns={branchColumns}
            pageSize={20}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={true}
            actions={
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-medium hover:opacity-90 transition-opacity">
                ⬇ Export
              </button>
            }
          />
        </div>
      </main>
    </div>
  );
}
