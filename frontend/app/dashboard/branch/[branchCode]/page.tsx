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
import { Calendar, Database, LayoutGrid } from 'lucide-react';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

function fmtDate(d: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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

  // Core metrics — one row per branch (limit 1 since filtered to this branch)
  const { data: branchSummary, isLoading: loadingSummary } = useProductionExplorer(
    filters, 'gam_branch',
    ['total_amount', 'transaction_count', 'unique_accounts', 'unique_customers', 'credit_amount', 'debit_amount', 'net_flow'],
    1, 1
  );

  // GL codes active in this period
  const { data: glBreakdownRaw, isLoading: loadingGL } = useProductionExplorer(
    filters, 'gl_sub_head_code',
    ['credit_amount', 'debit_amount', 'net_flow'],
    1, 100
  );

  // Daily trend
  const { data: trendDataRaw, isLoading: loadingTrend } = useProductionExplorer(
    filters, 'tran_date', ['total_amount'], 1, 100
  );

  // Channel distribution
  const { data: channelDataRaw, isLoading: loadingChannel } = useProductionExplorer(
    filters, 'tran_source', ['total_amount'], 1, 20
  );

  const isLoading = loadingSummary || loadingTrend || loadingChannel || loadingGL;

  const referenceDate = useMemo(
    () => parseISODateToLocal(filterStats?.date_range?.max) || new Date(),
    [filterStats?.date_range?.max]
  );
  const minReferenceDate = useMemo(
    () => parseISODateToLocal(filterStats?.date_range?.min) ?? undefined,
    [filterStats?.date_range?.min]
  );

  useEffect(() => {
    if (period === 'CUSTOM') return;
    const dr = getDateRange(period, referenceDate, minReferenceDate);
    setFilters((prev) => ({ ...prev, ...dr, branchCode }));
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
    setFilters({ ...getDateRange(period, referenceDate, minReferenceDate), branchCode });
  };

  const topBarProps = {
    period,
    onPeriodChange: setPeriod as (p: DashboardPeriod) => void,
    customRange: { startDate: filters.startDate, endDate: filters.endDate },
    onCustomRangeChange: handleCustomRangeChange,
    minDate: filterStats?.date_range?.min ?? undefined,
    maxDate: filterStats?.date_range?.max ?? undefined,
    onToggleFilters: () => setFiltersOpen((v) => !v),
    filtersOpen,
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const branchRow    = branchSummary?.rows?.[0];
  const totalAmount  = Number(branchRow?.total_amount       || 0);
  const totalCount   = Number(branchRow?.transaction_count  || 0);
  const totalAccounts = Number(branchRow?.unique_accounts   || 0);
  const totalCustomers = Number(branchRow?.unique_customers || 0);
  const creditAmount = Number(branchRow?.credit_amount      || 0);
  const debitAmount  = Number(branchRow?.debit_amount       || 0);
  const netFlow      = Number(branchRow?.net_flow           || 0);
  const avgTxn       = totalCount > 0 ? totalAmount / totalCount : 0;

  // total_rows from the procedure = total records in this branch for the period
  const totalRecords = branchSummary?.total_rows || 0;

  const glData = (glBreakdownRaw?.rows || []).map(r => ({
    gl_code: String(r.dimension),
    credit:  Number(r.credit_amount || 0),
    debit:   Number(r.debit_amount  || 0),
    net:     Number(r.net_flow      || 0),
  }));

  const trendData = (trendDataRaw?.rows || [])
    .map(r => ({ date: String(r.dimension), amount: Number(r.total_amount || 0) }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const channelData = (channelDataRaw?.rows || []).map(r => ({
    channel: String(r.dimension),
    total_amount: Number(r.total_amount || 0),
  }));

  if (isLoading && !branchSummary) {
    return (
      <>
        <TopBar title={branchCode} subtitle="Branch Detail · Production View" {...topBarProps} />
        <BranchDashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <TopBar title={branchCode} subtitle="Branch Detail · Production View" {...topBarProps} />

      <div className="px-5 py-4 flex flex-col gap-[14px]">

        {/* ── Back link + status — very first, above everything ── */}
        <div className="flex items-center justify-between">
          <Link href="/dashboard/branch" className="text-[11px] text-accent-blue hover:underline">
            ← Back to Branch &amp; Regional
          </Link>
          <Pill variant="green">Active · Warehouse Mode</Pill>
        </div>

        {/* ── Filters (right below back nav) ── */}
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
          hideStats
        />

        {/* ── 3 info cards — branch-specific, period-filtered ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'var(--accent-blue-dim)' }}>
              <Calendar className="w-4 h-4 text-accent-blue" />
            </div>
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-[0.5px] text-text-muted">Data Range</div>
              <div className="text-[13px] font-bold text-text-primary mt-0.5">
                {fmtDate(filters.startDate)} to {fmtDate(filters.endDate)}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">
                Records are bounded by reported transaction history.
              </div>
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'var(--accent-green-dim)' }}>
              <Database className="w-4 h-4 text-accent-green" />
            </div>
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-[0.5px] text-text-muted">Coverage</div>
              <div className="text-[13px] font-bold text-text-primary mt-0.5">
                {totalRecords.toLocaleString()} records
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">
                {totalAccounts.toLocaleString()} accounts · {totalCustomers.toLocaleString()} customers
              </div>
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'var(--accent-amber-dim)' }}>
              <LayoutGrid className="w-4 h-4 text-accent-amber" />
            </div>
            <div>
              <div className="text-[9.5px] font-bold uppercase tracking-[0.5px] text-text-muted">Dimensions</div>
              <div className="text-[13px] font-bold text-text-primary mt-0.5">
                {glData.length} GL codes · {channelData.length} channels
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">
                {trendData.length} trading days in period
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <KPICard label="Total Amount"  value={formatNPR(totalAmount)}         iconBg="var(--accent-blue-dim)"   highlighted />
          <KPICard label="Transactions"  value={totalCount.toLocaleString()}     iconBg="var(--accent-green-dim)"  />
          <KPICard label="Accounts"      value={totalAccounts.toLocaleString()}  iconBg="var(--accent-teal-dim)"   />
          <KPICard label="Avg / Txn"     value={formatNPR(avgTxn)}              iconBg="var(--accent-purple-dim)" />
          <KPICard label="Branch Code"   value={branchCode}                      iconBg="var(--bg-card)"           />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KPICard label="Deposits / Inflow" value={formatNPR(creditAmount)} iconBg="var(--accent-green-dim)" />
          <KPICard label="Loans / Outflow"   value={formatNPR(debitAmount)}  iconBg="var(--accent-red-dim)"   />
          <KPICard
            label="Net Flow (P/L Proxy)"
            value={formatNPR(netFlow)}
            subtitle={netFlow >= 0 ? 'Net Positive' : 'Net Negative'}
            iconBg={netFlow >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'}
          />
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Daily Trend" subtitle="Branch amount by date">
            {trendData.length === 0 ? <ChartEmptyState title="No branch trend data" /> : (
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

          <ChartCard title="Portfolio Breakdown by GL (Top 15)" subtitle="CR (Deposits) vs DR (Loans)">
            {glData.length === 0 ? <ChartEmptyState title="No GL data" /> : (
              <PremiumBarChart
                data={glData}
                xAxisKey="gl_code"
                series={[
                  { dataKey: 'credit', name: 'Inflow (CR)',  color: '#0ea5e9' },
                  { dataKey: 'debit',  name: 'Outflow (DR)', color: '#f43f5e' },
                ]}
                formatValue={formatNPR}
                height={260}
              />
            )}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Channel Distribution" subtitle="Branch channels by amount">
            {channelData.length === 0 ? <ChartEmptyState title="No channel data" /> : (
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

          <div className="bg-bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="text-[13px] font-semibold text-text-primary">Branch Profile</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: 'Branch Code',     value: branchCode },
                { label: 'Period',          value: period },
                { label: 'Active Channels', value: String(channelData.length) },
                { label: 'GL Heads',        value: String(glData.length) },
                { label: 'Data Up To',      value: filterStats?.date_range?.max || '—' },
                { label: 'Credit Ratio',    value: totalAmount > 0 ? `${((creditAmount / totalAmount) * 100).toFixed(1)}%` : '—' },
                { label: 'Avg / Txn',       value: formatNPR(avgTxn) },
                { label: 'Net Flow',        value: formatNPR(netFlow) },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-[9.5px] font-semibold uppercase tracking-[0.4px] text-text-muted">{item.label}</div>
                  <div className="text-[12px] text-text-primary mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── GL table ── */}
        {glData.length > 0 && (() => {
          type GlRow = { gl_code: string; credit: number; debit: number; net: number };
          const glTotal = glData.reduce((s, r) => s + r.credit + r.debit, 0);
          const glColumns: ColumnDef<GlRow>[] = [
            { accessorKey: 'gl_code', header: 'GL Sub-Head Code', enableColumnFilter: true,
              cell: ({ row }) => <span className="font-mono text-[11px] text-text-primary">{row.original.gl_code}</span> },
            { accessorKey: 'credit', header: 'Credit (CR)', enableSorting: true, sortDescFirst: true,
              enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
              cell: ({ row }) => <span className="font-mono text-[11px] text-accent-green">{formatNPR(row.original.credit)}</span> },
            { accessorKey: 'debit', header: 'Debit (DR)', enableSorting: true, sortDescFirst: true,
              enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
              cell: ({ row }) => <span className="font-mono text-[11px] text-accent-red">{formatNPR(row.original.debit)}</span> },
            { accessorKey: 'net', header: 'Net Flow', enableSorting: true,
              cell: ({ row }) => <span className={`font-mono text-[11px] ${row.original.net >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{formatNPR(row.original.net)}</span> },
            { id: 'total', header: 'Total Volume', enableSorting: true,
              sortingFn: (a, b) => (a.original.credit + a.original.debit) - (b.original.credit + b.original.debit),
              cell: ({ row }) => <span className="font-mono text-[11px]">{formatNPR(row.original.credit + row.original.debit)}</span> },
            { id: 'cr_ratio', header: 'CR Ratio',
              cell: ({ row }) => { const t = row.original.credit + row.original.debit; return t > 0 ? `${((row.original.credit / t) * 100).toFixed(1)}%` : '—'; } },
            { id: 'share', header: '% of Branch',
              cell: ({ row }) => { const t = row.original.credit + row.original.debit; return glTotal > 0 ? `${((t / glTotal) * 100).toFixed(1)}%` : '—'; } },
          ];
          return (
            <AdvancedDataTable
              title="GL Sub-Head Breakdown"
              subtitle={`${glData.length} GL codes · ${period} · ${fmtDate(filters.startDate)} → ${fmtDate(filters.endDate)}`}
              data={glData as GlRow[]}
              columns={glColumns}
              pageSize={10}
              enablePagination={true}
              initialHidden={{ cr_ratio: true, share: true }}
            />
          );
        })()}

        {/* ── Channel table ── */}
        {channelData.length > 0 && (() => {
          type ChanRow = { channel: string; total_amount: number };
          const chanTotal = channelData.reduce((s, c) => s + c.total_amount, 0);
          const chanColumns: ColumnDef<ChanRow>[] = [
            { accessorKey: 'channel', header: 'Channel', enableColumnFilter: true,
              cell: ({ row }) => <span className="capitalize font-medium text-text-primary">{formatChannelLabel(row.original.channel)}</span> },
            { accessorKey: 'total_amount', header: 'Total Amount', enableSorting: true, sortDescFirst: true,
              cell: ({ row }) => <strong className="font-mono text-[11px]">{formatNPR(row.original.total_amount)}</strong> },
            { id: 'share', header: '% of Branch',
              cell: ({ row }) => chanTotal > 0 ? `${((row.original.total_amount / chanTotal) * 100).toFixed(1)}%` : '—' },
          ];
          return (
            <AdvancedDataTable
              title="Channel Breakdown"
              subtitle={`tran_source distribution · ${period}`}
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


