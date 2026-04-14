'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { PremiumBarChart, PremiumDonutChart } from '@/components/ui/PremiumCharts';
import { PlaceholderBanner, PlaceholderPanel } from '@/components/ui/PlaceholderPanel';
import { Badge, badgeColor } from '@/components/ui/badge';
import { formatNPR, formatPercent } from '@/lib/formatters';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';

/**
 * Loan Portfolio dashboard.
 *
 * The data shown here is illustrative — the production system does not yet
 * expose a loan master / NRB classification feed. Sample numbers are derived
 * from plausible Nepal commercial-bank ratios (NPL ~4.4%, LDR ~85%) so the
 * visuals feel realistic. When the loan master API lands, replace the
 * SAMPLE_* constants + placeholder panels with live fetches.
 */

// NRB-aligned loan classification. 5 standard buckets with sector-avg weights.
const SAMPLE_CLASSIFICATION = [
  { name: 'Pass',         value: 95.56, fill: '#10B981', min_provision: 1 },
  { name: 'Watchlist',    value: 1.40,  fill: '#14B8A6', min_provision: 5 },
  { name: 'Substandard',  value: 1.20,  fill: '#F59E0B', min_provision: 25 },
  { name: 'Doubtful',     value: 1.04,  fill: '#F97316', min_provision: 50 },
  { name: 'Loss',         value: 0.80,  fill: '#F43F5E', min_provision: 100 },
];

// Sample sector concentration (Nepal central-bank industry split).
const SAMPLE_SECTOR = [
  { sector: 'Wholesale & Retail',   amount: 28,   accounts: 12450 },
  { sector: 'Construction',         amount: 19,   accounts: 4210 },
  { sector: 'Agriculture',          amount: 13,   accounts: 18340 },
  { sector: 'Manufacturing',        amount: 11,   accounts: 3120 },
  { sector: 'Hotels & Tourism',     amount: 8,    accounts: 1850 },
  { sector: 'Transport & Logistics', amount: 6,   accounts: 2230 },
  { sector: 'Real Estate',          amount: 5,    accounts: 960 },
  { sector: 'Services',             amount: 5,    accounts: 2410 },
  { sector: 'Consumption',          amount: 3,    accounts: 22410 },
  { sector: 'Others',               amount: 2,    accounts: 1120 },
];

// Debt-to-Income band distribution.
const SAMPLE_DTI = [
  { band: '< 30%',   customers: 18240, color: '#10B981' },
  { band: '30-50%',  customers: 12450, color: '#14B8A6' },
  { band: '50-70%',  customers: 5320,  color: '#F59E0B' },
  { band: '70-90%',  customers: 1840,  color: '#F97316' },
  { band: '≥ 90%',   customers: 520,   color: '#F43F5E' },
];

type LoanTopRow = {
  branch_code: string;
  outstanding: number;
  npl_ratio: number;
  watchlist_ratio: number;
  provisioning: number;
};

const SAMPLE_TOP_BRANCHES: LoanTopRow[] = [
  { branch_code: 'branch 3',  outstanding: 5200_00_000,  npl_ratio: 4.1, watchlist_ratio: 1.2, provisioning: 84_50_000 },
  { branch_code: 'branch 35', outstanding: 4650_00_000,  npl_ratio: 3.6, watchlist_ratio: 0.9, provisioning: 72_10_000 },
  { branch_code: 'branch 40', outstanding: 4310_00_000,  npl_ratio: 5.2, watchlist_ratio: 1.8, provisioning: 96_80_000 },
  { branch_code: 'branch 12', outstanding: 3890_00_000,  npl_ratio: 2.9, watchlist_ratio: 1.1, provisioning: 51_20_000 },
  { branch_code: 'branch 7',  outstanding: 3720_00_000,  npl_ratio: 6.8, watchlist_ratio: 2.4, provisioning: 121_40_000 },
  { branch_code: 'branch 28', outstanding: 3410_00_000,  npl_ratio: 3.4, watchlist_ratio: 1.0, provisioning: 58_80_000 },
  { branch_code: 'branch 52', outstanding: 3150_00_000,  npl_ratio: 4.7, watchlist_ratio: 1.5, provisioning: 78_90_000 },
  { branch_code: 'branch 46', outstanding: 2980_00_000,  npl_ratio: 3.1, watchlist_ratio: 0.8, provisioning: 42_60_000 },
];

// NRB thresholds (Basel III / NRB Directives).
const NRB_NPL_ALERT = 5.0; // sector avg ~4.44% (Mid-July 2025)

