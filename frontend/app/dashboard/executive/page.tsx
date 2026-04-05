'use client';

import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard, ChartLegendItem } from '@/components/ui/ChartCard';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { useDashboardData, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BranchData {
  branch_code: string;
  province: string;
  total_amount: number;
  transaction_count: number;
  unique_accounts: number;
  avg_transaction: number;
}

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filters, setFilters] = useState<DashboardFilters>({
    ...getDateRange('ALL'),
  });
  const [mounted, setMounted] = useState(false);
  
  const { data, isLoading, error } = useDashboardData(filters);
  const { data: filterStats } = useFilterStatistics();

  const referenceDate = useMemo(() => {
    return parseISODateToLocal(filterStats?.date_range?.max) || new Date();
  }, [filterStats?.date_range?.max]);

  const minReferenceDate = useMemo(() => (
    parseISODateToLocal(filterStats?.date_range?.min)
  ), [filterStats?.date_range?.min]);
  
  useEffect(() => {
    setMounted(true);
  }, []);

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
  
  const getSubtitle = () => {
    if (!mounted) return 'Loading...';
    const now = new Date();
    return `Last refreshed ${now.toLocaleTimeString('en-NP')} NPT · ${now.toLocaleDateString('en-GB')}`;
  };
  
  // Define columns for TanStack Table
  const columns = useMemo<ColumnDef<BranchData>[]>(
    () => [
      {
        accessorKey: 'branch_code',
        header: 'Branch Code',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div
              className={`
                w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold
                ${
                  row.index < 3
                    ? 'bg-[rgba(245,158,11,0.15)] text-accent-amber'
                    : 'bg-bg-input text-text-muted'
                }
              `}
            >
              {row.index + 1}
            </div>
            <span className="font-medium text-text-primary">{row.original.branch_code}</span>
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'province',
        header: 'Province',
        cell: (info) => info.getValue(),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'total_amount',
        header: 'Total Amount',
        cell: ({ row }) => (
          <strong className="text-text-primary">{formatNPR(row.original.total_amount)}</strong>
        ),
        enableSorting: true,
        sortingFn: 'basic',
      },
      {
        accessorKey: 'transaction_count',
        header: 'Transactions',
        cell: ({ row }) => row.original.transaction_count.toLocaleString(),
        enableSorting: true,
      },
      {
        accessorKey: 'unique_accounts',
        header: 'Accounts',
        cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
        enableSorting: true,
      },
      {
        accessorKey: 'avg_transaction',
        header: 'Avg/Transaction',
        cell: ({ row }) => formatNPR(row.original.avg_transaction),
        enableSorting: true,
      },
      {
        id: 'performance',
        header: 'Performance',
        cell: ({ row }) => {
          const amount = row.original.total_amount;
          const topAmount = data?.by_branch?.[0]?.total_amount || 1;
          const percentage = (amount / topAmount) * 100;
          
          return (
            <div className="flex items-center gap-2">
              <div className="w-16 bg-bg-input rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-accent-blue h-full rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[10px] text-text-muted">{percentage.toFixed(0)}%</span>
            </div>
          );
        },
      },
    ],
    [data]
  );
  
  if (error) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="ml-[220px] flex-1">
          <TopBar
            title="Executive Overview"
            subtitle="Last refreshed just now"
            period={period}
            onPeriodChange={handlePeriodChange}
            customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
            onCustomRangeChange={handleCustomRangeChange}
            minDate={filterStats?.date_range?.min || undefined}
            maxDate={filterStats?.date_range?.max || undefined}
          />
          <div className="p-6">
            <div className="bg-accent-red-dim border border-[rgba(239,68,68,0.2)] text-accent-red p-4 rounded-lg">
              Error loading dashboard data. Please ensure backend is running on port 3001.
            </div>
          </div>
        </main>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex">
        <Sidebar />
        <main className="ml-[220px] flex-1">
          <TopBar
            title="Executive Overview"
            subtitle="Loading..."
            period={period}
            onPeriodChange={handlePeriodChange}
            customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
            onCustomRangeChange={handleCustomRangeChange}
            minDate={filterStats?.date_range?.min || undefined}
            maxDate={filterStats?.date_range?.max || undefined}
          />
          <div className="p-6">
            <div className="text-text-secondary">Loading dashboard data...</div>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />
      
      <main className="ml-[220px] flex-1 flex flex-col min-w-0">
        <TopBar
          title="Executive Overview"
          subtitle={getSubtitle()}
          period={period}
          onPeriodChange={handlePeriodChange}
          customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
          onCustomRangeChange={handleCustomRangeChange}
          minDate={filterStats?.date_range?.min || undefined}
          maxDate={filterStats?.date_range?.max || undefined}
        />
        
        <div className="flex flex-col gap-4 p-6">
          {/* Advanced Filter Bar */}
          <AdvancedFilters
            filters={filters}
            onChange={setFilters}
            onClear={handleClearFilters}
          />
          
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              label="Total Transaction Amount"
              value={formatNPR(data?.summary?.total_amount || 0)}
              change={8.4}
              changeType="up"
              subtitle={`${data?.summary?.total_count || 0} txns`}
              iconBg="var(--accent-blue-dim)"
              highlighted
            />
            
            <KPICard
              label="Unique Accounts"
              value={(data?.summary?.unique_accounts || 0).toLocaleString()}
              change={5.1}
              changeType="up"
              subtitle="Active accounts"
              iconBg="var(--accent-green-dim)"
            />
            
            <KPICard
              label="Unique Customers"
              value={(data?.summary?.unique_customers || 0).toLocaleString()}
              change={3.2}
              changeType="up"
              subtitle="Total customers"
              iconBg="var(--accent-purple-dim)"
            />
            
            <KPICard
              label="Avg Transaction Size"
              value={formatNPR(data?.summary?.avg_transaction_size || 0)}
              change={2.7}
              changeType="up"
              subtitle="Per transaction"
              iconBg="var(--accent-teal-dim)"
            />
            
            <KPICard
              label="Transaction Count"
              value={(data?.summary?.total_count || 0).toLocaleString()}
              change={11.2}
              changeType="up"
              subtitle="Total transactions"
              iconBg="var(--accent-amber-dim)"
            />
            
            <KPICard
              label="Branch Performance"
              value={data?.by_branch?.length || 0}
              subtitle="Active branches"
              iconBg="var(--accent-purple-dim)"
            />
          </div>
          
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-3">
            <ChartCard
              title="Daily Transaction Trend"
              subtitle="Transaction amount over time (NPR)"
              legend={
                <>
                  <ChartLegendItem color="#3b82f6" label="Amount" />
                  <ChartLegendItem color="#10b981" label="Count" />
                </>
              }
            >
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data?.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--text-muted)" 
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            
            <ChartCard
              title="Transaction by Channel"
              subtitle="Breakdown by source"
              legend={
                <>
                  <ChartLegendItem color="#8b5cf6" label="Channel Distribution" />
                </>
              }
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.by_channel || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="channel" 
                    stroke="var(--text-muted)" 
                    style={{ fontSize: '10px' }}
                  />
                  <YAxis stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          
          {/* Province Breakdown */}
          <ChartCard
            title="Province Performance"
            subtitle="Transaction breakdown by province"
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.by_province || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
                <YAxis 
                  type="category" 
                  dataKey="province" 
                  stroke="var(--text-muted)" 
                  style={{ fontSize: '11px' }}
                  width={120}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--bg-card)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="amount" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          
          {/* TanStack Table with Advanced Filtering */}
          <AdvancedDataTable
            title="Branch Performance"
            subtitle={`${data?.by_branch?.length || 0} branches with sortable/filterable columns`}
            data={data?.by_branch || []}
            columns={columns}
            pageSize={10}
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
