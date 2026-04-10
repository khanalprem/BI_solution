'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { RecordTable } from '@/components/ui/RecordTable';
import { SearchableMultiSelect } from '@/components/ui/Select';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';
import { useFilterValues, useProductionCatalog, useProductionExplorer } from '@/lib/hooks/useDashboardData';
import type { DashboardFilters, FilterStatisticsResponse, FilterValuesResponse } from '@/types';

// ─── SQL preview — module-level constants (never recreated per render) ─────────

type SqlLineKind =
  | 'header' | 'select' | 'where' | 'group'
  | 'period' | 'eab' | 'partition' | 'page' | 'footer' | 'placeholder';
type SqlLine = { text: string; kind: SqlLineKind };

const KIND_CLS: Record<SqlLineKind, string> = {
  header:      'text-text-primary font-semibold',
  select:      'text-accent-blue',
  where:       'text-accent-green',
  group:       'text-accent-purple',
  period:      'text-accent-amber',
  eab:         'text-accent-teal',
  partition:   'text-accent-purple',
  page:        'text-text-muted',
  footer:      'text-text-primary font-semibold',
  placeholder: 'text-text-muted italic',
};

const ALL_PERIOD_PARAMS = [
  'prevdate_where', 'thismonth_where',  'thisyear_where',
  'prevmonth_where', 'prevyear_where',  'prevmonthmtd_where',
  'prevyearytd_where', 'prevmonthsamedate_where', 'prevyearsamedate_where',
] as const;

// ─── How it Works panel ───────────────────────────────────────────────────────

