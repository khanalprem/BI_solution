'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SearchableMultiSelect } from '@/components/ui/Select';
import { Separator } from '@/components/ui/separator';
import {
  useFilterValues,
  useProductionExplorer,
  type MeasureHavingFilter,
} from '@/lib/hooks/useDashboardData';
import { exportTableToCsv } from '@/lib/exportCsv';
import { formatNPR } from '@/lib/formatters';
import type { DashboardFilters, LookupOption } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

type DimKey     = 'acct_num' | 'acct_name' | 'cif_id' | 'acid' | 'gam_branch' | 'gam_province';
type MeasureKey = 'rfm_score' | 'tran_amt' | 'tran_count' | 'tran_maxdate';
type Op         = '=' | '<=' | '>=' | '<' | '>';
type SortDir    = 'asc' | 'desc';

interface DimDef {
  key:     DimKey;
  label:   string;
  filter:  'categorical' | 'text';
  options?: 'provinces' | 'branches';
}

const DIM_DEFS: DimDef[] = [
  { key: 'acct_num',     label: 'ACCT Num',     filter: 'text' },
  { key: 'acct_name',    label: 'ACCT Name',    filter: 'text' },
  { key: 'cif_id',       label: 'CIF Id',       filter: 'text' },
  { key: 'acid',         label: 'ACID',         filter: 'text' },
  { key: 'gam_branch',   label: 'GAM Branch',   filter: 'categorical', options: 'branches' },
  { key: 'gam_province', label: 'GAM Province', filter: 'categorical', options: 'provinces' },
];

interface MeasureDef {
  key:   MeasureKey;
  label: string;
  kind:  'numeric' | 'date';
  render: (v: unknown) => string;
}

