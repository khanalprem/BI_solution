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
import { SearchableMultiSelect } from '@/components/ui/Select';
import { MultiValueChipInput } from '@/components/ui/MultiValueChipInput';
import { formatNPR, formatPercent } from '@/lib/formatters';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';
import { useDeposits, useFilterValues } from '@/lib/hooks/useDashboardData';
import { exportTableToCsv } from '@/lib/exportCsv';
import type { DashboardFilters, FilterValuesResponse, LookupOption } from '@/types';

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

// `kind` drives which inline filter editor renders below the dim row:
//   • date        — Multi/Range mode toggle + date-formatted text inputs
//   • categorical — SearchableMultiSelect populated from /filters/values
//   • text        — MultiValueChipInput (free-text chips)
type DepositDimKind = 'date' | 'categorical' | 'text';
type DateLikeType  = 'date' | 'month' | 'quarter' | 'year';

interface DepositDimDef {
  key:   DepositDimKey;
  label: string;
  description: string;
  kind:  DepositDimKind;
  // For date-kind dims
  dateType?:  DateLikeType;
  // For all filterable kinds — which DashboardFilters key to read/write
  filterKey?: keyof DashboardFilters;
  fromKey?:   keyof DashboardFilters;
  toKey?:     keyof DashboardFilters;
  // For categorical dims — which FilterValuesResponse field provides options
  optionsKey?: keyof FilterValuesResponse;
}

const DEPOSIT_DIMS: DepositDimDef[] = [
  { key: 'year',         label: 'Year',         description: 'Calendar year (YYYY) — joined on d.date = d.year_enddate',         kind: 'date', dateType: 'year',    filterKey: 'year',        fromKey: 'yearFrom',        toKey: 'yearTo' },
  { key: 'year_quarter', label: 'Year Quarter', description: 'Quarterly period — joined on d.date = d.quarter_enddate',          kind: 'date', dateType: 'quarter', filterKey: 'yearQuarter', fromKey: 'yearQuarterFrom', toKey: 'yearQuarterTo' },
  { key: 'year_month',   label: 'Year Month',   description: 'Monthly period — joined on d.date = d.month_enddate',              kind: 'date', dateType: 'month',   filterKey: 'yearMonth',   fromKey: 'yearMonthFrom',   toKey: 'yearMonthTo' },
  { key: 'tran_date',    label: 'Date',         description: 'Daily granularity — no date_join; raw d.date',                     kind: 'date', dateType: 'date',    filterKey: 'tranDate',    fromKey: 'tranDateFrom',    toKey: 'tranDateTo' },
  { key: 'gam_province', label: 'GAM Province', description: 'Province of the account branch (p.name)',                          kind: 'categorical', filterKey: 'province',   optionsKey: 'provinces' },
  { key: 'gam_cluster',  label: 'GAM Cluster',  description: 'Account branch cluster (c.cluster_name)',                          kind: 'categorical', filterKey: 'cluster',    optionsKey: 'clusters'  },
  { key: 'gam_branch',   label: 'GAM Branch',   description: 'Account registration branch (b.branch_name)',                      kind: 'categorical', filterKey: 'branchCode', optionsKey: 'branches'  },
  { key: 'cif_id',       label: 'CIF Id',       description: 'Customer CIF ID (g.cif_id)',                                       kind: 'categorical', filterKey: 'cifId',      optionsKey: 'cif_ids'   },
  { key: 'acid',         label: 'ACID',         description: 'Internal account identifier (g.acid)',                             kind: 'categorical', filterKey: 'acid',       optionsKey: 'acids'     },
  { key: 'acct_num',     label: 'ACCT Num',     description: 'Account number (g.acct_num)',                                      kind: 'categorical', filterKey: 'acctNum',    optionsKey: 'acct_nums' },
  { key: 'acct_name',    label: 'ACCT Name',    description: 'Account holder name (g.acct_name)',                                kind: 'text',        filterKey: 'acctName' },
];

// Mode toggles inside the per-dim filter editor. Mirrors the pivot page UX so
// users get a consistent feel.
type DateFilterMode        = 'multi' | 'range';
type CategoricalFilterMode = 'single' | 'multi';

// ─── Date input formatting (mirrors pivot/page.tsx) ──────────────────────────
// Live-format date filter inputs as the user types: insert separators
// automatically (YYYY-MM-DD, YYYY-MM, YYYY-Qn). On blur, pad single-digit
// month / day so "2024-2-9" becomes "2024-02-09".
function formatDateValue(raw: string, type: DateLikeType): string {
  if (type === 'year') {
    return raw.replace(/\D/g, '').slice(0, 4);
  }
  if (type === 'quarter') {
    const digits = raw.replace(/[^\d]/g, '').slice(0, 5);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-Q${digits.slice(4)}`;
  }
  if (type === 'month') {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  // date: YYYY-MM-DD
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function padDateOnBlur(value: string, type: DateLikeType): string {
  const v = value.trim();
  if (!v) return v;
  if (type === 'date') {
    const m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  if (type === 'month') {
    const m = v.match(/^(\d{4})-(\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}`;
  }
  return v;
}

const DATE_PLACEHOLDER: Record<DateLikeType, string> = {
  date:    'YYYY-MM-DD, YYYY-MM-DD, …',
  month:   'YYYY-MM, YYYY-MM, …',
  quarter: 'YYYY-Qn, YYYY-Qn, …',
  year:    'YYYY, YYYY, …',
};

// Set of dim keys that are date-typed. Used to split the dim sidebar into
// "Date Dimensions" (with the shared Pivot toggle in the header) and the rest,
// and to compute selectedDateDims / partitionbyClause for the date-pivot view.
const DATE_DIM_KEYS = new Set<DepositDimKey>(['year', 'year_quarter', 'year_month', 'tran_date']);

// Mirrors `DEPOSIT_DIMENSIONS[k][:sql]` in production_data_service.rb.
// Used by the SQL preview so we can show the prepared CALL even before the
// procedure has been called (e.g. while the user is still configuring filters).
const DEPOSIT_DIM_SQL: Record<DepositDimKey, string> = {
  gam_branch:   'b.branch_name',
  gam_province: 'p.name',
  gam_cluster:  'c.cluster_name',
  acct_num:     'g.acct_num',
  acct_name:    'g.acct_name',
  acid:         'g.acid',
  cif_id:       'g.cif_id',
  tran_date:    'd.date',
  year_month:   'd.year_month',
  year_quarter: 'd.year_quarter',
  year:         'd.year',
};

