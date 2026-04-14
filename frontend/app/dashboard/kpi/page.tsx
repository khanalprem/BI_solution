'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { useKpiSummary } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent } from '@/lib/formatters';
import { PremiumBarChart } from '@/components/ui/PremiumCharts';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Badge, badgeColor } from '@/components/ui/badge';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';

const QUARTER_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function KPIDashboard() {
  const { filters, setFilters, filtersOpen, setFiltersOpen, handleClearFilters, topBarProps } = useDashboardPage();
  const { data, isLoading } = useKpiSummary(filters);

  const byQuarter = data?.by_quarter ?? [];
  const byProduct = data?.by_product ?? [];
  const byService = data?.by_service ?? [];

  type QuarterRow = { period: string; amount: number; count: number; accounts: number };
  const quarterTotals = useMemo(() => byQuarter.reduce((s, q) => ({ amount: s.amount + q.amount, count: s.count + q.count }), { amount: 0, count: 0 }), [byQuarter]);
  const quarterColumns = useMemo<ColumnDef<QuarterRow>[]>(() => [
    {
      accessorKey: 'period',
      header: 'Period',
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
      cell: ({ row }) => <strong className="text-text-primary">{row.original.period}</strong>,
    },
    {
      accessorKey: 'amount',
      header: 'Volume',
      enableSorting: true, sortDescFirst: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => <strong className="font-mono text-xs">{formatNPR(row.original.amount)}</strong>,
    },
    {
      accessorKey: 'count',
      header: 'Transactions',
      enableSorting: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.count.toLocaleString(),
    },
    {
      accessorKey: 'accounts',
      header: 'Accounts',
      enableSorting: true,
      enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
      cell: ({ row }) => row.original.accounts.toLocaleString(),
    },
    {
      id: 'avg_txn',
      header: 'Avg Txn',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.count > 0 ? a.original.amount / a.original.count : 0) - (b.original.count > 0 ? b.original.amount / b.original.count : 0),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.count > 0 ? formatNPR(row.original.amount / row.original.count) : '—'}</span>,
    },
    {
      id: 'txn_per_account',
      header: 'Txns / Account',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.accounts > 0 ? a.original.count / a.original.accounts : 0) - (b.original.accounts > 0 ? b.original.count / b.original.accounts : 0),
      cell: ({ row }) => (row.original.accounts > 0 ? (row.original.count / row.original.accounts).toFixed(1) : '—'),
    },
    {
      id: 'vol_per_account',
      header: 'Vol / Account',
      enableSorting: true,
      sortingFn: (a, b) => (a.original.accounts > 0 ? a.original.amount / a.original.accounts : 0) - (b.original.accounts > 0 ? b.original.amount / b.original.accounts : 0),
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.accounts > 0 ? formatNPR(row.original.amount / row.original.accounts) : '—'}</span>,
    },
    {
      id: 'share',
      header: '% of Total',
      enableSorting: true,
      sortingFn: (a, b) => a.original.amount - b.original.amount,
      cell: ({ row }) => {
        const pct = quarterTotals.amount > 0 ? (row.original.amount / quarterTotals.amount) * 100 : 0;
        return (
          <div className="flex items-center gap-2 min-w-[70px]">
            <div className="flex-1 h-1.5 rounded-full bg-bg-input overflow-hidden">
              <div className="h-full rounded-full bg-accent-blue transition-all" style={{ width: `${Math.min(pct * 2, 100)}%` }} />
            </div>
            <span className="text-[9.5px] text-text-muted w-8 text-right">{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
  ], [quarterTotals]);

  if (isLoading) {
    return (
      <>
        <TopBar title="KPI Summary" subtitle="Key performance indicators & metrics" {...topBarProps} />
        <StandardDashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <TopBar title="KPI Summary" subtitle="Key performance indicators & metrics" {...topBarProps} />
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <KPICard label="Total Volume" value={formatNPR(data?.total_amount ?? 0)} highlighted iconBg="var(--accent-blue-dim)" sparkData={byQuarter.map(q => q.amount)} />
          <KPICard label="Total Transactions" value={(data?.total_count ?? 0).toLocaleString()} iconBg="var(--accent-green-dim)" sparkData={byQuarter.map(q => q.count)} />
          <KPICard label="Unique Accounts" value={(data?.unique_accounts ?? 0).toLocaleString()} iconBg="var(--accent-purple-dim)" sparkData={byQuarter.map(q => q.accounts)} />
          <KPICard label="Unique Customers" value={(data?.unique_customers ?? 0).toLocaleString()} iconBg="var(--accent-teal-dim)" />
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <KPICard label="Avg Transaction" value={formatNPR(data?.avg_transaction ?? 0)} iconBg="var(--accent-amber-dim)" />
          <KPICard label="Credit Ratio" value={formatPercent(data?.credit_ratio ?? 0)} iconBg="var(--accent-green-dim)" />
          <KPICard label="Txns per Account" value={(data?.txn_per_account ?? 0).toFixed(1)} iconBg="var(--accent-blue-dim)" />
          <KPICard label="Volume per Account" value={formatNPR(data?.vol_per_account ?? 0)} iconBg="var(--accent-teal-dim)" />
        </div>

        {/* Coverage KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-xs font-display text-text-muted mb-1">Branch Coverage</div>
            <div className="text-2xl font-mono font-bold tracking-tight text-accent-blue">{(data?.unique_branches ?? 0).toLocaleString()}</div>
            <div className="text-[11px] text-text-secondary mt-1">Active branches</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-xs font-display text-text-muted mb-1">Province Coverage</div>
            <div className="text-2xl font-mono font-bold tracking-tight text-accent-green">{data?.unique_provinces ?? 0} / 7</div>
            <div className="text-[11px] text-text-secondary mt-1">Provinces active</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-xs font-display text-text-muted mb-1">Net Flow</div>
            <div className={`text-2xl font-mono font-bold tracking-tight ${(data?.net_flow ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {formatNPR(data?.net_flow ?? 0)}
            </div>
            <div className="text-[11px] text-text-secondary mt-1">CR minus DR</div>
          </div>
          <div className="bg-bg-card border border-border rounded-xl p-4">
            <div className="text-xs font-display text-text-muted mb-1">Credit Amount</div>
            <div className="text-2xl font-mono font-bold tracking-tight text-accent-green">{formatNPR(data?.credit_amount ?? 0)}</div>
            <div className="text-[11px] text-text-secondary mt-1">{formatNPR(data?.debit_amount ?? 0)} debit</div>
          </div>
        </div>

        {/* ── Banking Ratios (NIM / ROA / ROE / NPL / CAR / LDR) ────────────────
            Standard banking health ratios. Values are sector-average placeholders
            sourced from NRB Financial Stability Report (Mid-July 2025); wire a
            live capital / P&L feed to compute them per bank. */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="font-display text-[13.5px] font-bold tracking-tight text-text-primary leading-none">
              Banking Health Ratios
            </h3>
            <span className="text-[10px] text-text-muted">
              Placeholder · sector averages (NRB FSR 2022/23)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'NIM',  value: '3.85%', hint: 'Net Interest Margin',   color: 'text-accent-blue' },
              { label: 'ROA',  value: '1.12%', hint: 'Return on Assets',       color: 'text-accent-green' },
              { label: 'ROE',  value: '11.27%', hint: 'Return on Equity',      color: 'text-accent-purple' },
              { label: 'NPL',  value: '4.44%', hint: 'Non-Performing Loans',   color: 'text-accent-red' },
              { label: 'CAR',  value: '12.78%', hint: 'Capital Adequacy (min 11%)', color: 'text-accent-teal' },
              { label: 'LDR',  value: '85.2%', hint: 'Loan-to-Deposit (max 90%)',   color: 'text-accent-amber' },
            ].map((r) => (
              <div key={r.label} className="bg-bg-card border border-border rounded-xl p-3">
                <div className="text-[9.5px] font-bold uppercase tracking-[0.4px] text-text-muted">{r.label}</div>
                <div className={`text-lg font-mono font-bold tracking-tight mt-1 ${r.color}`}>{r.value}</div>
                <div className="text-[9.5px] text-text-secondary mt-1 leading-tight">{r.hint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quarterly Trend */}
        {byQuarter.length > 0 && (
          <ChartCard title="Quarterly Performance" subtitle="Volume and transaction count by quarter">
            <PremiumBarChart
              data={byQuarter}
              xAxisKey="period"
              series={[{ dataKey: 'amount', name: 'Volume' }]}
              itemColors={QUARTER_COLORS}
              formatValue={formatNPR}
              height={260}
            />
          </ChartCard>
        )}

        {/* Product & Service Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {byProduct.length > 0 && (
            <ChartCard title="Volume by Product" subtitle="Transaction volume per product type">
              <PremiumBarChart
                data={byProduct.slice(0, 10)}
                xAxisKey="product"
                series={[{ dataKey: 'amount', name: 'Amount', color: '#3b82f6' }]}
                layout="horizontal"
                formatValue={formatNPR}
                yAxisWidth={100}
                height={260}
              />
            </ChartCard>
          )}

          {byService.length > 0 && (
            <ChartCard title="Volume by Service" subtitle="Transaction volume per service type">
              <PremiumBarChart
                data={byService.slice(0, 10)}
                xAxisKey="service"
                series={[{ dataKey: 'amount', name: 'Amount', color: '#10b981' }]}
                layout="horizontal"
                formatValue={formatNPR}
                yAxisWidth={100}
                height={260}
              />
            </ChartCard>
          )}
        </div>

        {/* ── Banking Intelligence Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CASA Ratio */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-display font-semibold text-text-primary mb-1">CASA Ratio</div>
            <div className="text-[10px] text-text-muted mb-4">Current + Savings / Total Deposits</div>
            {(data?.casa?.by_gl?.length ?? 0) > 0 ? (
              <>
                <div className="text-2xl font-mono font-bold tracking-tight text-accent-blue mb-2">
                  {formatNPR(data?.casa?.total_deposits)}
                </div>
                <div className="text-[10px] text-text-muted">Total deposits by GL code (configure CASA GL codes)</div>
                <div className="mt-3 space-y-1.5">
                  {data?.casa?.by_gl?.slice(0, 5).map((g) => (
                    <div key={g.gl_code} className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-text-secondary">GL {g.gl_code}</span>
                      <span className="font-mono text-text-primary">{formatNPR(g.deposit_amount)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-2xl font-mono font-bold tracking-tight text-text-muted mb-2">—</div>
            )}
            <Badge className={badgeColor.blue}>Regulatory KPI</Badge>
          </div>

          {/* Transaction Velocity */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-display font-semibold text-text-primary mb-1">Transaction Velocity</div>
            <div className="text-[10px] text-text-muted mb-4">Avg txns per account per active day</div>
            <div className="text-2xl font-mono font-bold tracking-tight text-accent-green mb-2">
              {(data?.txn_velocity ?? 0).toFixed(3)}
            </div>
            <div className="text-[10px] text-text-muted mb-3">
              {(data?.active_days ?? 0).toLocaleString()} active trading days
            </div>
            <Badge className={badgeColor.green}>Activity Monitor</Badge>
          </div>

          {/* MoM Growth Summary */}
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="text-xs font-display font-semibold text-text-primary mb-1">MoM Growth Trend</div>
            <div className="text-[10px] text-text-muted mb-4">Month-over-month volume change</div>
            {(data?.mom_trends?.length ?? 0) >= 2 ? (() => {
              const last = data!.mom_trends[data!.mom_trends.length - 1];
              const prev = data!.mom_trends[data!.mom_trends.length - 2];
              const change = last.mom_change;
              return (
                <>
                  <div className={`text-2xl font-mono font-bold tracking-tight mb-1 ${(change ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {change !== null ? `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%` : '—'}
                  </div>
                  <div className="text-[10px] text-text-muted mb-1">
                    {last.month}: {formatNPR(last.amount)}
                  </div>
                  <div className="text-[10px] text-text-muted mb-3">
                    {prev.month}: {formatNPR(prev.amount)}
                  </div>
                </>
              );
            })() : (
              <div className="text-2xl font-mono font-bold tracking-tight text-text-muted mb-2">—</div>
            )}
            <Badge className={badgeColor.amber}>Decision Metric</Badge>
          </div>
        </div>

        {/* MoM Trends Chart */}
        {(data?.mom_trends?.length ?? 0) > 1 && (
          <ChartCard title="Month-over-Month Growth" subtitle="Transaction volume with MoM % change">
            <PremiumBarChart
              data={data!.mom_trends}
              xAxisKey="month"
              series={[{ dataKey: 'amount', name: 'Volume', color: '#6366F1' }]}
              formatValue={formatNPR}
              height={260}
            />
          </ChartCard>
        )}

        {/* Quarterly detail table */}
        {byQuarter.length > 0 && (
          <AdvancedDataTable
            title="Quarterly Breakdown"
            subtitle="Volume, transactions, and accounts per quarter — use Columns to show/hide fields"
            data={byQuarter as QuarterRow[]}
            columns={quarterColumns}
            pageSize={10}
            enablePagination={false}
            initialHidden={{ txn_per_account: true, vol_per_account: true, share: true }}
          />
        )}
      </div>
    </>
  );
}
