'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard, ChartEmptyState } from '@/components/ui/ChartCard';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { Pill } from '@/components/ui/Pill';
import { useProductionExplorer, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatChannelLabel, formatNPR, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { BranchDashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { PremiumBarChart } from '@/components/ui/PremiumCharts';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

export default function BranchDetailPage() {
  const params = useParams<{ branchCode: string }>();
  const branchCode = decodeURIComponent(params.branchCode);

  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({
    ...getDateRange('ALL'),
    branchCode,
  });

  const { data: filterStats } = useFilterStatistics();

  // 1. Branch Core Metrics
  const { data: branchSummary, isLoading: loadingSummary } = useProductionExplorer(
    filters,
    'gam_branch',
    ['total_amount', 'transaction_count', 'unique_accounts', 'credit_amount', 'debit_amount', 'net_flow'],
    1,
    1
  );

  // 2. Daily Trend
  const { data: trendDataRaw, isLoading: loadingTrend } = useProductionExplorer(
    filters,
    'tran_date',
    ['total_amount'],
    1,
    100
  );

  // 3. Channel Distribution
  const { data: channelDataRaw, isLoading: loadingChannel } = useProductionExplorer(
    filters,
    'tran_source',
    ['total_amount'],
    1,
    20
  );

  // 4. GL Breakdown (For Loans vs Deposits mapping / Portfolio structure)
  const { data: glBreakdownRaw, isLoading: loadingGL } = useProductionExplorer(
    filters,
    'gl_sub_head_code',
    ['credit_amount', 'debit_amount', 'net_flow'],
    1,
    15
  );

  const isLoading = loadingSummary || loadingTrend || loadingChannel || loadingGL;

  const referenceDate = useMemo(() => {
    return parseISODateToLocal(filterStats?.date_range?.max) || new Date();
  }, [filterStats?.date_range?.max]);

  const minReferenceDate = useMemo(() => (
    parseISODateToLocal(filterStats?.date_range?.min)
  ), [filterStats?.date_range?.min]);

  useEffect(() => {
    if (period === 'CUSTOM') return;
    const dateRange = getDateRange(period, referenceDate, minReferenceDate || undefined);
    setFilters((prev) => ({ ...prev, ...dateRange, branchCode }));
  }, [period, referenceDate, minReferenceDate, branchCode]);

  const handleCustomRangeChange = (range: { startDate: string; endDate: string }) => {
    setPeriod('CUSTOM');
    setFilters((prev) => ({ ...prev, ...range, branchCode }));
  };

  const handleClearFilters = () => {
    if (period === 'CUSTOM') {
      setFilters((prev) => ({ ...prev, branchCode, startDate: prev.startDate, endDate: prev.endDate }));
      return;
    }
    setFilters({ ...getDateRange(period, referenceDate, minReferenceDate || undefined), branchCode });
  };

  if (isLoading && !branchSummary) {
    return (
      <>
        <TopBar
          title="Branch Detail"
          subtitle={branchCode}
          period={period}
          onPeriodChange={setPeriod}
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

  const branchData = branchSummary?.rows?.[0];
  const province = Array.isArray(filters.province) ? filters.province[0] : (filters.province || '-'); // We don't have gam_province in this query natively, use filter as fallback
  const totalAmount = Number(branchData?.total_amount || 0);
  const totalCount = Number(branchData?.transaction_count || 0);
  const totalAccounts = Number(branchData?.unique_accounts || 0);
  const creditAmount = Number(branchData?.credit_amount || 0);
  const debitAmount = Number(branchData?.debit_amount || 0);
  const netFlow = Number(branchData?.net_flow || 0);
  const avgTxn = totalCount > 0 ? totalAmount / totalCount : 0;

  // Transform trend data and sort chronologically
  const trendData = (trendDataRaw?.rows?.map(r => ({
    date: String(r.dimension),
    amount: Number(r.total_amount || 0)
  })) || []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Transform channels
  const channelData = channelDataRaw?.rows?.map(r => ({
    channel: String(r.dimension),
    total_amount: Number(r.total_amount || 0)
  })) || [];

  // Transform GL codes
  const glData = glBreakdownRaw?.rows?.map(r => ({
    gl_code: String(r.dimension),
    credit: Number(r.credit_amount || 0),
    debit: Number(r.debit_amount || 0),
    net: Number(r.net_flow || 0)
  })) || [];

  return (
    <>
      <TopBar
        title={branchCode}
        subtitle="Branch Detail (Production View)"
        period={period}
        onPeriodChange={setPeriod}
        customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onCustomRangeChange={handleCustomRangeChange}
        minDate={filterStats?.date_range?.min || undefined}
        maxDate={filterStats?.date_range?.max || undefined}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        filtersOpen={filtersOpen}
      />

      <div className="p-6 flex flex-col gap-4">
          <AdvancedFilters
            filters={filters}
            onChange={setFilters}
            onClear={handleClearFilters}
            advancedOpen={filtersOpen}
            onAdvancedOpenChange={setFiltersOpen}
          />
          <div className="flex items-center justify-between">
            <Link href="/dashboard/branch" className="text-xs text-accent-blue hover:underline">
              ← Back to Branch & Regional
            </Link>
            <Pill variant="green">Active • Warehouse Mode</Pill>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <KPICard label="Total Amount" value={formatNPR(totalAmount)} iconBg="var(--accent-blue-dim)" />
            <KPICard label="Transactions" value={totalCount.toLocaleString()} iconBg="var(--accent-green-dim)" />
            <KPICard label="Accounts" value={totalAccounts.toLocaleString()} iconBg="var(--accent-teal-dim)" />
            <KPICard label="Avg / Txn" value={formatNPR(avgTxn)} iconBg="var(--accent-purple-dim)" />
            <KPICard label="Branch Code" value={branchCode} iconBg="var(--bg-card)" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KPICard label="Deposits / Inflow" value={formatNPR(creditAmount)} iconBg="var(--accent-green-dim)" />
            <KPICard label="Loans / Outflow" value={formatNPR(debitAmount)} iconBg="var(--accent-red-dim)" />
            <KPICard 
              label="Net Flow (P/L Proxy)" 
              value={formatNPR(netFlow)} 
              subtitle={netFlow >= 0 ? "Net Positive" : "Net Negative"} 
              iconBg={netFlow >= 0 ? "var(--accent-green-dim)" : "var(--accent-red-dim)"} 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard title="Daily Trend" subtitle="Branch amount by date">
              {!trendData || trendData.length === 0 ? (
                <ChartEmptyState title="No branch trend data" />
              ) : (
                <PremiumBarChart
                  data={trendData}
                  xAxisKey="date"
                  series={[{ dataKey: 'amount', name: 'Amount', color: '#3b82f6' }]}
                  formatValue={formatNPR}
                  formatXAxis={(v) => v.slice(5)}
                  height={260}
                />
              )}
            </ChartCard>

            <ChartCard title="Portfolio Breakdown by GL (Top 15)" subtitle="CR (Deposits/Income) vs DR (Loans/Expense)">
              {!glData || glData.length === 0 ? (
                <ChartEmptyState title="No GL data" />
              ) : (
                <PremiumBarChart
                  data={glData}
                  xAxisKey="gl_code"
                  series={[
                    { dataKey: 'credit', name: 'Inflow (CR)', color: '#10b981' },
                    { dataKey: 'debit', name: 'Outflow (DR)', color: '#ef4444' }
                  ]}
                  formatValue={formatNPR}
                  height={260}
                />
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard title="Channel Distribution" subtitle="Branch channels by amount">
              {!channelData || channelData.length === 0 ? (
                <ChartEmptyState title="No channel data" />
              ) : (
                <PremiumBarChart
                  data={channelData}
                  xAxisKey="channel"
                  series={[{ dataKey: 'total_amount', name: 'Amount', color: '#10b981' }]}
                  formatValue={formatNPR}
                  formatXAxis={formatChannelLabel}
                  height={260}
                />
              )}
            </ChartCard>

            {/* Branch info summary card */}
            <div className="bg-bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
              <div className="text-[13px] font-semibold text-text-primary">Branch Profile</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  { label: 'Branch Code',      value: branchCode },
                  { label: 'Province',          value: province },
                  { label: 'Status',            value: 'Operational' },
                  { label: 'Active Channels',   value: `${channelData.length}` },
                  { label: 'GL Heads Active',   value: `${glData.length}` },
                  { label: 'Data Up To',        value: filterStats?.date_range?.max || '—' },
                  { label: 'Credit Ratio',      value: totalAmount > 0 ? `${((creditAmount / totalAmount) * 100).toFixed(1)}%` : '—' },
                  { label: 'Avg / Txn',         value: formatNPR(avgTxn) },
                ].map(item => (
                  <div key={item.label}>
                    <div className="text-[9.5px] font-semibold uppercase tracking-[0.4px] text-text-muted">{item.label}</div>
                    <div className="text-[12px] text-text-primary mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* GL Breakdown table — all tran_summary GL fields */}
          {glData.length > 0 && (() => {
            type GlRow = { gl_code: string; credit: number; debit: number; net: number };
            const glTotal = glData.reduce((s, r) => s + r.credit + r.debit, 0);
            const glColumns: ColumnDef<GlRow>[] = [
              {
                accessorKey: 'gl_code',
                header: 'GL Sub-Head Code',
                enableColumnFilter: true,
                cell: ({ row }) => <span className="font-mono text-[11px] text-text-primary">{row.original.gl_code}</span>,
              },
              {
                accessorKey: 'credit',
                header: 'Credit (CR)',
                enableSorting: true, sortDescFirst: true,
                enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
                cell: ({ row }) => <span className="font-mono text-[11px] text-accent-green">{formatNPR(row.original.credit)}</span>,
              },
              {
                accessorKey: 'debit',
                header: 'Debit (DR)',
                enableSorting: true, sortDescFirst: true,
                enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
                cell: ({ row }) => <span className="font-mono text-[11px] text-accent-red">{formatNPR(row.original.debit)}</span>,
              },
              {
                accessorKey: 'net',
                header: 'Net Flow',
                enableSorting: true,
                cell: ({ row }) => <span className={`font-mono text-[11px] ${row.original.net >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{formatNPR(row.original.net)}</span>,
              },
              {
                id: 'total',
                header: 'Total Volume',
                enableSorting: true,
                sortingFn: (a, b) => (a.original.credit + a.original.debit) - (b.original.credit + b.original.debit),
                cell: ({ row }) => <span className="font-mono text-[11px]">{formatNPR(row.original.credit + row.original.debit)}</span>,
              },
              {
                id: 'cr_ratio',
                header: 'CR Ratio',
                cell: ({ row }) => {
                  const tot = row.original.credit + row.original.debit;
                  return tot > 0 ? `${((row.original.credit / tot) * 100).toFixed(1)}%` : '—';
                },
              },
              {
                id: 'share',
                header: '% of Branch',
                cell: ({ row }) => {
                  const tot = row.original.credit + row.original.debit;
                  return glTotal > 0 ? `${((tot / glTotal) * 100).toFixed(1)}%` : '—';
                },
              },
            ];
            return (
              <AdvancedDataTable
                title="GL Sub-Head Breakdown"
                subtitle={`${glData.length} GL codes active in this branch — all tran_summary GL fields`}
                data={glData as GlRow[]}
                columns={glColumns}
                pageSize={15}
                enablePagination={false}
                initialHidden={{ cr_ratio: true, share: true }}
              />
            );
          })()}

          {/* Channel breakdown table */}
          {channelData.length > 0 && (() => {
            type ChanRow = { channel: string; total_amount: number };
            const chanTotal = channelData.reduce((s, c) => s + c.total_amount, 0);
            const chanColumns: ColumnDef<ChanRow>[] = [
              {
                accessorKey: 'channel',
                header: 'Channel',
                enableColumnFilter: true,
                cell: ({ row }) => <span className="capitalize font-medium text-text-primary">{formatChannelLabel(row.original.channel)}</span>,
              },
              {
                accessorKey: 'total_amount',
                header: 'Total Amount',
                enableSorting: true, sortDescFirst: true,
                cell: ({ row }) => <strong className="font-mono text-[11px]">{formatNPR(row.original.total_amount)}</strong>,
              },
              {
                id: 'share',
                header: '% of Branch',
                cell: ({ row }) => chanTotal > 0 ? `${((row.original.total_amount / chanTotal) * 100).toFixed(1)}%` : '—',
              },
            ];
            return (
              <AdvancedDataTable
                title="Channel Breakdown"
                subtitle="tran_source distribution for this branch"
                data={channelData as ChanRow[]}
                columns={chanColumns}
                pageSize={10}
                enablePagination={false}
              />
            );
          })()}
      </div>
    </>
  );
}
