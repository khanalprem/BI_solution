import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  ColumnDef,
  flexRender,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  FilterFn,
} from '@tanstack/react-table';
import { ColumnFilter } from './ColumnFilter';

declare module '@tanstack/react-table' {
  interface FilterFns {
    arrayFilter: FilterFn<any>;
    dateRange: FilterFn<any>;
    numberRange: FilterFn<any>;
  }
}

const arrayFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  if (!filterValue || !Array.isArray(filterValue) || filterValue.length === 0) return true;
  return filterValue.includes(String(value));
};

const dateRangeFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  const value = row.getValue(columnId);
  if (!filterValue || !Array.isArray(filterValue)) return true;
  const [start, end] = filterValue as [string, string];
  const dateValue = new Date(String(value));
  if (start && end) return dateValue >= new Date(start) && dateValue <= new Date(end);
  if (start) return dateValue >= new Date(start);
  if (end) return dateValue <= new Date(end);
  return true;
};

const numberRangeFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  const value = Number(row.getValue(columnId));
  if (!filterValue || !Array.isArray(filterValue)) return true;
  const [min, max] = filterValue as [number, number];
  if (min && max) return value >= min && value <= max;
  if (min) return value >= min;
  if (max) return value <= max;
  return true;
};

interface AdvancedDataTableProps<TData> {
  title: string;
  subtitle?: string;
  data: TData[];
  columns: ColumnDef<TData>[];
  actions?: React.ReactNode;
  pageSize?: number;
  enableFiltering?: boolean;
  enableSorting?: boolean;
  enablePagination?: boolean;
  enableColumnVisibility?: boolean;
  showTextColumnFilters?: boolean;
}