function fmtScore(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString();
}
function fmtAmount(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return formatNPR(n);
}
function fmtDate(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

const MEASURE_DEFS: MeasureDef[] = [
  { key: 'rfm_score',    label: 'RFM Score',     kind: 'numeric', render: fmtScore },
  { key: 'tran_amt',     label: 'TRAN Amount',   kind: 'numeric', render: fmtAmount },
  { key: 'tran_count',   label: 'TRAN Count',    kind: 'numeric', render: fmtInt },
  { key: 'tran_maxdate', label: 'TRAN Max Date', kind: 'date',    render: fmtDate },
];

const OPS: Op[] = ['=', '<=', '>=', '<', '>'];
const OP_OPTIONS = OPS.map((op) => ({ value: op, label: op }));

const PAGE_SIZE = 200;

// ─── SQL preview styling (mirrors pivot/page.tsx) ─────────────────────────────

type SqlLineKind = 'header' | 'select' | 'where' | 'group' | 'page' | 'footer' | 'placeholder';
type SqlLine    = { text: string; kind: SqlLineKind };

const KIND_CLS: Record<SqlLineKind, string> = {
  header:      'text-text-primary font-semibold',
  select:      'text-accent-blue',
  where:       'text-accent-green',
  group:       'text-accent-purple',
  page:        'text-text-muted',
  footer:      'text-text-primary font-semibold',
  placeholder: 'text-text-muted italic',
};

// ─── State model ──────────────────────────────────────────────────────────────

type SegmentRow = Partial<Record<DimKey, string | null>> & Partial<Record<MeasureKey, number | string | null>>;

interface SortState { measure: MeasureKey; dir: SortDir }

// ─── Controls ─────────────────────────────────────────────────────────────────

interface ControlsProps {
  dims:            Set<DimKey>;
  measures:        Set<MeasureKey>;
  dimFilters:      Record<DimKey, string[]>;
  measureFilters:  Record<MeasureKey, { op: Op; value: string }>;
  sort:            SortState;
  provinces:       LookupOption[];
  branches:        LookupOption[];
  onToggleDim:     (k: DimKey) => void;
  onToggleMeasure: (k: MeasureKey) => void;
  onDimFilter:     (k: DimKey, values: string[]) => void;
  onMeasureFilter: (k: MeasureKey, spec: { op: Op; value: string }) => void;
  onSort:          (k: MeasureKey) => void;
}

function SegmentationControls({
  dims, measures, dimFilters, measureFilters, sort, provinces, branches,
  onToggleDim, onToggleMeasure, onDimFilter, onMeasureFilter, onSort,
}: ControlsProps) {
  const opts = (key: DimDef['options']) => {
    if (key === 'provinces') return provinces.map(({ name, value }) => ({ value, label: name }));
    if (key === 'branches')  return branches.map(({ name, value }) => ({ value, label: name }));
    return [];
  };

  return (
    <div className="rounded-xl border border-border bg-bg-surface p-4 lg:p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
      {/* ── Dimensions ─────────────────────────────────────────────────────── */}
      <h3 className="text-[11px] font-display font-semibold text-text-primary uppercase tracking-wide mb-2">
        Dimensions
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-2">
        {DIM_DEFS.map((d) => {
          const checked = dims.has(d.key);
          const values  = dimFilters[d.key] ?? [];
          return (
            <div key={d.key} className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 min-w-[110px] cursor-pointer">
                <Checkbox checked={checked} onCheckedChange={() => onToggleDim(d.key)} />
                <span className="text-xs text-text-primary truncate">{d.label}</span>
              </label>
              <div className="flex-1 min-w-0">
                {d.filter === 'categorical' ? (
                  <SearchableMultiSelect
                    value={values}
                    onChange={(next) => onDimFilter(d.key, next)}
                    options={opts(d.options)}
                    placeholder="All"
                  />
                ) : (
                  <Input
                    value={values.join(', ')}
                    onChange={(e) => {
                      const raw  = e.target.value;
                      const next = raw.split(',').map((v) => v.trim()).filter(Boolean);
                      onDimFilter(d.key, next);
                    }}
                    placeholder="Comma-separated"
                    className="h-8 text-xs"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Separator className="my-4" />

      {/* ── Measures ───────────────────────────────────────────────────────── */}
      <h3 className="text-[11px] font-display font-semibold text-text-primary uppercase tracking-wide mb-2">
        Measures
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-x-4 gap-y-2">
        {MEASURE_DEFS.map((m) => {
          const checked = measures.has(m.key);
          const spec    = measureFilters[m.key] ?? { op: '>=' as Op, value: '' };
          const isSorted = sort.measure === m.key;
          return (
            <div key={m.key} className="flex items-center gap-1.5">
              <label className="flex items-center gap-1.5 min-w-[110px] cursor-pointer">
                <Checkbox checked={checked} onCheckedChange={() => onToggleMeasure(m.key)} />
                <span className="text-xs text-text-primary truncate">{m.label}</span>
              </label>
              <div className="w-14 flex-shrink-0">
                <Select
                  value={spec.op}
                  onChange={(op) => onMeasureFilter(m.key, { op: op as Op, value: spec.value })}
                  options={OP_OPTIONS}
                />
              </div>
              <Input
                value={spec.value}
                onChange={(e) => onMeasureFilter(m.key, { op: spec.op, value: e.target.value })}
                placeholder={m.kind === 'date' ? 'YYYY-MM-DD' : '0'}
                className="h-8 text-xs flex-1 min-w-0"
              />
              <button
                type="button"
                onClick={() => onSort(m.key)}
                title={`Sort by ${m.label} — currently ${isSorted ? sort.dir.toUpperCase() : 'off'}`}
                className={`h-8 px-1.5 rounded border text-[10px] font-mono flex items-center gap-0.5 transition-colors flex-shrink-0 ${
                  isSorted
                    ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue'
                    : 'border-border bg-bg-card text-text-muted hover:bg-bg-card-hover'
                }`}
              >
                {isSorted ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CustomerSegmentationPage() {
  const [dims,     setDims]     = useState<Set<DimKey>>(() => new Set(DIM_DEFS.map((d) => d.key)));
  const [measures, setMeasures] = useState<Set<MeasureKey>>(() => new Set<MeasureKey>(['rfm_score']));

  const emptyDimFilters: Record<DimKey, string[]> =
    { acct_num: [], acct_name: [], cif_id: [], acid: [], gam_branch: [], gam_province: [] };
  const [dimFilters, setDimFilters] = useState<Record<DimKey, string[]>>(emptyDimFilters);

  const emptyMeasureFilters: Record<MeasureKey, { op: Op; value: string }> = {
    rfm_score:    { op: '>=', value: '' },
    tran_amt:     { op: '>=', value: '' },
    tran_count:   { op: '>=', value: '' },
    tran_maxdate: { op: '>=', value: '' },
  };
  const [measureFilters, setMeasureFilters] = useState(emptyMeasureFilters);

  const [sort, setSort] = useState<SortState>({ measure: 'rfm_score', dir: 'desc' });

  const { data: filterValues } = useFilterValues();
  const provinces: LookupOption[] = filterValues?.provinces ?? [];
  const branches:  LookupOption[] = filterValues?.branches  ?? [];

  // ── Toggles ─────────────────────────────────────────────────────────────────

  const toggleDim = (k: DimKey) => {
    setDims((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        if (next.size === 1) return prev; // at least one dim required
        next.delete(k);
      } else {
        next.add(k);
      }
      return next;
    });
  };

  const toggleMeasure = (k: MeasureKey) => {
    setMeasures((prev) => {
      const next = new Set(prev);
      if (next.has(k)) {
        next.delete(k);
        // If we removed the currently-sorted measure, fall back to rfm_score (re-adding if needed).
        if (sort.measure === k) {
          if (!next.has('rfm_score')) next.add('rfm_score');
          setSort({ measure: 'rfm_score', dir: 'desc' });
        }
        if (next.size === 0) next.add('rfm_score'); // keep at least one
      } else {
        next.add(k);
      }
      return next;
    });
  };

  const handleDimFilter     = (k: DimKey, values: string[]) => setDimFilters((p) => ({ ...p, [k]: values }));
  const handleMeasureFilter = (k: MeasureKey, spec: { op: Op; value: string }) =>
    setMeasureFilters((p) => ({ ...p, [k]: spec }));

  const handleSort = (k: MeasureKey) => {
    setSort((prev) => {
      if (prev.measure !== k) return { measure: k, dir: 'desc' };
      return { measure: k, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
    });
  };

  // ── API inputs ──────────────────────────────────────────────────────────────

  const apiFilters = useMemo<DashboardFilters>(() => {
    const f: DashboardFilters = {
      startDate: '',
      endDate:   '',
    };
    if (dimFilters.gam_province.length)  f.province   = dimFilters.gam_province;
    if (dimFilters.gam_branch.length)    f.branchCode = dimFilters.gam_branch;
    if (dimFilters.cif_id.length)        f.cifId      = dimFilters.cif_id;
    if (dimFilters.acct_num.length)      f.acctNum    = dimFilters.acct_num;
    if (dimFilters.acct_name.length)     f.acctName   = dimFilters.acct_name;
    if (dimFilters.acid.length)          f.acid       = dimFilters.acid;
    return f;
  }, [dimFilters]);

  const dimensionsArr = useMemo(() => DIM_DEFS.filter((d) => dims.has(d.key)).map((d) => d.key), [dims]);
  const measuresArr   = useMemo(() => MEASURE_DEFS.filter((m) => measures.has(m.key)).map((m) => m.key), [measures]);

  const havingFilters = useMemo<Record<string, MeasureHavingFilter>>(() => {
    const out: Record<string, MeasureHavingFilter> = {};
    for (const m of MEASURE_DEFS) {
      if (!measures.has(m.key)) continue;
      const spec = measureFilters[m.key];
      if (spec?.value?.trim()) out[m.key] = { op: spec.op, value: spec.value.trim() };
    }
    return out;
  }, [measureFilters, measures]);

  // When sorting by rfm_score DESC (default), omit orderby_clause to let the backend
  // fall back to the full RFM formula (ORDER BY SUM(count)*0.001 + SUM(amt)*0.0001 + ... DESC).
  // For any other sort, send "ORDER BY <alias> <dir>" — aliases are accepted by the sanitizer.
  const orderbyClause = useMemo(() => {
    if (sort.measure === 'rfm_score' && sort.dir === 'desc' && measuresArr[0] === 'rfm_score') return '';
    return `ORDER BY ${sort.measure} ${sort.dir.toUpperCase()}`;
  }, [sort, measuresArr]);

  // disableTiebreaker: true — segmentation always ranks by the user's chosen measure sort.
  // The service's default `, acct_num ASC` pagination tiebreaker would dilute that ranking
  // (rows tied on rfm_score would be sub-sorted alphabetically by account number).
  const { data, isLoading } = useProductionExplorer(
    apiFilters, dimensionsArr, measuresArr, [], 1, PAGE_SIZE, '', orderbyClause, havingFilters, true,
  );

  const rows = useMemo<SegmentRow[]>(() => (data?.rows || []) as SegmentRow[], [data]);

  // ── SQL preview ────────────────────────────────────────────────────────────

  const [sqlOpen, setSqlOpen] = useState(false);

  const sqlPreviewLines = useMemo<SqlLine[]>(() => {
    if (!data) return [{ text: '-- Loading…', kind: 'placeholder' }];
    const sp = data.sql_preview;
    const lines: SqlLine[] = [];
    lines.push({ text: 'CALL public.get_tran_summary(', kind: 'header' });
    lines.push({ text: `  select_outer   => '${sp.select_outer ?? 'SELECT tb2.*'}',`, kind: 'select' });
    lines.push({ text: `  select_inner   => '${sp.select_inner}',`,                    kind: 'select' });
    lines.push({ text: `  where_clause   => '${sp.where_clause}',`,                    kind: 'where' });
    lines.push({ text: `  groupby_clause => '${sp.groupby_clause}',`,                  kind: 'group' });
    lines.push({ text: `  having_clause  => '${sp.having_clause ?? ''}',`,             kind: 'group' });
    lines.push({ text: `  orderby_clause => '${sp.orderby_clause}',`,                  kind: 'group' });
    lines.push({ text: `  page           => ${sp.page},`,                              kind: 'page' });
    lines.push({ text: `  page_size      => ${sp.page_size}`,                          kind: 'page' });
    lines.push({ text: ')', kind: 'footer' });
    return lines;
  }, [data]);

  // ── Table columns — only selected dims + measures ──────────────────────────

  const columns = useMemo<ColumnDef<SegmentRow>[]>(() => {
    const cols: ColumnDef<SegmentRow>[] = [];
    DIM_DEFS.forEach((d) => {
      if (!dims.has(d.key)) return;
      cols.push({
        accessorKey: d.key,
        header: d.label,
        cell: (ctx) => {
          const v = ctx.getValue();
          const isMono = d.key === 'acct_num' || d.key === 'cif_id' || d.key === 'acid';
          return <span className={isMono ? 'font-mono text-xs' : ''}>{String(v ?? '—')}</span>;
        },
      });
    });
    MEASURE_DEFS.forEach((m) => {
      if (!measures.has(m.key)) return;
      const isAmount = m.key === 'tran_amt';
      cols.push({
        accessorKey: m.key,
        header: m.label,
        cell: (ctx) => (
          <span className={`font-mono text-xs block ${m.kind === 'numeric' ? 'text-right' : ''} ${
            m.key === 'rfm_score' ? 'text-accent-blue' : ''
          } ${isAmount ? '' : ''}`}>
            {m.render(ctx.getValue())}
          </span>
        ),
        sortingFn: m.kind === 'numeric'
          ? (a, b, id) => Number(a.getValue(id) ?? 0) - Number(b.getValue(id) ?? 0)
          : undefined,
      });
    });
    return cols;
  }, [dims, measures]);

  // ── Export ──────────────────────────────────────────────────────────────────

  const handleExport = () => {
    const headers = [
      ...DIM_DEFS.filter((d) => dims.has(d.key)).map((d) => d.key),
      ...MEASURE_DEFS.filter((m) => measures.has(m.key)).map((m) => m.key),
    ];
    exportTableToCsv(
      'customer-segmentation.csv',
      headers,
      rows.map((r) => {
        const out: Record<string, unknown> = {};
        DIM_DEFS.forEach((d) => { if (dims.has(d.key))     out[d.key] = r[d.key] ?? ''; });
        MEASURE_DEFS.forEach((m) => { if (measures.has(m.key)) out[m.key] = m.render(r[m.key]); });
        return out;
      }),
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const topBar = (
    <TopBar
      title="Customer Segmentation"
      subtitle="RFM score ranking — top customers first"
      onExport={handleExport}
      showPeriodSelector={false}
      showFiltersButton={false}
    />
  );

  if (isLoading) {
    return (
      <>
        {topBar}
        <StandardDashboardSkeleton />
      </>
    );
  }

  return (
    <>
      {topBar}
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
        {/* ── SQL preview (collapsible) ───────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-bg-surface overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          <button
            type="button"
            onClick={() => setSqlOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-bg-card-hover transition-colors"
          >
            <span className="flex items-center gap-2">
              {sqlOpen ? <ChevronDown className="h-3.5 w-3.5 text-text-muted" /> : <ChevronRight className="h-3.5 w-3.5 text-text-muted" />}
              <span className="text-[11px] font-display font-semibold text-text-primary uppercase tracking-wide">
                Procedure Call
              </span>
              <span className="text-[10px] font-mono text-text-muted">public.get_tran_summary</span>
            </span>
            <span className="text-[10px] text-text-muted">{sqlOpen ? 'Hide' : 'Show'}</span>
          </button>
          {sqlOpen && (
            <div className="border-t border-border px-4 py-3 overflow-x-auto">
              <pre className="text-[10px] leading-[1.75] font-mono">
                {sqlPreviewLines.map((line, i) => (
                  <span key={i} className={`block ${KIND_CLS[line.kind] ?? 'text-text-secondary'}`}>
                    {line.text}
                  </span>
                ))}
              </pre>
            </div>
          )}
        </div>

        <SegmentationControls
          dims={dims}
          measures={measures}
          dimFilters={dimFilters}
          measureFilters={measureFilters}
          sort={sort}
          provinces={provinces}
          branches={branches}
          onToggleDim={toggleDim}
          onToggleMeasure={toggleMeasure}
          onDimFilter={handleDimFilter}
          onMeasureFilter={handleMeasureFilter}
          onSort={handleSort}
        />

        <AdvancedDataTable
          title={`Customer Segmentation — Top ${rows.length} by RFM`}
          subtitle="RFM = SUM(count)·0.001 + SUM(amt)·0.0001 − days_since_last_tx·0.001 (higher = more valuable)"
          data={rows}
          columns={columns}
          pageSize={25}
        />
      </div>
    </>
  );
}
