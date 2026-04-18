'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';
import { useProductionExplorer } from '@/lib/hooks/useDashboardData';
import { exportTableToCsv } from '@/lib/exportCsv';
import { formatNPR } from '@/lib/formatters';

const DIMENSIONS = ['acct_num', 'acct_name', 'cif_id', 'acid', 'gam_branch', 'gam_province'];
const MEASURES   = ['rfm_score', 'tran_amt', 'tran_count', 'tran_maxdate'];
const ORDERBY    = 'ORDER BY SUM(tran_count)*0.001 + SUM(tran_amt)*0.0001 + (CURRENT_DATE-MAX(tran_date))*(-0.001) DESC';
const PAGE_SIZE  = 200;

type SegmentRow = {
  acct_num: string | null;
  acct_name: string | null;
  cif_id: string | null;
  acid: string | null;
  gam_branch: string | null;
  gam_province: string | null;
  rfm_score: number | string | null;
  tran_amt: number | string | null;
  tran_count: number | string | null;
  tran_maxdate: string | null;
};

function formatScore(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString();
}

function formatAmount(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return formatNPR(n);
}

function formatMaxDate(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  // trim timestamp suffix if present
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export default function CustomerSegmentationPage() {
  const { filters, setFilters, filtersOpen, setFiltersOpen, handleClearFilters, topBarProps } =
    useDashboardPage();

  const { data, isLoading } = useProductionExplorer(
    filters, DIMENSIONS, MEASURES, [], 1, PAGE_SIZE, '', ORDERBY,
  );

  const rows = useMemo<SegmentRow[]>(
    () => (data?.rows || []).map((r) => ({
      acct_num:     (r.acct_num     as string | null) ?? null,
      acct_name:    (r.acct_name    as string | null) ?? null,
      cif_id:       (r.cif_id       as string | null) ?? null,
      acid:         (r.acid         as string | null) ?? null,
      gam_branch:   (r.gam_branch   as string | null) ?? null,
      gam_province: (r.gam_province as string | null) ?? null,
      rfm_score:    (r.rfm_score    as number | string | null) ?? null,
      tran_amt:     (r.tran_amt     as number | string | null) ?? null,
      tran_count:   (r.tran_count   as number | string | null) ?? null,
      tran_maxdate: (r.tran_maxdate as string | null) ?? null,
    })),
    [data],
  );

  const columns = useMemo<ColumnDef<SegmentRow>[]>(() => [
    { accessorKey: 'acct_num',     header: 'ACCT Num',    cell: (ctx) => <span className="font-mono text-xs">{String(ctx.getValue() ?? '—')}</span> },
    { accessorKey: 'acct_name',    header: 'ACCT Name',   cell: (ctx) => <span>{String(ctx.getValue() ?? '—')}</span> },
    { accessorKey: 'cif_id',       header: 'CIF Id',      cell: (ctx) => <span className="font-mono text-xs">{String(ctx.getValue() ?? '—')}</span> },
    { accessorKey: 'acid',         header: 'ACID',        cell: (ctx) => <span className="font-mono text-xs">{String(ctx.getValue() ?? '—')}</span> },
    { accessorKey: 'gam_branch',   header: 'GAM Branch',  cell: (ctx) => <span>{String(ctx.getValue() ?? '—')}</span> },
    { accessorKey: 'gam_province', header: 'GAM Province', cell: (ctx) => <span>{String(ctx.getValue() ?? '—')}</span> },
    {
      accessorKey: 'rfm_score',
      header: 'RFM Score',
      cell: (ctx) => <span className="font-mono text-xs text-right block text-accent-blue">{formatScore(ctx.getValue())}</span>,
      sortingFn: (a, b, id) => Number(a.getValue(id) ?? 0) - Number(b.getValue(id) ?? 0),
    },
    {
      accessorKey: 'tran_amt',
      header: 'TRAN Amount',
      cell: (ctx) => <span className="font-mono text-xs text-right block">{formatAmount(ctx.getValue())}</span>,
      sortingFn: (a, b, id) => Number(a.getValue(id) ?? 0) - Number(b.getValue(id) ?? 0),
    },
    {
      accessorKey: 'tran_count',
      header: 'TRAN Count',
      cell: (ctx) => <span className="font-mono text-xs text-right block">{formatInt(ctx.getValue())}</span>,
      sortingFn: (a, b, id) => Number(a.getValue(id) ?? 0) - Number(b.getValue(id) ?? 0),
    },
    {
      accessorKey: 'tran_maxdate',
      header: 'TRAN Max Date',
      cell: (ctx) => <span className="font-mono text-xs">{formatMaxDate(ctx.getValue())}</span>,
    },
  ], []);

  const handleExport = () => {
    const headers = ['acct_num', 'acct_name', 'cif_id', 'acid', 'gam_branch', 'gam_province', 'rfm_score', 'tran_amt', 'tran_count', 'tran_maxdate'];
    exportTableToCsv(
      'customer-segmentation.csv',
      headers,
      rows.map((r) => ({
        ...r,
        rfm_score:    formatScore(r.rfm_score),
        tran_amt:     formatAmount(r.tran_amt),
        tran_count:   formatInt(r.tran_count),
        tran_maxdate: formatMaxDate(r.tran_maxdate),
      })),
    );
  };

  if (isLoading) {
    return (
      <>
        <TopBar title="Customer Segmentation" subtitle="RFM score ranking — top customers first" {...topBarProps} onExport={handleExport} />
        <StandardDashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <TopBar title="Customer Segmentation" subtitle="RFM score ranking — top customers first" {...topBarProps} onExport={handleExport} />
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
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
