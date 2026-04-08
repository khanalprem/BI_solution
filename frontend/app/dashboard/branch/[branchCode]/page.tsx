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
import { useBranchPerformance, useChannelBreakdown, useDailyTrend, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatChannelLabel, formatNPR, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const { data, isLoading } = useBranchPerformance(filters);
  const { data: trendData } = useDailyTrend(filters);
  const { data: channelData } = useChannelBreakdown(filters);

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

  if (isLoading) {
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
        <div className="p-6 text-text-secondary">Loading...</div>
      </>
    );
  }

  const branch = data?.branches?.[0];
  const province = branch?.province || '-';
  const totalAmount = data?.total_amount || 0;
  const totalCount = data?.total_count || 0;
  const totalAccounts = data?.unique_accounts || 0;
  const avgTxn = totalCount > 0 ? totalAmount / totalCount : 0;

  return (
    <>
      <TopBar
        title={branchCode}
        subtitle="Branch Detail"
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
            <Pill variant="green">Active</Pill>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <KPICard label="Total Amount" value={formatNPR(totalAmount)} iconBg="var(--accent-blue-dim)" />
            <KPICard label="Transactions" value={totalCount.toLocaleString()} iconBg="var(--accent-green-dim)" />
            <KPICard label="Accounts" value={totalAccounts.toLocaleString()} iconBg="var(--accent-teal-dim)" />
            <KPICard label="Avg / Txn" value={formatNPR(avgTxn)} iconBg="var(--accent-purple-dim)" />
            <KPICard label="Province" value={province} iconBg="var(--accent-amber-dim)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard title="Daily Trend" subtitle="Branch amount by date">
              {!trendData || trendData.length === 0 ? (
                <ChartEmptyState title="No branch trend data" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={trendData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={(value) => String(value).slice(5)} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={(value) => formatNPR(value)} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [formatNPR(value), 'Amount']}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Channel Distribution" subtitle="Branch channels by amount">
              {!channelData || channelData.length === 0 ? (
                <ChartEmptyState title="No channel data" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={channelData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="channel" stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={(value) => formatChannelLabel(String(value))} />
                    <YAxis stroke="var(--text-muted)" tick={{ fontSize: 9 }} tickFormatter={(value) => formatNPR(value)} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [formatNPR(value), 'Amount']}
                      labelFormatter={(value) => formatChannelLabel(String(value))}
                    />
                    <Bar dataKey="total_amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

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
                  <TableCell>Cluster</TableCell>
                  <TableCell>{Array.isArray(filters.cluster) ? filters.cluster.join(', ') : filters.cluster || 'Not classified in current data set'}</TableCell>
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
              </TableBody>
            </Table>
        </DataTable>
      </div>
    </>
  );
}