// Mirrors `DEPOSIT_DIMENSIONS[k][:date_join]` in production_data_service.rb.
// Only the coarse date dims need a date_join — `tran_date` is naturally daily.
const DEPOSIT_DATE_JOIN: Partial<Record<DepositDimKey, string>> = {
  year_month:   'AND d.date = d.month_enddate',
  year_quarter: 'AND d.date = d.quarter_enddate',
  year:         'AND d.date = d.year_enddate',
};

// Priority for active date dim — finest grain wins (matches backend
// DEPOSIT_DATE_DIM_PRIORITY).
const DEPOSIT_DATE_DIM_PRIORITY: DepositDimKey[] = ['tran_date', 'year_month', 'year_quarter', 'year'];

// Client-side mirror of `build_deposit_date_where` in production_data_service.rb.
// Lets the SQL preview show the exact `date_where` predicate even before the
// backend has been called. Keep in sync with `DEPOSIT_DATE_FILTER_COLS` and
// `DEPOSIT_DATE_VALUE_FORMAT` on the service. Returns the predicate WITHOUT
// a leading "AND" — the procedure concatenates it directly into a WHERE clause.
const DEPOSIT_DATE_WHERE_COLS: Array<{
  column: string;
  exact:  keyof DashboardFilters;
  from:   keyof DashboardFilters;
  to:     keyof DashboardFilters;
  format: RegExp;
}> = [
  { column: 'd.date',         exact: 'tranDate',    from: 'tranDateFrom',    to: 'tranDateTo',    format: /^\d{4}-\d{2}-\d{2}$/ },
  { column: 'd.year',         exact: 'year',        from: 'yearFrom',        to: 'yearTo',        format: /^\d{4}$/ },
  { column: 'd.year_month',   exact: 'yearMonth',   from: 'yearMonthFrom',   to: 'yearMonthTo',   format: /^\d{4}-\d{2}$/ },
  { column: 'd.year_quarter', exact: 'yearQuarter', from: 'yearQuarterFrom', to: 'yearQuarterTo', format: /^\d{4}-Q[1-4]$/i },
];

function asArrayOfStrings(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((s) => typeof s === 'string' && s.trim().length > 0).map(String);
  if (typeof v === 'string' && v.trim().length > 0) return [v];
  return [];
}

function buildClientDateWhere(filters: DashboardFilters): string {
  const clauses: string[] = [];
  for (const { column, exact, from, to, format } of DEPOSIT_DATE_WHERE_COLS) {
    // Drop values that don't match the column's expected format so the
    // preview never shows a clause Postgres would reject (e.g. "2024-01"
    // landing in a tran_date input which must be YYYY-MM-DD).
    const valid   = (s: string) => format.test(s);
    const fromVal = ((filters[from] as string | undefined)?.trim() || '');
    const toVal   = ((filters[to]   as string | undefined)?.trim() || '');
    const vals    = asArrayOfStrings(filters[exact]).filter(valid);
    const fv      = valid(fromVal) ? fromVal : '';
    const tv      = valid(toVal)   ? toVal   : '';

    if (fv && tv)               clauses.push(`${column} BETWEEN '${fv}' AND '${tv}'`);
    else if (fv)                clauses.push(`${column} >= '${fv}'`);
    else if (tv)                clauses.push(`${column} <= '${tv}'`);
    else if (vals.length === 1) clauses.push(`${column} = '${vals[0]}'`);
    else if (vals.length > 1)   clauses.push(`${column} IN (${vals.map((v) => `'${v}'`).join(', ')})`);
  }
  if (clauses.length > 0) return clauses.join(' AND ');

  // Period-selector fallback — same as the backend's last-resort branch.
  const sd = filters.startDate?.trim() || '';
  const ed = filters.endDate?.trim()   || '';
  if (sd && ed) return `d.date BETWEEN '${sd}' AND '${ed}'`;
  return '';
}

// Cell separator used by the pivot view to compose multi-date-dim column keys.
// E.g. selecting both `year` and `year_month` produces a column key
// "2024" + DATE_PIVOT_SEP + "2024-02". \x01 is unlikely to appear in real data.
const DATE_PIVOT_SEP = '\x01';

// ─── Procedure-call preview styling ──────────────────────────────────────────
// Colour-coded line types used by the collapsible "CALL public.get_deposit(...)"
// preview at the bottom of the results section. Mirrors the pivot page's SqlLine
// helper so users get a consistent look across both pages.
type SqlLineKind = 'header' | 'select' | 'where' | 'group' | 'partition' | 'eab' | 'page' | 'footer' | 'placeholder';
type SqlLine     = { text: string; kind: SqlLineKind };

const KIND_CLS: Record<SqlLineKind, string> = {
  header:      'text-text-primary font-semibold',
  select:      'text-accent-blue',
  where:       'text-accent-green',
  group:       'text-accent-purple',
  partition:   'text-accent-purple',
  eab:         'text-accent-teal',
  page:        'text-text-muted',
  footer:      'text-text-primary font-semibold',
  placeholder: 'text-text-muted italic',
};

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

