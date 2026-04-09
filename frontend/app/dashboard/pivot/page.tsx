'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { RecordTable } from '@/components/ui/RecordTable';
import { SearchableMultiSelect } from '@/components/ui/Select';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';
import { useFilterValues, useProductionCatalog, useProductionExplorer } from '@/lib/hooks/useDashboardData';
import type { DashboardFilters, FilterStatisticsResponse, FilterValuesResponse } from '@/types';

// ─── Dimension field definitions ──────────────────────────────────────────────

type FieldType = 'categorical' | 'text' | 'date' | 'month' | 'quarter' | 'year';
type DateFilterMode = 'single' | 'range' | 'multi';

interface DimensionFieldDef {
  key: string;
  label: string;
  type: FieldType;
  filterKey: keyof DashboardFilters;
  fromKey?: keyof DashboardFilters;
  toKey?: keyof DashboardFilters;
  optionsKey?: keyof FilterValuesResponse;
  description: string;
}

const DATE_DIM_KEYS = new Set(['tran_date', 'year_month', 'year_quarter', 'year']);

const DIMENSION_FIELDS: DimensionFieldDef[] = [
  // ── Categorical ────────────────────────────────────────────────────────────
  { key: 'gam_branch',       label: 'Account Branch',   type: 'categorical', filterKey: 'branchCode',    optionsKey: 'branches',          description: 'Branch where the account is registered' },
  { key: 'gam_province',     label: 'Account Province', type: 'categorical', filterKey: 'province',      optionsKey: 'provinces',         description: 'Province of the account branch' },
  { key: 'gam_cluster',      label: 'Account Cluster',  type: 'categorical', filterKey: 'cluster',       optionsKey: 'clusters',          description: 'Branch cluster grouping' },
  { key: 'gam_solid',        label: 'Account SOL ID',   type: 'categorical', filterKey: 'solid',         optionsKey: 'solids',            description: 'SOL identifier used for account routing' },
  { key: 'tran_source',      label: 'Channel',          type: 'categorical', filterKey: 'tranSource',    optionsKey: 'tran_sources',      description: 'Transaction channel (mobile / internet / branch)' },
  { key: 'part_tran_type',   label: 'CR / DR',          type: 'categorical', filterKey: 'partTranType',  optionsKey: 'part_tran_types',   description: 'Credit or debit side of the transaction' },
  { key: 'product',          label: 'Product',          type: 'categorical', filterKey: 'product',       optionsKey: 'products',          description: 'Banking product associated with the account' },
  { key: 'service',          label: 'Service',          type: 'categorical', filterKey: 'service',       optionsKey: 'services',          description: 'Service type applied to the transaction' },
  { key: 'merchant',         label: 'Merchant',         type: 'categorical', filterKey: 'merchant',      optionsKey: 'merchants',         description: 'Merchant identifier for payment transactions' },
  { key: 'gl_sub_head_code', label: 'GL Code',          type: 'categorical', filterKey: 'glSubHeadCode', optionsKey: 'gl_sub_head_codes', description: 'General ledger sub-head code' },
  { key: 'entry_user',       label: 'Entry User',       type: 'categorical', filterKey: 'entryUser',     optionsKey: 'entry_users',       description: 'User who entered the transaction' },
  { key: 'vfd_user',         label: 'Verified User',    type: 'categorical', filterKey: 'vfdUser',       optionsKey: 'vfd_users',         description: 'User who verified the transaction' },
  // ── Text ──────────────────────────────────────────────────────────────────
  { key: 'acct_num',         label: 'Account Number',   type: 'text',        filterKey: 'acctNum',       description: 'Full or partial account number (ILIKE search)' },
  { key: 'cif_id',           label: 'CIF ID',           type: 'text',        filterKey: 'cifId',         description: 'Full or partial customer CIF ID (ILIKE search)' },
  // ── Date fields — single / range / multi ──────────────────────────────────
  { key: 'tran_date',    label: 'Transaction Date', type: 'date',    filterKey: 'tranDate',    fromKey: 'tranDateFrom',    toKey: 'tranDateTo',    description: 'Daily granularity (YYYY-MM-DD)' },
  { key: 'year_month',   label: 'Year Month',       type: 'month',   filterKey: 'yearMonth',   fromKey: 'yearMonthFrom',   toKey: 'yearMonthTo',   description: 'Monthly period (YYYY-MM)' },
  { key: 'year_quarter', label: 'Year Quarter',     type: 'quarter', filterKey: 'yearQuarter', fromKey: 'yearQuarterFrom', toKey: 'yearQuarterTo', description: 'Quarterly period (YYYY-Qn)' },
  { key: 'year',         label: 'Year',             type: 'year',    filterKey: 'year',        fromKey: 'yearFrom',        toKey: 'yearTo',        description: 'Calendar year (YYYY)' },
];