export function AdvancedDataTable<TData>({
  title,
  subtitle,
  data,
  columns,
  actions,
  pageSize = 10,
  enableFiltering = true,
  enableSorting = true,
  enablePagination = true,
  enableColumnVisibility = false,
  showTextColumnFilters = false,
}: AdvancedDataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const summarizeFilterValue = React.useCallback((value: unknown): string => {
    if (Array.isArray(value)) {
      if (value.length === 0) return '';
      if (value.length <= 2) return value.join(', ');
      return `${value.slice(0, 2).join(', ')} +${value.length - 2}`;
    }
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return value.toString();
    return '';
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getFacetedRowModel: enableFiltering ? getFacetedRowModel() : undefined,
    getFacetedUniqueValues: enableFiltering ? getFacetedUniqueValues() : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    filterFns: { arrayFilter: arrayFilterFn, dateRange: dateRangeFilterFn, numberRange: numberRangeFilterFn },
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    initialState: { pagination: { pageSize } },
  });

  const activeTableFilters = React.useMemo(() =>
    columnFilters
      .map((filter) => {
        const column = table.getColumn(filter.id);
        if (!column) return null;
        const header = column.columnDef.header;
        const label = typeof header === 'string' ? header : filter.id;
        const valueLabel = summarizeFilterValue(filter.value);
        return { id: filter.id, label: valueLabel ? `${label}: ${valueLabel}` : label };
      })
      .filter(Boolean) as Array<{ id: string; label: string }>,
    [columnFilters, summarizeFilterValue, table]
  );

  const hasAnyFilter = activeTableFilters.length > 0 || Boolean(globalFilter);
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;
  const from = pageIndex * table.getState().pagination.pageSize + 1;
  const to = Math.min((pageIndex + 1) * table.getState().pagination.pageSize, totalRows);

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)]" style={{ background: 'var(--bg-card)' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border" style={{ background: 'var(--bg-surface)' }}>
        <div className="min-w-0">
          <h3 className="font-display text-[13px] font-bold text-text-primary tracking-tight truncate">{title}</h3>
          {subtitle && <p className="text-[10.5px] text-text-muted mt-0.5 leading-none">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {enableFiltering && (
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search…"
                className="pl-7 pr-3 py-1.5 text-[11px] rounded-lg border border-border bg-bg-input outline-none focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 transition-all w-[160px] focus:w-[200px] placeholder:text-text-muted"
              />
            </div>
          )}
          {/* Row count badge */}
          <span className="text-[10px] text-text-muted font-medium px-2 py-1 rounded-md border border-border bg-bg-input">
            {totalRows.toLocaleString()} rows
          </span>
          {actions}
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2" style={{ background: 'var(--bg-card-hover)' }}>
          {globalFilter && (
            <button
              type="button"
              onClick={() => setGlobalFilter('')}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent-blue/25 bg-accent-blue/10 px-2.5 py-0.5 text-[10.5px] text-accent-blue hover:bg-accent-blue/15 transition-colors"
            >
              <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Search: {globalFilter}
              <span className="opacity-60">×</span>
            </button>
          )}
          {activeTableFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => table.getColumn(filter.id)?.setFilterValue(undefined)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-input px-2.5 py-0.5 text-[10.5px] text-text-secondary hover:border-border-strong hover:text-text-primary transition-colors"
            >
              {filter.label}
              <span className="opacity-50">×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => { table.resetColumnFilters(); setGlobalFilter(''); }}
            className="ml-auto text-[10.5px] font-medium text-accent-red hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-[1] border-b border-border" style={{ background: 'var(--bg-base)' }}>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-2.5 text-left text-[9.5px] font-bold text-text-muted uppercase tracking-[0.5px] whitespace-nowrap"
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex items-center gap-1 flex-1 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-text-primary transition-colors' : ''}`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {enableSorting && header.column.getCanSort() && (
                            <span className="text-[8px] opacity-50 ml-0.5">
                              {({ asc: '▲', desc: '▼' } as Record<string, string>)[header.column.getIsSorted() as string] ?? '⇅'}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const filterType = (header.column.columnDef.meta as { filterType?: string } | undefined)?.filterType;
                          if (!enableFiltering || !header.column.getCanFilter() || (!showTextColumnFilters && !filterType)) return null;
                          return <ColumnFilter column={header.column} filterType={filterType as 'text' | 'select' | 'date-range' | 'number-range' || 'text'} />;
                        })()}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 select-none">
                    <div className="flex items-end gap-1 h-8 opacity-20">
                      {[3, 5, 2, 6, 4].map((h, i) => (
                        <div key={i} className="w-2 rounded-sm bg-text-secondary" style={{ height: `${h * 5}px` }} />
                      ))}
                    </div>
                    <p className="text-[12px] font-medium text-text-secondary">No results</p>
                    <p className="text-[11px] text-text-muted">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2.5 text-[11.5px] text-text-secondary whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {enablePagination && pageCount > 0 && (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-t border-border" style={{ background: 'var(--bg-surface)' }}>
          <span className="text-[10.5px] text-text-muted">
            <span className="text-text-primary font-semibold">{from}–{to}</span> of{' '}
            <span className="text-text-primary font-semibold">{totalRows.toLocaleString()}</span>
          </span>

          <div className="flex items-center gap-1.5">
            {/* First / Prev */}
            <PagBtn onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} title="First">
              «
            </PagBtn>
            <PagBtn onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} title="Previous">
              ‹
            </PagBtn>

            {/* Page numbers — show up to 5 around current */}
            {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
              let p: number;
              if (pageCount <= 5) p = i;
              else if (pageIndex < 3) p = i;
              else if (pageIndex > pageCount - 4) p = pageCount - 5 + i;
              else p = pageIndex - 2 + i;
              return (
                <button
                  key={p}
                  onClick={() => table.setPageIndex(p)}
                  className={`min-w-[28px] h-7 rounded-md text-[11px] font-medium transition-all ${
                    p === pageIndex
                      ? 'bg-accent-blue text-white shadow-sm'
                      : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary border border-border bg-bg-input'
                  }`}
                >
                  {p + 1}
                </button>
              );
            })}

            {/* Next / Last */}
            <PagBtn onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} title="Next">
              ›
            </PagBtn>
            <PagBtn onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} title="Last">
              »
            </PagBtn>

            <div className="h-4 w-px bg-border mx-1" />

            {/* Page size */}
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="px-2 py-1 text-[11px] bg-bg-input border border-border rounded-md outline-none focus:border-accent-blue/60 transition-all text-text-secondary"
            >
              {[10, 20, 50, 100].map((sz) => (
                <option key={sz} value={sz}>{sz} / page</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function PagBtn({ onClick, disabled, title, children }: { onClick: () => void; disabled: boolean; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="min-w-[28px] h-7 rounded-md text-[12px] font-medium border border-border bg-bg-input text-text-secondary hover:bg-bg-card-hover hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
    >
      {children}
    </button>
  );
}

export { type ColumnDef } from '@tanstack/react-table';
