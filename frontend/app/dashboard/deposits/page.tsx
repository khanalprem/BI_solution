'use client';

import { useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { PlaceholderPanel } from '@/components/ui/PlaceholderPanel';
import { PremiumLineChart, PremiumBarChart } from '@/components/ui/PremiumCharts';
import { Checkbox } from '@/components/ui/checkbox';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { formatNPR, formatPercent } from '@/lib/formatters';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';
import { useDeposits } from '@/lib/hooks/useDashboardData';
import { exportTableToCsv } from '@/lib/exportCsv';
import type { DashboardFilters } from '@/types';

// ─── Dimension definitions ────────────────────────────────────────────────────
// The exact 11 dims that `public.get_deposit` supports via its
// select_clause / groupby_clause + date_join + branch/province/cluster joins.
// Order = broad-to-narrow like the pivot sidebar: dates, geo, identity.

type DepositDimKey =
  | 'year'
  | 'year_quarter'
  | 'year_month'
  | 'tran_date'
  | 'gam_province'
  | 'gam_cluster'
  | 'gam_branch'
  | 'cif_id'
  | 'acid'
  | 'acct_num'
  | 'acct_name';

interface DepositDimDef {
  key:   DepositDimKey;
  label: string;
  description: string;
  isDate?: boolean;
}

const DEPOSIT_DIMS: DepositDimDef[] = [
  { key: 'year',         label: 'Year',         description: 'Calendar year (YYYY) — joined on d.date = d.year_enddate',         isDate: true },
  { key: 'year_quarter', label: 'Year Quarter', description: 'Quarterly period — joined on d.date = d.quarter_enddate',          isDate: true },
  { key: 'year_month',   label: 'Year Month',   description: 'Monthly period — joined on d.date = d.month_enddate',              isDate: true },
  { key: 'tran_date',    label: 'Date',         description: 'Daily granularity — no date_join; raw d.date',                     isDate: true },
  { key: 'gam_province', label: 'GAM Province', description: 'Province of the account branch (p.name)' },
  { key: 'gam_cluster',  label: 'GAM Cluster',  description: 'Account branch cluster (c.cluster_name)' },
  { key: 'gam_branch',   label: 'GAM Branch',   description: 'Account registration branch (b.branch_name)' },
  { key: 'cif_id',       label: 'CIF Id',       description: 'Customer CIF ID (g.cif_id)' },
  { key: 'acid',         label: 'ACID',         description: 'Internal account identifier (g.acid)' },
  { key: 'acct_num',     label: 'ACCT Num',     description: 'Account number (g.acct_num)' },
  { key: 'acct_name',    label: 'ACCT Name',    description: 'Account holder name (g.acct_name)' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function coerceNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatDimCell(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

/** Sum the `deposit` column across a row set. Coerces string→number (BigDecimal). */
function sumDeposit(rows: Array<Record<string, unknown>> | undefined): number {
  if (!rows || rows.length === 0) return 0;
  return rows.reduce((s, r) => s + (coerceNumber(r.deposit) ?? 0), 0);
}

const PAGE_SIZE = 50;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DepositsDashboard() {
  // Default to YTD rather than ALL — get_deposit scans EAB × GAM × DATES and
  // consistently times out on a 5-year window (ALL = full production data
  // range). YTD gives a useful multi-month trend with sub-30s response times
  // for typical sessions. Users can widen via the TopBar period selector.
  const { filters, setFilters, filtersOpen, setFiltersOpen, handleClearFilters, topBarProps } =
    useDashboardPage({ defaultPeriod: 'YTD' });

  // ── Snapshot date: pin to end of selected window so KPI/top-lists read as
  // "balance as of the report end date". Fallback to startDate when endDate
  // is missing (first render edge case).
  const snapshotDate = filters.endDate || filters.startDate;

  // A snapshot filter is the normal filter set with `tranDate` overridden to a
  // single day. This makes `date_where = "d.date = '<snapshot>'"` on the
  // backend, which is much cheaper than a BETWEEN scan and is the correct
  // semantics for "point-in-time balance".
  const snapshotFilters = useMemo<DashboardFilters>(
    () => ({
      ...filters,
      tranDate: snapshotDate,
      tranDateFrom: undefined,
      tranDateTo: undefined,
    }),
    [filters, snapshotDate],
  );

  // ── Overview queries (fire on every filter change)
  // 1. Branch snapshot — top branches, total deposits, branch count
  const {
    data: branchSnap,
    isLoading: branchLoading,
    isError:   branchError,
  } = useDeposits(snapshotFilters, ['gam_branch'], 1, 200);

  // 2. Monthly trend — deposit balance at each month-end in the window.
  //    date_join = "d.date = d.month_enddate" means we get one row per month.
  const {
    data: trendSnap,
    isLoading: trendLoading,
    isError:   trendError,
  } = useDeposits(filters, ['year_month'], 1, 200, '', 'ORDER BY d.date ASC');

  // 3. Top depositors — default ORDER BY sum(deposit) DESC, page_size = 10
  const {
    data: topDepositorsSnap,
    isLoading: topDepLoading,
    isError:   topDepError,
  } = useDeposits(snapshotFilters, ['cif_id', 'acct_name'], 1, 10);

  // ── Derived overview values
  const branchRows = (branchSnap?.rows ?? []) as Array<Record<string, unknown>>;
  const totalDeposits = sumDeposit(branchRows);
  const branchCount = branchRows.length;

  const topBranchName = branchRows[0] ? String(branchRows[0].gam_branch ?? '—') : '—';
  const topBranchAmt  = branchRows[0] ? coerceNumber(branchRows[0].deposit) ?? 0 : 0;
  const topBranchShare = totalDeposits > 0 ? (topBranchAmt / totalDeposits) * 100 : 0;

  // Top 10 branches for the horizontal bar chart.
  const topBranches = useMemo(
    () =>
      branchRows.slice(0, 10).map((r) => ({
        gam_branch: String(r.gam_branch ?? '—'),
        deposit:    coerceNumber(r.deposit) ?? 0,
      })),
    [branchRows],
  );

  // Trend series — mirror shape expected by PremiumLineChart
  const trendSeries = useMemo(
    () =>
      ((trendSnap?.rows ?? []) as Array<Record<string, unknown>>).map((r) => ({
        year_month: String(r.year_month ?? ''),
        deposit:    coerceNumber(r.deposit) ?? 0,
      })),
    [trendSnap],
  );

  const topDepositors = useMemo(
    () =>
      ((topDepositorsSnap?.rows ?? []) as Array<Record<string, unknown>>).map((r) => {
        const deposit = coerceNumber(r.deposit) ?? 0;
        return {
          cif_id:    String(r.cif_id ?? '—'),
          acct_name: String(r.acct_name ?? '—'),
          deposit,
          share:     totalDeposits > 0 ? (deposit / totalDeposits) * 100 : 0,
        };
      }),
    [topDepositorsSnap, totalDeposits],
  );

  // ── Ad-hoc breakdown explorer state (unchanged from previous implementation)
  // Start empty so the explorer doesn't fire a 4th concurrent get_deposit call
  // on mount — the overview section already shows the gam_branch breakdown.
  // Users opt in by ticking dims, matching the pivot page's "pick to start"
  // pattern.
  const [selectedDims, setSelectedDims] = useState<DepositDimKey[]>([]);
  const [explorerPage, setExplorerPage] = useState(1);

  const toggleDim = (key: DepositDimKey) => {
    setExplorerPage(1);
    setSelectedDims((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // Send dims in the order defined in DEPOSIT_DIMS so column ordering is stable.
  const orderedDims = useMemo(
    () => DEPOSIT_DIMS.filter((d) => selectedDims.includes(d.key)).map((d) => d.key),
    [selectedDims],
  );

  const {
    data: explorerData,
    isLoading: explorerLoading,
    isFetching: explorerFetching,
    isError:   explorerIsError,
    error:     explorerErrorObj,
  } = useDeposits(filters, orderedDims, explorerPage, PAGE_SIZE);

  // `explorerData` may contain stale rows from a previous query (placeholderData
  // keeps the table from flashing during pagination). Guard against that when
  // the user changes dims: if the backend's dims don't match what's currently
  // selected, treat the response as "not for us" so we don't render rows whose
  // columns aren't bound to the active selection (e.g. ACCT Num showing "—"
  // because the previous query only grouped by GAM Branch).
  const dimsMatch = useMemo(() => {
    if (!explorerData) return false;
    const a = explorerData.dimensions ?? [];
    if (a.length !== orderedDims.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== orderedDims[i]) return false;
    return true;
  }, [explorerData, orderedDims]);

  const explorerRows  = dimsMatch ? explorerData!.rows : [];
  const explorerTotal = dimsMatch ? explorerData!.total_rows : 0;
  const totalPages    = Math.max(1, Math.ceil(explorerTotal / PAGE_SIZE));

  const handleExport = () => {
    if (explorerRows.length === 0) return;
    const headers = [...orderedDims, 'deposit'];
    exportTableToCsv(
      `deposits_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      explorerRows as unknown as Record<string, unknown>[],
    );
  };

  // "Initial load" — we have nothing to show. Also triggers when the dims
  // changed and the new query is still in flight (stale prev is discarded).
  const explorerInitialLoad = (explorerLoading || explorerFetching) && !dimsMatch;

  const overviewLoading = branchLoading || trendLoading || topDepLoading;
  // Any-error flag for the single page-level hint below the KPI row. Each chart
  // / table renders its own inline error state so a timeout on one query never
  // blacks out the whole page.
  const overviewAnyError = branchError || trendError || topDepError;

  return (
    <>
      <TopBar
        title="Deposit Portfolio"
        subtitle="Deposit balances from public.get_deposit — GAM × EAB × dates"
        {...topBarProps}
        onExport={explorerRows.length > 0 ? handleExport : undefined}
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        {/* ══════════════════════════════════════════════════════════════════════
            Portfolio Overview — live data from get_deposit
            3 parallel queries (branch snapshot · monthly trend · top depositors)
            ══════════════════════════════════════════════════════════════════════ */}

        {/* Headline KPIs — all live */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard
            label="Total Deposits"
            value={overviewLoading ? '…' : formatNPR(totalDeposits)}
            iconBg="var(--accent-blue-dim)"
            subtitle={snapshotDate ? `As of ${snapshotDate}` : 'As of latest'}
          />
          <KPICard
            label="Branches Reporting"
            value={overviewLoading ? '…' : branchCount.toLocaleString()}
            iconBg="var(--accent-teal-dim)"
            subtitle="Distinct GAM branches with balances"
          />
          <KPICard
            label="Top Branch Share"
            value={overviewLoading ? '…' : formatPercent(topBranchShare)}
            iconBg="var(--accent-purple-dim)"
            subtitle={topBranchName === '—' ? 'No data' : topBranchName}
          />
          <KPICard
            label="Period Covered"
            value={
              filters.startDate && filters.endDate
                ? `${filters.startDate} → ${filters.endDate}`
                : '—'
            }
            iconBg="var(--accent-amber-dim)"
            subtitle={`${trendSeries.length} month${trendSeries.length === 1 ? '' : 's'} in trend`}
          />
        </div>

        {overviewAnyError && (
          <div className="rounded-xl border border-accent-amber/30 bg-accent-amber/5 px-4 py-3 text-[11px] text-accent-amber">
            Some overview queries timed out. The page shows what loaded; narrow
            the period (e.g. a single month) or add a branch / customer filter
            to recover the rest.
          </div>
        )}

        {/* Charts row: Monthly Trend + Top Branches */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard
            title="Monthly Balance Trend"
            subtitle="Deposit balance at each month-end (d.date = d.month_enddate)"
            className="lg:col-span-2"
          >
            {trendLoading ? (
              <div className="flex items-center justify-center h-[260px] text-[11px] text-text-muted">
                Loading trend…
              </div>
            ) : trendError ? (
              <div className="flex flex-col items-center justify-center gap-1 h-[260px] text-center px-4">
                <p className="text-[11px] font-semibold text-accent-red">Trend query timed out</p>
                <p className="text-[10.5px] text-text-muted max-w-[360px]">
                  year_month × eab over a multi-year window is expensive.
                  Narrow the period to load this chart.
                </p>
              </div>
            ) : trendSeries.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-[11px] text-text-muted">
                No month-end balances in the selected window.
              </div>
            ) : (
              <PremiumLineChart
                data={trendSeries as unknown as Record<string, unknown>[]}
                xAxisKey="year_month"
                series={[{ dataKey: 'deposit', name: 'Deposit', color: '#6366F1' }]}
                formatValue={formatNPR}
                height={260}
              />
            )}
          </ChartCard>

          <ChartCard title="Top 10 Branches" subtitle={`Deposit on ${snapshotDate ?? 'latest'}`}>
            {branchLoading ? (
              <div className="flex items-center justify-center h-[260px] text-[11px] text-text-muted">
                Loading branches…
              </div>
            ) : branchError ? (
              <div className="flex flex-col items-center justify-center gap-1 h-[260px] text-center px-4">
                <p className="text-[11px] font-semibold text-accent-red">Branch query timed out</p>
                <p className="text-[10.5px] text-text-muted max-w-[260px]">
                  Try a narrower period or apply a branch filter.
                </p>
              </div>
            ) : topBranches.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-[11px] text-text-muted">
                No branch data for this snapshot.
              </div>
            ) : (
              <PremiumBarChart
                data={topBranches as unknown as Record<string, unknown>[]}
                xAxisKey="gam_branch"
                series={[{ dataKey: 'deposit', name: 'Deposit', color: '#14B8A6' }]}
                layout="horizontal"
                formatValue={formatNPR}
                height={260}
                yAxisWidth={120}
              />
            )}
          </ChartCard>
        </div>

        {/* Top 10 Depositors */}
        <section
          className="rounded-xl border border-border bg-bg-card overflow-hidden"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display text-[13.5px] font-bold tracking-tight text-text-primary">
                Top 10 Depositors
              </h3>
              <p className="text-[10.5px] text-text-muted mt-0.5">
                {snapshotDate
                  ? `Top CIFs by balance on ${snapshotDate} · concentration view`
                  : 'Top CIFs by latest balance'}
              </p>
            </div>
          </div>
          {topDepLoading ? (
            <div className="p-4">
              <StandardDashboardSkeleton />
            </div>
          ) : topDepError ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-[12px] font-semibold text-accent-red">Top depositors query timed out</p>
              <p className="text-[11px] text-text-muted max-w-md mx-auto">
                cif_id × acct_name over the full account book is heavy. Try a narrower period or add a customer / branch filter.
              </p>
            </div>
          ) : topDepositors.length === 0 ? (
            <div className="p-8 text-center text-[12px] text-text-muted">
              No depositor data for this snapshot.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead className="bg-bg-surface">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-secondary border-b border-border w-[80px]">#</th>
                    <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-secondary border-b border-border">CIF</th>
                    <th className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-secondary border-b border-border">Account Name</th>
                    <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-secondary border-b border-border">Deposit</th>
                    <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-secondary border-b border-border w-[120px]">% of Book</th>
                  </tr>
                </thead>
                <tbody>
                  {topDepositors.map((r, i) => (
                    <tr key={`${r.cif_id}-${i}`} className="border-b border-border/30 last:border-0 hover:bg-row-hover">
                      <td className="px-3 py-2 text-text-muted font-mono text-xs">{i + 1}</td>
                      <td className="px-3 py-2 text-text-primary font-mono text-xs whitespace-nowrap">{r.cif_id}</td>
                      <td className="px-3 py-2 text-text-primary">{r.acct_name}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-text-primary whitespace-nowrap">
                        {formatNPR(r.deposit)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-accent-blue whitespace-nowrap">
                        {formatPercent(r.share)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Feeds that get_deposit does not supply — kept as placeholders so the
            page communicates what's coming next without faking the numbers. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <PlaceholderPanel
            title="Deposit Mix by Product"
            subtitle="CASA / Fixed / Call / Margin split"
            status="Awaiting integration"
            statusTone="amber"
            message="No product-level tag in GAM × EAB."
            hint="Expected inputs: product / scheme_type column on gam, or a deposit-master join."
            icon="🥧"
          />
          <PlaceholderPanel
            title="Cost of Funds"
            subtitle="Weighted deposit rate trend"
            status="Awaiting integration"
            statusTone="amber"
            message="No daily interest-rate feed connected."
            hint="Expected inputs: product-level rate cards, daily weighted-average cost."
            icon="💰"
          />
          <PlaceholderPanel
            title="Maturity Ladder"
            subtitle="Fixed-deposit rollover schedule"
            status="Awaiting integration"
            statusTone="amber"
            message="No FD maturity calendar connected."
            hint="Expected inputs: FD maturity dates, interest-rate book, rollover intent."
            icon="📅"
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            Ad-hoc Breakdown — user-driven dim picker + paginated table
            ══════════════════════════════════════════════════════════════════════ */}

        <div className="flex flex-col gap-1 pt-2">
          <h2 className="font-display text-[15px] font-bold tracking-tight text-text-primary">
            Ad-hoc Breakdown
          </h2>
          <p className="text-[11px] text-text-muted">
            Pick dimensions to GROUP BY and page through the full result set.
          </p>
        </div>

        {/* Two-column layout: dim chooser on the left, results on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
          {/* Dim chooser */}
          <aside
            className="rounded-xl border border-border bg-bg-card"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="border-b border-border px-4 py-3">
              <h3 className="font-display text-[13.5px] font-bold tracking-tight text-text-primary">
                Dimensions
              </h3>
              <p className="text-[10.5px] text-text-muted mt-0.5">
                Choose which fields to GROUP BY. The procedure always emits{' '}
                <code className="font-mono text-[10px] text-accent-blue">deposit</code>.
              </p>
            </div>
            <ul className="divide-y divide-border">
              {DEPOSIT_DIMS.map((dim) => {
                const selected = selectedDims.includes(dim.key);
                return (
                  <li
                    key={dim.key}
                    className={`transition-colors border-l-2 ${
                      selected
                        ? 'bg-accent-blue/5 border-accent-blue'
                        : 'border-transparent hover:bg-row-hover'
                    }`}
                  >
                    <label className="flex items-start gap-3 px-4 py-2.5 cursor-pointer select-none">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleDim(dim.key)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[12px] font-medium ${
                              selected ? 'text-accent-blue' : 'text-text-primary'
                            }`}
                          >
                            {dim.label}
                          </span>
                          {dim.isDate && (
                            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-amber/30 bg-accent-amber/10 text-accent-amber">
                              date
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-muted mt-0.5">{dim.description}</p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Results */}
          <section
            className="rounded-xl border border-border bg-bg-card overflow-hidden"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-display text-[13.5px] font-bold tracking-tight text-text-primary">
                  Deposit Balances
                </h3>
                <p className="text-[10.5px] text-text-muted mt-0.5">
                  {selectedDims.length === 0
                    ? 'Select at least one dimension to fetch data.'
                    : `${explorerTotal.toLocaleString()} grouped row${explorerTotal === 1 ? '' : 's'} · ${
                        explorerFetching ? 'updating…' : 'from public.get_deposit'
                      }`}
                </p>
              </div>
            </div>

            {selectedDims.length === 0 ? (
              <div className="p-8 text-center text-[12px] text-text-muted">
                Pick a dimension from the left to GROUP BY.
              </div>
            ) : explorerInitialLoad ? (
              <div className="p-4">
                <StandardDashboardSkeleton />
              </div>
            ) : explorerIsError ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-[12px] font-semibold text-accent-red">Failed to load deposits.</p>
                <p className="text-[11px] text-text-muted max-w-md mx-auto leading-relaxed">
                  The deposit query can time out when a broad date range is combined with
                  high-cardinality dimensions like <code className="font-mono text-[10px]">ACCT Num</code>{' '}
                  or <code className="font-mono text-[10px]">ACID</code>.
                  Try narrowing the period (e.g. a single month) or adding a branch /
                  customer filter before re-running.
                </p>
                {explorerErrorObj instanceof Error && (
                  <p className="text-[10px] text-text-muted font-mono">{explorerErrorObj.message}</p>
                )}
              </div>
            ) : explorerRows.length === 0 ? (
              <div className="p-8 text-center text-[12px] text-text-muted">
                No rows matched the current filters.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[12px]">
                    <thead className="bg-bg-surface sticky top-0 z-10">
                      <tr>
                        {orderedDims.map((k) => (
                          <th
                            key={k}
                            className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-secondary border-b border-border whitespace-nowrap"
                          >
                            {DEPOSIT_DIMS.find((d) => d.key === k)?.label ?? k}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-secondary border-b border-border whitespace-nowrap">
                          Deposit
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {explorerRows.map((row, i) => {
                        const r = row as Record<string, unknown>;
                        const deposit = coerceNumber(r.deposit);
                        return (
                          <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-row-hover">
                            {orderedDims.map((k) => (
                              <td key={k} className="px-3 py-2 text-text-primary whitespace-nowrap">
                                {formatDimCell(r[k])}
                              </td>
                            ))}
                            <td className="px-3 py-2 text-right font-mono text-xs text-text-primary whitespace-nowrap">
                              {deposit === null ? '—' : formatNPR(deposit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination — same visual style as pivot / HTD panels */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <div className="text-[10.5px] text-text-muted">
                      Showing {((explorerPage - 1) * PAGE_SIZE) + 1}–
                      {Math.min(explorerPage * PAGE_SIZE, explorerTotal).toLocaleString()} of {explorerTotal.toLocaleString()} rows
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={explorerPage <= 1}
                        onClick={() => setExplorerPage(1)}
                        className="px-2 py-1 rounded border border-border bg-bg-input text-[10.5px] text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        «
                      </button>
                      <button
                        type="button"
                        disabled={explorerPage <= 1}
                        onClick={() => setExplorerPage((p) => p - 1)}
                        className="px-2 py-1 rounded border border-border bg-bg-input text-[10.5px] text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p: number;
                        if (totalPages <= 5) p = i + 1;
                        else if (explorerPage <= 3) p = i + 1;
                        else if (explorerPage >= totalPages - 2) p = totalPages - 4 + i;
                        else p = explorerPage - 2 + i;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setExplorerPage(p)}
                            className={`min-w-[28px] px-2 py-1 rounded text-[10.5px] font-semibold transition-colors ${
                              p === explorerPage
                                ? 'bg-accent-blue text-white shadow-sm'
                                : 'border border-border bg-bg-input text-text-secondary hover:bg-bg-card'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        disabled={explorerPage >= totalPages}
                        onClick={() => setExplorerPage((p) => p + 1)}
                        className="px-2 py-1 rounded border border-border bg-bg-input text-[10.5px] text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                      <button
                        type="button"
                        disabled={explorerPage >= totalPages}
                        onClick={() => setExplorerPage(totalPages)}
                        className="px-2 py-1 rounded border border-border bg-bg-input text-[10.5px] text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
