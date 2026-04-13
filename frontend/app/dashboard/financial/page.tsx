'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard, ChartLegendItem } from '@/components/ui/ChartCard';
import { useFinancialSummary } from '@/lib/hooks/useDashboardData';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';
import { formatNPR, formatPercent } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { PremiumLineChart, PremiumBarChart } from '@/components/ui/PremiumCharts';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';

export default function FinancialDashboard() {
  const {
    filters, setFilters, filtersOpen, setFiltersOpen,
    filterStats, handleClearFilters, topBarProps,
  } = useDashboardPage();

  const { data, isLoading } = useFinancialSummary(filters);

  const creditRatio = data?.credit_ratio ?? 0;
  const netFlow = data?.net_flow ?? 0;
  const creditAmount = data?.credit_amount ?? 0;
  const debitAmount = data?.debit_amount ?? 0;
  const totalAmount = data?.total_amount ?? 0;
  const avgCredit = data?.avg_credit ?? 0;
  const avgDebit = data?.avg_debit ?? 0;
  const monthlyTrend = data?.monthly_trend ?? [];
  const byGl = useMemo(() => data?.by_gl ?? [], [data?.by_gl]);

  // Separate CR and DR GL entries
  const glCr = useMemo(() => byGl.filter((g) => g.type === 'CR').slice(0, 8), [byGl]);
  const glDr = useMemo(() => byGl.filter((g) => g.type === 'DR').slice(0, 8), [byGl]);

  type GlRow = { gl_code: string; gl_desc?: string; type: string; amount: number; count: number };
  const glColumns = useMemo<ColumnDef<GlRow>[]>(() => [
    {
      accessorKey: 'gl_code',
      header: 'GL Code',
      enableColumnFilter: true,
      cell: ({ row }) => <span className="font-mono text-[11px] text-text-primary">{row.original.gl_code}</span>,
    },
    {
      accessorKey: 'gl_desc',
      header: 'GL Description',
      enableColumnFilter: true,
      cell: ({ row }) => <span className="text-text-secondary">{row.original.gl_desc || '—'}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
      cell: ({ row }) => (
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${row.original.type === 'CR' ? 'bg-accent-green-dim text-accent-green' : 'bg-accent-red-dim text-accent-red'}`}>
          {row.original.type}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount (NPR)',
      enableSorting: true,
      sortDescFirst: true,
      enableColumnFilter: true,
      filterFn: 'numberRange',
      meta: { filterType: 'number-range' },
      cell: ({ row }) => <strong className="font-mono text-[11px]">{formatNPR(row.original.amount)}</strong>,
    },
    {
      accessorKey: 'count',
      header: 'Transactions',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'numberRange',
      meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.count.toLocaleString(),
    },
    {
      id: 'avg_amount',
      header: 'Avg Amount',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.count > 0 ? a.original.amount / a.original.count : 0) - (b.original.count > 0 ? b.original.amount / b.original.count : 0),
      cell: ({ row }) => formatNPR(row.original.count > 0 ? row.original.amount / row.original.count : 0),
    },
    {
      id: 'share',
      header: '% of Total',
      cell: ({ row }) => {
        const total = byGl.reduce((s, g) => s + g.amount, 0);
        return total > 0 ? `${((row.original.amount / total) * 100).toFixed(1)}%` : '—';
      },
    },
  ], [byGl]);

  if (isLoading) {
    return (
      <>
        <TopBar title="Financial Summary" subtitle="Credit, debit & net flow analysis" {...topBarProps} />
        <StandardDashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Financial Summary"
        subtitle="Credit, debit & net flow analysis"
        {...topBarProps}
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <KPICard label="Total Volume" value={formatNPR(totalAmount)} highlighted iconBg="var(--accent-blue-dim)" sparkData={monthlyTrend.map(m => m.credit + m.debit)} />
          <KPICard label="Credit Inflow (CR)" value={formatNPR(creditAmount)} iconBg="var(--accent-green-dim)" sparkData={monthlyTrend.map(m => m.credit)} />
          <KPICard label="Debit Outflow (DR)" value={formatNPR(debitAmount)} iconBg="var(--accent-red-dim)" sparkData={monthlyTrend.map(m => m.debit)} />
          <KPICard
            label="Net Flow"
            value={formatNPR(netFlow)}
            subtitle={netFlow >= 0 ? 'Net positive' : 'Net negative'}
            iconBg={netFlow >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'}
            sparkData={monthlyTrend.map(m => m.net)}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <KPICard label="Credit Ratio" value={formatPercent(creditRatio)} subtitle="% of total volume" iconBg="var(--accent-purple-dim)" />
          <KPICard label="Avg Credit Txn" value={formatNPR(avgCredit)} iconBg="var(--accent-teal-dim)" />
          <KPICard label="Avg Debit Txn" value={formatNPR(avgDebit)} iconBg="var(--accent-amber-dim)" />
          <KPICard label="CR Transactions" value={(data?.credit_count ?? 0).toLocaleString()} subtitle={`${(data?.debit_count ?? 0).toLocaleString()} DR`} iconBg="var(--accent-blue-dim)" />
        </div>

        {/* Monthly Trend */}
        <ChartCard
          title="Monthly Credit vs Debit Trend"
          subtitle="Month-over-month inflow and outflow"
          legend={
            <>
              <ChartLegendItem color="#0ea5e9" label="Credit (CR)" />
              <ChartLegendItem color="#f43f5e" label="Debit (DR)" />
              <ChartLegendItem color="#a78bfa" label="Net Flow" />
            </>
          }
        >
          <PremiumLineChart
            data={monthlyTrend}
            xAxisKey="month"
            series={[
              { dataKey: 'credit', name: 'Credit (CR)', color: '#0ea5e9' },
              { dataKey: 'debit',  name: 'Debit (DR)',  color: '#f43f5e' },
              { dataKey: 'net',    name: 'Net Flow',    color: '#a78bfa', dashed: true },
            ]}
            formatValue={formatNPR}
            referenceLine={0}
            height={280}
          />
        </ChartCard>

        {/* Monthly bar chart */}
        <ChartCard title="Monthly Volume Bar Chart" subtitle="Credit and debit volumes by month">
          <PremiumBarChart
            data={monthlyTrend}
            xAxisKey="month"
            series={[
              { dataKey: 'credit', name: 'Credit (CR)', color: '#0ea5e9' },
              { dataKey: 'debit',  name: 'Debit (DR)',  color: '#f43f5e' },
            ]}
            formatValue={formatNPR}
            height={260}
          />
        </ChartCard>

        {/* GL Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Top GL Codes — Credit (CR)" subtitle="Largest inflow GL sub-heads">
            <PremiumBarChart
              data={glCr}
              xAxisKey="gl_code"
              series={[{ dataKey: 'amount', name: 'Amount', color: '#0ea5e9' }]}
              layout="horizontal"
              formatValue={formatNPR}
              yAxisWidth={70}
              height={260}
            />
          </ChartCard>

          <ChartCard title="Top GL Codes — Debit (DR)" subtitle="Largest outflow GL sub-heads">
            <PremiumBarChart
              data={glDr}
              xAxisKey="gl_code"
              series={[{ dataKey: 'amount', name: 'Amount', color: '#f43f5e' }]}
              layout="horizontal"
              formatValue={formatNPR}
              yAxisWidth={70}
              height={260}
            />
          </ChartCard>
        </div>

        {/* GL detail table */}
        {byGl.length > 0 && (
          <AdvancedDataTable
            title="GL Sub-Head Breakdown"
            subtitle="All GL codes with CR/DR split — use Columns to show/hide fields"
            data={byGl as GlRow[]}
            columns={glColumns}
            pageSize={10}
            initialHidden={{ avg_amount: true, share: true }}
          />
        )}
      </div>
    </>
  );
}
