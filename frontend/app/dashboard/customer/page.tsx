'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard, ChartEmptyState, ChartLegendItem } from '@/components/ui/ChartCard';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { Pill } from '@/components/ui/Pill';
import { useDashboardData, useFilterStatistics, useTopCustomers } from '@/lib/hooks/useDashboardData';
import { formatNPR, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { PremiumBarChart, PremiumComposedChart } from '@/components/ui/PremiumCharts';
import { CustomerDashboardSkeleton } from '@/components/ui/DashboardSkeleton';

interface CustomerData {
  cif_id: string;
  name: string;
  segment: string;
  amount: number;
  accounts: number;
  risk: number;
  transaction_count: number;
  avg_transaction: number;
}

interface SegmentData {
  segment: string;
  customers: number;
  amount: number;
  avg: number;
}

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';


export default function CustomerDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
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
      transaction_count: customer.transaction_count,
      avg_transaction: customer.transaction_count > 0 ? customer.amount / customer.transaction_count : 0,
    }))
  ), [topCustomers]);

  // Derive segment data from live top customers
  const segmentData = useMemo<SegmentData[]>(() => {
    const map = new Map<string, { customers: number; amount: number }>();
    customerRows.forEach((c) => {
      const existing = map.get(c.segment) || { customers: 0, amount: 0 };
      map.set(c.segment, { customers: existing.customers + 1, amount: existing.amount + c.amount });
    });
    return Array.from(map.entries()).map(([segment, vals]) => ({
      segment,
      customers: vals.customers,
      amount: vals.amount,
      avg: vals.customers > 0 ? vals.amount / vals.customers : 0,
    }));
  }, [customerRows]);

  // Derive risk tier data from live top customers
  const riskTierData = useMemo(() => {
    const tiers = [1, 2, 3].map((tier) => {
      const filtered = customerRows.filter((c) => c.risk === tier);
      return {
        tier: tier === 1 ? 'Tier 1 (Low)' : tier === 2 ? 'Tier 2 (Medium)' : 'Tier 3 (High)',
        count: filtered.length,
        amount: filtered.reduce((s, c) => s + c.amount, 0),
      };
    });
    return tiers;
  }, [customerRows]);
  
  // Customer table columns — all production fields from customers + tran_summary
  const customerColumns = useMemo<ColumnDef<CustomerData>[]>(
    () => [
      {
        id: 'rank',
        header: 'Rank',
        cell: ({ row }) => (
          <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-semibold ${row.index < 3 ? 'bg-accent-amber-dim text-accent-amber' : 'bg-bg-input text-text-muted'}`}>
            {row.index + 1}
          </div>
        ),
        enableColumnFilter: false, enableSorting: false,
      },
      {
        accessorKey: 'cif_id',
        header: 'CIF ID',
        cell: ({ row }) => (
          <Link href={`/dashboard/customer/${encodeURIComponent(row.original.cif_id)}`} className="text-accent-blue text-[11px] hover:underline">
            <code>{row.original.cif_id}</code>
          </Link>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: 'name',
        header: 'Customer Name',
        cell: ({ row }) => (
          <Link href={`/dashboard/customer/${encodeURIComponent(row.original.cif_id)}`} className="font-semibold text-text-primary hover:text-accent-blue transition-colors">
            {row.original.name}
          </Link>
        ),
        enableColumnFilter: true,
      },
      {
        accessorKey: 'segment',
        header: 'Segment',
        cell: ({ row }) => <Pill variant="blue">{row.original.segment}</Pill>,
        enableColumnFilter: true, filterFn: 'arrayFilter', meta: { filterType: 'select' },
      },
      {
        accessorKey: 'amount',
        header: 'Total Amount',
        cell: ({ row }) => <strong className="text-text-primary">{formatNPR(row.original.amount)}</strong>,
        enableSorting: true, sortDescFirst: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        accessorKey: 'accounts',
        header: 'Accounts',
        cell: ({ row }) => row.original.accounts.toLocaleString(),
        enableSorting: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        accessorKey: 'transaction_count',
        header: 'Transactions',
        cell: ({ row }) => row.original.transaction_count.toLocaleString(),
        enableSorting: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        accessorKey: 'avg_transaction',
        header: 'Avg / Txn',
        cell: ({ row }) => formatNPR(row.original.avg_transaction),
        enableSorting: true, enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      },
      {
        accessorKey: 'risk',
        header: 'Risk Tier',
        cell: ({ row }) => (
          <Pill variant={row.original.risk === 1 ? 'green' : row.original.risk === 2 ? 'amber' : 'red'}>
            Tier {row.original.risk}
          </Pill>
        ),
        enableColumnFilter: true, filterFn: 'arrayFilter', meta: { filterType: 'select' },
      },
      // tran_summary derived columns (hidden by default)
      {
        id: 'vol_per_account',
        header: 'Vol / Account',
        enableSorting: true,
        sortingFn: (a, b) => (a.original.accounts > 0 ? a.original.amount / a.original.accounts : 0) - (b.original.accounts > 0 ? b.original.amount / b.original.accounts : 0),
        cell: ({ row }) => formatNPR(row.original.accounts > 0 ? row.original.amount / row.original.accounts : 0),
      },
      {
        id: 'txn_per_account',
        header: 'Txns / Account',
        enableSorting: true,
        sortingFn: (a, b) => (a.original.accounts > 0 ? a.original.transaction_count / a.original.accounts : 0) - (b.original.accounts > 0 ? b.original.transaction_count / b.original.accounts : 0),
        cell: ({ row }) => (row.original.accounts > 0 ? (row.original.transaction_count / row.original.accounts).toFixed(1) : '—'),
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
          const total = segmentData.reduce((sum, s) => sum + s.amount, 0);
          const percentage = ((row.original.amount / total) * 100).toFixed(1);
          return `${percentage}%`;
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        id: 'growth',
        header: 'Customer Share',
        cell: ({ row }) => {
          const total = segmentData.reduce((sum, segment) => sum + segment.customers, 0);
          const percentage = total > 0 ? ((row.original.customers / total) * 100).toFixed(1) : '0.0';
          return `${percentage}%`;
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
    ],
    [segmentData]
  );

  if (isLoading) {
    return (
      <>
        <TopBar
          title="Customer & Portfolio"
          period={period}
          onPeriodChange={handlePeriodChange}
          customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
          onCustomRangeChange={handleCustomRangeChange}
          minDate={filterStats?.date_range?.min || undefined}
          maxDate={filterStats?.date_range?.max || undefined}
          onToggleFilters={() => setFiltersOpen((current) => !current)}
          filtersOpen={filtersOpen}
        />
        <CustomerDashboardSkeleton />
      </>
    );
  }
  
  return (
    <>
      <TopBar
          title="Customer & Portfolio"
          subtitle="Customer segmentation & portfolio analysis"
          period={period}
          onPeriodChange={handlePeriodChange}
          customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
          onCustomRangeChange={handleCustomRangeChange}
          minDate={filterStats?.date_range?.min || undefined}
          maxDate={filterStats?.date_range?.max || undefined}
          onToggleFilters={() => setFiltersOpen((current) => !current)}
          filtersOpen={filtersOpen}
        />
        
        <div className="flex flex-col gap-4 p-6">
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
              value={riskTierData[2]?.count.toLocaleString()}
              subtitle="Tier 3"
              iconBg="var(--accent-red-dim)"
            />
          </div>
          
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard
              title="Customer Segmentation"
              subtitle="Volume and customer count by segment"
              legend={
                <>
                  <ChartLegendItem color="#3b82f6" label="Portfolio Value" />
                  <ChartLegendItem color="#10b981" label="Customers" />
                </>
              }
            >
              {segmentData.length === 0 ? (
                <ChartEmptyState title="No segment data" />
              ) : (
                <PremiumComposedChart
                  data={segmentData}
                  xAxisKey="segment"
                  bars={[{ dataKey: 'amount', name: 'Portfolio Value', color: '#3b82f6', yAxisIndex: 0 }]}
                  lines={[{ dataKey: 'customers', name: 'Customers', color: '#10b981', yAxisIndex: 1 }]}
                  formatValue={formatNPR}
                  rightFormatValue={(v) => v.toLocaleString()}
                  showDots={true}
                  height={260}
                />
              )}
            </ChartCard>
            
            <ChartCard
              title="Risk Tier Distribution"
              subtitle="Portfolio exposure by risk tier"
            >
              {riskTierData.length === 0 ? (
                <ChartEmptyState title="No risk tier data" />
              ) : (
                <PremiumBarChart
                  data={riskTierData}
                  xAxisKey="tier"
                  series={[{ dataKey: 'amount', name: 'Portfolio Value', color: '#8b5cf6' }]}
                  formatValue={formatNPR}
                  height={260}
                />
              )}
            </ChartCard>
          </div>
          
          {/* Segment Performance Table with TanStack */}
          <AdvancedDataTable
            title="Segment Performance"
            subtitle="Detailed segment metrics with filters"
            data={segmentData}
            columns={segmentColumns}
            pageSize={10}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={false}
          />
          
          {/* Top Customers Table with TanStack */}
          <AdvancedDataTable
            title="Top Customers by Portfolio Value"
            subtitle={`${customerRows.length} high-value customers · Click CIF/name for full detail`}
            data={customerRows}
            columns={customerColumns}
            pageSize={20}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={true}
            initialHidden={{ vol_per_account: true, txn_per_account: true }}
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
