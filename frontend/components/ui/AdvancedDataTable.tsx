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
import { SlidersHorizontal, Eye, EyeOff, Search, X } from 'lucide-react';
import { ColumnFilter } from './ColumnFilter';
import { Checkbox } from './checkbox';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from './dialog';

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
  initialHidden?: VisibilityState;
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
  enableColumnVisibility = true,
  showTextColumnFilters = false,
  initialHidden = {},
}: AdvancedDataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialHidden);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [colModalOpen, setColModalOpen] = React.useState(false);
  const [colSearch, setColSearch] = React.useState('');

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

  // All toggleable columns
  const allColumns = table.getAllLeafColumns().filter(col => col.id !== '_select');

  // Filtered by search
  const filteredColumns = React.useMemo(() =>
    allColumns.filter(col => {
      const header = col.columnDef.header;
      const label = typeof header === 'string' ? header : col.id;
      return label.toLowerCase().includes(colSearch.toLowerCase());
    }),
    [allColumns, colSearch]
  );

  const visibleCount = allColumns.filter(c => c.getIsVisible()).length;
  const hiddenCount = allColumns.length - visibleCount;

  const hasAnyFilter = activeTableFilters.length > 0 || Boolean(globalFilter);
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;
  const from = pageIndex * table.getState().pagination.pageSize + 1;
  const to = Math.min((pageIndex + 1) * table.getState().pagination.pageSize, totalRows);

  return (
    <>
      {/* ── Column Visibility Modal ── */}
      <Dialog open={colModalOpen} onOpenChange={setColModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Column Visibility</DialogTitle>
            <DialogDescription>
              {visibleCount} of {allColumns.length} columns shown
              {hiddenCount > 0 && ` · ${hiddenCount} hidden`}
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="px-5 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={colSearch}
                onChange={e => setColSearch(e.target.value)}
                placeholder="Search columns…"
                className="w-full pl-7 pr-3 py-1.5 text-[11px] rounded-lg border border-border bg-bg-input outline-none focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 transition-all placeholder:text-text-muted"
              />
              {colSearch && (
                <button onClick={() => setColSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Toggle all */}
          <div className="px-5 pt-2 pb-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => table.toggleAllColumnsVisible(true)}
              className="text-[10.5px] text-accent-blue hover:underline font-medium"
            >
              Show all
            </button>
            <button
              type="button"
              onClick={() => {
                // keep at least 1 visible
                allColumns.forEach((col, i) => col.toggleVisibility(i === 0));
              }}
              className="text-[10.5px] text-text-muted hover:text-text-primary hover:underline"
            >
              Hide all
            </button>
          </div>

          {/* Column list */}
          <div className="px-5 pb-2 max-h-[340px] overflow-y-auto space-y-0.5">
            {filteredColumns.length === 0 && (
              <p className="text-[11px] text-text-muted py-4 text-center">No columns match</p>
            )}
            {filteredColumns.map(col => {
              const header = col.columnDef.header;
              const label = typeof header === 'string' ? header : col.id;
              const visible = col.getIsVisible();
              return (
                <label
                  key={col.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-bg-input transition-colors group"
                >
                  <Checkbox
                    checked={visible}
                    onCheckedChange={val => col.toggleVisibility(!!val)}
                  />
                  <span className={`flex-1 text-[11.5px] truncate ${visible ? 'text-text-primary' : 'text-text-muted'}`}>
                    {label}
                  </span>
                  {visible
                    ? <Eye className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    : <EyeOff className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  }
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => { setColumnVisibility(initialHidden); }}
              className="text-[11px] text-text-muted hover:text-text-primary transition-colors"
            >
              Reset to default
            </button>
            <button
              type="button"
              onClick={() => setColModalOpen(false)}
              className="px-4 py-1.5 rounded-lg bg-accent-blue text-white text-[11px] font-semibold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search…"
                  className="pl-7 pr-3 py-1.5 text-[11px] rounded-lg border border-border bg-bg-input outline-none focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 transition-all w-[160px] focus:w-[200px] placeholder:text-text-muted"
                />
              </div>
            )}

            {/* Column visibility button */}
            {enableColumnVisibility && (
              <button
                type="button"
                onClick={() => setColModalOpen(true)}
                className="h-[30px] flex items-center gap-1.5 px-3 rounded-lg border border-border bg-bg-input text-text-secondary hover:text-text-primary hover:bg-bg-card transition-all text-[10.5px] font-semibold"
                title="Show/hide columns"
              >
                <SlidersHorizontal className="w-3 h-3" />
                Columns
                {hiddenCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-accent-blue text-white text-[9px] font-bold leading-none">
                    {hiddenCount}
                  </span>
                )}
              </button>
            )}

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
                Search: {globalFilter}
                <X className="w-2.5 h-2.5 opacity-60" />
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
                <X className="w-2.5 h-2.5 opacity-50" />
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
                table.getRowModel().rows.map((row) => (
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
              <PagBtn onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} title="First">«</PagBtn>
              <PagBtn onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} title="Previous">‹</PagBtn>

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

              <PagBtn onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} title="Next">›</PagBtn>
              <PagBtn onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} title="Last">»</PagBtn>

              <div className="h-4 w-px bg-border mx-1" />

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
    </>
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
