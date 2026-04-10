'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { Pill } from '@/components/ui/Pill';
import { useRiskSummary } from '@/lib/hooks/useDashboardData';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';
import { formatNPR, formatPercent } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { PremiumBarChart } from '@/components/ui/PremiumCharts';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';

export default function RiskDashboard() {
  const {
    filters, setFilters, filtersOpen, setFiltersOpen,
    filterStats, handleClearFilters, topBarProps,
  } = useDashboardPage();

  const { data, isLoading } = useRiskSummary(filters);

  const byGl = data?.by_gl ?? [];
  const byProvince = data?.by_province ?? [];

  type ProvinceRow = { province: string; amount: number; accounts: number; debit_amount: number };
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
      cell: ({ row }) => <strong className="font-mono text-[11px]">{formatNPR(row.original.amount)}</strong>,
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
      enableColumnFilter: true,
      filterFn: 'numberRange',
      meta: { filterType: 'number-range' },
      cell: ({ row }) => <span className="font-mono text-[11px] text-accent-red">{formatNPR(row.original.debit_amount)}</span>,
    },
    {
      id: 'credit_amount',
      header: 'Credit Amount',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.amount - a.original.debit_amount) - (b.original.amount - b.original.debit_amount),
      cell: ({ row }) => <span className="font-mono text-[11px] text-accent-green">{formatNPR(row.original.amount - row.original.debit_amount)}</span>,
    },
    {
      id: 'debit_pct',
      header: 'Debit %',
      enableSorting: false,
      cell: ({ row }) => {
        const pct = row.original.amount > 0 ? (row.original.debit_amount / row.original.amount) * 100 : 0;
        return <span>{formatPercent(pct)}</span>;
      },
    },
    {
      id: 'credit_pct',
      header: 'Credit %',
      cell: ({ row }) => {
        const cr = row.original.amount - row.original.debit_amount;
        const pct = row.original.amount > 0 ? (cr / row.original.amount) * 100 : 0;
        return <span>{formatPercent(pct)}</span>;
      },
    },
    {
      id: 'avg_per_account',
      header: 'Avg / Account',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.accounts > 0 ? a.original.amount / a.original.accounts : 0) - (b.original.accounts > 0 ? b.original.amount / b.original.accounts : 0),
      cell: ({ row }) => formatNPR(row.original.accounts > 0 ? row.original.amount / row.original.accounts : 0),
    },
    {
      id: 'network_share',
      header: 'Network Share',
      cell: ({ row }) => {
        const total = byProvince.reduce((s, p) => s + p.amount, 0);
        return total > 0 ? `${((row.original.amount / total) * 100).toFixed(1)}%` : '—';
      },
    },
    {
      id: 'risk_level',
      header: 'Risk Level',
      enableSorting: false,
      cell: ({ row }) => {
        const pct = row.original.amount > 0 ? (row.original.debit_amount / row.original.amount) * 100 : 0;
        return (
          <Pill variant={pct > 60 ? 'red' : pct > 45 ? 'amber' : 'green'}>
            {pct > 60 ? 'High' : pct > 45 ? 'Medium' : 'Low'}
          </Pill>
        );
      },
    },
  ], [byProvince]);
  const totalAmount = data?.total_amount ?? 0;
  const creditAmount = data?.credit_amount ?? 0;
  const debitAmount = data?.debit_amount ?? 0;
  const netFlow = data?.net_flow ?? 0;
  const highValueCount = data?.high_value_count ?? 0;
  const top3BranchShare = data?.top3_branch_share ?? 0;
  const monthlyVolatility = data?.monthly_volatility ?? 0;
  const avgMonthlyVolume = data?.avg_monthly_volume ?? 0;

  const getRiskLevel = (share: number) => {
    if (share > 60) return 'red';
    if (share > 40) return 'amber';
    return 'green';
  };

  if (isLoading) {
    return (
      <>
        <TopBar title="Risk & Exposure" subtitle="Transaction risk analysis" {...topBarProps} />
        <StandardDashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <TopBar title="Risk & Exposure" subtitle="Transaction risk analysis" {...topBarProps} />
      <div className="flex flex-col gap-[14px] px-5 py-4">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total Volume" value={formatNPR(totalAmount)} highlighted iconBg="var(--accent-blue-dim)" />
          <KPICard
            label="High-Value Txns"
            value={highValueCount.toLocaleString()}
            subtitle={`Above ${formatNPR(data?.high_value_threshold ?? 0)}`}
            iconBg="var(--accent-red-dim)"
          />
          <KPICard
            label="Top 3 Branch Concentration"
            value={formatPercent(top3BranchShare)}
            subtitle={top3BranchShare > 50 ? 'Concentrated' : 'Diversified'}
            iconBg={top3BranchShare > 50 ? 'var(--accent-red-dim)' : 'var(--accent-green-dim)'}
          />
          <KPICard
            label="Monthly Volatility"
            value={formatPercent(monthlyVolatility)}
            subtitle="Std dev / mean"
            iconBg="var(--accent-amber-dim)"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Credit Inflow" value={formatNPR(creditAmount)} iconBg="var(--accent-green-dim)" />
          <KPICard label="Debit Outflow" value={formatNPR(debitAmount)} iconBg="var(--accent-red-dim)" />
          <KPICard label="Net Flow" value={formatNPR(netFlow)} iconBg={netFlow >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'} />
          <KPICard label="Avg Monthly Volume" value={formatNPR(avgMonthlyVolume)} iconBg="var(--accent-teal-dim)" />
        </div>

        {/* Risk Indicators */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Concentration Risk */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[13px] font-semibold mb-1">Branch Concentration Risk</div>
            <div className="text-[11px] text-text-muted mb-4">Top 3 branches share of total volume</div>
            <div className={`text-[32px] font-bold tracking-tight mb-2 ${top3BranchShare > 50 ? 'text-accent-red' : top3BranchShare > 30 ? 'text-accent-amber' : 'text-accent-green'}`}>
              {formatPercent(top3BranchShare)}
            </div>
            <div className="h-2 rounded-full bg-bg-input overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all ${top3BranchShare > 50 ? 'bg-accent-red' : top3BranchShare > 30 ? 'bg-accent-amber' : 'bg-accent-green'}`} style={{ width: `${Math.min(top3BranchShare, 100)}%` }} />
            </div>
            <Pill variant={getRiskLevel(top3BranchShare)}>
              {top3BranchShare > 60 ? 'High Concentration' : top3BranchShare > 40 ? 'Moderate' : 'Well Distributed'}
            </Pill>
          </div>

          {/* Volatility Risk */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[13px] font-semibold mb-1">Volume Volatility</div>
            <div className="text-[11px] text-text-muted mb-4">Coefficient of variation (monthly)</div>
            <div className={`text-[32px] font-bold tracking-tight mb-2 ${monthlyVolatility > 50 ? 'text-accent-red' : monthlyVolatility > 25 ? 'text-accent-amber' : 'text-accent-green'}`}>
              {formatPercent(monthlyVolatility)}
            </div>
            <div className="h-2 rounded-full bg-bg-input overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all ${monthlyVolatility > 50 ? 'bg-accent-red' : monthlyVolatility > 25 ? 'bg-accent-amber' : 'bg-accent-green'}`} style={{ width: `${Math.min(monthlyVolatility, 100)}%` }} />
            </div>
            <Pill variant={monthlyVolatility > 50 ? 'red' : monthlyVolatility > 25 ? 'amber' : 'green'}>
              {monthlyVolatility > 50 ? 'High Volatility' : monthlyVolatility > 25 ? 'Moderate' : 'Stable'}
            </Pill>
          </div>

          {/* High Value Risk */}
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-[13px] font-semibold mb-1">High-Value Transaction Exposure</div>
            <div className="text-[11px] text-text-muted mb-4">Transactions above threshold</div>
            <div className="text-[32px] font-bold tracking-tight mb-2 text-accent-amber">
              {highValueCount.toLocaleString()}
            </div>
            <div className="text-[12px] text-text-secondary mb-3">
              Threshold: {formatNPR(data?.high_value_threshold ?? 0)}
            </div>
            <Pill variant={highValueCount > 100 ? 'amber' : 'green'}>
              {highValueCount > 100 ? 'Monitor Required' : 'Within Normal'}
            </Pill>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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

        {/* Province Risk Table */}
        {byProvince.length > 0 && (
          <AdvancedDataTable
            title="Province Risk Summary"
            subtitle="All tran_summary province fields — use Columns to show/hide"
            data={byProvince as ProvinceRow[]}
            columns={provinceColumns}
            pageSize={10}
            enablePagination={false}
            initialHidden={{ credit_amount: true, credit_pct: true, avg_per_account: true, network_share: true }}
          />
        )}
      </div>
    </>
  );
}
