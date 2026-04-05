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
import { useDashboardData, useFilterStatistics, useTopCustomers } from '@/lib/hooks/useDashboardData';
import { formatNPR, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CustomerData {
  cif_id: string;
  name: string;
  segment: string;
  amount: number;
  accounts: number;
  risk: number;
}

interface SegmentData {
  segment: string;
  customers: number;
  amount: number;
  avg: number;
}

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

const SEGMENT_DATA: SegmentData[] = [
  { segment: 'Mass Retail', customers: 45230, amount: 12450000000, avg: 275000 },
  { segment: 'Affluent', customers: 8920, amount: 18750000000, avg: 2102000 },
  { segment: 'SME', customers: 3450, amount: 24500000000, avg: 7100000 },
  { segment: 'Private Banking', customers: 620, amount: 8900000000, avg: 14350000 },
];

const RISK_TIER_DATA = [
  { tier: 'Tier 1 (Low)', count: 42500, amount: 28500000000 },
  { tier: 'Tier 2 (Medium)', count: 12800, amount: 24100000000 },
  { tier: 'Tier 3 (High)', count: 2920, amount: 12000000000 },
];

export default function CustomerDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filters, setFilters] = useState<DashboardFilters>({
    ...getDateRange('ALL'),
  });
  
  const { data, isLoading } = useDashboardData(filters);
  const { data: filterStats } = useFilterStatistics();
  const { data: topCustomers } = useTopCustomers(filters, 20);

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

  const customerRows = useMemo<CustomerData[]>(() => (
    (topCustomers || []).map((customer) => ({
      cif_id: customer.cif_id,
      name: customer.name,
      segment: customer.segment,
      amount: customer.amount,
      accounts: customer.accounts,
      risk: customer.risk,
    }))
  ), [topCustomers]);
  
  // Customer table columns with ALL filters
  const customerColumns = useMemo<ColumnDef<CustomerData>[]>(
    () => [
      {
        id: 'rank',
        header: 'Rank',
        cell: ({ row }) => (
          <div className={`
            w-6 h-6 rounded flex items-center justify-center text-[10px] font-semibold
            ${row.index < 3 ? 'bg-accent-amber-dim text-accent-amber' : 'bg-bg-input text-text-muted'}
          `}>
            {row.index + 1}
          </div>
        ),
        enableColumnFilter: false,
        enableSorting: false,
      },
      {
        accessorKey: 'cif_id',
        header: 'CIF ID',
        cell: ({ row }) => (
          <Link
            href={`/dashboard/customer/${encodeURIComponent(row.original.cif_id)}`}
            className="text-accent-blue text-[11px] hover:underline"
          >
            <code>{row.original.cif_id}</code>
          </Link>
        ),
        enableColumnFilter: true,
        // Text filter (default)
      },
      {
        accessorKey: 'name',
        header: 'Customer Name',
        cell: ({ row }) => (
          <Link
            href={`/dashboard/customer/${encodeURIComponent(row.original.cif_id)}`}
            className="font-semibold text-text-primary hover:text-accent-blue transition-colors"
          >
            {row.original.name}
          </Link>
        ),
        enableColumnFilter: true,
        // Text filter (default)
      },
      {
        accessorKey: 'segment',
        header: 'Segment',
        cell: ({ row }) => (
          <Pill variant="blue">{row.original.segment}</Pill>
        ),
        enableColumnFilter: true,
        filterFn: 'arrayFilter',
        meta: { filterType: 'select' }
      },
      {
        accessorKey: 'amount',
        header: 'Total Amount',
        cell: ({ row }) => (
          <strong className="text-text-primary">{formatNPR(row.original.amount)}</strong>
        ),
        enableSorting: true,
        sortDescFirst: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        accessorKey: 'accounts',
        header: 'Accounts',
        cell: ({ row }) => row.original.accounts.toLocaleString(),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        accessorKey: 'risk',
        header: 'Risk Tier',
        cell: ({ row }) => (
          <Pill variant={row.original.risk === 1 ? 'green' : row.original.risk === 2 ? 'amber' : 'red'}>
            Tier {row.original.risk}
          </Pill>
        ),
        enableColumnFilter: true,
        filterFn: 'arrayFilter',
        meta: { filterType: 'select' }
      },
    ],
    []
  );
  
  // Segment table columns with ALL filters
  const segmentColumns = useMemo<ColumnDef<SegmentData>[]>(
    () => [
      {
        accessorKey: 'segment',
        header: 'Segment',
        cell: ({ row }) => (
          <strong className="text-text-primary">{row.original.segment}</strong>
        ),
        enableColumnFilter: true,
        filterFn: 'arrayFilter',
        meta: { filterType: 'select' }
      },
      {
        accessorKey: 'customers',
        header: 'Customers',
        cell: ({ row }) => row.original.customers.toLocaleString(),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        accessorKey: 'amount',
        header: 'Total Amount',
        cell: ({ row }) => (
          <strong className="text-text-primary">{formatNPR(row.original.amount)}</strong>
        ),
        enableSorting: true,
        sortDescFirst: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        accessorKey: 'avg',
        header: 'Avg/Customer',
        cell: ({ row }) => formatNPR(row.original.avg),
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: 'numberRange',
        meta: { filterType: 'number-range' }
      },
      {
        id: 'percentage',
        header: '% of Total',
        cell: ({ row }) => {
          const total = SEGMENT_DATA.reduce((sum, s) => sum + s.amount, 0);
          const percentage = ((row.original.amount / total) * 100).toFixed(1);
          return `${percentage}%`;
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        id: 'growth',
        header: 'Growth',
        cell: () => <Pill variant="green">+5.2%</Pill>,
        enableSorting: false,
        enableColumnFilter: false,
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
            title="Customer & Portfolio"
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
  
  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />
      
      <main className="ml-[220px] flex-1 flex flex-col min-w-0">
        <TopBar
          title="Customer & Portfolio"
          subtitle="Customer segmentation & portfolio analysis"
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
              label="Total Customers"
              value={(data?.summary?.unique_customers || 0).toLocaleString()}
              change={4.2}
              changeType="up"
              iconBg="var(--accent-blue-dim)"
            />
            <KPICard
              label="Total Portfolio Value"
              value={formatNPR(data?.summary?.total_amount || 0)}
              change={6.8}
              changeType="up"
              iconBg="var(--accent-green-dim)"
            />
            <KPICard
              label="Avg per Customer"
              value={formatNPR((data?.summary?.total_amount || 0) / (data?.summary?.unique_customers || 1))}
              subtitle="Average"
              iconBg="var(--accent-purple-dim)"
            />
            <KPICard
              label="Active Accounts"
              value={(data?.summary?.unique_accounts || 0).toLocaleString()}
              change={3.1}
              changeType="up"
              iconBg="var(--accent-teal-dim)"
            />
            <KPICard
              label="High Risk Customers"
              value={RISK_TIER_DATA[2]?.count.toLocaleString()}
              subtitle="Tier 3"
              iconBg="var(--accent-red-dim)"
            />
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard
              title="Customer Segmentation"
              subtitle="By customer count and amount"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={SEGMENT_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="segment" 
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
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="customers" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            
            <ChartCard
              title="Risk Tier Distribution"
              subtitle="KYC risk breakdown"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={RISK_TIER_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="tier" 
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
          
          {/* Segment Performance Table with TanStack */}
          <AdvancedDataTable
            title="Segment Performance"
            subtitle="Detailed segment metrics with filters"
            data={SEGMENT_DATA}
            columns={segmentColumns}
            pageSize={10}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={false}
          />
          
          {/* Top Customers Table with TanStack */}
          <AdvancedDataTable
            title="Top Customers by Portfolio Value"
            subtitle={`${customerRows.length} high-value customers • Click CIF/name for full detail`}
            data={customerRows}
            columns={customerColumns}
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