// Match the pivot page's default — keeps initial paint cheap and lets the
// user step through with the page-pill controls below the table. Bumped to
// 200 in pivot mode so the client-side pivot has enough cells to be useful
// (see effectivePageSize below).
const PAGE_SIZE = 10;

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

  // Per-dim sort state. Mirrors the pivot page:
  //   • orderFields  — ordered list of dim keys the user has flagged for sort
  //   • orderDirs    — direction per key (default DESC; cycles OFF → DESC → ASC → OFF)
  // When both are empty no `orderby_clause` is sent to the procedure, which
  // falls back to the proc's internal default. The sort badges next to each
  // dim show the sort priority (sort #1, #2, …) in click order.
  const [orderFields, setOrderFields] = useState<DepositDimKey[]>([]);
  const [orderDirs, setOrderDirs]     = useState<Record<string, 'asc' | 'desc'>>({});

  // Date pivot toggle — when enabled and at least one date dim is selected,
  // the date dim values are pivoted to column headers in the result table and
  // a `PARTITION BY <date dims>` clause is sent to get_deposit so its
  // ROW_NUMBER ranking partitions per-date instead of globally.
  const [datePivotEnabled, setDatePivotEnabled] = useState(false);

  // Shared sort direction across the four date dims. `null` = off. Two
  // buttons (↑ ASC and ↓ DESC) in the Date Dimensions container header
  // drive this. When set (and pivot is off), all selected date dims auto-
  // include in ORDER BY in fixed priority order (tran_date → year_month →
  // year_quarter → year, finest grain first), with this direction applied.
  // Disabled while pivot is on because the auto-pivot ORDER BY already
  // covers the date dims.
  const [dateSortDir, setDateSortDir] = useState<'asc' | 'desc' | null>(null);

  // Show/hide the colour-coded `CALL public.get_deposit(...)` preview at the
  // bottom of the results section. Collapsed by default — it's a developer-
  // detail panel for understanding what's actually being sent to the procedure.
  const [showProcPreview, setShowProcPreview] = useState(false);

  // Per-dim filter UI state — which row's inline editor is open, and the
  // mode toggle inside each editor. Mirrors the pivot page so the UX feels the
  // same when switching between pages.
  const [expandedDim, setExpandedDim] = useState<DepositDimKey | null>(null);
  const [dateFilterModes, setDateFilterModes] = useState<Record<string, DateFilterMode>>({});
  const [categoricalFilterModes, setCategoricalFilterModes] = useState<Record<string, CategoricalFilterMode>>({});

  // Filter dropdown options — fetched once per session via /filters/values.
  const { data: filterValues } = useFilterValues();

  const toggleDim = (key: DepositDimKey) => {
    setExplorerPage(1);
    setSelectedDims((prev) => {
      const wasSelected = prev.includes(key);
      // When un-checking a dim, also drop any sort it had — leaving a sort
      // entry on a deselected dim would silently inject an ORDER BY token the
      // user can't see. Stays in sync with the visible dim list.
      if (wasSelected) {
        setOrderFields((of) => of.filter((k) => k !== key));
        setOrderDirs((od)   => { const n = { ...od }; delete n[key]; return n; });
      }
      return wasSelected ? prev.filter((k) => k !== key) : [...prev, key];
    });
  };

  // ─── Per-dim filter helpers ──────────────────────────────────────────────
  // Read current value(s) of a dim's filter from the shared filters object.
  const getMultiValue = (dim: DepositDimDef): string[] => {
    if (!dim.filterKey) return [];
    const v = filters[dim.filterKey];
    if (Array.isArray(v)) return v as string[];
    if (typeof v === 'string' && v) return [v];
    return [];
  };

  // Write a filter value back into the DashboardFilters state (or clear it).
  // Also resets the explorer page to 1 so the user always starts from the top
  // when they change a filter.
  const setFieldFilter = (key: keyof DashboardFilters, value: string | string[] | undefined) => {
    setFilters({ ...filters, [key]: value });
    setExplorerPage(1);
  };

  const fieldHasFilter = (dim: DepositDimDef): boolean => {
    if (!dim.filterKey) return false;
    if (dim.fromKey && filters[dim.fromKey]) return true;
    if (dim.toKey && filters[dim.toKey]) return true;
    const v = filters[dim.filterKey];
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    return false;
  };

  const clearRangeFilters = (dim: DepositDimDef) => {
    if (!dim.fromKey && !dim.toKey) return;
    // Spread + cast to a writable shape so we can assign `undefined` to either
    // optional range key without TS complaining about exact-readonly inference
    // on individual DashboardFilters fields.
    const next: Record<string, unknown> = { ...filters };
    if (dim.fromKey) next[dim.fromKey as string] = undefined;
    if (dim.toKey)   next[dim.toKey   as string] = undefined;
    setFilters(next as unknown as DashboardFilters);
    setExplorerPage(1);
  };

  const setDateMode = (key: DepositDimKey, mode: DateFilterMode) =>
    setDateFilterModes((prev) => ({ ...prev, [key]: mode }));

  const setCategoricalMode = (key: DepositDimKey, mode: CategoricalFilterMode) =>
    setCategoricalFilterModes((prev) => ({ ...prev, [key]: mode }));

  const getOptions = (dim: DepositDimDef): { value: string; label: string }[] => {
    if (!dim.optionsKey || !filterValues) return [];
    const opts = filterValues[dim.optionsKey] as LookupOption[] | undefined;
    return (opts ?? []).map((o) => ({ value: o.value, label: o.name }));
  };

  // Send dims in the order defined in DEPOSIT_DIMS so column ordering is stable.
  const orderedDims = useMemo(
    () => DEPOSIT_DIMS.filter((d) => selectedDims.includes(d.key)).map((d) => d.key),
    [selectedDims],
  );

  // ── Date pivot derivations ──────────────────────────────────────────────
  // Selected dims split into date vs non-date. When pivoting, dates become
  // pivot columns and non-dates remain row labels.
  const selectedDateDims    = useMemo(() => orderedDims.filter((k) => DATE_DIM_KEYS.has(k)), [orderedDims]);
  const selectedNonDateDims = useMemo(() => orderedDims.filter((k) => !DATE_DIM_KEYS.has(k)), [orderedDims]);

  // ── Mandatory-date-filter gate ──────────────────────────────────────────
  // The Ad-hoc Breakdown explorer is gated on having at least ONE of the four
  // date-dim filters set. Without it the proc falls back to a year-wide
  // BETWEEN scan (period-selector window) which is expensive and almost always
  // not what the user wanted — making it explicit forces them to pick a real
  // window before firing the query.
  const isFilterValueSet = (v: string | string[] | undefined): boolean => {
    if (Array.isArray(v)) return v.length > 0;
    return typeof v === 'string' && v.trim().length > 0;
  };

  const hasDateDimFilter = useMemo(() => (
    isFilterValueSet(filters.tranDate)         || isFilterValueSet(filters.tranDateFrom)    || isFilterValueSet(filters.tranDateTo) ||
    isFilterValueSet(filters.yearMonth)        || isFilterValueSet(filters.yearMonthFrom)   || isFilterValueSet(filters.yearMonthTo) ||
    isFilterValueSet(filters.yearQuarter)      || isFilterValueSet(filters.yearQuarterFrom) || isFilterValueSet(filters.yearQuarterTo) ||
    isFilterValueSet(filters.year)             || isFilterValueSet(filters.yearFrom)        || isFilterValueSet(filters.yearTo)
  ), [filters]);

  // The toggle is "armed" only when at least one date dim is checked. Otherwise
  // there's nothing to pivot — the button stays disabled in the UI.
  const pivotEnabled = datePivotEnabled && selectedDateDims.length > 0;

  // Sent to /production/deposits when pivoting. The proc's ROW_NUMBER OVER
  // (PARTITION BY ...) ranks rows within each partition so pagination behaves
  // sanely (you don't lose rows for one date when another date dominates the
  // top of a global ranking). Empty string when pivot is off → procedure
  // falls back to global pagination.
  const partitionbyClause = pivotEnabled
    ? `PARTITION BY ${selectedDateDims.join(', ')}`
    : '';

  // Page size stays at PAGE_SIZE (10) in all modes — including pivot. With a
  // small page in pivot mode the user may need to step through more pages to
  // see all dates × branches, but that's the trade-off the dashboard owners
  // chose. Use the page-pill controls below the table to navigate.
  const effectivePageSize = PAGE_SIZE;

  // Date dims to auto-include in ORDER BY when the shared date Sort toggle
  // is on. Listed in fixed priority (finest grain first) so successive sort
  // levels narrow naturally: day, then month, then quarter, then year.
  const dateSortFields = useMemo(() => {
    if (!dateSortDir) return [] as DepositDimKey[];
    return DEPOSIT_DATE_DIM_PRIORITY.filter((k) => selectedDims.includes(k));
  }, [dateSortDir, selectedDims]);

  // ORDER BY clause sent to the backend.
  //
  //   • Pivot on  → `ORDER BY <pivoted dates>, <other dims>`. Pivoted columns
  //     sort first so each row's date columns line up left→right; non-date
  //     dims follow to stabilise row identity. Manual Sort selections are
  //     ignored (the UI greys them out).
  //   • Pivot off → date Sort toggle (auto-include all selected date dims in
  //     priority order) + user's explicit per-dim Sort selections (priority
  //     follows click order). Empty when neither is active so the procedure
  //     uses its internal default ordering.
  //
  // Append " DESC" only for keys flipped to desc — leaving ASC implicit keeps
  // the controller's token whitelist happy (see sanitize_deposit_clause).
  // Defined here (above the explorer's useDeposits call) so JS hoisting rules
  // don't bite us — declaring it below would TDZ.
  const orderbyClause = useMemo(() => {
    if (pivotEnabled) {
      const parts = [...selectedDateDims, ...selectedNonDateDims];
      return parts.length > 0 ? `ORDER BY ${parts.join(', ')}` : '';
    }
    // Date Sort toggle entries first (direction = dateSortDir), then user's
    // manual sorts for any non-date dim — dedup so a date dim already auto-
    // sorted isn't appended a second time.
    const autoSet  = new Set<string>(dateSortFields);
    const extras   = orderFields.filter((k) => !autoSet.has(k));
    const all      = [...dateSortFields, ...extras];
    if (all.length === 0) return '';
    const parts = all.map((k) => {
      const isDateAuto = autoSet.has(k);
      const dir        = isDateAuto ? dateSortDir : orderDirs[k];
      return dir === 'desc' ? `${k} DESC` : k;
    });
    return `ORDER BY ${parts.join(', ')}`;
  }, [pivotEnabled, selectedDateDims, selectedNonDateDims, dateSortFields, dateSortDir, orderFields, orderDirs]);

  const {
    data: explorerData,
    isLoading: explorerLoading,
    isFetching: explorerFetching,
    isError:   explorerIsError,
    error:     explorerErrorObj,
  } = useDeposits(
    filters,
    orderedDims,
    explorerPage,
    effectivePageSize,
    partitionbyClause,
    orderbyClause,
    { enabled: hasDateDimFilter },
  );

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
  const totalPages    = Math.max(1, Math.ceil(explorerTotal / effectivePageSize));

  // ── Pivot table construction (client-side) ──────────────────────────────
  // When pivot is on, rows are reshaped: identity = non-date dim values; one
  // column per unique combination of date dim values; cell = SUM(deposit).
  // We sum because the same (rowKey, dateKey) pair may legitimately appear
  // multiple times if more than one non-date dim was selected and one of them
  // is unstable across the same date partition (rare, but defensive).
  const pivotData = useMemo(() => {
    if (!pivotEnabled || explorerRows.length === 0) return null;

    const rowMap = new Map<string, { rowDims: Record<string, unknown>; cells: Map<string, number> }>();
    const colSet = new Set<string>();

    for (const row of explorerRows as Array<Record<string, unknown>>) {
      const rowKey = selectedNonDateDims.map((k) => String(row[k] ?? '')).join('\x00');
      const colKey = selectedDateDims.map((k) => String(row[k] ?? '')).join(DATE_PIVOT_SEP);
      colSet.add(colKey);

      let entry = rowMap.get(rowKey);
      if (!entry) {
        const rowDims: Record<string, unknown> = {};
        selectedNonDateDims.forEach((k) => { rowDims[k] = row[k]; });
        entry = { rowDims, cells: new Map() };
        rowMap.set(rowKey, entry);
      }
      const dep = coerceNumber(row.deposit) ?? 0;
      entry.cells.set(colKey, (entry.cells.get(colKey) ?? 0) + dep);
    }

    // Sort columns ascending — date keys sort lexicographically as expected
    // (YYYY, YYYY-Qn, YYYY-MM, YYYY-MM-DD all collate correctly as strings).
    const columnKeys = Array.from(colSet).sort();
    const rows       = Array.from(rowMap.values());

    return { rows, columnKeys };
  }, [pivotEnabled, explorerRows, selectedNonDateDims, selectedDateDims]);

  // Decoded labels for multi-date pivot columns. "2024\x012024-02" → "2024 / 2024-02"
  const formatColLabel = (colKey: string): string =>
    colKey.split(DATE_PIVOT_SEP).join(' / ');

  // ── Procedure-call preview lines ────────────────────────────────────────
  // Colour-coded list of `CALL public.get_deposit(...)` arguments. We always
  // build the preview — even before the procedure has run — so the user can
  // see what the call WILL look like while they configure filters / dims.
  //   • SELECT / GROUP / PARTITION / ORDER / page / page_size — built from
  //     the frontend's local state (mirrors backend logic via DEPOSIT_DIM_SQL).
  //   • WHERE clauses (gam_where, date_where, branch_where, etc.) are built
  //     server-side from the active filters; we use the response's
  //     sql_preview values once available, otherwise show a "pending" hint
  //     so the user knows those will be filled in after the call returns.
  const procLines = useMemo<SqlLine[]>(() => {
    const sp = (dimsMatch ? explorerData?.sql_preview : null) ?? null;

    // Built locally from selected dims (matches the service's deposit_explorer)
    const dimSelects = orderedDims.map((k) => `${DEPOSIT_DIM_SQL[k]} AS ${k}`);
    const dimSqls    = orderedDims.map((k) => DEPOSIT_DIM_SQL[k]);
    const selectClauseLocal  = dimSelects.length > 0
      ? `${dimSelects.join(', ')}, sum(e.tran_date_bal) as deposit`
      : 'sum(e.tran_date_bal) as deposit';
    const groupbyClauseLocal = dimSqls.length > 0 ? `GROUP BY ${dimSqls.join(', ')}` : '';

    // Active date dim → date_join (finest grain wins)
    const activeDateDim = DEPOSIT_DATE_DIM_PRIORITY.find((k) => orderedDims.includes(k));
    const dateJoinLocal = activeDateDim ? (DEPOSIT_DATE_JOIN[activeDateDim] ?? '') : '';

    // Helper: prefer server-side string when we have it, otherwise placeholder
    const whereVal = (live: string | undefined): string =>
      live !== undefined ? `'${live}'` : "'<built server-side from active filters>'";

    // date_where is built client-side from the same filter rules the backend
    // uses, so the preview shows the actual predicate even before the call
    // runs. We still prefer the live server string when available — it's
    // authoritative (e.g. captures the exact start_date/end_date fallback the
    // backend chose).
    const dateWhereLocal = sp?.date_where ?? buildClientDateWhere(filters);

    const lines: SqlLine[] = [];
    if (orderedDims.length === 0) {
      lines.push({ text: '-- Pick at least one dimension to fire the call.', kind: 'placeholder' });
    } else if (!hasDateDimFilter) {
      lines.push({ text: '-- Set a date filter (Year / Year Quarter / Year Month / Date) to fire the call.', kind: 'placeholder' });
    } else if (!sp) {
      lines.push({ text: '-- Preview only — call has not been issued yet.', kind: 'placeholder' });
    }

    lines.push({ text: 'CALL public.get_deposit(', kind: 'header' });
    lines.push({ text: `  select_clause      => '${selectClauseLocal}',`, kind: 'select' });
    lines.push({ text: `  groupby_clause     => '${groupbyClauseLocal}',`, kind: 'group' });
    lines.push({
      text: `  partitionby_clause => '${partitionbyClause}',${partitionbyClause ? '  -- ✓ pivot active' : '  -- empty: no pivot'}`,
      kind: 'partition',
    });
    lines.push({ text: `  orderby_clause     => '${orderbyClause}',${orderbyClause ? '  -- ✓ user sort' : '  -- empty: proc default order'}`, kind: 'group' });
    lines.push({ text: `  gam_where          => ${whereVal(sp?.gam_where)},`,      kind: 'where' });
    lines.push({ text: `  date_where         => '${dateWhereLocal}',`,              kind: 'where' });
    lines.push({
      text: `  date_join          => '${dateJoinLocal}',${dateJoinLocal ? '  -- coarse date dim active' : ''}`,
      kind: 'eab',
    });
    lines.push({ text: `  branch_where       => ${whereVal(sp?.branch_where)},`,   kind: 'where' });
    lines.push({ text: `  province_where     => ${whereVal(sp?.province_where)},`, kind: 'where' });
    lines.push({ text: `  cluster_where      => ${whereVal(sp?.cluster_where)},`,  kind: 'where' });
    lines.push({ text: `  page               => ${explorerPage},`, kind: 'page' });
    lines.push({ text: `  page_size          => ${effectivePageSize}`, kind: 'page' });
    lines.push({ text: ')', kind: 'footer' });
    return lines;
  }, [orderedDims, partitionbyClause, orderbyClause, explorerPage, effectivePageSize, explorerData, dimsMatch, hasDateDimFilter, filters]);

  // Pivot toggle handler. Reset the page to 1 because the partition clause
  // changes the result shape and any cached page index would be meaningless.
  const togglePivot = () => {
    setDatePivotEnabled((v) => !v);
    setExplorerPage(1);
  };

  // Shared date Sort direction setter. Click a direction to activate;
  // click the active direction again to turn off. Only takes effect when
  // pivot is off — when pivot is on the auto-pivot ORDER BY already covers
  // the date dims.
  const setDateSortDirCycle = (dir: 'asc' | 'desc') => {
    setDateSortDir((prev) => (prev === dir ? null : dir));
    setExplorerPage(1);
  };

  // ── Per-dim sort: independent ASC / DESC buttons ────────────────────────
  // Each dim row has two buttons (↑ ASC and ↓ DESC). Clicking either one
  // either activates that direction or, if it's already the active direction
  // for that dim, turns the sort off. Clicking the inactive direction when
  // the other is active switches the direction in place. Click order is
  // preserved across new selections so the first-clicked dim gets sort
  // priority #1, the second gets #2, etc.
  const setSort = (key: DepositDimKey, dir: 'asc' | 'desc') => {
    const inList = orderFields.includes(key);
    const cur    = orderDirs[key];

    if (inList && cur === dir) {
      // same direction clicked again → turn off
      setOrderFields((prev) => prev.filter((k) => k !== key));
      setOrderDirs((prev)   => { const n = { ...prev }; delete n[key]; return n; });
    } else {
      if (!inList) setOrderFields((prev) => [...prev, key]);
      setOrderDirs((prev) => ({ ...prev, [key]: dir }));
    }
    setExplorerPage(1);
  };

  // Renderer for a single dim row in the sidebar. Pulled out so we can use it
  // for both the date-dimensions list (inside the Pivot-toggle container) and
  // the non-date list. Closes over all the hook state — recreated per render,
  // which is fine and matches the project's "no nested useCallback" rule.
  const renderDimRow = (dim: DepositDimDef) => {
    const selected  = selectedDims.includes(dim.key);
    const expanded  = expandedDim === dim.key;
    const filtered  = fieldHasFilter(dim);
    const isDate    = dim.kind === 'date';
    // Use literal class strings — Tailwind's JIT can't detect dynamic names.
    const labelSelectedCls = isDate ? 'text-accent-amber' : 'text-accent-blue';
    const rowSelectedBg = selected
      ? isDate ? 'bg-accent-amber/8 border-accent-amber' : 'bg-accent-blue/5 border-accent-blue'
      : 'border-transparent hover:bg-row-hover';

    const ordered  = orderFields.includes(dim.key);
    const orderIdx = orderFields.indexOf(dim.key);
    const orderDir = orderDirs[dim.key];

    return (
      <li key={dim.key} className={`transition-colors border-l-2 ${rowSelectedBg}`}>
        {/* Row: checkbox + label + (filter expand toggle) */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
          onClick={() => toggleDim(dim.key)}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => {}}
            tabIndex={-1}
            className={`pointer-events-none ${isDate ? 'data-[state=checked]:bg-accent-amber data-[state=checked]:border-accent-amber' : ''}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className={`text-[12px] font-medium ${selected ? labelSelectedCls : 'text-text-primary'}`}>
                {dim.label}
              </span>
              {isDate && (
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-amber/30 bg-accent-amber/10 text-accent-amber">
                  date
                </span>
              )}
              {selected && isDate && pivotEnabled && (
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-purple/30 bg-accent-purple/10 text-accent-purple">
                  pivot
                </span>
              )}
              {filtered && (
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-green/30 bg-accent-green/10 text-accent-green">
                  filtered
                </span>
              )}
              {/* Non-date dims: show priority + direction from manual sort. */}
              {!isDate && ordered && !pivotEnabled && (
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-amber/30 bg-accent-amber/10 text-accent-amber">
                  sort #{orderIdx + 1} {orderDir === 'desc' ? '↓' : '↑'}
                </span>
              )}
              {/* Date dims: show direction (↑/↓) when the shared Sort
                  buttons in the Date Dimensions header are active (and pivot
                  is off, so the auto-order actually applies). */}
              {isDate && dateSortDir && !pivotEnabled && selected && (
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-amber/30 bg-accent-amber/10 text-accent-amber">
                  sort {dateSortDir === 'desc' ? '↓' : '↑'}
                </span>
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">{dim.description}</p>
          </div>

          {/* Sort buttons — separate ASC / DESC. Disabled when pivot is on
              because the orderby_clause is auto-built from pivoted dates +
              other dims, so manual sort would be ignored. Hidden entirely on
              date dim rows — the shared "Sort" toggle in the Date Dimensions
              container header handles all four dates at once. */}
          {!isDate && (
            <div className="flex-shrink-0 inline-flex rounded-md border border-border overflow-hidden">
              {(['asc', 'desc'] as const).map((d) => {
                const isActive = ordered && orderDir === d;
                const arrow    = d === 'asc' ? '↑' : '↓';
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={pivotEnabled}
                    onClick={(e) => { e.stopPropagation(); setSort(dim.key, d); }}
                    className={`px-2 py-1 text-[10.5px] font-mono transition-colors ${d === 'desc' ? 'border-l border-border' : ''} ${
                      pivotEnabled
                        ? 'bg-bg-input/40 text-text-muted/40 cursor-not-allowed'
                        : isActive
                          ? 'bg-accent-amber/15 text-accent-amber'
                          : 'bg-bg-input text-text-muted hover:bg-accent-amber/10 hover:text-accent-amber'
                    }`}
                    title={
                      pivotEnabled
                        ? 'Sort disabled while Pivot is on (ORDER BY is auto-built from pivot)'
                        : `Sort ${dim.label} ${d.toUpperCase()}`
                    }
                  >
                    {arrow}
                  </button>
                );
              })}
            </div>
          )}

          {dim.filterKey && (
            <button
              type="button"
              aria-label={expanded ? 'Collapse filter' : 'Expand filter'}
              onClick={(e) => { e.stopPropagation(); setExpandedDim(expanded ? null : dim.key); }}
              className="flex-shrink-0 text-text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded hover:bg-bg-input transition-colors"
            >
              {expanded ? '▲' : '▼'}
            </button>
          )}
        </div>

        {/* Inline filter editor */}
        {expanded && dim.filterKey && (
          <div className="px-4 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>
            {/* ── Date dim: Multi (chip text) / Range (From-To) ── */}
            {dim.kind === 'date' && (() => {
              const mode = dateFilterModes[dim.key] ?? 'multi';
              const dt   = dim.dateType ?? 'date';
              return (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {(['multi', 'range'] as DateFilterMode[]).map((m) => (
                      <button key={m} type="button"
                        onClick={() => { setDateMode(dim.key, m); clearRangeFilters(dim); if (dim.filterKey) setFieldFilter(dim.filterKey, undefined); }}
                        className={`px-2.5 py-0.5 rounded text-[9.5px] font-semibold uppercase tracking-wider transition-colors ${mode === m ? 'bg-accent-blue text-white' : 'bg-bg-input text-text-secondary border border-border hover:border-border-strong'}`}>
                        {m === 'range' ? 'Range' : 'Multi'}
                      </button>
                    ))}
                  </div>
                  {mode === 'range' && dim.fromKey && dim.toKey && (
                    <div className="flex gap-2">
                      <input type="text"
                        value={(filters[dim.fromKey] as string) ?? ''}
                        onChange={(e) => setFieldFilter(dim.fromKey!, formatDateValue(e.target.value, dt) || undefined)}
                        onBlur={(e)   => setFieldFilter(dim.fromKey!, padDateOnBlur(e.target.value, dt) || undefined)}
                        placeholder="From"
                        inputMode="numeric"
                        className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono" />
                      <input type="text"
                        value={(filters[dim.toKey] as string) ?? ''}
                        onChange={(e) => setFieldFilter(dim.toKey!, formatDateValue(e.target.value, dt) || undefined)}
                        onBlur={(e)   => setFieldFilter(dim.toKey!, padDateOnBlur(e.target.value, dt) || undefined)}
                        placeholder="To"
                        inputMode="numeric"
                        className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono" />
                    </div>
                  )}
                  {mode === 'multi' && (
                    <input type="text"
                      value={getMultiValue(dim).join(', ')}
                      onChange={(e) => {
                        const vals = e.target.value.split(',').map((s) => formatDateValue(s.trim(), dt)).filter(Boolean);
                        if (dim.filterKey) setFieldFilter(dim.filterKey, vals.length > 0 ? vals : undefined);
                      }}
                      onBlur={(e) => {
                        const vals = e.target.value.split(',').map((s) => padDateOnBlur(s.trim(), dt)).filter(Boolean);
                        if (dim.filterKey) setFieldFilter(dim.filterKey, vals.length > 0 ? vals : undefined);
                      }}
                      placeholder={DATE_PLACEHOLDER[dt]}
                      inputMode="numeric"
                      className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono" />
                  )}
                </div>
              );
            })()}

            {/* ── Categorical dim: Single / Multi SearchableMultiSelect ── */}
            {dim.kind === 'categorical' && (() => {
              const catMode = categoricalFilterModes[dim.key] ?? 'multi';
              return (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {(['single', 'multi'] as CategoricalFilterMode[]).map((m) => (
                      <button key={m} type="button"
                        onClick={() => { setCategoricalMode(dim.key, m); if (dim.filterKey) setFieldFilter(dim.filterKey, undefined); }}
                        className={`px-2.5 py-0.5 rounded text-[9.5px] font-semibold uppercase tracking-wider transition-colors ${catMode === m ? 'bg-accent-blue text-white' : 'bg-bg-input text-text-secondary border border-border hover:border-border-strong'}`}>
                        {m === 'single' ? 'Single' : 'Multi'}
                      </button>
                    ))}
                  </div>
                  <SearchableMultiSelect
                    value={getMultiValue(dim)}
                    onChange={(vals) => dim.filterKey && setFieldFilter(dim.filterKey, vals.length > 0 ? vals : undefined)}
                    options={getOptions(dim)}
                    mode={catMode}
                    placeholder={`Select ${dim.label.toLowerCase()} values…`}
                  />
                </div>
              );
            })()}

            {/* ── Text dim: free-text chip input ── */}
            {dim.kind === 'text' && (
              <MultiValueChipInput
                value={getMultiValue(dim)}
                onChange={(vals) => dim.filterKey && setFieldFilter(dim.filterKey, vals.length > 0 ? vals : undefined)}
                placeholder="Type a value and press Enter"
              />
            )}
          </div>
        )}
      </li>
    );
  };

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

        {/* ══════════════════════════════════════════════════════════════════════
            Procedure call preview — Show/Hide toggle, collapsed by default.
            Sits at the top of the breakdown section so developers can see
            exactly what's being passed to public.get_deposit before scrolling
            through results.
            ══════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setShowProcPreview((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-input/50 hover:bg-bg-input transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className={`text-[10px] font-mono text-text-muted transition-transform ${showProcPreview ? 'rotate-90' : ''}`}>▸</span>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-text-muted">
                get_deposit — All 12 Parameters
              </p>
              {pivotEnabled && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-accent-purple/30 bg-accent-purple/10 text-accent-purple uppercase tracking-wider">
                  pivoted
                </span>
              )}
              {explorerData?.sql_preview?.date_join && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-accent-teal/30 bg-accent-teal/10 text-accent-teal uppercase tracking-wider">
                  date join
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              {explorerFetching && <span className="text-[10px] text-accent-blue animate-pulse">Running…</span>}
              <span className="text-[9px] font-medium text-text-muted uppercase tracking-wider">
                {showProcPreview ? 'Hide' : 'Show'}
              </span>
            </div>
          </button>

          {showProcPreview && (
            <>
              {/* Colour legend — same conventions as the pivot page */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 border-b border-border bg-bg-base/40">
                {[
                  { dot: 'bg-accent-blue',   label: 'SELECT' },
                  { dot: 'bg-accent-green',  label: 'WHERE clauses' },
                  { dot: 'bg-accent-purple', label: 'GROUP / ORDER / PARTITION' },
                  { dot: 'bg-accent-teal',   label: 'date_join' },
                  { dot: 'bg-text-muted',    label: 'Pagination' },
                ].map((l) => (
                  <span key={l.label} className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${l.dot}`} />
                    <span className="text-[9px] text-text-muted">{l.label}</span>
                  </span>
                ))}
              </div>

              <div className="px-4 py-3 overflow-x-auto">
                <pre className="text-[10px] leading-[1.75] font-mono">
                  {procLines.map((line, i) => (
                    <span key={i} className={`block ${KIND_CLS[line.kind] ?? 'text-text-secondary'}`}>
                      {line.text}
                    </span>
                  ))}
                </pre>
              </div>
            </>
          )}
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
            {/* ── Date Dimensions container — shared Pivot toggle in header ── */}
            <div className="border-b border-border">
              <div className="flex items-center justify-between gap-2 px-4 py-2 bg-accent-amber/5 border-b border-border/60">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-amber">Date Dimensions</p>
                <div className="flex items-center gap-2">
                  {/* Pivot toggle — pivots selected date dims as column headers */}
                  <button
                    type="button"
                    onClick={togglePivot}
                    disabled={selectedDateDims.length === 0}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9.5px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      datePivotEnabled
                        ? 'border-accent-purple/40 bg-accent-purple/15 text-accent-purple'
                        : 'border-border bg-bg-input text-text-muted hover:border-accent-purple/30 hover:text-accent-purple'
                    }`}
                    title="Pivot all selected date fields as column headers"
                  >
                    <span className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${datePivotEnabled ? 'border-accent-purple bg-accent-purple' : 'border-current'}`}>
                      {datePivotEnabled && (
                        <svg viewBox="0 0 8 8" className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="1,4 3,6 7,1.5" />
                        </svg>
                      )}
                    </span>
                    Pivot
                  </button>
                  {/* Sort direction — ASC / DESC selectable independently.
                      Click a direction to activate; click the active one
                      again to turn off. Disabled while Pivot is on (auto-
                      pivot ORDER BY covers dates) or when no date dim is
                      selected. */}
                  {(() => {
                    const sortDisabled = selectedDateDims.length === 0 || datePivotEnabled;
                    return (
                      <div className="inline-flex h-7 rounded-md border border-border overflow-hidden">
                        {(['asc', 'desc'] as const).map((d) => {
                          const isActive = dateSortDir === d && !datePivotEnabled;
                          const arrow    = d === 'asc' ? '↑' : '↓';
                          return (
                            <button
                              key={d}
                              type="button"
                              disabled={sortDisabled}
                              onClick={() => setDateSortDirCycle(d)}
                              className={`px-2 text-[11px] font-mono flex items-center justify-center transition-colors ${d === 'desc' ? 'border-l border-border' : ''} ${
                                sortDisabled
                                  ? 'bg-bg-input/40 text-text-muted/40 cursor-not-allowed'
                                  : isActive
                                    ? 'bg-accent-amber/15 text-accent-amber'
                                    : 'bg-bg-input text-text-muted hover:bg-accent-amber/10 hover:text-accent-amber'
                              }`}
                              title={
                                datePivotEnabled
                                  ? 'Sort disabled while Pivot is on (ORDER BY is auto-built from pivot)'
                                  : selectedDateDims.length === 0
                                    ? 'Select at least one date dimension first'
                                    : `Sort all selected date dims ${d.toUpperCase()}`
                              }
                            >
                              {arrow}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <ul className="divide-y divide-border">
                {DEPOSIT_DIMS.filter((d) => DATE_DIM_KEYS.has(d.key)).map((dim) => renderDimRow(dim))}
              </ul>
            </div>

            {/* ── Non-date dimensions ─────────────────────────────────────── */}
            <ul className="divide-y divide-border">
              {DEPOSIT_DIMS.filter((d) => !DATE_DIM_KEYS.has(d.key)).map((dim) => renderDimRow(dim))}
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
                    : !hasDateDimFilter
                      ? 'Set a date filter (Year, Year Quarter, Year Month, or Date) to fetch data.'
                      : pivotEnabled && pivotData
                        ? `${pivotData.rows.length.toLocaleString()} pivoted row${pivotData.rows.length === 1 ? '' : 's'} × ${pivotData.columnKeys.length.toLocaleString()} date column${pivotData.columnKeys.length === 1 ? '' : 's'} · ${explorerFetching ? 'updating…' : 'date pivot view'}`
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
            ) : !hasDateDimFilter ? (
              /* Mandatory-date-filter empty state. Shown when one or more dims
                 are picked but the user hasn't yet set any of the four date
                 dim filters. The query is intentionally suppressed until they
                 do, because the proc otherwise scans the full period window. */
              <div className="p-8 text-center space-y-3">
                <div className="inline-flex items-center gap-1.5 rounded border border-accent-amber/30 bg-accent-amber/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-accent-amber">
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M5 4.5v3M5 3v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Date filter required
                </div>
                <p className="text-[12px] font-semibold text-text-primary">
                  Pick at least one date filter before running this query.
                </p>
                <p className="text-[11px] text-text-muted max-w-md mx-auto leading-relaxed">
                  Expand <span className="font-mono text-accent-amber">Year</span>,{' '}
                  <span className="font-mono text-accent-amber">Year Quarter</span>,{' '}
                  <span className="font-mono text-accent-amber">Year Month</span>, or{' '}
                  <span className="font-mono text-accent-amber">Date</span> in the Date
                  Dimensions panel and enter a value. Without one, the procedure scans the
                  full period window which is expensive and rarely intended.
                </p>
              </div>
            ) : explorerInitialLoad ? (
              <div className="p-4">
                <StandardDashboardSkeleton />
              </div>
            ) : explorerIsError ? (
              (() => {
                // Extract the most useful error string we can find.
                //   • axios error → error.response.data.error / .message / data itself
                //   • plain Error  → error.message
                // The backend (Rails) typically returns
                //   { "error": "PG::SyntaxError: ..." }  on 500
                // so showing that surfaces the real SQL error instead of the
                // generic axios "Request failed with status code 500".
                let serverDetail: string | null = null;
                let topMessage: string | null = null;
                const e = explorerErrorObj as unknown;
                if (e && typeof e === 'object') {
                  const ax = e as { response?: { status?: number; data?: unknown }; message?: string };
                  topMessage = ax.message ?? null;
                  const data = ax.response?.data;
                  if (typeof data === 'string') {
                    serverDetail = data;
                  } else if (data && typeof data === 'object') {
                    const d = data as Record<string, unknown>;
                    serverDetail = (typeof d.error === 'string' ? d.error : null)
                      ?? (typeof d.message === 'string' ? d.message : null)
                      ?? (typeof d.exception === 'string' ? d.exception : null)
                      ?? JSON.stringify(d).slice(0, 600);
                  }
                }
                return (
                  <div className="p-8 text-center space-y-3">
                    <p className="text-[12px] font-semibold text-accent-red">
                      Deposit query failed.
                    </p>
                    {serverDetail ? (
                      <pre className="text-[10.5px] text-text-muted max-w-[640px] mx-auto leading-relaxed whitespace-pre-wrap break-words font-mono text-left bg-bg-input/40 rounded-md border border-border/60 px-3 py-2">
                        {serverDetail}
                      </pre>
                    ) : (
                      <p className="text-[11px] text-text-muted max-w-md mx-auto leading-relaxed">
                        The procedure returned an error. Check the backend logs
                        for the SQL stack trace.
                      </p>
                    )}
                    {topMessage && (
                      <p className="text-[10px] text-text-muted/70 font-mono">{topMessage}</p>
                    )}
                  </div>
                );
              })()
            ) : explorerRows.length === 0 ? (
              <div className="p-8 text-center text-[12px] text-text-muted">
                No rows matched the current filters.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  {pivotEnabled && pivotData ? (
                    /* ── Pivot table: date dim values become column headers ── */
                    <table className="w-full border-collapse text-[12px]">
                      <thead className="bg-bg-surface sticky top-0 z-10">
                        <tr>
                          {selectedNonDateDims.map((k) => (
                            <th
                              key={k}
                              className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-secondary border-b border-border whitespace-nowrap"
                            >
                              {DEPOSIT_DIMS.find((d) => d.key === k)?.label ?? k}
                            </th>
                          ))}
                          {pivotData.columnKeys.map((colKey) => (
                            <th
                              key={colKey}
                              className="px-3 py-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.06em] text-accent-purple border-b border-border whitespace-nowrap"
                              title={`Deposit · ${formatColLabel(colKey)}`}
                            >
                              {formatColLabel(colKey)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pivotData.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={selectedNonDateDims.length + pivotData.columnKeys.length}
                              className="px-3 py-6 text-center text-[11px] text-text-muted"
                            >
                              Select at least one non-date dimension to anchor pivot rows, or turn off Pivot to see a flat list.
                            </td>
                          </tr>
                        ) : (
                          pivotData.rows.map((pr, i) => (
                            <tr key={i} className="border-b border-border/30 last:border-0 hover:bg-row-hover">
                              {selectedNonDateDims.map((k) => (
                                <td key={k} className="px-3 py-2 text-text-primary whitespace-nowrap">
                                  {formatDimCell(pr.rowDims[k])}
                                </td>
                              ))}
                              {pivotData.columnKeys.map((colKey) => {
                                const v = pr.cells.get(colKey);
                                return (
                                  <td
                                    key={colKey}
                                    className="px-3 py-2 text-right font-mono text-xs text-text-primary whitespace-nowrap"
                                  >
                                    {v === undefined ? '—' : formatNPR(v)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    /* ── Flat table (default view) ── */
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
                  )}
                </div>

                {/* Pagination — same visual style as pivot / HTD panels */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <div className="text-[10.5px] text-text-muted">
                      Showing {((explorerPage - 1) * effectivePageSize) + 1}–
                      {Math.min(explorerPage * effectivePageSize, explorerTotal).toLocaleString()} of {explorerTotal.toLocaleString()} rows
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