// ─── Measure definitions ──────────────────────────────────────────────────────

interface MeasureDef {
  key: string;
  label: string;
  description: string;
  group: 'standard' | 'comparison';
  period?: string;
}

const STANDARD_MEASURES: MeasureDef[] = [
  { key: 'total_amount',      label: 'Total Amount',       description: 'SUM(tran_amt)',                       group: 'standard' },
  { key: 'transaction_count', label: 'Transaction Count',  description: 'SUM(tran_count)',                     group: 'standard' },
  { key: 'unique_accounts',   label: 'Unique Accounts',    description: 'COUNT(DISTINCT acct_num)',             group: 'standard' },
  { key: 'unique_customers',  label: 'Unique Customers',   description: 'COUNT(DISTINCT cif_id)',               group: 'standard' },
  { key: 'credit_amount',     label: 'Credit Amount',      description: "SUM where part_tran_type = 'CR'",     group: 'standard' },
  { key: 'debit_amount',      label: 'Debit Amount',       description: "SUM where part_tran_type = 'DR'",     group: 'standard' },
  { key: 'net_flow',          label: 'Net Flow',           description: 'CR amount − DR amount',                group: 'standard' },
  { key: 'eod_balance',       label: 'EOD Balance (EAB)',  description: 'MAX(eod_balance) via EAB join',        group: 'standard' },
];

const COMPARISON_MEASURES: MeasureDef[] = [
  { key: 'prevdate_amt',            label: 'Prev Date — Amount',            description: 'prevdate_where · tran_amt',         group: 'comparison', period: 'prevdate' },
  { key: 'prevdate_count',          label: 'Prev Date — Count',             description: 'prevdate_where · tran_count',       group: 'comparison', period: 'prevdate' },
  { key: 'thismonth_amt',           label: 'This Month — Amount',           description: 'thismonth_where · tran_amt',        group: 'comparison', period: 'thismonth' },
  { key: 'thismonth_count',         label: 'This Month — Count',            description: 'thismonth_where · tran_count',      group: 'comparison', period: 'thismonth' },
  { key: 'thisyear_amt',            label: 'This Year — Amount',            description: 'thisyear_where · tran_amt',         group: 'comparison', period: 'thisyear' },
  { key: 'thisyear_count',          label: 'This Year — Count',             description: 'thisyear_where · tran_count',       group: 'comparison', period: 'thisyear' },
  { key: 'prevmonth_amt',           label: 'Prev Month — Amount',           description: 'prevmonth_where · tran_amt',        group: 'comparison', period: 'prevmonth' },
  { key: 'prevmonth_count',         label: 'Prev Month — Count',            description: 'prevmonth_where · tran_count',      group: 'comparison', period: 'prevmonth' },
  { key: 'prevyear_amt',            label: 'Prev Year — Amount',            description: 'prevyear_where · tran_amt',         group: 'comparison', period: 'prevyear' },
  { key: 'prevyear_count',          label: 'Prev Year — Count',             description: 'prevyear_where · tran_count',       group: 'comparison', period: 'prevyear' },
  { key: 'prevmonthmtd_amt',        label: 'Prev Month MTD — Amount',       description: 'prevmonthmtd_where · tran_amt',     group: 'comparison', period: 'prevmonthmtd' },
  { key: 'prevmonthmtd_count',      label: 'Prev Month MTD — Count',        description: 'prevmonthmtd_where · tran_count',   group: 'comparison', period: 'prevmonthmtd' },
  { key: 'prevyearytd_amt',         label: 'Prev Year YTD — Amount',        description: 'prevyearytd_where · tran_amt',      group: 'comparison', period: 'prevyearytd' },
  { key: 'prevyearytd_count',       label: 'Prev Year YTD — Count',         description: 'prevyearytd_where · tran_count',    group: 'comparison', period: 'prevyearytd' },
  { key: 'prevmonthsamedate_amt',   label: 'Prev Month Same Date — Amount', description: 'prevmonthsamedate_where · tran_amt',   group: 'comparison', period: 'prevmonthsamedate' },
  { key: 'prevmonthsamedate_count', label: 'Prev Month Same Date — Count',  description: 'prevmonthsamedate_where · tran_count', group: 'comparison', period: 'prevmonthsamedate' },
  { key: 'prevyearsamedate_amt',    label: 'Prev Year Same Date — Amount',  description: 'prevyearsamedate_where · tran_amt',    group: 'comparison', period: 'prevyearsamedate' },
  { key: 'prevyearsamedate_count',  label: 'Prev Year Same Date — Count',   description: 'prevyearsamedate_where · tran_count',  group: 'comparison', period: 'prevyearsamedate' },
];

