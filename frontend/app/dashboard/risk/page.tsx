'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { Badge, badgeColor, type BadgeColor } from '@/components/ui/badge';
import { useRiskSummary } from '@/lib/hooks/useDashboardData';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';
import { formatNPR, formatPercent } from '@/lib/formatters';
import { PremiumBarChart } from '@/components/ui/PremiumCharts';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';

export default function RiskDashboard() {
  const {
    filters, setFilters, filtersOpen, setFiltersOpen,
    handleClearFilters, topBarProps,
  } = useDashboardPage();

  const { data, isLoading, isError } = useRiskSummary(filters);

  const byGl = data?.by_gl ?? [];
  const byProvince = data?.by_province ?? [];
  const byBranch = data?.by_branch ?? [];
  const npaData = data?.npa_classification ?? [];

  // Configurable thresholds from backend (with sensible defaults)
  const thresholds = data?.thresholds ?? {
    concentration_warn: 40, concentration_high: 60,
    volatility_warn: 25, volatility_high: 50,
  };

  type ProvinceRow = { province: string; amount: number; accounts: number; debit_amount: number };
  const provinceTotal = useMemo(() => byProvince.reduce((s, p) => s + p.amount, 0), [byProvince]);
  const provinceColumns = useMemo<ColumnDef<ProvinceRow>[]>(() => [
    {
      accessorKey: 'province',
      header: 'Province',
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
      cell: ({ row }) => <span className="capitalize font-medium text-text-primary">{row.original.province}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Total Amount',
      enableSorting: true,
      sortDescFirst: true,
      enableColumnFilter: true,
      filterFn: 'numberRange',
      meta: { filterType: 'number-range' },
      cell: ({ row }) => <strong className="font-mono text-xs">{formatNPR(row.original.amount)}</strong>,
    },
    {
      accessorKey: 'accounts',
      header: 'Accounts',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'numberRange',
      meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.accounts.toLocaleString(),
    },
    {
      accessorKey: 'debit_amount',
      header: 'Debit Exposure',
      enableSorting: true,
      sortDescFirst: true,
      cell: ({ row }) => <span className="font-mono text-xs text-accent-red">{formatNPR(row.original.debit_amount)}</span>,
    },
    {
      id: 'credit_amount',
      header: 'Credit Amount',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.amount - a.original.debit_amount) - (b.original.amount - b.original.debit_amount),
      cell: ({ row }) => <span className="font-mono text-xs text-accent-green">{formatNPR(row.original.amount - row.original.debit_amount)}</span>,
    },
    {
      id: 'debit_pct',
      header: 'Debit %',
      enableSorting: false,
      cell: ({ row }) => {
        const pct = row.original.amount > 0 ? (row.original.debit_amount / row.original.amount) * 100 : 0;
        return <span className={pct > 55 ? 'text-accent-red' : 'text-text-secondary'}>{formatPercent(pct)}</span>;
      },
    },
    {
      id: 'network_share',
      header: 'Network Share',
      cell: ({ row }) => provinceTotal > 0 ? `${((row.original.amount / provinceTotal) * 100).toFixed(1)}%` : '—',
    },
    {
      id: 'risk_level',
      header: 'Risk Level',
      enableSorting: false,
      cell: ({ row }) => {
        const pct = row.original.amount > 0 ? (row.original.debit_amount / row.original.amount) * 100 : 0;
        return (
          <Badge className={pct > 60 ? badgeColor.red : pct > 45 ? badgeColor.amber : badgeColor.green}>
            {pct > 60 ? 'High' : pct > 45 ? 'Medium' : 'Low'}
          </Badge>
        );
      },
    },
  ], [provinceTotal]);

  const totalAmount = data?.total_amount ?? 0;
  const creditAmount = data?.credit_amount ?? 0;
  const debitAmount = data?.debit_amount ?? 0;
  const netFlow = data?.net_flow ?? 0;
  const highValueCount = data?.high_value_count ?? 0;
  const top3BranchShare = data?.top3_branch_share ?? 0;
  const monthlyVolatility = data?.monthly_volatility ?? 0;
  const avgMonthlyVolume = data?.avg_monthly_volume ?? 0;
  const momChange = data?.mom_volume_change ?? 0;
  const top3Branches = data?.top3_branches ?? [];

  // Risk level helpers using configurable thresholds
  const getConcentrationLevel = (share: number): BadgeColor => {
    if (share > thresholds.concentration_high) return 'red';
    if (share > thresholds.concentration_warn) return 'amber';
    return 'green';
  };
  const getVolatilityLevel = (cv: number): BadgeColor => {
    if (cv > thresholds.volatility_high) return 'red';
    if (cv > thresholds.volatility_warn) return 'amber';
    return 'green';
  };
  const concentrationColor = getConcentrationLevel(top3BranchShare);
  const volatilityColor = getVolatilityLevel(monthlyVolatility);

  if (isLoading) {
    return (
      <>
        <TopBar title="Risk & Exposure" subtitle="Transaction risk analysis" {...topBarProps} />
        <StandardDashboardSkeleton />
      </>
    );
  }

  if (isError) {
    return (
      <>
        <TopBar title="Risk & Exposure" subtitle="Transaction risk analysis" {...topBarProps} />
        <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          <div className="bg-accent-red/10 border border-accent-red/20 rounded-xl p-6 text-center">
            <p className="text-text-primary font-display font-semibold">Failed to load risk data</p>
            <p className="text-text-secondary text-sm mt-1">Please check your connection and try again.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Risk & Exposure" subtitle="Transaction risk analysis" {...topBarProps} />
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        {/* Primary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <KPICard label="Total Volume" value={formatNPR(totalAmount)} highlighted iconBg="var(--accent-blue-dim)" />
          <KPICard
            label="High-Value Txns"
            value={highValueCount.toLocaleString()}
            subtitle={`Above ${formatNPR(data?.high_value_threshold)}`}
            iconBg="var(--accent-red-dim)"
          />
          <KPICard
            label="Top 3 Branch Concentration"
            value={formatPercent(top3BranchShare)}
            subtitle={top3BranchShare > thresholds.concentration_high ? 'Concentrated' : top3BranchShare > thresholds.concentration_warn ? 'Moderate' : 'Diversified'}
            iconBg={top3BranchShare > thresholds.concentration_warn ? 'var(--accent-red-dim)' : 'var(--accent-green-dim)'}
          />
          <KPICard
            label="Monthly Volatility (CV)"
            value={formatPercent(monthlyVolatility)}
            subtitle={`MoM: ${momChange >= 0 ? '▲' : '▼'} ${Math.abs(momChange).toFixed(1)}%`}
            iconBg="var(--accent-amber-dim)"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <KPICard label="Credit Inflow" value={formatNPR(creditAmount)} iconBg="var(--accent-green-dim)" />
          <KPICard label="Debit Outflow" value={formatNPR(debitAmount)} iconBg="var(--accent-red-dim)" />
          <KPICard
            label="Net Flow"
            value={formatNPR(netFlow)}
            subtitle={`MoM: ${momChange >= 0 ? '▲' : '▼'} ${Math.abs(momChange).toFixed(1)}%`}
            iconBg={netFlow >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'}
          />
          <KPICard label="Avg Monthly Volume" value={formatNPR(avgMonthlyVolume)} iconBg="var(--accent-teal-dim)" />
        </div>

        {/* Risk Indicator Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Branch Concentration Risk */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="text-[13px] font-display font-semibold mb-1">Branch Concentration Risk</div>
            <div className="text-[11px] text-text-muted mb-4">Top 3 branches share of total volume</div>
            <div className={`text-[32px] font-bold tracking-tight mb-2 text-accent-${concentrationColor}`}>
              {formatPercent(top3BranchShare)}
            </div>
            <div className="h-2 rounded-full bg-bg-input overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all bg-accent-${concentrationColor}`}
                style={{ width: `${Math.min(top3BranchShare, 100)}%` }}
              />
            </div>
            {/* Top 3 branch breakdown */}
            {top3Branches.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {top3Branches.map((b: { branch: string; amount: number }, i: number) => (
                  <div key={b.branch} className="flex items-center justify-between text-[11px]">
                    <span className="text-text-secondary">
                      <span className="font-mono text-text-muted mr-1.5">#{i + 1}</span>
                      {b.branch}
                    </span>
                    <span className="font-mono text-text-primary">{formatNPR(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <Badge className={badgeColor[concentrationColor]}>
              {top3BranchShare > thresholds.concentration_high ? 'High Concentration' : top3BranchShare > thresholds.concentration_warn ? 'Moderate' : 'Well Distributed'}
            </Badge>
          </div>

          {/* Volatility Risk */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="text-[13px] font-display font-semibold mb-1">Volume Volatility</div>
            <div className="text-[11px] text-text-muted mb-4">Coefficient of variation (monthly)</div>
            <div className={`text-[32px] font-bold tracking-tight mb-1 text-accent-${volatilityColor}`}>
              {formatPercent(monthlyVolatility)}
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[13px] font-semibold ${momChange >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                {momChange >= 0 ? '▲' : '▼'} {Math.abs(momChange).toFixed(1)}%
              </span>
              <span className="text-[10px] text-text-muted">MoM volume change</span>
            </div>
            <div className="h-2 rounded-full bg-bg-input overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all bg-accent-${volatilityColor}`}
                style={{ width: `${Math.min(monthlyVolatility * 2, 100)}%` }}
              />
            </div>
            <Badge className={badgeColor[volatilityColor]}>
              {monthlyVolatility > thresholds.volatility_high ? 'High Volatility' : monthlyVolatility > thresholds.volatility_warn ? 'Moderate' : 'Stable'}
            </Badge>
          </div>

          {/* High Value Risk */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="text-[13px] font-display font-semibold mb-1">High-Value Transaction Exposure</div>
            <div className="text-[11px] text-text-muted mb-4">Transactions above threshold</div>
            <div className="text-[32px] font-bold tracking-tight mb-2 text-accent-amber">
              {highValueCount.toLocaleString()}
            </div>
            <div className="text-[12px] text-text-secondary mb-3">
              Threshold: {formatNPR(data?.high_value_threshold)}
            </div>
            <Badge className={highValueCount > 1000 ? badgeColor.red : highValueCount > 100 ? badgeColor.amber : badgeColor.green}>
              {highValueCount > 1000 ? 'Critical' : highValueCount > 100 ? 'Monitor Required' : 'Within Normal'}
            </Badge>
          </div>
        </div>

        {/* NPA Classification (if data available from gam.acct_cls_flg) */}
        {npaData.length > 0 && (
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="text-[13px] font-display font-semibold mb-1">Account Classification (NPA Proxy)</div>
            <div className="text-[11px] text-text-muted mb-4">From GAM acct_cls_flg — account asset quality distribution</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {npaData.map((item: { classification: string; accounts: number; amount: number }) => (
                <div key={item.classification} className="bg-bg-surface border border-border/50 rounded-lg p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">{item.classification || 'Unclassified'}</div>
                  <div className="text-[18px] font-bold tracking-tight text-text-primary">{item.accounts.toLocaleString()}</div>
                  <div className="text-[10px] text-text-muted">accounts</div>
                  <div className="text-[11px] font-mono text-text-secondary mt-1">{formatNPR(item.amount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="GL Code Risk Exposure" subtitle="Top GL sub-heads by volume">
            <PremiumBarChart
              data={byGl.slice(0, 8)}
              xAxisKey="gl_code"
              series={[{ dataKey: 'amount', name: 'Amount' }]}
              layout="horizontal"
              itemColors={byGl.slice(0, 8).map((_, i) => i === 0 ? '#f43f5e' : i === 1 ? '#fb923c' : '#0ea5e9')}
              formatValue={formatNPR}
              yAxisWidth={80}
              height={260}
            />
          </ChartCard>

          <ChartCard title="Province Risk Distribution" subtitle="Transaction volume by province">
            <PremiumBarChart
              data={byProvince}
              xAxisKey="province"
              series={[
                { dataKey: 'amount',       name: 'Total', color: '#0ea5e9' },
                { dataKey: 'debit_amount', name: 'Debit', color: '#f43f5e' },
              ]}
              formatValue={formatNPR}
              height={260}
            />
          </ChartCard>
        </div>

        {/* Branch concentration chart */}
        {byBranch.length > 0 && (
          <ChartCard title="Branch Concentration" subtitle="Top branches by transaction volume">
            <PremiumBarChart
              data={byBranch}
              xAxisKey="branch"
              series={[{ dataKey: 'amount', name: 'Volume', color: '#6366F1' }]}
              layout="horizontal"
              formatValue={formatNPR}
              yAxisWidth={80}
              height={260}
            />
          </ChartCard>
        )}

        {/* Province Risk Table */}
        {byProvince.length > 0 && (
          <AdvancedDataTable
            title="Province Risk Summary"
            subtitle="All tran_summary province fields — use Columns to show/hide"
            data={byProvince as ProvinceRow[]}
            columns={provinceColumns}
            pageSize={10}
            enablePagination={false}
            initialHidden={{ credit_amount: true, network_share: true }}
          />
        )}
      </div>
    </>
  );
}
