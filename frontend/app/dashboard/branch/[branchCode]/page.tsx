'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard, ChartEmptyState } from '@/components/ui/ChartCard';
import { DataTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/DataTable';
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
            
            <DataTable title="Branch Information" subtitle="Contact and regulatory profile">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Field</TableHeader>
                    <TableHeader>Value</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Branch Code</TableCell>
                    <TableCell>
                      <strong className="text-text-primary">{branchCode}</strong>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Province</TableCell>
                    <TableCell>{province}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>
                      <Pill variant="green">Operational</Pill>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Last Updated</TableCell>
                    <TableCell>{filterStats?.date_range?.max || '-'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Channel Coverage</TableCell>
                    <TableCell>{(channelData || []).length} active channels</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>GL Scope</TableCell>
                    <TableCell>{(glData || []).length} unique ledger heads active</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </DataTable>
          </div>
      </div>
    </>
  );
}
