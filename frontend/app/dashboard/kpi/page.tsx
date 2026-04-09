'use client';

import { useState, useMemo, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { useKpiSummary, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { PremiumBarChart } from '@/components/ui/PremiumCharts';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';

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

  type QuarterRow = { period: string; amount: number; count: number; accounts: number };
  const quarterColumns = useMemo<ColumnDef<QuarterRow>[]>(() => [
    { accessorKey: 'period', header: 'Period', enableColumnFilter: true, cell: ({ row }) => <strong className="text-text-primary">{row.original.period}</strong> },
    {
      accessorKey: 'amount',
      header: 'Volume',
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => <strong className="font-mono text-[11px]">{formatNPR(row.original.amount)}</strong>,
    },
    { accessorKey: 'count', header: 'Transactions', enableSorting: true, cell: ({ row }) => row.original.count.toLocaleString() },
    { accessorKey: 'accounts', header: 'Accounts', enableSorting: true, cell: ({ row }) => row.original.accounts.toLocaleString() },
    {
      id: 'avg_txn',
      header: 'Avg Txn',
      enableSorting: false,
      cell: ({ row }) => <span className="font-mono text-[11px]">{row.original.count > 0 ? formatNPR(row.original.amount / row.original.count) : '—'}</span>,
    },
  ], []);

  if (isLoading) {
    return (
      <>
        <TopBar title="KPI Summary" subtitle="Key performance indicators & metrics" period={period} onPeriodChange={(p) => setPeriod(p as DashboardPeriod)} customRange={{ startDate: filters.startDate, endDate: filters.endDate }} onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }} minDate={filterStats?.date_range?.min || undefined} maxDate={filterStats?.date_range?.max || undefined} />
        <StandardDashboardSkeleton />
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
            <PremiumBarChart
              data={byQuarter}
              xAxisKey="period"
              series={[{ dataKey: 'amount', name: 'Volume' }]}
              itemColors={QUARTER_COLORS}
              formatValue={formatNPR}
              height={260}
            />
          </ChartCard>
        )}

        {/* Product & Service Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {byProduct.length > 0 && (
            <ChartCard title="Volume by Product" subtitle="Transaction volume per product type">
              <PremiumBarChart
                data={byProduct.slice(0, 10)}
                xAxisKey="product"
                series={[{ dataKey: 'amount', name: 'Amount', color: '#3b82f6' }]}
                layout="horizontal"
                formatValue={formatNPR}
                yAxisWidth={100}
                height={260}
              />
            </ChartCard>
          )}

          {byService.length > 0 && (
            <ChartCard title="Volume by Service" subtitle="Transaction volume per service type">
              <PremiumBarChart
                data={byService.slice(0, 10)}
                xAxisKey="service"
                series={[{ dataKey: 'amount', name: 'Amount', color: '#10b981' }]}
                layout="horizontal"
                formatValue={formatNPR}
                yAxisWidth={100}
                height={260}
              />
            </ChartCard>
          )}
        </div>

        {/* Quarterly detail table */}
        {byQuarter.length > 0 && (
          <AdvancedDataTable
            title="Quarterly Breakdown"
            subtitle="Volume, transactions, and accounts per quarter"
            data={byQuarter as QuarterRow[]}
            columns={quarterColumns}
            pageSize={10}
            enablePagination={false}
          />
        )}
      </div>
    </>
  );
}