export default function LoansDashboard() {
  const { filters, setFilters, filtersOpen, setFiltersOpen, handleClearFilters, topBarProps } = useDashboardPage();

  const topBranchColumns = useMemo<ColumnDef<LoanTopRow>[]>(() => [
    {
      accessorKey: 'branch_code',
      header: 'Branch',
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
      cell: ({ row }) => <span className="font-medium text-text-primary">{row.original.branch_code}</span>,
    },
    {
      accessorKey: 'outstanding',
      header: 'Outstanding',
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => <span className="font-mono text-xs">{formatNPR(row.original.outstanding)}</span>,
    },
    {
      accessorKey: 'npl_ratio',
      header: 'NPL Ratio',
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => {
        const v = row.original.npl_ratio;
        const color = v >= NRB_NPL_ALERT ? 'red' : v >= 4 ? 'amber' : 'green';
        return <Badge className={badgeColor[color]}>{formatPercent(v)}</Badge>;
      },
    },
    {
      accessorKey: 'watchlist_ratio',
      header: 'Watchlist',
      enableSorting: true,
      cell: ({ row }) => <span className="font-mono text-xs text-accent-amber">{formatPercent(row.original.watchlist_ratio)}</span>,
    },
    {
      accessorKey: 'provisioning',
      header: 'Provision Held',
      enableSorting: true,
      cell: ({ row }) => <span className="font-mono text-xs">{formatNPR(row.original.provisioning)}</span>,
    },
  ], []);

  // Aggregate sample numbers into headline KPIs.
  const totalOutstanding = 112_000_00_00_000;
  const nplPortfolioPct = 4.44; // sector avg
  const netNplPct = 1.05;
  const grossNplAmount = totalOutstanding * (nplPortfolioPct / 100);
  const ldr = 85.2;
  const provisionCoverage = 68.5;

  return (
    <>
      <TopBar title="Loan Portfolio" subtitle="NRB-aligned loan book health · classification · concentration" {...topBarProps} />
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        <PlaceholderBanner
          message="Loan master and NRB classification feed not yet integrated."
          hint="Numbers below use sector-average Nepal commercial-bank ratios (NPL 4.44%, LDR 85%, etc.) for layout preview."
        />

        {/* Headline KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard label="Outstanding Loans" value={formatNPR(totalOutstanding)} iconBg="var(--accent-blue-dim)" />
          <KPICard label="Gross NPL" value={formatNPR(grossNplAmount)} iconBg="var(--accent-red-dim)" subtitle={formatPercent(nplPortfolioPct)} />
          <KPICard label="Net NPL" value={formatPercent(netNplPct)} iconBg="var(--accent-amber-dim)" subtitle="After provisioning" />
          <KPICard label="LDR" value={formatPercent(ldr)} iconBg="var(--accent-teal-dim)" subtitle="NRB cap: 90%" />
          <KPICard label="Provision Coverage" value={formatPercent(provisionCoverage)} iconBg="var(--accent-green-dim)" subtitle="Required: 100% of NPL" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Loan Classification" subtitle="Share of portfolio (NRB 5-bucket)">
            <PremiumDonutChart
              data={SAMPLE_CLASSIFICATION}
              formatValue={(v) => `${v.toFixed(2)}%`}
              height={260}
              centerLabel="Pass"
              centerValue="95.56%"
            />
          </ChartCard>
          <ChartCard title="Sector Concentration" subtitle="% of outstanding by industry">
            <PremiumBarChart
              data={SAMPLE_SECTOR}
              xAxisKey="sector"
              series={[{ dataKey: 'amount', name: 'Share %', color: '#6366F1' }]}
              layout="horizontal"
              formatValue={(v) => `${v}%`}
              yAxisWidth={140}
              height={260}
            />
          </ChartCard>
          <ChartCard title="DTI Band Distribution" subtitle="Borrowers by debt-to-income ratio">
            <PremiumBarChart
              data={SAMPLE_DTI}
              xAxisKey="band"
              series={[{ dataKey: 'customers', name: 'Borrowers' }]}
              itemColors={SAMPLE_DTI.map((d) => d.color)}
              formatValue={(v) => v.toLocaleString()}
              height={260}
            />
          </ChartCard>
        </div>

        {/* Branches table */}
        <AdvancedDataTable
          title="Top Branches by Loan Book"
          subtitle="Outstanding, NPL ratio, provisioning · sample data"
          data={SAMPLE_TOP_BRANCHES}
          columns={topBranchColumns}
          pageSize={10}
          enableFiltering={true}
          enableSorting={true}
          enablePagination={false}
        />

        {/* Awaiting-integration panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PlaceholderPanel
            title="Loan Origination Pipeline"
            subtitle="New applications · approvals · disbursement"
            status="Awaiting integration"
            statusTone="amber"
            message="No loan origination data source connected."
            hint="Expected inputs: application intake, credit decisions, disbursement events."
            icon="📋"
          />
          <PlaceholderPanel
            title="Collateral & Security Coverage"
            subtitle="Collateral LTV distribution"
            status="Awaiting integration"
            statusTone="amber"
            message="No collateral master connected."
            hint="Expected inputs: collateral valuations, LTV per facility, collateral type mix."
            icon="🔒"
          />
        </div>
      </div>
    </>
  );
}
