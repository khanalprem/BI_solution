'use client';

import { useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { PlaceholderPanel } from '@/components/ui/PlaceholderPanel';
import { Checkbox } from '@/components/ui/checkbox';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { formatNPR } from '@/lib/formatters';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';
import { useDeposits } from '@/lib/hooks/useDashboardData';
import { exportTableToCsv } from '@/lib/exportCsv';

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

const PAGE_SIZE = 50;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DepositsDashboard() {
  const { filters, setFilters, filtersOpen, setFiltersOpen, handleClearFilters, topBarProps } = useDashboardPage();

  // Default to gam_branch so the page renders something useful on first load.
  const [selectedDims, setSelectedDims] = useState<DepositDimKey[]>(['gam_branch']);
  const [page, setPage] = useState(1);

  const toggleDim = (key: DepositDimKey) => {
    setPage(1);
    setSelectedDims((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  // Send dims in the order defined in DEPOSIT_DIMS so column ordering is stable.
  const orderedDims = useMemo(
    () => DEPOSIT_DIMS.filter((d) => selectedDims.includes(d.key)).map((d) => d.key),
    [selectedDims],
  );

  const { data, isLoading, isFetching, isError, error } = useDeposits(
    filters,
    orderedDims,
    page,
    PAGE_SIZE,
  );

  const rows   = data?.rows   ?? [];
  const total  = data?.total_rows ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Page-local total so the KPI card reflects the current view. The procedure
  // does not return a book-wide deposit total, so we label this "Current page"
  // to avoid misleading users when they are paginating.
  const pageDepositTotal = useMemo(
    () => rows.reduce((s, r) => s + (coerceNumber((r as Record<string, unknown>).deposit) ?? 0), 0),
    [rows],
  );

  const handleExport = () => {
    if (rows.length === 0) return;
    const headers = [...orderedDims, 'deposit'];
    exportTableToCsv(`deposits_${new Date().toISOString().slice(0, 10)}.csv`, headers,
      rows as unknown as Record<string, unknown>[]);
  };

  const initialLoad = isLoading && !data;

  return (
    <>
      <TopBar
        title="Deposit Portfolio"
        subtitle="Deposit balances from public.get_deposit — GAM × EAB × dates"
        {...topBarProps}
        onExport={rows.length > 0 ? handleExport : undefined}
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        {/* Headline KPIs — only the procedure-backed deposit sum is real. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KPICard
            label="Total Deposits (Page)"
            value={formatNPR(pageDepositTotal)}
            iconBg="var(--accent-blue-dim)"
            subtitle={`Sum of deposit across ${rows.length.toLocaleString()} row${rows.length === 1 ? '' : 's'}`}
          />
          <KPICard
            label="Matching Rows"
            value={total.toLocaleString()}
            iconBg="var(--accent-teal-dim)"
            subtitle={`${selectedDims.length} dimension${selectedDims.length === 1 ? '' : 's'} selected`}
          />
          <KPICard
            label="Page"
            value={`${page} / ${totalPages}`}
            iconBg="var(--accent-purple-dim)"
            subtitle={`Page size ${PAGE_SIZE}`}
          />
          <KPICard
            label="Date Window"
            value={filters.startDate && filters.endDate ? `${filters.startDate} → ${filters.endDate}` : '—'}
            iconBg="var(--accent-amber-dim)"
            subtitle="Applied to d.date via date_where"
          />
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
                    : `${total.toLocaleString()} grouped row${total === 1 ? '' : 's'} · ${
                        isFetching ? 'updating…' : 'from public.get_deposit'
                      }`}
                </p>
              </div>
            </div>

            {selectedDims.length === 0 ? (
              <div className="p-8 text-center text-[12px] text-text-muted">
                Pick a dimension from the left to GROUP BY.
              </div>
            ) : initialLoad ? (
              <div className="p-4">
                <StandardDashboardSkeleton />
              </div>
            ) : isError ? (
              <div className="p-8 text-center text-[12px] text-accent-red">
                Failed to load deposits
                {error instanceof Error ? `: ${error.message}` : '.'}
              </div>
            ) : rows.length === 0 ? (
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
                      {rows.map((row, i) => {
                        const r = row as Record<string, unknown>;
                        const deposit = coerceNumber(r.deposit);
                        return (
                          <tr key={i} className="hover:bg-row-hover border-b border-border/60">
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
                      Showing {((page - 1) * PAGE_SIZE) + 1}–
                      {Math.min(page * PAGE_SIZE, total).toLocaleString()} of {total.toLocaleString()} rows
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage(1)}
                        className="px-2 py-1 rounded border border-border bg-bg-input text-[10.5px] text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        «
                      </button>
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-2 py-1 rounded border border-border bg-bg-input text-[10.5px] text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p: number;
                        if (totalPages <= 5) p = i + 1;
                        else if (page <= 3) p = i + 1;
                        else if (page >= totalPages - 2) p = totalPages - 4 + i;
                        else p = page - 2 + i;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p)}
                            className={`min-w-[28px] px-2 py-1 rounded text-[10.5px] font-semibold transition-colors ${
                              p === page
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
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-2 py-1 rounded border border-border bg-bg-input text-[10.5px] text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => setPage(totalPages)}
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

        {/* Feeds that get_deposit does not supply — kept as placeholders so the
            page communicates what's coming next without faking the numbers. */}
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
            title="Cost of Funds"
            subtitle="Weighted deposit rate"
            status="Awaiting integration"
            statusTone="amber"
            message="No daily interest-rate feed connected."
            hint="Expected inputs: product-level rate cards, daily weighted-average cost."
            icon="💰"
          />
        </div>
      </div>
    </>
  );
}
