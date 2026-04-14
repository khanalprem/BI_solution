'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { PremiumBarChart, PremiumDonutChart, PremiumLineChart } from '@/components/ui/PremiumCharts';
import { PlaceholderBanner, PlaceholderPanel } from '@/components/ui/PlaceholderPanel';
import { formatNPR, formatPercent } from '@/lib/formatters';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';

/**
 * Deposit Portfolio dashboard.
 *
 * Illustrative sample data until the deposit master + daily cost-of-funds feed
 * are wired. Nepal commercial-bank sector averages used for plausibility:
 * CASA ~40%, weighted cost of deposits ~6-7%, deposit mix dominated by fixed.
 */

// Nepal commercial-bank deposit mix (approximate sector shares).
const SAMPLE_MIX = [
  { name: 'Fixed',   value: 52, fill: '#6366F1' },
  { name: 'Savings', value: 30, fill: '#10B981' },
  { name: 'Current', value: 10, fill: '#14B8A6' },
  { name: 'Call',    value: 5,  fill: '#F59E0B' },
  { name: 'Margin',  value: 3,  fill: '#8B5CF6' },
];

// Monthly cost-of-funds (weighted average rate on deposits).
const SAMPLE_COF_TREND = Array.from({ length: 12 }).map((_, i) => ({
  month: `M${String(i + 1).padStart(2, '0')}`,
  cof: 5.8 + Math.sin(i / 2) * 0.6 + i * 0.02,
}));

type DepositorRow = {
  cif_id: string;
  name: string;
  product: string;
  balance: number;
  share_pct: number;
};

const SAMPLE_TOP_DEPOSITORS: DepositorRow[] = [
  { cif_id: 'C-12034', name: 'Everest Trading Pvt Ltd',     product: 'Call',    balance: 840_00_00_000,  share_pct: 2.1 },
  { cif_id: 'C-10921', name: 'Himalaya Industries',          product: 'Fixed',   balance: 620_00_00_000,  share_pct: 1.6 },
  { cif_id: 'C-15673', name: 'Prabhu Holdings',              product: 'Fixed',   balance: 540_00_00_000,  share_pct: 1.4 },
  { cif_id: 'C-18442', name: 'Kathmandu Metro Authority',    product: 'Current', balance: 480_00_00_000,  share_pct: 1.2 },
  { cif_id: 'C-21208', name: 'Nepal Telecom Treasury',       product: 'Call',    balance: 410_00_00_000,  share_pct: 1.0 },
  { cif_id: 'C-25119', name: 'Vishal Bazaar Group',          product: 'Fixed',   balance: 360_00_00_000,  share_pct: 0.9 },
  { cif_id: 'C-27884', name: 'Manakamana Cement',            product: 'Savings', balance: 300_00_00_000,  share_pct: 0.8 },
  { cif_id: 'C-31422', name: 'Buddha Air Pvt Ltd',           product: 'Current', balance: 280_00_00_000,  share_pct: 0.7 },
  { cif_id: 'C-33980', name: 'Chaudhary Group',              product: 'Fixed',   balance: 260_00_00_000,  share_pct: 0.7 },
  { cif_id: 'C-36517', name: 'Surya Nepal Pvt Ltd',          product: 'Fixed',   balance: 240_00_00_000,  share_pct: 0.6 },
];

// Deposit retention rate by month.
const SAMPLE_RETENTION = Array.from({ length: 12 }).map((_, i) => ({
  month: `M${String(i + 1).padStart(2, '0')}`,
  retained: 92 + Math.cos(i / 3) * 2 + (i > 8 ? -1 : 0),
  new_deposits: 180_000_00_000 + i * 4_000_00_000,
}));

