'use client';

import React, { useState, useMemo } from 'react';
import { SlidersHorizontal, Search, X, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from './checkbox';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from './dialog';

interface RecordTableProps {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  actions?: React.ReactNode;
  // Optional resolver for column-header labels. Default: underscore → space.
  // Pivot/explorer pages pass a resolver that maps backend keys (dims/measures)
  // to their sidebar field-list labels.
  columnLabel?: (col: string) => string;
}

function renderCellValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function RecordTable({ title, subtitle, columns, rows, actions, columnLabel }: RecordTableProps) {
  const resolveLabel = columnLabel ?? ((c: string) => c.replaceAll('_', ' '));
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => new Set(columns));
  const [colModalOpen, setColModalOpen] = useState(false);
  const [colSearch, setColSearch] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');

  // Sync when columns prop changes (table switch)
  React.useEffect(() => {
    setVisibleCols(new Set(columns));
    setGlobalFilter('');
  }, [columns.join(',')]);

  const shownCols = useMemo(() => columns.filter(c => visibleCols.has(c)), [columns, visibleCols]);
  const hiddenCount = columns.length - visibleCols.size;

  const filteredRows = useMemo(() => {
    if (!globalFilter.trim()) return rows;
    const q = globalFilter.toLowerCase();
    return rows.filter(row =>
      shownCols.some(col => String(row[col] ?? '').toLowerCase().includes(q))
    );
  }, [rows, shownCols, globalFilter]);

  const filteredColSearch = useMemo(() =>
    columns.filter(c => c.toLowerCase().includes(colSearch.toLowerCase())),
    [columns, colSearch]
  );

  const toggleCol = (col: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) {
        if (next.size === 1) return prev; // keep at least 1
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
  };

  return (
    <>
      {/* Column Visibility Modal */}
      <Dialog open={colModalOpen} onOpenChange={setColModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Column Visibility</DialogTitle>
            <DialogDescription>
              {visibleCols.size} of {columns.length} columns shown
              {hiddenCount > 0 && ` · ${hiddenCount} hidden`}
            </DialogDescription>
          </DialogHeader>

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

          <div className="px-5 pt-2 pb-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleCols(new Set(columns))}
              className="text-[10.5px] text-accent-blue hover:underline font-medium"
            >
              Show all
            </button>
            <button
              type="button"
              onClick={() => setVisibleCols(new Set([columns[0]]))}
              className="text-[10.5px] text-text-muted hover:text-text-primary hover:underline"
            >
              Hide all
            </button>
          </div>

          <div className="px-5 pb-2 max-h-[340px] overflow-y-auto space-y-0.5">
            {filteredColSearch.length === 0 && (
              <p className="text-[11px] text-text-muted py-4 text-center">No columns match</p>
            )}
            {filteredColSearch.map(col => {
              const visible = visibleCols.has(col);
              return (
                <label
                  key={col}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer hover:bg-bg-input transition-colors group"
                >
                  <Checkbox
                    checked={visible}
                    onCheckedChange={() => toggleCol(col)}
                  />
                  <span className={`flex-1 text-[11.5px] font-mono truncate ${visible ? 'text-text-primary' : 'text-text-muted'}`}>
                    {resolveLabel(col)}
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
              onClick={() => { setVisibleCols(new Set(columns)); setColSearch(''); }}
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

      <div className="rounded-xl border border-border overflow-hidden" style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-card)' }}>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border" style={{ background: 'var(--bg-surface)' }}>
          <div className="min-w-0">
            <h3 className="font-display text-[13px] font-bold text-text-primary tracking-tight truncate">{title}</h3>
            {subtitle && <p className="text-[10.5px] text-text-muted mt-0.5 leading-none">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Global search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={globalFilter}
                onChange={e => setGlobalFilter(e.target.value)}
                placeholder="Search…"
                className="pl-7 pr-3 py-1.5 text-[11px] rounded-lg border border-border bg-bg-input outline-none focus:border-accent-blue/60 focus:ring-1 focus:ring-accent-blue/30 transition-all w-[140px] focus:w-[180px] placeholder:text-text-muted"
              />
            </div>

            {/* Columns button */}
            <button
              type="button"
              onClick={() => setColModalOpen(true)}
              className="h-[30px] flex items-center gap-1.5 px-3 rounded-lg border border-border bg-bg-input text-text-secondary hover:text-text-primary hover:bg-bg-card transition-all text-[10.5px] font-semibold"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Columns
              {hiddenCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-accent-blue text-white text-[9px] font-bold leading-none">
                  {hiddenCount}
                </span>
              )}
            </button>

            <span className="text-[10px] text-text-muted font-medium px-2 py-1 rounded-md border border-border bg-bg-input">
              {filteredRows.length.toLocaleString()} rows
            </span>
            {actions}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11.5px]">
            <thead className="sticky top-0 z-[1] border-b border-border" style={{ background: 'var(--bg-base)' }}>
              <tr>
                {shownCols.map(col => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-left text-[10.5px] font-bold text-text-secondary uppercase tracking-[0.5px] whitespace-nowrap"
                  >
                    {resolveLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={shownCols.length} className="py-12 text-center text-[11px] text-text-muted">
                    {globalFilter ? 'No rows match your search' : 'No data'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-row-hover transition-colors">
                    {shownCols.map(col => (
                      <td key={col} className="px-4 py-2.5 text-text-secondary whitespace-nowrap">
                        {renderCellValue(row[col])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