// ─── Type badge styling ───────────────────────────────────────────────────────

const TYPE_BADGE: Record<FieldType, { label: string; cls: string }> = {
  categorical: { label: 'list',    cls: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20' },
  text:        { label: 'text',    cls: 'bg-accent-green/10 text-accent-green border-accent-green/20' },
  date:        { label: 'date',    cls: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' },
  month:       { label: 'month',   cls: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' },
  quarter:     { label: 'quarter', cls: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' },
  year:        { label: 'year',    cls: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20' },
};

// ─── Date option generation ───────────────────────────────────────────────────

function generateDateOptions(filterStats?: FilterStatisticsResponse) {
  const min = filterStats?.date_range?.min;
  const max = filterStats?.date_range?.max;
  if (!min || !max) return { months: [], quarters: [], years: [] };

  const start = new Date(`${min}T00:00:00`);
  const end   = new Date(`${max}T00:00:00`);

  const months:   { value: string; label: string }[] = [];
  const qSet   = new Set<string>();
  const ySet   = new Set<string>();

  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth() + 1;
    const mStr = String(m).padStart(2, '0');
    months.push({ value: `${y}-${mStr}`, label: `${y}-${mStr}` });
    qSet.add(`${y}-Q${Math.ceil(m / 3)}`);
    ySet.add(String(y));
    cur.setMonth(cur.getMonth() + 1);
  }

  return {
    months,
    quarters: Array.from(qSet).map((v) => ({ value: v, label: v })),
    years:    Array.from(ySet).map((v) => ({ value: v, label: v })),
  };
}

// ─── Pivot transformation ─────────────────────────────────────────────────────

type DataRow = Record<string, string | number | boolean | null>;

function pivotRows(
  rows: DataRow[],
  dateDimKey: string,
  rowDimKeys: string[],
  measureKeys: string[],
): { pivotedColumns: string[]; pivotedRows: DataRow[] } {
  const dateValues = [...new Set(rows.map((r) => String(r[dateDimKey] ?? '')).filter(Boolean))].sort();

  const pivotedColumns: string[] = [
    ...rowDimKeys,
    ...dateValues.flatMap((dv) => measureKeys.map((mk) => `${dv} | ${mk}`)),
  ];

  const grouped = new Map<string, DataRow>();
  for (const row of rows) {
    const rowKey = rowDimKeys.map((k) => String(row[k] ?? '')).join('\x00');
    if (!grouped.has(rowKey)) {
      const newRow: DataRow = {};
      rowDimKeys.forEach((k) => { newRow[k] = row[k] ?? null; });
      grouped.set(rowKey, newRow);
    }
    const outRow = grouped.get(rowKey)!;
    const dv = String(row[dateDimKey] ?? '');
    measureKeys.forEach((mk) => { outRow[`${dv} | ${mk}`] = row[mk] ?? null; });
  }

  return { pivotedColumns, pivotedRows: Array.from(grouped.values()) };
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function PivotDashboard() {
  const { filters, setFilters, topBarProps, handleClearFilters, filterStats } = useDashboardPage();

  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['gam_branch']);
  const [selectedMeasures, setSelectedMeasures]     = useState<string[]>(['total_amount', 'transaction_count']);
  const [expandedField, setExpanded]                = useState<string | null>(null);
  const [page, setPage]                             = useState(1);
  const [pageSize, setPageSize]                     = useState(10);
  const [dateFilterModes, setDateFilterModes]       = useState<Record<string, DateFilterMode>>({
    tran_date:    'single',
    year_month:   'multi',
    year_quarter: 'multi',
    year:         'multi',
  });

  const { data: filterValues } = useFilterValues();
  const { data: catalog }      = useProductionCatalog();

  const measures        = useMemo(() => selectedMeasures.filter((k) => STANDARD_MEASURES.some((m) => m.key === k)), [selectedMeasures]);
  const timeComparisons = useMemo(() => selectedMeasures.filter((k) => COMPARISON_MEASURES.some((m) => m.key === k)), [selectedMeasures]);
  const effectiveMeasures = measures.length > 0 ? measures : ['total_amount'];

  const { data: explorer, isLoading, isFetching } = useProductionExplorer(
    filters, selectedDimensions, effectiveMeasures, timeComparisons, page, pageSize,
  );

  // ── Date options generated from filter stats ──────────────────────────────

  const dateOptions = useMemo(() => generateDateOptions(filterStats), [filterStats]);

  // ── Pivot: if a date dim is selected alongside non-date dims, pivot ───────

  const { displayColumns, displayRows, isPivoted } = useMemo(() => {
    if (!explorer || !explorer.rows.length) {
      return { displayColumns: explorer?.columns ?? [], displayRows: explorer?.rows ?? [], isPivoted: false };
    }

    const dateDim   = selectedDimensions.find((k) => DATE_DIM_KEYS.has(k));
    const rowDims   = selectedDimensions.filter((k) => !DATE_DIM_KEYS.has(k));
    const shouldPivot = Boolean(dateDim && rowDims.length > 0);

    if (!shouldPivot) {
      return { displayColumns: explorer.columns, displayRows: explorer.rows as DataRow[], isPivoted: false };
    }

    const { pivotedColumns, pivotedRows } = pivotRows(
      explorer.rows as DataRow[],
      dateDim!,
      rowDims,
      [...effectiveMeasures, ...timeComparisons],
    );
    return { displayColumns: pivotedColumns, displayRows: pivotedRows, isPivoted: true };
  }, [explorer, selectedDimensions, effectiveMeasures, timeComparisons]);

  // ── Filter helpers ────────────────────────────────────────────────────────

  const setFieldFilter = useCallback(
    (key: keyof DashboardFilters, value: DashboardFilters[typeof key]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    [setFilters],
  );

  const clearDateRangeFilters = useCallback(
    (field: DimensionFieldDef) => {
      setFilters((prev) => {
        const next = { ...prev };
        delete next[field.filterKey as keyof typeof next];
        if (field.fromKey) delete next[field.fromKey as keyof typeof next];
        if (field.toKey) delete next[field.toKey as keyof typeof next];
        return next;
      });
      setPage(1);
    },
    [setFilters],
  );

  const getMultiValue = useCallback(
    (field: DimensionFieldDef): string[] => {
      const v = filters[field.filterKey];
      if (!v) return [];
      return Array.isArray(v) ? v : [v as string];
    },
    [filters],
  );

  const getSingleValue = useCallback(
    (filterKey: keyof DashboardFilters): string => {
      const v = filters[filterKey];
      if (!v) return '';
      return Array.isArray(v) ? v[0] ?? '' : (v as string);
    },
    [filters],
  );

  const getOptions = useCallback(
    (field: DimensionFieldDef) => {
      if (field.optionsKey && filterValues) {
        return (filterValues[field.optionsKey] as string[]).filter(Boolean).map((v) => ({ value: v, label: v }));
      }
      if (field.type === 'month')   return dateOptions.months;
      if (field.type === 'quarter') return dateOptions.quarters;
      if (field.type === 'year')    return dateOptions.years;
      return [];
    },
    [filterValues, dateOptions],
  );

  const fieldHasFilter = useCallback(
    (field: DimensionFieldDef): boolean => {
      const v = filters[field.filterKey];
      const from = field.fromKey ? filters[field.fromKey] : undefined;
      const to   = field.toKey   ? filters[field.toKey]   : undefined;
      if (Array.isArray(v)) return v.length > 0;
      return Boolean(v) || Boolean(from) || Boolean(to);
    },
    [filters],
  );

  // ── Dimension toggle ──────────────────────────────────────────────────────

  const toggleDimension = useCallback((key: string) => {
    setSelectedDimensions((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        return next.length > 0 ? next : prev; // keep at least one
      }
      return [...prev, key];
    });
    setPage(1);
  }, []);

  // ── Measure toggle ────────────────────────────────────────────────────────

  const toggleMeasure = useCallback((key: string) => {
    setSelectedMeasures((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((k) => k !== key);
        const hasStandard = next.some((k) => STANDARD_MEASURES.some((m) => m.key === k));
        return hasStandard ? next : prev;
      }
      return [...prev, key];
    });
  }, []);

  // ── Date filter mode switch ───────────────────────────────────────────────

  const setDateMode = useCallback((fieldKey: string, mode: DateFilterMode) => {
    setDateFilterModes((prev) => ({ ...prev, [fieldKey]: mode }));
  }, []);

  // ── Counts & labels ───────────────────────────────────────────────────────

  const activeFilterCount = useMemo(
    () =>
      DIMENSION_FIELDS.reduce((n, f) => n + (fieldHasFilter(f) ? 1 : 0), 0) +
      (typeof filters.minAmount === 'number' ? 1 : 0) +
      (typeof filters.maxAmount === 'number' ? 1 : 0),
    [filters, fieldHasFilter],
  );

  const dimensionLabels = useMemo(
    () => selectedDimensions.map((d) => catalog?.dimension_options.find((o) => o.value === d)?.label ?? d).join(' × '),
    [catalog, selectedDimensions],
  );

  const sqlPreview = useMemo(() => {
    if (!explorer) return 'Select at least one dimension and one measure.';
    const lines = [
      `-- Dimensions (GROUP BY): ${selectedDimensions.join(', ')}`,
      `-- Standard measures:     ${effectiveMeasures.join(', ')}`,
    ];
    if (timeComparisons.length > 0) lines.push(`-- Period comparisons:     ${timeComparisons.join(', ')}`);
    const p = (explorer.sql_preview as any).page ?? page;
    const ps = (explorer.sql_preview as any).page_size ?? pageSize;
    lines.push(`-- Pagination:            page=${p}, page_size=${ps}`);
    lines.push('', explorer.sql_preview.select_inner, explorer.sql_preview.where_clause,
      explorer.sql_preview.groupby_clause, explorer.sql_preview.orderby_clause);
    const pw = explorer.sql_preview.period_wheres ?? {};
    if (Object.keys(pw).length > 0) {
      lines.push('');
      Object.entries(pw).forEach(([p, c]) => lines.push(`-- ${p}:`, `   ${c}`));
    }
    return lines.join('\n');
  }, [explorer, selectedDimensions, effectiveMeasures, timeComparisons, page, pageSize]);

  const totalPages = Math.ceil((explorer?.total_rows ?? 0) / pageSize) || 1;

  return (
    <>
      <TopBar
        title="Pivot Analysis"
        subtitle="Production get_tran_summary — dynamic field & filter explorer"
        {...topBarProps}
        showExportButton={false}
      />

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5 items-start">

          {/* ── Left: field selector panel ─────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* DIMENSIONS */}
            <section className="rounded-xl border border-border bg-bg-card overflow-hidden">
              <header className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-primary">Dimensions</p>
                  <p className="text-[10.5px] text-text-secondary mt-0.5">Check one or more fields to group results by</p>
                </div>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={handleClearFilters} className="text-[10px] font-medium text-accent-red hover:underline">
                    Clear filters ({activeFilterCount})
                  </button>
                )}
              </header>

              <ul className="divide-y divide-border">
                {DIMENSION_FIELDS.map((field) => {
                  const selected = selectedDimensions.includes(field.key);
                  const expanded = expandedField === field.key;
                  const filtered = fieldHasFilter(field);
                  const badge    = TYPE_BADGE[field.type];
                  const isDate   = DATE_DIM_KEYS.has(field.key);
                  const mode     = isDate ? (dateFilterModes[field.key] ?? 'single') : null;

                  return (
                    <li key={field.key} className={`transition-colors ${selected ? 'bg-accent-blue/5' : 'hover:bg-bg-hover'}`}>
                      {/* Row */}
                      <div
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
                        onClick={() => toggleDimension(field.key)}
                      >
                        {/* Checkbox */}
                        <span className={`flex-shrink-0 w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors ${selected ? 'border-accent-blue bg-accent-blue' : 'border-border'}`}>
                          {selected && (
                            <svg viewBox="0 0 10 10" className="w-2 h-2 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1.5,5 4,7.5 8.5,2" />
                            </svg>
                          )}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className={`text-[12px] font-medium ${selected ? 'text-accent-blue' : 'text-text-primary'}`}>
                              {field.label}
                            </span>
                            <span className={`text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border ${badge.cls}`}>
                              {badge.label}
                            </span>
                            {filtered && (
                              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-green/30 bg-accent-green/10 text-accent-green">
                                filtered
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted mt-0.5 truncate">{field.description}</p>
                        </div>

                        <button
                          type="button"
                          aria-label={expanded ? 'Collapse filter' : 'Expand filter'}
                          onClick={(e) => { e.stopPropagation(); setExpanded(expanded ? null : field.key); }}
                          className="flex-shrink-0 text-text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded hover:bg-bg-input transition-colors"
                        >
                          {expanded ? '▲' : '▼'}
                        </button>
                      </div>

                      {/* Inline filter control */}
                      {expanded && (
                        <div className="px-4 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>

                          {/* Categorical → multi-select from API values */}
                          {field.type === 'categorical' && (
                            <SearchableMultiSelect
                              value={getMultiValue(field)}
                              onChange={(vals) => setFieldFilter(field.filterKey, vals.length > 0 ? vals : undefined)}
                              options={getOptions(field)}
                              placeholder={`Filter by ${field.label.toLowerCase()}…`}
                            />
                          )}

                          {/* Text → ILIKE search */}
                          {field.type === 'text' && (
                            <input
                              type="text"
                              value={(filters[field.filterKey] as string) ?? ''}
                              onChange={(e) => setFieldFilter(field.filterKey, e.target.value.trim() || undefined)}
                              placeholder={field.key === 'acct_num' ? 'Partial account number (ILIKE)' : 'Partial CIF ID (ILIKE)'}
                              className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                            />
                          )}

                          {/* Date fields — mode switcher + inputs */}
                          {isDate && mode !== null && (
                            <div className="space-y-2">
                              {/* Mode tabs */}
                              <div className="flex gap-1">
                                {(['single', 'range', 'multi'] as DateFilterMode[]).map((m) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => { setDateMode(field.key, m); clearDateRangeFilters(field); }}
                                    className={`px-2.5 py-0.5 rounded text-[9.5px] font-semibold uppercase tracking-wider transition-colors ${
                                      mode === m
                                        ? 'bg-accent-blue text-white'
                                        : 'bg-bg-input text-text-secondary border border-border hover:border-border-strong'
                                    }`}
                                  >
                                    {m === 'single' ? 'Single' : m === 'range' ? 'Range' : 'Multi'}
                                  </button>
                                ))}
                              </div>

                              {/* Single mode */}
                              {mode === 'single' && (
                                <input
                                  type="text"
                                  value={getSingleValue(field.filterKey)}
                                  onChange={(e) => {
                                    const v = e.target.value.trim();
                                    setFieldFilter(field.filterKey, v || undefined);
                                  }}
                                  placeholder={
                                    field.type === 'date'    ? 'YYYY-MM-DD' :
                                    field.type === 'month'   ? 'YYYY-MM' :
                                    field.type === 'quarter' ? 'YYYY-Qn' : 'YYYY'
                                  }
                                  className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono"
                                />
                              )}

                              {/* Range mode */}
                              {mode === 'range' && field.fromKey && field.toKey && (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={(filters[field.fromKey] as string) ?? ''}
                                    onChange={(e) => setFieldFilter(field.fromKey!, e.target.value.trim() || undefined)}
                                    placeholder="From"
                                    className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono"
                                  />
                                  <input
                                    type="text"
                                    value={(filters[field.toKey] as string) ?? ''}
                                    onChange={(e) => setFieldFilter(field.toKey!, e.target.value.trim() || undefined)}
                                    placeholder="To"
                                    className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono"
                                  />
                                </div>
                              )}

                              {/* Multi mode */}
                              {mode === 'multi' && (
                                field.type === 'date' ? (
                                  <input
                                    type="text"
                                    value={getMultiValue(field).join(', ')}
                                    onChange={(e) => {
                                      const vals = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                                      setFieldFilter(field.filterKey, vals.length > 0 ? vals : undefined);
                                    }}
                                    placeholder="YYYY-MM-DD, YYYY-MM-DD, …"
                                    className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono"
                                  />
                                ) : (
                                  <SearchableMultiSelect
                                    value={getMultiValue(field)}
                                    onChange={(vals) => setFieldFilter(field.filterKey, vals.length > 0 ? vals : undefined)}
                                    options={getOptions(field)}
                                    placeholder={`Select ${field.label.toLowerCase()} values…`}
                                  />
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Amount range */}
              <div className="border-t border-border px-4 py-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-muted">Amount Range (NPR)</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.minAmount ?? ''}
                    onChange={(e) => { const v = e.target.value.trim(); setFieldFilter('minAmount', v ? Number(v) : undefined); }}
                    placeholder="Min"
                    className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                  />
                  <input
                    type="number"
                    value={filters.maxAmount ?? ''}
                    onChange={(e) => { const v = e.target.value.trim(); setFieldFilter('maxAmount', v ? Number(v) : undefined); }}
                    placeholder="Max"
                    className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                  />
                </div>
              </div>
            </section>

            {/* MEASURES — standard + period comparisons in one panel */}
            <section className="rounded-xl border border-border bg-bg-card overflow-hidden">
              <header className="px-4 py-3 border-b border-border">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-primary">Measures</p>
                <p className="text-[10.5px] text-text-secondary mt-0.5">
                  Standard aggregations and period-comparison <span className="font-mono">*_where</span> fields
                </p>
              </header>

              {/* Standard group */}
              <div className="px-4 pt-3 pb-1">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-text-muted">Standard Aggregations</p>
              </div>
              <ul className="divide-y divide-border">
                {STANDARD_MEASURES.map((measure) => {
                  const active = selectedMeasures.includes(measure.key);
                  const isLast = active && effectiveMeasures.length === 1 && effectiveMeasures[0] === measure.key;
                  return (
                    <li key={measure.key}>
                      <button
                        type="button"
                        disabled={isLast}
                        title={isLast ? 'At least one standard measure is required' : undefined}
                        onClick={() => toggleMeasure(measure.key)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? 'bg-accent-blue/5' : 'hover:bg-bg-hover'} disabled:cursor-not-allowed`}
                      >
                        <span className={`flex-shrink-0 w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors ${active ? 'border-accent-blue bg-accent-blue' : 'border-border'}`}>
                          {active && (
                            <svg viewBox="0 0 10 10" className="w-2 h-2 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1.5,5 4,7.5 8.5,2" />
                            </svg>
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[12px] font-medium ${active ? 'text-accent-blue' : 'text-text-primary'}`}>{measure.label}</p>
                          <p className="text-[10px] text-text-muted mt-0.5 font-mono">{measure.description}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Comparison group — grouped by period */}
              <div className="px-4 pt-4 pb-1 border-t border-border mt-1">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-text-muted">Period Comparisons</p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  WHERE clauses are built relative to the selected dimension and filter date.
                </p>
              </div>

              {Array.from(new Set(COMPARISON_MEASURES.map((m) => m.period!))).map((period) => {
                const pair      = COMPARISON_MEASURES.filter((m) => m.period === period);
                const anyActive = pair.some((m) => selectedMeasures.includes(m.key));

                return (
                  <div key={period} className={`border-t border-border ${anyActive ? 'bg-accent-blue/5' : ''}`}>
                    <div className="px-4 pt-2.5 pb-1 flex items-center gap-2">
                      <p className={`text-[11px] font-semibold ${anyActive ? 'text-accent-blue' : 'text-text-primary'}`}>
                        {period === 'prevdate'          && 'Previous Date'}
                        {period === 'thismonth'         && 'This Month'}
                        {period === 'thisyear'          && 'This Year'}
                        {period === 'prevmonth'         && 'Previous Month'}
                        {period === 'prevyear'          && 'Previous Year'}
                        {period === 'prevmonthmtd'      && 'Prev Month MTD'}
                        {period === 'prevyearytd'       && 'Prev Year YTD'}
                        {period === 'prevmonthsamedate' && 'Prev Month Same Date'}
                        {period === 'prevyearsamedate'  && 'Prev Year Same Date'}
                      </p>
                      {anyActive && (
                        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-blue/30 bg-accent-blue/15 text-accent-blue">
                          active
                        </span>
                      )}
                    </div>

                    <div className="px-4 pb-2.5 flex gap-2">
                      {pair.map((m) => {
                        const on = selectedMeasures.includes(m.key);
                        const metricLabel = m.key.endsWith('_amt') ? 'tran_amt' : 'tran_count';
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => toggleMeasure(m.key)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10.5px] font-medium transition-colors ${
                              on
                                ? 'border-accent-blue/40 bg-accent-blue/15 text-accent-blue'
                                : 'border-border bg-bg-input text-text-secondary hover:border-border-strong hover:text-text-primary'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-sm border flex items-center justify-center flex-shrink-0 ${on ? 'border-accent-blue bg-accent-blue' : 'border-current'}`}>
                              {on && (
                                <svg viewBox="0 0 8 8" className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="1,4 3,6 7,1.5" />
                                </svg>
                              )}
                            </span>
                            <span className="font-mono">{metricLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          </div>

          {/* ── Right: SQL preview + results ───────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* SQL / procedure preview */}
            <div className="rounded-xl border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                  Generated Procedure Parameters
                </p>
                <div className="flex items-center gap-3">
                  {isPivoted && (
                    <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded border border-accent-amber/30 bg-accent-amber/10 text-accent-amber uppercase tracking-wider">
                      pivoted
                    </span>
                  )}
                  {isFetching && <span className="text-[10px] text-accent-blue animate-pulse">Running…</span>}
                </div>
              </div>
              <pre className="overflow-x-auto text-[10px] leading-relaxed text-text-secondary whitespace-pre-wrap">
                {sqlPreview}
              </pre>
            </div>

            {/* Result table */}
            <RecordTable
              title={`Results — ${dimensionLabels}`}
              subtitle={
                isLoading
                  ? 'Executing get_tran_summary against production…'
                  : `${(explorer?.total_rows ?? 0).toLocaleString()} total rows · page ${page} of ${totalPages}${isPivoted ? ' · date values pivoted to columns' : ''}`
              }
              columns={displayColumns}
              rows={displayRows}
            />

            {/* Pagination + page size */}
            {(explorer?.total_rows ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-text-muted">
                  {`Showing ${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, explorer!.total_rows).toLocaleString()} of ${explorer!.total_rows.toLocaleString()} rows`}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted">Per page:</span>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => { setPageSize(n); setPage(1); }}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                        pageSize === n
                          ? 'bg-accent-blue text-white'
                          : 'bg-bg-input border border-border text-text-secondary hover:border-border-strong'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" disabled={page <= 1} onClick={() => setPage(1)}
                  className="px-2 py-1.5 text-[11px] font-medium rounded-lg border border-border bg-bg-input text-text-primary hover:bg-bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  «
                </button>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-border bg-bg-input text-text-primary hover:bg-bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  ← Prev
                </button>
                {/* Page number pills */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button key={p} type="button" onClick={() => setPage(p)}
                      className={`min-w-[28px] h-7 rounded-md text-[11px] font-medium transition-all ${
                        p === page ? 'bg-accent-blue text-white shadow-sm' : 'border border-border bg-bg-input text-text-secondary hover:bg-bg-card'
                      }`}>
                      {p}
                    </button>
                  );
                })}
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-border bg-bg-input text-text-primary hover:bg-bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  Next →
                </button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                  className="px-2 py-1.5 text-[11px] font-medium rounded-lg border border-border bg-bg-input text-text-primary hover:bg-bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  »
                </button>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