export default function DepositsDashboard() {
  const { filters, setFilters, filtersOpen, setFiltersOpen, handleClearFilters, topBarProps } = useDashboardPage();

  const depositorColumns = useMemo<ColumnDef<DepositorRow>[]>(() => [
    {
      accessorKey: 'cif_id',
      header: 'CIF',
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.cif_id}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Customer',
      enableColumnFilter: true,
      meta: { filterType: 'text' },
      cell: ({ row }) => <span className="font-medium text-text-primary">{row.original.name}</span>,
    },
    {
      accessorKey: 'product',
      header: 'Product',
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
    },
    {
      accessorKey: 'balance',
      header: 'Balance',
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => <span className="font-mono text-xs">{formatNPR(row.original.balance)}</span>,
    },
    {
      accessorKey: 'share_pct',
      header: '% of Book',
      enableSorting: true,
      cell: ({ row }) => <span className="font-mono text-xs text-accent-blue">{formatPercent(row.original.share_pct)}</span>,
    },
  ], []);

  // Headline numbers.
  const totalDeposits = 395_00_00_00_000;
  const casaRatio = 40; // Current + Savings share
  const cofLatest = SAMPLE_COF_TREND[SAMPLE_COF_TREND.length - 1].cof;
  const avgRetention = SAMPLE_RETENTION.reduce((s, r) => s + r.retained, 0) / SAMPLE_RETENTION.length;
  const fixedShare = SAMPLE_MIX.find((m) => m.name === 'Fixed')?.value || 0;

  return (
    <>
      <TopBar title="Deposit Portfolio" subtitle="Deposit mix · cost of funds · top depositors · retention" {...topBarProps} />
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        <PlaceholderBanner
          message="Deposit master and daily cost-of-funds feed not yet integrated."
          hint="Numbers below use sector-average Nepal commercial-bank shares (CASA 40%, WACD ~6%) for layout preview."
        />

        {/* Headline KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard label="Total Deposits" value={formatNPR(totalDeposits)} iconBg="var(--accent-blue-dim)" />
          <KPICard label="CASA Ratio" value={formatPercent(casaRatio)} iconBg="var(--accent-green-dim)" subtitle="Current + Savings" />
          <KPICard label="Fixed Share" value={formatPercent(fixedShare)} iconBg="var(--accent-purple-dim)" subtitle="Stable funding" />
          <KPICard label="Cost of Funds" value={formatPercent(cofLatest)} iconBg="var(--accent-amber-dim)" subtitle="Weighted average" />
          <KPICard label="Avg Retention (12M)" value={formatPercent(avgRetention)} iconBg="var(--accent-teal-dim)" subtitle="Rollover + renewal" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Deposit Mix" subtitle="Share of total deposits by product">
            <PremiumDonutChart
              data={SAMPLE_MIX}
              formatValue={(v) => `${v}%`}
              height={260}
              centerLabel="CASA"
              centerValue={`${casaRatio}%`}
            />
          </ChartCard>
          <ChartCard title="Cost of Funds Trend" subtitle="Weighted average rate on deposits">
            <PremiumLineChart
              data={SAMPLE_COF_TREND}
              xAxisKey="month"
              series={[{ dataKey: 'cof', name: 'COF %', color: '#F59E0B' }]}
              formatValue={(v) => `${v.toFixed(2)}%`}
              height={260}
            />
          </ChartCard>
          <ChartCard title="Deposit Retention" subtitle="% of balances retained month-over-month">
            <PremiumLineChart
              data={SAMPLE_RETENTION}
              xAxisKey="month"
              series={[{ dataKey: 'retained', name: 'Retention %', color: '#10B981' }]}
              formatValue={(v) => `${v.toFixed(1)}%`}
              height={260}
            />
          </ChartCard>
        </div>

        {/* Top depositors */}
        <AdvancedDataTable
          title="Top 10 Depositors"
          subtitle="Concentration view · sample data"
          data={SAMPLE_TOP_DEPOSITORS}
          columns={depositorColumns}
          pageSize={10}
          enableFiltering={true}
          enableSorting={true}
          enablePagination={false}
        />

        {/* Awaiting-integration panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PlaceholderPanel
            title="Maturity Ladder"
            subtitle="Fixed-deposit rollover schedule"
            status="Awaiting integration"
            statusTone="amber"
            message="No FD maturity calendar connected."
            hint="Expected inputs: FD maturity dates, interest-rate book, rollover intent."
            icon="📅"
          />
          <PlaceholderPanel
            title="Customer Deposit Trajectory"
            subtitle="Inflow vs outflow per CIF"
            status="Awaiting integration"
            statusTone="amber"
            message="No daily customer-balance snapshot connected."
            hint="Expected inputs: EOD balances per CIF + product, daily net flow."
            icon="📈"
          />
        </div>
      </div>
    </>
  );
}
