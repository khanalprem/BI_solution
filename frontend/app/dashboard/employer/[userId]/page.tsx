'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, User, Building2, TrendingUp, CreditCard } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { useEmployeeDetail, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { PremiumLineChart, PremiumBarChart } from '@/components/ui/PremiumCharts';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

export default function EmployeeDetailPage() {
  const params = useParams();
  const userId = decodeURIComponent((params?.userId as string) ?? '');

  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filters, setFilters] = useState<DashboardFilters>({ ...getDateRange('ALL') });
  const { data: filterStats } = useFilterStatistics();

  const referenceDate = useMemo(
    () => parseISODateToLocal(filterStats?.date_range?.max) || new Date(),
    [filterStats?.date_range?.max]
  );
  const minReferenceDate = useMemo(
    () => parseISODateToLocal(filterStats?.date_range?.min),
    [filterStats?.date_range?.min]
  );

  useEffect(() => {
    if (period === 'CUSTOM') return;
    const dateRange = getDateRange(period, referenceDate, minReferenceDate || undefined);
    setFilters((prev) =>
      prev.startDate === dateRange.startDate && prev.endDate === dateRange.endDate
        ? prev
        : { ...prev, ...dateRange }
    );
  }, [period, referenceDate, minReferenceDate]);

  const { data, isLoading } = useEmployeeDetail(filters, userId);

  const summary = data?.summary;
  const monthlyTrend = data?.monthly_trend ?? [];
  const dailyTrend = data?.daily_trend ?? [];
  const byBranch = data?.by_branch ?? [];
  const byProduct = data?.by_product ?? [];

  type EmpBranchRow = { branch: string; province: string; amount: number; count: number; accounts: number };
  const branchColumns = useMemo<ColumnDef<EmpBranchRow>[]>(() => [
    {
      accessorKey: 'branch',
      header: 'Branch',
      enableColumnFilter: true,
      cell: ({ row }) => (
        <Link href={`/dashboard/branch/${encodeURIComponent(row.original.branch)}`} className="font-semibold text-accent-blue hover:underline">
          {row.original.branch}
        </Link>
      ),
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
      accessorKey: 'amount',
      header: 'Volume',
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => <strong className="font-mono text-[11px]">{formatNPR(row.original.amount)}</strong>,
    },
    {
      accessorKey: 'count',
      header: 'Transactions',
      enableSorting: true,
      cell: ({ row }) => row.original.count.toLocaleString(),
    },
    {
      accessorKey: 'accounts',
      header: 'Accounts',
      enableSorting: true,
      cell: ({ row }) => row.original.accounts.toLocaleString(),
    },
    {
      id: 'avg_txn',
      header: 'Avg Txn',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-[11px]">
          {row.original.count > 0 ? formatNPR(row.original.amount / row.original.count) : '—'}
        </span>
      ),
    },
  ], []);

  type ProductRow = { product: string; amount: number; count: number };
  const productColumns = useMemo<ColumnDef<ProductRow>[]>(() => [
    {
      accessorKey: 'product',
      header: 'Product',
      enableColumnFilter: true,
      cell: ({ row }) => <span className="font-medium text-text-primary">{row.original.product}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Volume',
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => <strong className="font-mono text-[11px]">{formatNPR(row.original.amount)}</strong>,
    },
    {
      accessorKey: 'count',
      header: 'Transactions',
      enableSorting: true,
      cell: ({ row }) => row.original.count.toLocaleString(),
    },
    {
      id: 'avg_txn',
      header: 'Avg Txn',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="font-mono text-[11px]">
          {row.original.count > 0 ? formatNPR(row.original.amount / row.original.count) : '—'}
        </span>
      ),
    },
  ], []);

  // Initials from user ID
  const initials = userId
    .split(/[\s._-]/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || userId.slice(0, 2).toUpperCase();

  if (isLoading) {
    return (
      <>
        <TopBar
          title={userId}
          subtitle="Employee · Transaction activity"
          period={period}
          onPeriodChange={(p) => setPeriod(p as DashboardPeriod)}
          customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
          onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }}
          minDate={filterStats?.date_range?.min || undefined}
          maxDate={filterStats?.date_range?.max || undefined}
          showFiltersButton={false}
        />
        <StandardDashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <TopBar
        title={userId}
        subtitle="Employee · Transaction activity"
        period={period}
        onPeriodChange={(p) => setPeriod(p as DashboardPeriod)}
        customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }}
        minDate={filterStats?.date_range?.min || undefined}
        maxDate={filterStats?.date_range?.max || undefined}
        showFiltersButton={false}
      />

      <div className="flex flex-col gap-4 p-6 page-enter">

        {/* ── Back + Identity header ── */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/employer"
            className="flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Staff
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
            >
              {initials}
            </div>
            <div>
              <div className="text-[14px] font-semibold font-display tracking-tight">{userId}</div>
              <div className="text-[10px] text-text-muted">Entry User · {data?.active_branches ?? 0} branch{(data?.active_branches ?? 0) !== 1 ? 'es' : ''} active</div>
            </div>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard
            label="Total Volume"
            value={formatNPR(summary?.total_amount ?? 0)}
            highlighted
            iconBg="var(--accent-blue-dim)"
            icon={<TrendingUp className="w-3.5 h-3.5" />}
          />
          <KPICard
            label="Transactions"
            value={(summary?.total_count ?? 0).toLocaleString()}
            iconBg="var(--accent-green-dim)"
            icon={<CreditCard className="w-3.5 h-3.5" />}
          />
          <KPICard
            label="Unique Accounts"
            value={(summary?.unique_accounts ?? 0).toLocaleString()}
            iconBg="var(--accent-purple-dim)"
            icon={<User className="w-3.5 h-3.5" />}
          />
          <KPICard
            label="Active Branches"
            value={(data?.active_branches ?? 0).toLocaleString()}
            iconBg="var(--accent-teal-dim)"
            icon={<Building2 className="w-3.5 h-3.5" />}
          />
        </div>

        {/* ── Secondary KPIs ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[11px] text-text-muted mb-1">Credit Volume</div>
            <div className="text-[22px] font-bold tracking-tight text-accent-green font-mono">
              {formatNPR(summary?.credit_amount ?? 0)}
            </div>
            <div className="text-[10px] text-text-muted mt-1">
              {formatPercent(summary?.credit_ratio ?? 0)} of total
            </div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[11px] text-text-muted mb-1">Debit Volume</div>
            <div className="text-[22px] font-bold tracking-tight text-accent-red font-mono">
              {formatNPR(summary?.debit_amount ?? 0)}
            </div>
            <div className="text-[10px] text-text-muted mt-1">
              {(summary?.debit_count ?? 0).toLocaleString()} debit transactions
            </div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[11px] text-text-muted mb-1">Avg Transaction Size</div>
            <div className="text-[22px] font-bold tracking-tight text-accent-amber font-mono">
              {formatNPR(summary?.avg_transaction_size ?? 0)}
            </div>
            <div className="text-[10px] text-text-muted mt-1">
              Net flow: {formatNPR(summary?.net_flow ?? 0)}
            </div>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {monthlyTrend.length > 0 && (
            <ChartCard title="Monthly Volume Trend" subtitle="Credit vs Debit by month">
              <PremiumLineChart
                data={monthlyTrend}
                xAxisKey="month"
                series={[
                  { dataKey: 'credit', name: 'Credit', color: '#10b981' },
                  { dataKey: 'debit', name: 'Debit', color: '#ef4444' },
                ]}
                formatValue={formatNPR}
                height={220}
              />
            </ChartCard>
          )}

          {byBranch.length > 0 && (
            <ChartCard title="Branch Activity" subtitle="Volume by branch handled">
              <PremiumBarChart
                data={byBranch.slice(0, 8)}
                xAxisKey="branch"
                series={[{ dataKey: 'amount', name: 'Volume', color: '#3b82f6' }]}
                layout="horizontal"
                formatValue={formatNPR}
                yAxisWidth={80}
                height={220}
              />
            </ChartCard>
          )}
        </div>

        {dailyTrend.length > 0 && (
          <ChartCard title="Daily Activity" subtitle="Transaction volume per day">
            <PremiumLineChart
              data={dailyTrend}
              xAxisKey="date"
              series={[{ dataKey: 'amount', name: 'Volume', color: '#8b5cf6' }]}
              formatValue={formatNPR}
              height={200}
            />
          </ChartCard>
        )}

        {/* ── Branch detail table ── */}
        {byBranch.length > 0 && (
          <AdvancedDataTable
            title="Branch Breakdown"
            subtitle={`${byBranch.length} branch${byBranch.length !== 1 ? 'es' : ''} active`}
            data={byBranch as EmpBranchRow[]}
            columns={branchColumns}
            pageSize={10}
          />
        )}

        {/* ── Product breakdown table ── */}
        {byProduct.length > 0 && (
          <AdvancedDataTable
            title="Product Breakdown"
            subtitle="Transaction volume by product type"
            data={byProduct as ProductRow[]}
            columns={productColumns}
            pageSize={10}
            enablePagination={false}
          />
        )}
      </div>
    </>
  );
}
