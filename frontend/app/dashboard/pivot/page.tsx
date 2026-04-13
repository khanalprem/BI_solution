'use client';

import { useCallback, useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Checkbox } from '@/components/ui/checkbox';
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
            body="Measures are aggregations computed over the grouped rows — Total Amount, Count, Credit/Debit, and Net Flow. Selecting TRAN Date Balance in Dimensions triggers the EAB LEFT JOIN. At least one standard measure must remain selected."
            tags={[
              { label: 'Total Amount',      tagCls: 'border-accent-green/25 bg-accent-green/10 text-accent-green' },
              { label: 'Transaction Count', tagCls: 'border-accent-green/25 bg-accent-green/10 text-accent-green' },
              { label: 'Net Flow',          tagCls: 'border-accent-green/25 bg-accent-green/10 text-accent-green' },
              { label: 'Net Flow',          tagCls: 'border-accent-green/25 bg-accent-green/10 text-accent-green' },
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

const DATE_FIELD_ORDER = ['year', 'year_quarter', 'year_month', 'tran_date'] as const;

// Fields (besides date container) that get a Pivot button
const PIVOT_CAPABLE_NON_DATE = new Set(['part_tran_type', 'tran_type', 'gl_sub_head_code']);

const DIMENSION_FIELDS: DimensionFieldDef[] = [
  // ── Account / customer dimensions ─────────────────────────────────────────
  { key: 'gam_branch',       label: 'GAM Branch',       type: 'categorical', filterKey: 'branchCode',    optionsKey: 'branches',          description: 'Account registration branch (GAM)' },
  { key: 'gam_province',     label: 'GAM Province',     type: 'categorical', filterKey: 'province',      optionsKey: 'provinces',         description: 'Province of the account branch (GAM)' },
  { key: 'gam_cluster',      label: 'GAM Cluster',      type: 'categorical', filterKey: 'cluster',       optionsKey: 'clusters',          description: 'Account branch cluster (GAM)' },
  { key: 'gam_solid',        label: 'Account SOL ID',   type: 'categorical', filterKey: 'solid',         optionsKey: 'solids',            description: 'SOL identifier for account routing' },
  { key: 'acct_num',         label: 'ACCT Num',         type: 'text',        filterKey: 'acctNum',       description: 'Account number (exact match)' },
  { key: 'acct_name',        label: 'ACCT Name',        type: 'text',                                    description: 'Account holder name' },
  { key: 'cif_id',           label: 'CIF Id',           type: 'text',        filterKey: 'cifId',         description: 'Full or partial customer CIF ID (ILIKE search)' },
  // ── Transaction dimensions ────────────────────────────────────────────────
  { key: 'tran_source',      label: 'TRAN Source',      type: 'categorical', filterKey: 'tranSource',    optionsKey: 'tran_sources',      description: 'Transaction channel (mobile / internet / branch)' },
  { key: 'tran_branch',      label: 'TRAN Branch',      type: 'categorical',                             description: 'Branch where the transaction was processed' },
  { key: 'tran_cluster',     label: 'TRAN Cluster',     type: 'categorical',                             description: 'Transaction branch cluster' },
  { key: 'tran_province',    label: 'TRAN Province',    type: 'categorical',                             description: 'Province of the transaction branch' },
  { key: 'tran_type',        label: 'TRAN Type',        type: 'categorical',                             description: 'Transaction type code' },
  { key: 'part_tran_type',   label: 'PART Tran Type',   type: 'categorical', filterKey: 'partTranType',  optionsKey: 'part_tran_types',   description: 'Credit or debit side of the transaction (CR / DR)' },
  { key: 'gl_sub_head_code', label: 'GL Sub Head',      type: 'categorical', filterKey: 'glSubHeadCode', optionsKey: 'gl_sub_head_codes', description: 'General ledger sub-head code' },
  { key: 'product',          label: 'Product',          type: 'categorical', filterKey: 'product',       optionsKey: 'products',          description: 'Banking product associated with the account' },
  { key: 'service',          label: 'Service',          type: 'categorical', filterKey: 'service',       optionsKey: 'services',          description: 'Service type applied to the transaction' },
  { key: 'merchant',         label: 'Merchant',         type: 'categorical', filterKey: 'merchant',      optionsKey: 'merchants',         description: 'Merchant identifier for payment transactions' },
  // ── User dimensions ───────────────────────────────────────────────────────
  { key: 'entry_user',       label: 'ENTRY User',       type: 'categorical', filterKey: 'entryUser',     optionsKey: 'entry_users',       description: 'User who entered the transaction' },
  { key: 'vfd_user',         label: 'VFD User',         type: 'categorical', filterKey: 'vfdUser',       optionsKey: 'vfd_users',         description: 'User who verified the transaction' },
  // ── Date fields — rendered in the Date container with shared Pivot/Sort ───
  { key: 'tran_date',    label: 'Tran Date',     type: 'date',    filterKey: 'tranDate',    fromKey: 'tranDateFrom',    toKey: 'tranDateTo',    description: 'Daily granularity (YYYY-MM-DD)' },
  { key: 'year_month',   label: 'Year Month',    type: 'month',   filterKey: 'yearMonth',   fromKey: 'yearMonthFrom',   toKey: 'yearMonthTo',   description: 'Monthly period (YYYY-MM)' },
  { key: 'year_quarter', label: 'Year Quarter',  type: 'quarter', filterKey: 'yearQuarter', fromKey: 'yearQuarterFrom', toKey: 'yearQuarterTo', description: 'Quarterly period (YYYY-Qn)' },
  { key: 'year',         label: 'Year',          type: 'year',    filterKey: 'year',        fromKey: 'yearFrom',        toKey: 'yearTo',        description: 'Calendar year (YYYY)' },
  // ── EAB outer-join dimension ──────────────────────────────────────────────
  // tran_date_bal comes from the eab table (e.tran_date_bal) via LEFT JOIN on acid.
  { key: 'tran_date_bal', label: 'TRAN Date Balance', type: 'measure_dim', description: 'Account balance on transaction date (from EAB table via acid join)' },
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
  // Core totals
  { key: 'tran_amt',        label: 'TRAN Amount',        description: 'SUM(tran_amt)',                                        group: 'standard' },
  { key: 'tran_count',      label: 'TRAN Count',         description: 'SUM(tran_count)',                                      group: 'standard' },
  { key: 'signed_tranamt',  label: 'Signed TRAN Amount', description: 'SUM(signed_tranamt) — CR positive, DR negative',       group: 'standard' },
  // Credit leg
  { key: 'cr_amt',          label: 'CR Amount',          description: "SUM(tran_amt) where part_tran_type = 'CR'",            group: 'standard' },
  { key: 'cr_count',        label: 'CR Count',           description: "SUM(tran_count) where part_tran_type = 'CR'",          group: 'standard' },
  // Debit leg
  { key: 'dr_amt',          label: 'DR Amount',          description: "SUM(tran_amt) where part_tran_type = 'DR'",            group: 'standard' },
  { key: 'dr_count',        label: 'DR Count',           description: "SUM(tran_count) where part_tran_type = 'DR'",          group: 'standard' },
  // Distinct counts & date
  { key: 'tran_acct_count', label: 'TRAN Acct Count',   description: 'COUNT(DISTINCT acct_num)',                             group: 'standard' },
  { key: 'tran_maxdate',    label: 'TRAN Max Date',      description: 'MAX(tran_date)',                                       group: 'standard' },
];

const COMPARISON_MEASURES: MeasureDef[] = [
  { key: 'prevdate_amt',            label: 'Prev. Day — Amount',            description: 'prevdate_where · tran_amt',         group: 'comparison', period: 'prevdate' },
  { key: 'prevdate_count',          label: 'Prev. Day — Count',             description: 'prevdate_where · tran_count',       group: 'comparison', period: 'prevdate' },
  { key: 'thismonth_amt',           label: 'This Month — Amount',           description: 'thismonth_where · tran_amt',        group: 'comparison', period: 'thismonth' },
  { key: 'thismonth_count',         label: 'This Month — Count',            description: 'thismonth_where · tran_count',      group: 'comparison', period: 'thismonth' },
  { key: 'thisyear_amt',            label: 'This Year — Amount',            description: 'thisyear_where · tran_amt',         group: 'comparison', period: 'thisyear' },
  { key: 'thisyear_count',          label: 'This Year — Count',             description: 'thisyear_where · tran_count',       group: 'comparison', period: 'thisyear' },
  { key: 'prevmonth_amt',           label: 'Prev. Month — Amount',          description: 'prevmonth_where · tran_amt',        group: 'comparison', period: 'prevmonth' },
  { key: 'prevmonth_count',         label: 'Prev. Month — Count',           description: 'prevmonth_where · tran_count',      group: 'comparison', period: 'prevmonth' },
  { key: 'prevyear_amt',            label: 'Prev. Year — Amount',           description: 'prevyear_where · tran_amt',         group: 'comparison', period: 'prevyear' },
  { key: 'prevyear_count',          label: 'Prev. Year — Count',            description: 'prevyear_where · tran_count',       group: 'comparison', period: 'prevyear' },
  { key: 'prevmonthmtd_amt',        label: 'Prev. Month MTD — Amount',      description: 'prevmonthmtd_where · tran_amt',     group: 'comparison', period: 'prevmonthmtd' },
  { key: 'prevmonthmtd_count',      label: 'Prev. Month MTD — Count',       description: 'prevmonthmtd_where · tran_count',   group: 'comparison', period: 'prevmonthmtd' },
  { key: 'prevyearytd_amt',         label: 'Prev. Year YTD — Amount',       description: 'prevyearytd_where · tran_amt',      group: 'comparison', period: 'prevyearytd' },
  { key: 'prevyearytd_count',       label: 'Prev. Year YTD — Count',        description: 'prevyearytd_where · tran_count',    group: 'comparison', period: 'prevyearytd' },
  { key: 'prevmonthsamedate_amt',   label: 'Prev. Month Same Day — Amount', description: 'prevmonthsamedate_where · tran_amt',   group: 'comparison', period: 'prevmonthsamedate' },
  { key: 'prevmonthsamedate_count', label: 'Prev. Month Same Day — Count',  description: 'prevmonthsamedate_where · tran_count', group: 'comparison', period: 'prevmonthsamedate' },
  { key: 'prevyearsamedate_amt',    label: 'Prev. Year Same Day — Amount',  description: 'prevyearsamedate_where · tran_amt',    group: 'comparison', period: 'prevyearsamedate' },
  { key: 'prevyearsamedate_count',  label: 'Prev. Year Same Day — Count',   description: 'prevyearsamedate_where · tran_count',  group: 'comparison', period: 'prevyearsamedate' },
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

// ─── Period-label display map ─────────────────────────────────────────────────
// Backend prefixes comparison tran_date values as "{period_label}:{date}"
// e.g. "this_month:2022-02-18". These labels come from PERIOD_COMPARISONS[:label]
// downcased + spaces→underscores.
const PERIOD_DISPLAY: Record<string, string> = {
  previous_date:         'Prev. Day',
  this_month:            'This Month',
  this_year:             'This Year',
  previous_month:        'Prev. Month',
  previous_year:         'Prev. Year',
  prev_month_mtd:        'Prev. Month MTD',
  prev_year_ytd:         'Prev. Year YTD',
  prev_month_same_date:  'Prev. Month Same Day',
  prev_year_same_date:   'Prev. Year Same Day',
};

// Parse a raw pivot value that may be "period_label:date" or just "date".
function parsePivotHeader(pv: string): { period: string | null; date: string } {
  const sep = pv.indexOf(':');
  if (sep === -1) return { period: null, date: pv };
  const periodKey = pv.slice(0, sep);
  // Only treat it as period-prefixed if we recognise the period key
  if (periodKey in PERIOD_DISPLAY) {
    return { period: periodKey, date: pv.slice(sep + 1) };
  }
  return { period: null, date: pv };
}

// ─── Pivot data structures ────────────────────────────────────────────────────

type DataRow = Record<string, string | number | boolean | null>;

// Separator used internally to key pivot cells: pivotValue + SEP + measureKey.
// Null byte never appears in real data values.
const PIVOT_SEP = '\x00';

// Separator used to join multiple pivot dimension values into a composite column key.
// e.g. "2024-02-01\x01CR" when pivoting on both tran_date + part_tran_type.
// SOH control character — never appears in real data.
const PIVOT_DIM_SEP = '\x01';

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

// Approximate pixel width per row-dim column for sticky left offsets.
// Each row-dim column is ~160px wide (px-4 padding + typical content).
const ROW_DIM_COL_WIDTH = 160;

interface L1Group {
  l1:     string;        // raw level-1 key (may carry "period:date" prefix)
  period: string | null; // parsed period label key, or null for main data
  date:   string;        // display date / value
  l2s:    string[];      // ordered level-2 sub-values (e.g. ["CR", "DR"])
}

// Module-level helper: top-level pivot group header cell.
// Defined outside PivotTable so React never sees a "new component type" on re-render.
function PivotGroupTh({
  colSpan, period, date,
}: { colSpan: number; period: string | null; date: string }) {
  return (
    <th
      colSpan={colSpan}
      className={`px-3 py-2 text-center text-[10px] font-bold border-l border-border whitespace-nowrap ${
        period !== null
          ? 'text-accent-amber bg-accent-amber/5'
          : 'text-accent-purple bg-accent-purple/5'
      }`}
    >
      {period !== null ? (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[8.5px] font-bold uppercase tracking-wider text-accent-amber/80 leading-none">
            {PERIOD_DISPLAY[period]}
          </span>
          <span className="text-[10px] font-bold text-accent-amber leading-none">{date}</span>
        </div>
      ) : date}
    </th>
  );
}

function PivotTable({ data, title, subtitle }: { data: PivotData; title: string; subtitle?: string }) {
  const { rowDimKeys, pivotValues, measureKeys, rows } = data;
  const hasMultiMeasure = measureKeys.length > 1;

  // Detect composite (multi-level) pivot keys: "2024-02-01\x01CR"
  const isMultiLevel = pivotValues.length > 0 && pivotValues[0].includes(PIVOT_DIM_SEP);

  // Build ordered level-1 groups from composite pivot values.
  // Preserves the natural sort order established by buildPivotData.
  const level1Groups: L1Group[] = [];
  if (isMultiLevel) {
    const seen = new Map<string, L1Group>();
    for (const pv of pivotValues) {
      const sepIdx = pv.indexOf(PIVOT_DIM_SEP);
      const l1 = sepIdx === -1 ? pv : pv.slice(0, sepIdx);
      const l2 = sepIdx === -1 ? ''  : pv.slice(sepIdx + 1);
      if (!seen.has(l1)) {
        const parsed = parsePivotHeader(l1);
        const g: L1Group = { l1, period: parsed.period, date: parsed.date, l2s: [] };
        seen.set(l1, g);
        level1Groups.push(g);
      }
      seen.get(l1)!.l2s.push(l2);
    }
  }

  // Total <thead> rows — drives rowSpan on frozen row-dim headers.
  // single-level: 1 (pivot values) [+ 1 if multiMeasure]
  // multi-level:  2 (level1 + level2) [+ 1 if multiMeasure]
  const totalHeaderRows = (isMultiLevel ? 2 : 1) + (hasMultiMeasure ? 1 : 0);

  // Total scrollable columns (for "No data" colSpan).
  const totalPivotCols = isMultiLevel
    ? level1Groups.reduce((s, g) => s + g.l2s.length, 0) * measureKeys.length
    : pivotValues.length * measureKeys.length;

  // Pre-compute cumulative left offset for each row-dim column (sticky freeze).
  const stickyLeft = rowDimKeys.map((_, i) => i * ROW_DIM_COL_WIDTH);
  const lastDimIdx  = rowDimKeys.length - 1;

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

      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-0 text-[11.5px]" style={{ minWidth: '100%' }}>
          <thead className="sticky top-0 z-[3]" style={{ background: 'var(--bg-base)' }}>

            {/* ── Row 1: frozen row-dim headers + top-level pivot group headers ── */}
            <tr className="border-b border-border">
              {rowDimKeys.map((k, i) => (
                <th
                  key={k}
                  rowSpan={totalHeaderRows}
                  className="px-4 py-2 text-left text-[9.5px] font-bold text-text-muted uppercase tracking-[0.5px] whitespace-nowrap border-r border-border"
                  style={{
                    position: 'sticky',
                    left: stickyLeft[i],
                    zIndex: 4,
                    background: 'var(--bg-base)',
                    minWidth: ROW_DIM_COL_WIDTH,
                    boxShadow: i === lastDimIdx ? '2px 0 6px -2px rgba(0,0,0,0.3)' : undefined,
                  }}
                >
                  {k}
                </th>
              ))}

              {isMultiLevel
                // Multi-level: level-1 group headers spanning all their sub-columns
                ? level1Groups.map(({ l1, period, date, l2s }) => (
                    <PivotGroupTh
                      key={l1}
                      colSpan={l2s.length * measureKeys.length}
                      period={period}
                      date={date}
                    />
                  ))
                // Single-level: each pivot value spans measure columns
                : pivotValues.map((pv) => {
                    const { period, date } = parsePivotHeader(pv);
                    return (
                      <PivotGroupTh
                        key={pv}
                        colSpan={measureKeys.length}
                        period={period}
                        date={date}
                      />
                    );
                  })
              }
            </tr>

            {/* ── Row 2 (multi-level only): level-2 sub-column headers (CR / DR / …) ── */}
            {isMultiLevel && (
              <tr className="border-b border-border">
                {level1Groups.flatMap(({ l1, period, l2s }) =>
                  l2s.map((l2) => (
                    <th
                      key={`${l1}${PIVOT_DIM_SEP}${l2}`}
                      colSpan={measureKeys.length}
                      className={`px-3 py-1.5 text-center text-[9px] font-bold uppercase tracking-[0.5px] whitespace-nowrap border-l border-border/50 ${
                        period !== null
                          ? 'text-accent-amber/80 bg-accent-amber/5'
                          : 'text-accent-purple/80 bg-accent-purple/5'
                      }`}
                    >
                      {l2}
                    </th>
                  ))
                )}
              </tr>
            )}

            {/* ── Row 2 or 3: measure sub-headers (when hasMultiMeasure) ── */}
            {hasMultiMeasure && (
              <tr className="border-b border-border">
                {isMultiLevel
                  ? level1Groups.flatMap(({ l1, period, l2s }) =>
                      l2s.flatMap((l2) =>
                        measureKeys.map((mk) => (
                          <th
                            key={`${l1}${PIVOT_DIM_SEP}${l2}${PIVOT_SEP}${mk}`}
                            className={`px-3 py-1.5 text-center text-[8.5px] font-semibold uppercase tracking-[0.4px] whitespace-nowrap border-l border-border/50 ${
                              period !== null
                                ? 'text-accent-amber/70 bg-accent-amber/3'
                                : 'text-text-muted bg-accent-purple/3'
                            }`}
                          >
                            {mk.replaceAll('_', ' ')}
                          </th>
                        ))
                      )
                    )
                  : pivotValues.flatMap((pv) => {
                      const { period } = parsePivotHeader(pv);
                      return measureKeys.map((mk) => (
                        <th
                          key={`${pv}${PIVOT_SEP}${mk}`}
                          className={`px-3 py-1.5 text-center text-[8.5px] font-semibold uppercase tracking-[0.4px] whitespace-nowrap border-l border-border/50 ${
                            period !== null
                              ? 'text-accent-amber/70 bg-accent-amber/3'
                              : 'text-text-muted bg-accent-purple/3'
                          }`}
                        >
                          {mk.replaceAll('_', ' ')}
                        </th>
                      ));
                    })
                }
              </tr>
            )}
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={rowDimKeys.length + totalPivotCols}
                  className="py-12 text-center text-[11px] text-text-muted"
                >
                  No data
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-[rgba(255,255,255,0.04)] transition-colors">
                  {/* Frozen row-dim cells */}
                  {rowDimKeys.map((k, di) => (
                    <td
                      key={k}
                      className="px-4 py-2.5 text-text-primary font-medium whitespace-nowrap border-r border-border/40"
                      style={{
                        position: 'sticky',
                        left: stickyLeft[di],
                        zIndex: 2,
                        background: 'var(--bg-card)',
                        minWidth: ROW_DIM_COL_WIDTH,
                        boxShadow: di === lastDimIdx ? '2px 0 6px -2px rgba(0,0,0,0.3)' : undefined,
                      }}
                    >
                      {renderCell(row[k])}
                    </td>
                  ))}

                  {/* Pivot value × measure cells — scrollable */}
                  {isMultiLevel
                    ? level1Groups.flatMap(({ l1, l2s }) =>
                        l2s.flatMap((l2) => {
                          const fullKey = `${l1}${PIVOT_DIM_SEP}${l2}`;
                          return measureKeys.map((mk) => (
                            <td
                              key={`${fullKey}${PIVOT_SEP}${mk}`}
                              className="px-3 py-2.5 text-right text-text-secondary whitespace-nowrap border-l border-border/30 font-mono text-[11px]"
                            >
                              {renderCell(row[`${fullKey}${PIVOT_SEP}${mk}`])}
                            </td>
                          ));
                        })
                      )
                    : pivotValues.flatMap((pv) =>
                        measureKeys.map((mk) => (
                          <td
                            key={`${pv}${PIVOT_SEP}${mk}`}
                            className="px-3 py-2.5 text-right text-text-secondary whitespace-nowrap border-l border-border/30 font-mono text-[11px]"
                          >
                            {renderCell(row[`${pv}${PIVOT_SEP}${mk}`])}
                          </td>
                        ))
                      )
                  }
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
  const [selectedMeasures, setSelectedMeasures]     = useState<string[]>(['tran_amt', 'tran_count']);
  const [datePivotEnabled, setDatePivotEnabled] = useState(false);
  const [dateSortEnabled, setDateSortEnabled]   = useState(false);
  const [nonDatePartitions, setNonDatePartitions] = useState<string[]>([]);
  // orderFields: ordered list of dimension/measure keys checked for "Sort"
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
  // tran_date_bal is an EAB outer-join dimension (not a measure).
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
  // Measures come only from the Measures panel — tran_date_bal is a dimension (EAB join).
  const measures = useMemo(
    () => standardMeasures.length > 0 ? standardMeasures : ['tran_amt'],
    [standardMeasures],
  );

  // Selected date dimensions in fixed order
  const selectedDateDims = useMemo(
    () => DATE_FIELD_ORDER.filter((k) => selectedDimensions.includes(k)),
    [selectedDimensions],
  );

  // Date fields going into PARTITION BY (when datePivotEnabled)
  const datePivotFields = useMemo(
    () => (datePivotEnabled ? selectedDateDims : []),
    [datePivotEnabled, selectedDateDims],
  );

  // Date fields going into ORDER BY (when dateSortEnabled)
  const dateSortFields = useMemo(
    () => (dateSortEnabled ? selectedDateDims : []),
    [dateSortEnabled, selectedDateDims],
  );

  // Combined partitionDimensions: date pivot fields (fixed order) + non-date pivots
  const partitionDimensions = useMemo(
    () => [
      ...datePivotFields,
      ...nonDatePartitions.filter((k) => selectedDimensions.includes(k)),
    ],
    [datePivotFields, nonDatePartitions, selectedDimensions],
  );

  // rowDims: the dimensions that become the LEFT-SIDE row keys in the pivot table.
  // = all backend dimensions EXCEPT the ones the user chose as pivot (column-header) fields.
  const rowDims = useMemo(
    () => backendDimensions.filter((k) => !partitionDimensions.includes(k)),
    [backendDimensions, partitionDimensions],
  );

  // partitionby_clause — the fields the user explicitly checked for Pivot Col.
  const partitionbyClause = useMemo(
    () => partitionDimensions.length > 0
      ? `PARTITION BY ${partitionDimensions.join(', ')}`
      : '',
    [partitionDimensions],
  );

  // autoOrderFields — computed automatically when pivot is active.
  // Rule: pivot fields first (UI order), then remaining selected dimension fields (row dims).
  // When no pivot is active this is empty — user controls ORDER BY fully via orderFields.
  const autoOrderFields = useMemo(() => {
    if (partitionDimensions.length > 0) {
      // Pivot active: pivot fields first, then row dims
      return [...partitionDimensions, ...rowDims];
    }
    if (dateSortEnabled && dateSortFields.length > 0) {
      // Sort-only (no pivot): date fields in fixed order
      return dateSortFields;
    }
    return [];
  }, [partitionDimensions, rowDims, dateSortEnabled, dateSortFields]);

  // effectiveOrderList — the final deduplicated ORDER BY field list.
  // = autoOrderFields + any user-checked fields not already in autoOrderFields.
  // When no pivot: only user-checked orderFields apply.
  const effectiveOrderList = useMemo(() => {
    const autoSet = new Set(autoOrderFields);
    const extra   = orderFields.filter((k) => !autoSet.has(k));
    return [...autoOrderFields, ...extra];
  }, [autoOrderFields, orderFields]);

  // orderby_clause sent to the backend.
  const orderbyClause = useMemo(
    () => effectiveOrderList.length > 0
      ? `ORDER BY ${effectiveOrderList.join(', ')}`
      : '',
    [effectiveOrderList],
  );

  const { data: explorer, isLoading, isFetching } = useProductionExplorer(
    filters, backendDimensions, measures, timeComparisons, page, pageSize, partitionbyClause, orderbyClause,
  );

  // ── Date options generated from filter stats ──────────────────────────────

  const dateOptions = useMemo(() => generateDateOptions(filterStats), [filterStats]);

  // ── Frontend pivot — pandas equivalent: ─────────────────────────────────────
  //   df.pivot(
  //     index   = rowDims,             ← dimensions NOT checked for Pivot Col → left-side rows
  //     columns = partitionDimensions, ← dimensions checked for Pivot Col → column group headers
  //     values  = measures,            ← selected measures → cell values
  //   )
  //
  // The backend returns flat rows (one per group-by combination).
  // We re-pivot them here: group by rowDims, spread partitionDimensions values across columns.
  // Missing intersections stay null (rendered as "—").
  const { pivotData, flatColumns, flatRows, isPivoted } = useMemo(() => {
    const emptyFlat = {
      pivotData: null,
      flatColumns: explorer?.columns ?? [],
      flatRows: (explorer?.rows ?? []) as DataRow[],
      isPivoted: false,
    };
    if (!explorer || !explorer.rows.length) return emptyFlat;

    const rows = explorer.rows as DataRow[];

    if (partitionDimensions.length === 0) {
      // No pivot fields selected — flat table.
      const flatCols = explorer.columns.filter((c) => c !== '_period');
      const flat     = rows.map(({ _period, ...rest }) => rest as DataRow);
      return { pivotData: null, flatColumns: flatCols, flatRows: flat, isPivoted: false };
    }

    // Build a single pivot-column key from all checked pivot fields.
    // Single field → value as-is.  Multiple fields → joined with PIVOT_DIM_SEP (\x01).
    // e.g. tran_date + part_tran_type → "2024-02-01\x01CR"
    const pivotRows = partitionDimensions.length === 1
      ? rows
      : rows.map((r) => ({
          ...r,
          _pivot_key: partitionDimensions.map((k) => String(r[k] ?? '')).join(PIVOT_DIM_SEP),
        }));

    const pivotField = partitionDimensions.length === 1
      ? partitionDimensions[0]
      : '_pivot_key';

    // Apply pivot:
    //   index   = rowDims
    //   columns = pivotField (distinct values become column-group headers)
    //   values  = measures
    const pd = buildPivotData(pivotRows, pivotField, rowDims, measures);
    return { pivotData: pd, flatColumns: [], flatRows: [], isPivoted: true };
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
    const isDateField = (DATE_FIELD_ORDER as readonly string[]).includes(key);
    const isCurrentlySelected = selectedDimensions.includes(key);

    if (isCurrentlySelected) {
      // Guard: must keep at least one dimension selected
      if (selectedDimensions.length === 1) return;

      // ── Clear the filter for this field when deselecting ──────────────────
      const fieldDef = DIMENSION_FIELDS.find((f) => f.key === key);
      if (fieldDef) {
        setFilters((prev) => {
          const next = { ...prev };
          if (fieldDef.filterKey) delete next[fieldDef.filterKey as keyof typeof next];
          if (fieldDef.fromKey)   delete next[fieldDef.fromKey   as keyof typeof next];
          if (fieldDef.toKey)     delete next[fieldDef.toKey     as keyof typeof next];
          return next;
        });
      }

      // ── Update pivot / sort / order state ─────────────────────────────────
      if (isDateField) {
        const remainingDate = DATE_FIELD_ORDER.filter(
          (k) => k !== key && selectedDimensions.includes(k),
        );
        if (remainingDate.length === 0) {
          setDatePivotEnabled(false);
          setDateSortEnabled(false);
        }
      } else {
        setNonDatePartitions((pp) => pp.filter((k) => k !== key));
      }
      setOrderFields((of) => of.filter((k) => k !== key));
      setSelectedDimensions((prev) => prev.filter((k) => k !== key));
    } else {
      // Selecting — auto-enable pivot on first date field
      if (isDateField) {
        const currentDateDims = DATE_FIELD_ORDER.filter((k) => selectedDimensions.includes(k));
        if (currentDateDims.length === 0) setDatePivotEnabled(true);
      }
      setSelectedDimensions((prev) => [...prev, key]);
    }

    setPage(1);
  }, [selectedDimensions, setFilters]);

  // ── Toggle for date container pivot (single toggle for all date fields) ───

  const toggleDatePivot = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDatePivotEnabled((prev) => !prev);
    setPage(1);
  }, []);

  // ── Toggle for date container sort ────────────────────────────────────────

  const toggleDateSort = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDateSortEnabled((prev) => !prev);
    setPage(1);
  }, []);

  // ── Toggle for non-date pivot-capable fields ──────────────────────────────

  const toggleNonDatePartition = useCallback((key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNonDatePartitions((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // Auto-select the dimension too
      setSelectedDimensions((dims) => (dims.includes(key) ? dims : [...dims, key]));
      return [...prev, key];
    });
    setPage(1);
  }, []);

  // ── Sort toggle — maintains check order ──────────────────────────────────

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
        if (!hasStandard) return prev; // keep at least one standard measure
        setOrderFields((of) => of.filter((k) => k !== key)); // drop from ORDER BY
        return next;
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
      if (d === 'tran_date_bal') return 'TRAN Date Balance';
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
      text: `  eab_join                 => '${eabVal}',${eabVal ? '  -- ✓ tran_date_bal selected → LEFT JOIN eab' : '  -- empty: tran_date_bal not selected'}`,
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

              {/* ── Section A: Date Dimensions Container ───────────────────── */}
              <div className="border-b border-border">
                {/* Container header with shared Pivot + Sort checkboxes */}
                <div className="flex items-center justify-between gap-2 px-4 py-2 bg-accent-amber/5 border-b border-border/60">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-amber">Date Dimensions</p>
                  <div className="flex items-center gap-2">
                    {/* Pivot checkbox */}
                    <button
                      type="button"
                      onClick={toggleDatePivot}
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
                    {/* Sort checkbox */}
                    <button
                      type="button"
                      onClick={toggleDateSort}
                      disabled={selectedDateDims.length === 0}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9.5px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        dateSortEnabled
                          ? 'border-accent-amber/40 bg-accent-amber/15 text-accent-amber'
                          : 'border-border bg-bg-input text-text-muted hover:border-accent-amber/30 hover:text-accent-amber'
                      }`}
                      title="Sort by all selected date fields (year → year_quarter → year_month → tran_date)"
                    >
                      <span className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${dateSortEnabled ? 'border-accent-amber bg-accent-amber' : 'border-current'}`}>
                        {dateSortEnabled && (
                          <svg viewBox="0 0 8 8" className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="1,4 3,6 7,1.5" />
                          </svg>
                        )}
                      </span>
                      Sort
                    </button>
                  </div>
                </div>

                {/* Individual date fields — no pivot/sort buttons; just select + filter expand */}
                <ul className="divide-y divide-border/60">
                  {DIMENSION_FIELDS.filter((f) => (DATE_FIELD_ORDER as readonly string[]).includes(f.key)).map((field) => {
                    const selected  = selectedDimensions.includes(field.key);
                    const expanded  = expandedField === field.key;
                    const filtered  = fieldHasFilter(field);
                    const badge     = TYPE_BADGE[field.type];
                    const mode      = dateFilterModes[field.key] ?? 'single';
                    const hasFilter = !!field.filterKey;

                    return (
                      <li key={field.key} className={`transition-colors ${selected ? 'bg-accent-amber/8' : 'hover:bg-bg-hover'}`}>
                        <div
                          className="flex items-center gap-3 px-4 py-2 cursor-pointer select-none"
                          onClick={() => toggleDimension(field.key)}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => {}}
                            tabIndex={-1}
                            className="pointer-events-none data-[state=checked]:bg-accent-amber data-[state=checked]:border-accent-amber"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className={`text-[12px] font-medium ${selected ? 'text-accent-amber' : 'text-text-primary'}`}>
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
                              {selected && datePivotEnabled && (
                                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-purple/30 bg-accent-purple/10 text-accent-purple">
                                  pivot
                                </span>
                              )}
                              {selected && dateSortEnabled && (
                                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-amber/30 bg-accent-amber/10 text-accent-amber">
                                  sort
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-text-muted mt-0.5 truncate">{field.description}</p>
                          </div>
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
                        {/* Inline filter — date fields */}
                        {expanded && hasFilter && (
                          <div className="px-4 pb-3 pt-1" onClick={(e) => e.stopPropagation()}>
                            <div className="space-y-2">
                              <div className="flex gap-1">
                                {(['single', 'range', 'multi'] as DateFilterMode[]).map((m) => (
                                  <button key={m} type="button"
                                    onClick={() => { setDateMode(field.key, m); clearDateRangeFilters(field); }}
                                    className={`px-2.5 py-0.5 rounded text-[9.5px] font-semibold uppercase tracking-wider transition-colors ${mode === m ? 'bg-accent-blue text-white' : 'bg-bg-input text-text-secondary border border-border hover:border-border-strong'}`}>
                                    {m === 'single' ? 'Single' : m === 'range' ? 'Range' : 'Multi'}
                                  </button>
                                ))}
                              </div>
                              {mode === 'single' && (
                                <input type="text"
                                  value={getSingleValue(field.filterKey!)}
                                  onChange={(e) => { const v = e.target.value.trim(); setFieldFilter(field.filterKey!, v || undefined); }}
                                  placeholder={field.type === 'date' ? 'YYYY-MM-DD' : field.type === 'month' ? 'YYYY-MM' : field.type === 'quarter' ? 'YYYY-Qn' : 'YYYY'}
                                  className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono" />
                              )}
                              {mode === 'range' && field.fromKey && field.toKey && (
                                <div className="flex gap-2">
                                  <input type="text" value={(filters[field.fromKey] as string) ?? ''} onChange={(e) => setFieldFilter(field.fromKey!, e.target.value.trim() || undefined)} placeholder="From" className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono" />
                                  <input type="text" value={(filters[field.toKey] as string) ?? ''} onChange={(e) => setFieldFilter(field.toKey!, e.target.value.trim() || undefined)} placeholder="To" className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono" />
                                </div>
                              )}
                              {mode === 'multi' && (
                                field.type === 'date' ? (
                                  <input type="text" value={getMultiValue(field).join(', ')} onChange={(e) => { const vals = e.target.value.split(',').map((s) => s.trim()).filter(Boolean); if (field.filterKey) setFieldFilter(field.filterKey, vals.length > 0 ? vals : undefined); }} placeholder="YYYY-MM-DD, YYYY-MM-DD, …" className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue font-mono" />
                                ) : (
                                  <SearchableMultiSelect value={getMultiValue(field)} onChange={(vals) => setFieldFilter(field.filterKey!, vals.length > 0 ? vals : undefined)} options={getOptions(field)} placeholder={`Select ${field.label.toLowerCase()} values…`} />
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* ── Section B: Non-date dimension fields ────────────────────── */}
              <ul className="divide-y divide-border">
                {DIMENSION_FIELDS.filter((f) => !(DATE_FIELD_ORDER as readonly string[]).includes(f.key)).map((field) => {
                  const selected    = selectedDimensions.includes(field.key);
                  const pivotable   = PIVOT_CAPABLE_NON_DATE.has(field.key);
                  const partitioned = nonDatePartitions.includes(field.key);
                  const ordered     = effectiveOrderList.includes(field.key);
                  const orderIdx    = effectiveOrderList.indexOf(field.key);
                  const isAutoOrder = autoOrderFields.includes(field.key);
                  const expanded    = expandedField === field.key;
                  const filtered    = fieldHasFilter(field);
                  const badge       = TYPE_BADGE[field.type];
                  const isMeasure   = field.type === 'measure_dim';
                  const hasFilter   = !isMeasure && field.filterKey;

                  return (
                    <li key={field.key} className={`transition-colors ${selected ? (partitioned ? 'bg-accent-purple/5' : 'bg-accent-blue/5') : 'hover:bg-bg-hover'}`}>
                      {/* Row */}
                      <div
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none"
                        onClick={() => toggleDimension(field.key)}
                      >
                        {/* Dimension checkbox */}
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => {}}
                          tabIndex={-1}
                          className="pointer-events-none"
                        />

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
                                pivot
                              </span>
                            )}
                            {ordered && (
                              <span className={`text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border ${isAutoOrder ? 'border-accent-amber/20 bg-accent-amber/8 text-accent-amber/60' : 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber'}`}>
                                sort #{orderIdx + 1}{isAutoOrder ? ' auto' : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted mt-0.5 truncate">{field.description}</p>
                        </div>

                        {/* Pivot button — only for pivot-capable non-date fields */}
                        {pivotable && (
                          <button
                            type="button"
                            onClick={(e) => toggleNonDatePartition(field.key, e)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9.5px] font-semibold transition-colors ${
                              partitioned
                                ? 'border-accent-purple/40 bg-accent-purple/15 text-accent-purple'
                                : 'border-border bg-bg-input text-text-muted hover:border-accent-purple/30 hover:text-accent-purple'
                            }`}
                            title="Pivot on this field's values as column headers"
                          >
                            <span className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${partitioned ? 'border-accent-purple bg-accent-purple' : 'border-current'}`}>
                              {partitioned && (
                                <svg viewBox="0 0 8 8" className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polyline points="1,4 3,6 7,1.5" />
                                </svg>
                              )}
                            </span>
                            Pivot
                          </button>
                        )}

                        {/* Sort button */}
                        <button
                          type="button"
                          onClick={(e) => { if (!isAutoOrder) toggleOrderField(field.key, e); }}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9.5px] font-semibold transition-colors ${
                            ordered && isAutoOrder
                              ? 'border-accent-amber/25 bg-accent-amber/8 text-accent-amber/60 cursor-default'
                              : ordered
                              ? 'border-accent-amber/40 bg-accent-amber/15 text-accent-amber'
                              : 'border-border bg-bg-input text-text-muted hover:border-accent-amber/30 hover:text-accent-amber'
                          }`}
                          title={isAutoOrder ? 'Auto-included in ORDER BY (follows Pivot selection)' : 'Sort by this field'}
                        >
                          <span className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${ordered ? 'border-accent-amber bg-accent-amber/70' : 'border-current'}`}>
                            {ordered && (
                              <svg viewBox="0 0 8 8" className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="1,4 3,6 7,1.5" />
                              </svg>
                            )}
                          </span>
                          Sort
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
                              onChange={(vals) => {
                                setFieldFilter(field.filterKey!, vals.length > 0 ? vals : undefined);
                                // Auto-add as dimension so filtered rows are immediately visible
                                if (vals.length > 0 && !selectedDimensions.includes(field.key)) {
                                  setSelectedDimensions((prev) => [...prev, field.key]);
                                }
                              }}
                              options={getOptions(field)}
                              placeholder={`Filter by ${field.label.toLowerCase()}…`}
                            />
                          )}

                          {/* Text → ILIKE search */}
                          {field.type === 'text' && (
                            <>
                              <input
                                type="text"
                                value={(filters[field.filterKey!] as string) ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value.trim() || undefined;
                                  setFieldFilter(field.filterKey!, value);
                                  // Auto-add as dimension so filtered rows are immediately visible
                                  if (value && !selectedDimensions.includes(field.key)) {
                                    setSelectedDimensions((prev) => [...prev, field.key]);
                                  }
                                }}
                                placeholder={field.key === 'acct_num' ? 'Account number (exact match)' : 'Partial CIF ID (ILIKE)'}
                                className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                              />
                              {!selectedDimensions.includes(field.key) && (
                                <p className="text-[9.5px] text-text-muted mt-1">
                                  Typing will also add <span className="font-semibold text-text-secondary">{field.label}</span> as a GROUP BY dimension.
                                </p>
                              )}
                            </>
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
                  const active   = selectedMeasures.includes(measure.key);
                  const isLast   = active && measures.length === 1 && measures[0] === measure.key;
                  const ordered  = orderFields.includes(measure.key);
                  const orderIdx = orderFields.indexOf(measure.key);
                  return (
                    <li key={measure.key} className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${active ? (ordered ? 'bg-accent-amber/5' : 'bg-accent-blue/5') : 'hover:bg-bg-hover'}`}>
                      {/* Select checkbox — div wrapper avoids button-in-button (Radix Checkbox renders as button) */}
                      <div
                        role="button"
                        tabIndex={isLast ? -1 : 0}
                        aria-disabled={isLast}
                        title={isLast ? 'At least one standard measure is required' : undefined}
                        onClick={isLast ? undefined : () => toggleMeasure(measure.key)}
                        onKeyDown={isLast ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') toggleMeasure(measure.key); }}
                        className={`flex items-center gap-2.5 flex-1 min-w-0 text-left ${isLast ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      >
                        <Checkbox
                          checked={active}
                          onCheckedChange={() => {}}
                          tabIndex={-1}
                          className="pointer-events-none"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`text-[12px] font-medium ${active ? 'text-accent-blue' : 'text-text-primary'}`}>{measure.label}</p>
                            {ordered && (
                              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-amber/30 bg-accent-amber/10 text-accent-amber">
                                sort #{orderIdx + 1}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted mt-0.5 font-mono">{measure.description}</p>
                        </div>
                      </div>
                      {/* Sort button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          if (!selectedMeasures.includes(measure.key)) toggleMeasure(measure.key);
                          toggleOrderField(measure.key, e);
                        }}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md border text-[9.5px] font-semibold transition-colors ${
                          ordered
                            ? 'border-accent-amber/40 bg-accent-amber/15 text-accent-amber'
                            : 'border-border bg-bg-input text-text-muted hover:border-accent-amber/30 hover:text-accent-amber'
                        }`}
                        title="Include this measure in ORDER BY"
                      >
                        <span className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${ordered ? 'border-accent-amber bg-accent-amber' : 'border-current'}`}>
                          {ordered && (
                            <svg viewBox="0 0 8 8" className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="1,4 3,6 7,1.5" />
                            </svg>
                          )}
                        </span>
                        Sort
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
                        {period === 'prevdate'          && 'Prev. Day'}
                        {period === 'thismonth'         && 'This Month'}
                        {period === 'thisyear'          && 'This Year'}
                        {period === 'prevmonth'         && 'Prev. Month'}
                        {period === 'prevyear'          && 'Prev. Year'}
                        {period === 'prevmonthmtd'      && 'Prev. Month MTD'}
                        {period === 'prevyearytd'       && 'Prev. Year YTD'}
                        {period === 'prevmonthsamedate' && 'Prev. Month Same Day'}
                        {period === 'prevyearsamedate'  && 'Prev. Year Same Day'}
                      </p>
                      {anyActive && (
                        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-blue/30 bg-accent-blue/15 text-accent-blue">
                          active
                        </span>
                      )}
                    </div>

                    <div className="px-4 pb-2.5 flex flex-wrap gap-2">
                      {pair.map((m) => {
                        const on          = selectedMeasures.includes(m.key);
                        const ordered     = orderFields.includes(m.key);
                        const orderIdx    = orderFields.indexOf(m.key);
                        const metricLabel = m.key.endsWith('_amt') ? 'tran_amt' : 'tran_count';
                        return (
                          <div key={m.key} className="flex items-center gap-1">
                            {/* Select chip */}
                            <button
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
                              {ordered && (
                                <span className="text-[8px] font-bold px-1 rounded bg-accent-amber/20 text-accent-amber">
                                  #{orderIdx + 1}
                                </span>
                              )}
                            </button>
                            {/* Sort button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                if (!selectedMeasures.includes(m.key)) toggleMeasure(m.key);
                                toggleOrderField(m.key, e);
                              }}
                              className={`flex items-center gap-1 px-1.5 py-1 rounded-md border text-[9px] font-semibold transition-colors ${
                                ordered
                                  ? 'border-accent-amber/40 bg-accent-amber/15 text-accent-amber'
                                  : 'border-border bg-bg-input text-text-muted hover:border-accent-amber/30 hover:text-accent-amber'
                              }`}
                              title={`Sort by ${m.label}`}
                            >
                              <span className={`w-2 h-2 rounded-sm border flex items-center justify-center flex-shrink-0 ${ordered ? 'border-accent-amber bg-accent-amber' : 'border-current'}`}>
                                {ordered && (
                                  <svg viewBox="0 0 8 8" className="w-1.5 h-1.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="1,4 3,6 7,1.5" />
                                  </svg>
                                )}
                              </span>
                              ↕
                            </button>
                          </div>
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

            {/* Pivot clause summary — shown when any field is checked for pivot */}
            {partitionDimensions.length > 0 ? (
              <div className="rounded-lg border border-accent-purple/30 bg-accent-purple/8 px-4 py-2.5 flex items-start gap-2.5">
                <span className="text-accent-purple text-[13px] leading-none mt-0.5">⊞</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-accent-purple">Pivot active</p>
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
                  onClick={() => { setNonDatePartitions([]); setDatePivotEnabled(false); setDateSortEnabled(false); setPage(1); }}
                  className="flex-shrink-0 text-[10px] font-medium text-accent-red hover:underline"
                >
                  Clear
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-bg-input/40 px-4 py-2 flex items-center gap-2">
                <span className="text-text-muted text-[11px]">⊞</span>
                <p className="text-[10.5px] text-text-muted">
                  <strong className="text-text-secondary">No pivot selected</strong> — check{' '}
                  <span className="font-semibold text-accent-purple">Pivot</span> on any selected dimension to pivot the report on its values as column headers.
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
                      <span className="font-mono text-accent-blue block mb-0.5">{"=> 'PARTITION BY tran_date'"}</span>
                      <span className="text-accent-blue font-semibold">✓ Pivot active</span> — Full clause passed verbatim. Field values become column headers.
                    </div>
                  </div>
                  {explorer?.sql_preview?.include_eab && (
                    <div className="mt-1.5 rounded border border-accent-teal/20 bg-accent-teal/8 px-2 py-1.5 text-[10px]">
                      <span className="text-accent-teal font-semibold block mb-0.5">TRAN Date Balance active — EAB join explained</span>
                      <span className="text-text-muted">
                        <code className="text-accent-teal">select_inner</code> adds <code>acid</code> to GROUP BY so the outer query can join.{' '}
                        <code className="text-accent-teal">select_outer</code> pulls <code>e.tran_date_bal</code> from the production eab table (not schema.rb).{' '}
                        The procedure result includes <code>tran_date_bal</code> from the eab table — the account balance snapshot on the transaction date.
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