function StepCard({ num, circleCls, heading, body, tags }: {
  num: number;
  circleCls: string;
  heading: string;
  body: React.ReactNode;
  tags?: { label: string; tagCls: string }[];
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${circleCls}`}>{num}</span>
        <p className="text-[11px] font-semibold text-text-primary">{heading}</p>
      </div>
      <p className="text-[10.5px] text-text-secondary leading-relaxed">{body}</p>
      {tags && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t.label} className={`text-[9px] px-2 py-0.5 rounded border font-medium ${t.tagCls}`}>{t.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function HowItWorksPanel() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-accent-blue/20 bg-accent-blue/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent-blue/8 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-5 h-5 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0 text-accent-blue">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M6 5.5v3M6 3.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="text-[11.5px] font-semibold text-accent-blue">How Pivot Analysis Works</span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-accent-blue transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-accent-blue/15 grid grid-cols-1 md:grid-cols-2 gap-4">
          <StepCard
            num={1} circleCls="bg-accent-blue" heading="Select Dimensions"
            body={<>Dimensions are the <strong className="text-text-primary">grouping fields</strong> — e.g. Branch, Channel, Product. Each checked dimension becomes a <span className="font-mono text-accent-amber">GROUP BY</span> column in the stored procedure. You can select multiple dimensions to build cross-tab analyses.</>}
            tags={[
              { label: 'Account Branch', tagCls: 'border-accent-blue/25 bg-accent-blue/10 text-accent-blue' },
              { label: 'Channel',        tagCls: 'border-accent-blue/25 bg-accent-blue/10 text-accent-blue' },
              { label: 'Product',        tagCls: 'border-accent-blue/25 bg-accent-blue/10 text-accent-blue' },
              { label: 'Year Month',     tagCls: 'border-accent-blue/25 bg-accent-blue/10 text-accent-blue' },
            ]}
          />
          <StepCard
            num={2} circleCls="bg-accent-green" heading="Choose Measures"
            body="Measures are aggregations computed over the grouped rows — Total Amount, Count, Credit/Debit, Net Flow, and EOD Balance (via EAB join). At least one standard measure must remain selected."
            tags={[
              { label: 'Total Amount',      tagCls: 'border-accent-green/25 bg-accent-green/10 text-accent-green' },
              { label: 'Transaction Count', tagCls: 'border-accent-green/25 bg-accent-green/10 text-accent-green' },
              { label: 'Net Flow',          tagCls: 'border-accent-green/25 bg-accent-green/10 text-accent-green' },
              { label: 'EOD Balance',       tagCls: 'border-accent-green/25 bg-accent-green/10 text-accent-green' },
            ]}
          />
          <StepCard
            num={3} circleCls="bg-accent-amber" heading="Add Period Comparisons"
            body={<>Period comparisons pass <strong className="text-text-primary">WHERE clauses</strong> as stored-procedure parameters (e.g. <span className="font-mono text-accent-amber">prevmonth_where</span>). The backend computes separate aggregations for each period. Useful for MoM, YoY, and MTD reporting.</>}
          />
          <StepCard
            num={4} circleCls="bg-accent-purple" heading="Pivot Table Logic"
            body={<>When a <strong className="text-text-primary">date dimension</strong> is selected, results auto-pivot — date values become column headers. Without a date dimension, period comparison rows pivot on the <span className="font-mono text-accent-amber">_period</span> column instead.</>}
            tags={[
              { label: 'Date → Column pivot',   tagCls: 'border-accent-amber/25 bg-accent-amber/10 text-accent-amber' },
              { label: 'Period → Column pivot',  tagCls: 'border-accent-purple/25 bg-accent-purple/10 text-accent-purple' },
            ]}
          />
          <div className="col-span-full mt-1 flex items-start gap-2.5 rounded-lg border border-border bg-bg-input px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-live-pulse mt-1 flex-shrink-0" />
            <p className="text-[10px] text-text-muted leading-relaxed">
              All results execute against <strong className="text-text-secondary">production PostgreSQL</strong> via the
              <span className="font-mono"> get_tran_summary</span> stored procedure. Filters, pagination, and field selection
              are passed as procedure parameters — no data is cached. Results reflect live warehouse data from Nepal banking transactions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dimension field definitions ──────────────────────────────────────────────

type FieldType = 'categorical' | 'text' | 'date' | 'month' | 'quarter' | 'year' | 'measure_dim';
type DateFilterMode = 'single' | 'range' | 'multi';

interface DimensionFieldDef {
  key: string;
  label: string;
  type: FieldType;
  filterKey?: keyof DashboardFilters;
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
  // ── EOD Balance — measure rendered in the Dimension panel ─────────────────
  { key: 'eod_balance',  label: 'EOD Balance (EAB)', type: 'measure_dim',                                                                description: 'MAX(eod_balance) — triggers EAB LEFT JOIN on acid' },
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
  // eod_balance moved to Dimensions panel — selected there, sent as measure to backend
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
  measure_dim: { label: 'eab',     cls: 'bg-accent-teal/10 text-accent-teal border-accent-teal/20' },
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

// ─── Pivot data structures ────────────────────────────────────────────────────

type DataRow = Record<string, string | number | boolean | null>;

// Separator used internally to key pivot cells: pivotValue + SEP + measureKey.
// Null byte never appears in real data values.
const PIVOT_SEP = '\x00';

interface PivotData {
  rowDimKeys:  string[];   // left-side "row" dimension columns
  pivotValues: string[];   // unique values of the pivot field — become column group headers
  measureKeys: string[];   // measure names — become sub-column headers under each pivot value
  rows:        DataRow[];  // keyed as `pivotValue\x00measureKey` for pivot cells
}

// Build structured pivot data from flat rows.
// pivotFieldKey: the column whose distinct values become top-level column groups.
function buildPivotData(
  rows: DataRow[],
  pivotFieldKey: string,
  rowDimKeys: string[],
  measureKeys: string[],
): PivotData {
  const pivotValues = [...new Set(
    rows.map((r) => String(r[pivotFieldKey] ?? '')).filter(Boolean),
  )].sort();

  const grouped = new Map<string, DataRow>();
  for (const row of rows) {
    const rowKey = rowDimKeys.map((k) => String(row[k] ?? '')).join('\x01');
    if (!grouped.has(rowKey)) {
      const seed: DataRow = {};
      rowDimKeys.forEach((k) => { seed[k] = row[k] ?? null; });
      grouped.set(rowKey, seed);
    }
    const out = grouped.get(rowKey)!;
    const pv  = String(row[pivotFieldKey] ?? '');
    measureKeys.forEach((mk) => { out[`${pv}${PIVOT_SEP}${mk}`] = row[mk] ?? null; });
  }

  return { rowDimKeys, pivotValues, measureKeys, rows: Array.from(grouped.values()) };
}

// ─── Excel-style PivotTable component ────────────────────────────────────────

function renderCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(v);
}

function PivotTable({ data, title, subtitle }: { data: PivotData; title: string; subtitle?: string }) {
  const { rowDimKeys, pivotValues, measureKeys, rows } = data;
  const hasMultiMeasure = measureKeys.length > 1;

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)]" style={{ background: 'var(--bg-card)' }}>
      {/* Table header bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border" style={{ background: 'var(--bg-surface)' }}>
        <div className="min-w-0">
          <h3 className="font-display text-[13px] font-bold text-text-primary tracking-tight truncate">{title}</h3>
          {subtitle && <p className="text-[10.5px] text-text-muted mt-0.5 leading-none">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-accent-purple/30 bg-accent-purple/10 text-accent-purple uppercase tracking-wider">
            pivot
          </span>
          <span className="text-[10px] text-text-muted font-medium px-2 py-1 rounded-md border border-border bg-bg-input">
            {rows.length.toLocaleString()} rows
          </span>
        </div>
      </div>

      {/* Two-tier pivot header */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11.5px]">
          <thead className="sticky top-0 z-[1]" style={{ background: 'var(--bg-base)' }}>

            {/* Top row — row dim headers (rowspan=2) + pivot value group headers */}
            <tr className="border-b border-border">
              {rowDimKeys.map((k) => (
                <th
                  key={k}
                  rowSpan={hasMultiMeasure ? 2 : 1}
                  className="px-4 py-2 text-left text-[9.5px] font-bold text-text-muted uppercase tracking-[0.5px] whitespace-nowrap border-r border-border bg-bg-base"
                >
                  {k.replaceAll('_', ' ')}
                </th>
              ))}
              {pivotValues.map((pv) => (
                <th
                  key={pv}
                  colSpan={measureKeys.length}
                  className="px-3 py-2 text-center text-[10px] font-bold text-accent-purple border-l border-border whitespace-nowrap bg-accent-purple/5"
                >
                  {pv}
                </th>
              ))}
            </tr>

            {/* Sub-header row — measure names under each pivot value group */}
            {hasMultiMeasure && (
              <tr className="border-b border-border">
                {pivotValues.map((pv) =>
                  measureKeys.map((mk) => (
                    <th
                      key={`${pv}-${mk}`}
                      className="px-3 py-1.5 text-center text-[8.5px] font-semibold text-text-muted uppercase tracking-[0.4px] whitespace-nowrap border-l border-border/50 bg-accent-purple/3"
                    >
                      {mk.replaceAll('_', ' ')}
                    </th>
                  ))
                )}
              </tr>
            )}
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={rowDimKeys.length + pivotValues.length * measureKeys.length}
                  className="py-12 text-center text-[11px] text-text-muted"
                >
                  No data
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                  {/* Row dimension cells */}
                  {rowDimKeys.map((k) => (
                    <td key={k} className="px-4 py-2.5 text-text-primary font-medium whitespace-nowrap border-r border-border/40">
                      {renderCell(row[k])}
                    </td>
                  ))}
                  {/* Pivot value × measure cells */}
                  {pivotValues.map((pv) =>
                    measureKeys.map((mk) => (
                      <td key={`${pv}-${mk}`} className="px-3 py-2.5 text-right text-text-secondary whitespace-nowrap border-l border-border/30 font-mono text-[11px]">
                        {renderCell(row[`${pv}${PIVOT_SEP}${mk}`])}
                      </td>
                    ))
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function PivotDashboard() {
  const { filters, setFilters, topBarProps, handleClearFilters, filterStats } = useDashboardPage();

  const [selectedDimensions, setSelectedDimensions] = useState<string[]>(['gam_branch']);
  const [selectedMeasures, setSelectedMeasures]     = useState<string[]>(['total_amount', 'transaction_count']);
  // partitionDimensions: ordered list of dimension keys checked for "Pivot Col"
  // Order follows the sequence the user checked them — used as pivot column headers top-to-bottom.
  const [partitionDimensions, setPartitionDimensions] = useState<string[]>([]);
  // orderFields: ordered list of dimension/measure keys checked for "Order By"
  // Combines dimension keys and measure keys into a single ORDER BY field1, field2 clause.
  const [orderFields, setOrderFields]                 = useState<string[]>([]);
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

  // All selected dimensions are sent to the backend as true GROUP BY dimensions.
  // eod_balance and tran_date_bal are now proper dimensions (not measures).
  const backendDimensions = useMemo(
    () => selectedDimensions,
    [selectedDimensions],
  );

  const standardMeasures = useMemo(
    () => selectedMeasures.filter((k) => STANDARD_MEASURES.some((m) => m.key === k)),
    [selectedMeasures],
  );
  const timeComparisons = useMemo(
    () => selectedMeasures.filter((k) => COMPARISON_MEASURES.some((m) => m.key === k)),
    [selectedMeasures],
  );
  // Measures come only from the Measures panel — eod_balance/tran_date_bal are now dimensions.
  const measures = useMemo(
    () => standardMeasures.length > 0 ? standardMeasures : ['total_amount'],
    [standardMeasures],
  );

  // rowDims: the dimensions that become the LEFT-SIDE row keys in the pivot table.
  // = all backend dimensions EXCEPT the ones the user chose as pivot (column-header) fields.
  const rowDims = useMemo(
    () => backendDimensions.filter((k) => !partitionDimensions.includes(k)),
    [backendDimensions, partitionDimensions],
  );

  // partitionby_clause — contains ONLY the fields the user explicitly checked for Pivot Col.
  // The stored procedure uses this verbatim inside OVER(...) for ROW_NUMBER().
  const partitionbyClause = useMemo(
    () => partitionDimensions.length > 0
      ? `PARTITION BY ${partitionDimensions.join(', ')}`
      : '',
    [partitionDimensions],
  );

  // orderby_clause — built from ALL fields (dimensions + measures) checked for Order By, in check order.
  // Example: ORDER BY tran_date, acct_num, total_amount
  // When empty the backend falls back to its default measure-based ORDER BY.
  const orderbyClause = useMemo(
    () => orderFields.length > 0
      ? `ORDER BY ${orderFields.join(', ')}`
      : '',
    [orderFields],
  );

  const { data: explorer, isLoading, isFetching } = useProductionExplorer(
    filters, backendDimensions, measures, timeComparisons, page, pageSize, partitionbyClause, orderbyClause,
  );

  // ── Date options generated from filter stats ──────────────────────────────

  const dateOptions = useMemo(() => generateDateOptions(filterStats), [filterStats]);

  // ── Pivot logic ───────────────────────────────────────────────────────────
  // Case A — date dim selected: pivot on that date column.
  //   rows without a non-date dim → single summary row per date value.
  //   rows with non-date dims   → one row per non-date combo, date values = columns.
  // Case B — no date dim, comparisons active: pivot on the `_period` column injected
  //   by the backend, so main vs comparison rows appear as separate column groups.
  // Case C — no date dim, no comparisons: flat table.

  // pivotData is non-null only when user has checked Partition fields.
  // flatDisplay is used otherwise — always a plain table.
  const { pivotData, flatColumns, flatRows, isPivoted } = useMemo(() => {
    const emptyFlat = { pivotData: null, flatColumns: explorer?.columns ?? [], flatRows: explorer?.rows ?? [], isPivoted: false };
    if (!explorer || !explorer.rows.length) return emptyFlat;

    const rows = explorer.rows as DataRow[];

    if (partitionDimensions.length > 0) {
      if (partitionDimensions.length === 1) {
        // Single pivot field — its distinct values are top-level column groups.
        const pd = buildPivotData(rows, partitionDimensions[0], rowDims, measures);
        return { pivotData: pd, flatColumns: [], flatRows: [], isPivoted: true };
      }

      // Multiple pivot fields — composite key becomes the column group header
      // in the order the user ticked them.
      const compositeRows = rows.map((r) => ({
        ...r,
        _pivot_key: partitionDimensions.map((k) => String(r[k] ?? '')).join(' › '),
      }));
      const pd = buildPivotData(compositeRows, '_pivot_key', rowDims, measures);
      return { pivotData: pd, flatColumns: [], flatRows: [], isPivoted: true };
    }

    // No partition — flat table, strip internal _period column.
    const flatCols = explorer.columns.filter((c) => c !== '_period');
    const flat     = rows.map((r) => { const { _period, ...rest } = r; return rest; });
    return { pivotData: null, flatColumns: flatCols, flatRows: flat, isPivoted: false };
  }, [explorer, rowDims, partitionDimensions, measures]);

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
      if (!field.filterKey) return [];
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
      if (!field.filterKey) return false;
      const v    = filters[field.filterKey];
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
        // Also remove from partition and orderFields if deselected
        setPartitionDimensions((pp) => pp.filter((k) => k !== key));
        setOrderFields((of) => of.filter((k) => k !== key));
        const next = prev.filter((k) => k !== key);
        return next.length > 0 ? next : prev;
      }
      return [...prev, key];
    });
    setPage(1);
  }, []);

  // ── Partition toggle — maintains check order (top-to-bottom = first-checked-first) ─

  const togglePartition = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPartitionDimensions((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // Auto-select the dimension too so it appears in GROUP BY
      setSelectedDimensions((dims) => dims.includes(key) ? dims : [...dims, key]);
      return [...prev, key];
    });
    setPage(1);
  }, []);

  // ── Order By toggle — maintains check order ───────────────────────────────

  const toggleOrderField = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOrderFields((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
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
    () => selectedDimensions.map((d) => {
      if (d === 'eod_balance') return 'EOD Balance';
      return catalog?.dimension_options.find((o) => o.value === d)?.label ?? d;
    }).join(' × '),
    [catalog, selectedDimensions],
  );

  // ── Full procedure-call preview (all 20 params) ──────────────────────────
  const sqlPreviewLines = useMemo((): SqlLine[] => {
    if (!explorer) {
      return [{ text: '-- Select at least one dimension and one measure to generate the call.', kind: 'placeholder' }];
    }

    const sp  = explorer.sql_preview;
    const pw  = sp.period_wheres ?? {};

    const lines: SqlLine[] = [];
    lines.push({ text: 'CALL public.get_tran_summary(', kind: 'header' });

    // ── SELECT ───────────────────────────────────────────────────────────────
    lines.push({ text: `  select_outer             => '${sp.select_outer ?? 'SELECT tb2.*'}',`, kind: 'select' });
    lines.push({ text: `  select_inner             => '${sp.select_inner}',`,                   kind: 'select' });

    // ── WHERE ────────────────────────────────────────────────────────────────
    lines.push({ text: `  where_clause             => '${sp.where_clause}',`,                   kind: 'where' });

    // ── PERIOD WHERE params (9) ───────────────────────────────────────────────
    ALL_PERIOD_PARAMS.forEach((param) => {
      const val = pw[param] ?? '';
      const active = val.length > 0;
      lines.push({ text: `  ${param.padEnd(28)} => '${val}',${active ? '  -- ✓ active' : ''}`, kind: 'period' });
    });

    // ── GROUP / HAVING / ORDER / PARTITION ───────────────────────────────────
    lines.push({ text: `  groupby_clause           => '${sp.groupby_clause}',`,                 kind: 'group' });
    lines.push({ text: `  having_clause            => '${sp.having_clause ?? ''}',`,            kind: 'group' });
    lines.push({ text: `  orderby_clause           => '${sp.orderby_clause}',`,                 kind: 'group' });

    // partitionby_clause — full PARTITION BY clause passed verbatim to the procedure
    const pbVal = sp.partitionby_clause ?? '';
    lines.push({
      text: `  partitionby_clause       => '${pbVal}',${pbVal ? '  -- ✓ pivot active' : '  -- \'\' = global ROW_NUMBER (no pivot)'}`,
      kind: 'partition',
    });

    // ── EAB join ─────────────────────────────────────────────────────────────
    const eabVal = sp.eab_join ?? '';
    lines.push({
      text: `  eab_join                 => '${eabVal}',${eabVal ? '  -- ✓ eod_balance selected → LEFT JOIN eab' : '  -- empty: eod_balance not selected'}`,
      kind: 'eab',
    });

    // ── Security / Pagination ────────────────────────────────────────────────
    lines.push({ text: `  user_id                  => '',  -- row-level security (empty = no restriction)`, kind: 'page' });
    lines.push({ text: `  page                     => ${sp.page},`, kind: 'page' });
    lines.push({ text: `  page_size                => ${sp.page_size}`, kind: 'page' });
    lines.push({ text: ')', kind: 'footer' });

    return lines;
  }, [explorer]);

  // Use main query total_rows from backend for pagination.
  // When pivoted, the backend total still reflects raw row count (correct for page nav).
  // Clamp: if total_rows < rows actually on this page, the SP under-reported — trust actual count.
  const backendTotal = useMemo(() => {
    if (!explorer) return 0;
    const minFromPage = (page - 1) * pageSize + explorer.rows.length;
    return Math.max(explorer.total_rows ?? 0, minFromPage);
  }, [explorer, page, pageSize]);

  const totalPages = Math.ceil(backendTotal / pageSize) || 1;

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
                  const selected    = selectedDimensions.includes(field.key);
                  const partitioned = partitionDimensions.includes(field.key);
                  const partOrder   = partitionDimensions.indexOf(field.key);
                  const ordered     = orderFields.includes(field.key);
                  const orderIdx    = orderFields.indexOf(field.key);
                  const expanded    = expandedField === field.key;
                  const filtered    = fieldHasFilter(field);
                  const badge       = TYPE_BADGE[field.type];
                  const isDate      = DATE_DIM_KEYS.has(field.key);
                  const isMeasure   = field.type === 'measure_dim';
                  const mode        = isDate ? (dateFilterModes[field.key] ?? 'single') : null;
                  const hasFilter   = !isMeasure && field.filterKey;

                  return (
                    <li key={field.key} className={`transition-colors ${selected ? (partitioned ? 'bg-accent-purple/5' : 'bg-accent-blue/5') : 'hover:bg-bg-hover'}`}>
                      {/* Row */}
                      <div
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
                        onClick={() => toggleDimension(field.key)}
                      >
                        {/* Dimension checkbox */}
                        <span className={`flex-shrink-0 w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors ${selected ? 'border-accent-blue bg-accent-blue' : 'border-border'}`}>
                          {selected && (
                            <svg viewBox="0 0 10 10" className="w-2 h-2 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1.5,5 4,7.5 8.5,2" />
                            </svg>
                          )}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className={`text-[12px] font-medium ${selected ? (partitioned ? 'text-accent-purple' : 'text-accent-blue') : 'text-text-primary'}`}>
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
                            {partitioned && (
                              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-purple/30 bg-accent-purple/10 text-accent-purple">
                                pivot #{partOrder + 1}
                              </span>
                            )}
                            {ordered && (
                              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-amber/30 bg-accent-amber/10 text-accent-amber">
                                order #{orderIdx + 1}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted mt-0.5 truncate">{field.description}</p>
                        </div>

                        {/* Include in Partition — always visible on every field */}
                        <button
                          type="button"
                          onClick={(e) => togglePartition(field.key, e)}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9.5px] font-semibold transition-colors ${
                            partitioned
                              ? 'border-accent-purple/40 bg-accent-purple/15 text-accent-purple'
                              : 'border-border bg-bg-input text-text-muted hover:border-accent-purple/30 hover:text-accent-purple'
                          }`}
                          title="Include this field as a pivot column header"
                        >
                          <span className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${partitioned ? 'border-accent-purple bg-accent-purple' : 'border-current'}`}>
                            {partitioned && (
                              <svg viewBox="0 0 8 8" className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="1,4 3,6 7,1.5" />
                              </svg>
                            )}
                          </span>
                          Partition
                        </button>

                        {/* Order By button */}
                        <button
                          type="button"
                          onClick={(e) => toggleOrderField(field.key, e)}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9.5px] font-semibold transition-colors ${
                            ordered
                              ? 'border-accent-amber/40 bg-accent-amber/15 text-accent-amber'
                              : 'border-border bg-bg-input text-text-muted hover:border-accent-amber/30 hover:text-accent-amber'
                          }`}
                          title="Include this field in ORDER BY"
                        >
                          <span className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${ordered ? 'border-accent-amber bg-accent-amber' : 'border-current'}`}>
                            {ordered && (
                              <svg viewBox="0 0 8 8" className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="1,4 3,6 7,1.5" />
                              </svg>
                            )}
                          </span>
                          Order By
                        </button>

                        {hasFilter && (
                          <button
                            type="button"
                            aria-label={expanded ? 'Collapse filter' : 'Expand filter'}
                            onClick={(e) => { e.stopPropagation(); setExpanded(expanded ? null : field.key); }}
                            className="flex-shrink-0 text-text-muted hover:text-text-primary text-[10px] px-1.5 py-0.5 rounded hover:bg-bg-input transition-colors"
                          >
                            {expanded ? '▲' : '▼'}
                          </button>
                        )}
                      </div>

                      {/* Inline filter control */}
                      {expanded && hasFilter && (
                        <div className="px-4 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>

                          {/* Categorical → multi-select from API values */}
                          {field.type === 'categorical' && (
                            <SearchableMultiSelect
                              value={getMultiValue(field)}
                              onChange={(vals) => setFieldFilter(field.filterKey!, vals.length > 0 ? vals : undefined)}
                              options={getOptions(field)}
                              placeholder={`Filter by ${field.label.toLowerCase()}…`}
                            />
                          )}

                          {/* Text → ILIKE search */}
                          {field.type === 'text' && (
                            <input
                              type="text"
                              value={(filters[field.filterKey!] as string) ?? ''}
                              onChange={(e) => setFieldFilter(field.filterKey!, e.target.value.trim() || undefined)}
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
                                  value={getSingleValue(field.filterKey!)}
                                  onChange={(e) => {
                                    const v = e.target.value.trim();
                                    setFieldFilter(field.filterKey!, v || undefined);
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
                                      if (field.filterKey) setFieldFilter(field.filterKey, vals.length > 0 ? vals : undefined);
                                    }}
                                    placeholder="YYYY-MM-DD, YYYY-MM-DD, …"
                                    className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono"
                                  />
                                ) : (
                                  <SearchableMultiSelect
                                    value={getMultiValue(field)}
                                    onChange={(vals) => setFieldFilter(field.filterKey!, vals.length > 0 ? vals : undefined)}
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
                  const isLast = active && measures.length === 1 && measures[0] === measure.key;
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

            {/* How it works */}
            <HowItWorksPanel />

            {/* Partition clause summary — shown when any field is checked for partition */}
            {partitionDimensions.length > 0 ? (
              <div className="rounded-lg border border-accent-purple/30 bg-accent-purple/8 px-4 py-2.5 flex items-start gap-2.5">
                <span className="text-accent-purple text-[13px] leading-none mt-0.5">⊞</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-accent-purple">Partition pivot active</p>
                  <p className="text-[10.5px] text-text-secondary mt-0.5">
                    Column headers are built from: {' '}
                    {partitionDimensions.map((k, i) => (
                      <span key={k}>
                        <span className="font-mono text-accent-purple bg-accent-purple/10 px-1 rounded">{k}</span>
                        {i < partitionDimensions.length - 1 && <span className="text-text-muted mx-1">→</span>}
                      </span>
                    ))}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    Column headers:{' '}
                    {partitionDimensions.map((k, i) => (
                      <span key={k}>
                        <span className="font-mono text-accent-purple bg-accent-purple/10 px-1 rounded">{k}</span>
                        {i < partitionDimensions.length - 1 && <span className="text-text-muted mx-1">›</span>}
                      </span>
                    ))}
                  </p>
                  {rowDims.length > 0 && (
                    <p className="text-[10px] text-text-muted mt-0.5 font-mono">
                      {partitionbyClause}
                      <span className="text-text-muted not-italic font-sans ml-1.5">← pagination key</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setPartitionDimensions([]); setPage(1); }}
                  className="flex-shrink-0 text-[10px] font-medium text-accent-red hover:underline"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-bg-input/40 px-4 py-2 flex items-center gap-2">
                <span className="text-text-muted text-[11px]">⊞</span>
                <p className="text-[10.5px] text-text-muted">
                  <strong className="text-text-secondary">No partition selected</strong> — check{' '}
                  <span className="font-semibold text-accent-purple">Partition</span> on any selected dimension to pivot the report on its values as column headers.
                </p>
              </div>
            )}


            {/* ── Full procedure call preview — all 20 params ──────────────── */}
            <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-input/50">
                <div className="flex items-center gap-2.5">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-text-muted">
                    get_tran_summary — All 20 Parameters
                  </p>
                  {explorer?.sql_preview?.include_eab && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-accent-teal/30 bg-accent-teal/10 text-accent-teal uppercase tracking-wider">
                      EAB join active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  {isPivoted && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-accent-amber/30 bg-accent-amber/10 text-accent-amber uppercase tracking-wider">
                      pivoted
                    </span>
                  )}
                  {isFetching && <span className="text-[10px] text-accent-blue animate-pulse">Running…</span>}
                </div>
              </div>

              {/* Colour legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-2 border-b border-border bg-bg-base/40">
                {[
                  { dot: 'bg-accent-blue',   label: 'SELECT' },
                  { dot: 'bg-accent-green',  label: 'WHERE' },
                  { dot: 'bg-accent-purple', label: 'GROUP / ORDER / PARTITION' },
                  { dot: 'bg-accent-amber',  label: 'Period comparisons' },
                  { dot: 'bg-accent-teal',   label: 'EAB join' },
                  { dot: 'bg-text-muted',    label: 'Pagination / security' },
                ].map((l) => (
                  <span key={l.label} className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${l.dot}`} />
                    <span className="text-[9px] text-text-muted">{l.label}</span>
                  </span>
                ))}
              </div>

              {/* Lines */}
              <div className="px-4 py-3 overflow-x-auto">
                <pre className="text-[10px] leading-[1.75] font-mono">
                  {sqlPreviewLines.map((line, i) => (
                    <span key={i} className={`block ${KIND_CLS[line.kind] ?? 'text-text-secondary'}`}>
                      {line.text}
                    </span>
                  ))}
                </pre>
              </div>

              {/* partitionby explainer */}
              <div className="border-t border-border px-4 py-3 bg-accent-purple/5 flex items-start gap-2.5">
                <span className="w-4 h-4 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="4" stroke="#8b5cf6" strokeWidth="1.5"/>
                    <path d="M5 4.5v3M5 3v.5" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </span>
                <div className="space-y-1">
                  <p className="text-[10.5px] font-semibold text-accent-purple">partitionby_clause rules</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-text-muted">
                    <div className="rounded border border-accent-green/20 bg-accent-green/8 px-2 py-1.5">
                      <span className="font-mono text-accent-green block mb-0.5">{"=> ''"}</span>
                      <span className="text-accent-green font-semibold">✓ No pivot</span> — Global <code>ROW_NUMBER()</code>. Standard paginated table.
                    </div>
                    <div className="rounded border border-accent-blue/20 bg-accent-blue/8 px-2 py-1.5">
                      <span className="font-mono text-accent-blue block mb-0.5">{"=> 'PARTITION BY gam_branch, year_month'"}</span>
                      <span className="text-accent-blue font-semibold">✓ Pivot</span> — Full clause passed verbatim. Field values become column headers.
                    </div>
                  </div>
                  {explorer?.sql_preview?.include_eab && (
                    <div className="mt-1.5 rounded border border-accent-teal/20 bg-accent-teal/8 px-2 py-1.5 text-[10px]">
                      <span className="text-accent-teal font-semibold block mb-0.5">EOD Balance active — EAB join explained</span>
                      <span className="text-text-muted">
                        <code className="text-accent-teal">select_inner</code> adds <code>acid</code> to GROUP BY so the outer query can join.{' '}
                        <code className="text-accent-teal">select_outer</code> pulls <code>e.tran_date_bal</code> from the production eab table (not schema.rb).{' '}
                        The procedure result contains both <code>eod_balance</code> (aggregated from tran_summary) and <code>eab_balance</code> (real snapshot from eab).
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Empty periods notice */}
            {(explorer?.empty_periods ?? []).length > 0 && (
              <div className="rounded-lg border border-border bg-bg-input px-4 py-2.5 flex items-start gap-2.5">
                <span className="text-text-muted text-[13px] leading-none mt-0.5">ⓘ</span>
                <div>
                  <p className="text-[11px] font-semibold text-text-primary">No data for some periods</p>
                  <p className="text-[10.5px] text-text-muted mt-0.5">
                    The following comparison periods returned no rows — their columns are omitted from the table:{' '}
                    <span className="font-mono text-text-secondary">{explorer!.empty_periods.join(', ')}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Result table — PivotTable when partition active, RecordTable otherwise */}
            {isPivoted && pivotData ? (
              <PivotTable
                data={pivotData}
                title={`Results — ${dimensionLabels}`}
                subtitle={
                  isLoading
                    ? 'Executing get_tran_summary against production…'
                    : `${backendTotal.toLocaleString()} raw rows · ${pivotData.rows.length.toLocaleString()} pivoted rows on this page · page ${page} of ${totalPages}`
                }
              />
            ) : (
              <RecordTable
                title={`Results — ${dimensionLabels}`}
                subtitle={
                  isLoading
                    ? 'Executing get_tran_summary against production…'
                    : `${backendTotal.toLocaleString()} total rows · page ${page} of ${totalPages}`
                }
                columns={flatColumns}
                rows={flatRows}
              />
            )}

            {/* Pagination + page size */}
            {backendTotal > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-[11px] text-text-muted">
                  {isPivoted && pivotData
                    ? `${pivotData.rows.length.toLocaleString()} pivoted rows · page ${page} of ${totalPages} (${backendTotal.toLocaleString()} raw)`
                    : `Showing ${((page - 1) * pageSize) + 1}–${Math.min(page * pageSize, backendTotal).toLocaleString()} of ${backendTotal.toLocaleString()} rows`}
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
