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

// Declare custom filter functions for module augmentation
declare module '@tanstack/react-table' {
  interface FilterFns {
    arrayFilter: FilterFn<any>;
    dateRange: FilterFn<any>;
    numberRange: FilterFn<any>;
  }
}

// Custom filter functions
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
  
  if (start && end) {
    return dateValue >= new Date(start) && dateValue <= new Date(end);
  } else if (start) {
    return dateValue >= new Date(start);
  } else if (end) {
    return dateValue <= new Date(end);
  }
  return true;
};

const numberRangeFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  const value = Number(row.getValue(columnId));
  if (!filterValue || !Array.isArray(filterValue)) return true;
  
  const [min, max] = filterValue as [number, number];
  
  if (min && max) {
    return value >= min && value <= max;
  } else if (min) {
    return value >= min;
  } else if (max) {
    return value <= max;
  }
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
    filterFns: {
      arrayFilter: arrayFilterFn,
      dateRange: dateRangeFilterFn,
      numberRange: numberRangeFilterFn,
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  const activeTableFilters = React.useMemo(() => {
    return columnFilters
      .map((filter) => {
        const column = table.getColumn(filter.id);
        if (!column) return null;

        const header = column.columnDef.header;
        const label = typeof header === 'string' ? header : filter.id;
        const valueLabel = summarizeFilterValue(filter.value);

        return {
          id: filter.id,
          label: valueLabel ? `${label}: ${valueLabel}` : label,
        };
      })
      .filter(Boolean) as Array<{ id: string; label: string }>;
  }, [columnFilters, summarizeFilterValue, table]);

  const hasAnyFilter = activeTableFilters.length > 0 || Boolean(globalFilter);

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-bg-surface">
        <div>
          <div className="text-[12px] font-semibold text-text-primary">{title}</div>
          {subtitle && <div className="text-[10px] text-text-muted mt-0.5">{subtitle}</div>}
        </div>
        <div className="flex gap-2 items-center">
          {/* Global Search */}
          {enableFiltering && (
            <div className="relative">
              <input
                type="text"
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search all columns..."
                className="pl-8 pr-3 py-1.5 text-xs bg-bg-input border border-border rounded-lg outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          )}
          {actions}
        </div>
      </div>

      {hasAnyFilter && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg-card-hover px-4 py-2.5">
          {globalFilter && (
            <button
              type="button"
              onClick={() => setGlobalFilter('')}
              className="inline-flex items-center gap-2 rounded-full border border-accent-blue/25 bg-accent-blue/10 px-2.5 py-1 text-[11px] text-text-primary"
            >
              <span>Search: {globalFilter}</span>
              <span className="text-text-muted">×</span>
            </button>
          )}

          {activeTableFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => table.getColumn(filter.id)?.setFilterValue(undefined)}
              className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-bg-input px-2.5 py-1 text-[11px] text-text-primary"
            >
              <span>{filter.label}</span>
              <span className="text-text-muted">×</span>
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              table.resetColumnFilters();
              setGlobalFilter('');
            }}
            className="ml-auto text-[11px] font-medium text-accent-red hover:underline"
          >
            Clear table filters
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-[1] bg-bg-surface border-b border-border">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="group px-4 py-2.5 text-left text-[10px] font-semibold text-text-muted uppercase tracking-wider whitespace-nowrap"
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-2">
                        {/* Header with Sort */}
                        <div
                          className={`flex items-center gap-1.5 flex-1 ${
                            header.column.getCanSort() ? 'cursor-pointer select-none hover:text-text-primary transition-colors' : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {enableSorting && header.column.getCanSort() && (
                            <span className="text-[9px] opacity-60">
                              {{
                                asc: '▲',
                                desc: '▼',
                              }[header.column.getIsSorted() as string] ?? '⇅'}
                            </span>
                          )}
                        </div>

                        {/* Column Filter Icon */}
                        {(() => {
                          const filterType = (header.column.columnDef.meta as { filterType?: 'text' | 'select' | 'date-range' | 'number-range' } | undefined)?.filterType;
                          const shouldShowFilter =
                            enableFiltering &&
                            header.column.getCanFilter() &&
                            (showTextColumnFilters || Boolean(filterType));

                          if (!shouldShowFilter) return null;

                          return (
                            <ColumnFilter
                              column={header.column}
                              filterType={filterType || 'text'}
                            />
                          );
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
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 text-text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span className="text-text-muted text-xs">No data available</span>
                  </div>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-b-0 odd:bg-transparent even:bg-bg-input/25 hover:bg-bg-card-hover transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2 text-[11px] text-text-secondary whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="px-4 py-2 border-t border-border flex items-center justify-between bg-bg-surface">
          <div className="text-[10px] text-text-secondary font-medium">
            Showing <span className="text-text-primary font-semibold">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to{' '}
            <span className="text-text-primary font-semibold">{Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}</span>{' '}
            of <span className="text-text-primary font-semibold">{table.getFilteredRowModel().rows.length}</span> results
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="px-2.5 py-1.5 text-xs bg-bg-input border border-border rounded-md hover:bg-bg-card-hover hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
              title="First page"
            >
              ««
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-2.5 py-1.5 text-xs bg-bg-input border border-border rounded-md hover:bg-bg-card-hover hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
              title="Previous page"
            >
              «
            </button>
            <span className="px-3 text-xs text-text-secondary font-medium">
              Page <span className="text-text-primary font-semibold">{table.getState().pagination.pageIndex + 1}</span> of{' '}
              <span className="text-text-primary font-semibold">{table.getPageCount()}</span>
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-2.5 py-1.5 text-xs bg-bg-input border border-border rounded-md hover:bg-bg-card-hover hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
              title="Next page"
            >
              »
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="px-2.5 py-1.5 text-xs bg-bg-input border border-border rounded-md hover:bg-bg-card-hover hover:border-border-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
              title="Last page"
            >
              »»
            </button>
            
            <div className="h-4 w-px bg-border mx-1"></div>
            
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="ml-1 px-2.5 py-1.5 text-xs bg-bg-input border border-border rounded-md outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all font-medium"
            >
              {[10, 20, 30, 40, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} rows
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

// Export helper for creating columns
export { type ColumnDef } from '@tanstack/react-table';
