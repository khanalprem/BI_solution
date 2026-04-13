'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { KPICard } from '@/components/ui/KPICard';
import { Badge, badgeColor } from '@/components/ui/badge';
import { RecordTable } from '@/components/ui/RecordTable';
import { useProductionCatalog, useProductionTable } from '@/lib/hooks/useDashboardData';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

export default function ConfigDashboard() {
  const [selectedTable, setSelectedTable] = useState('tran_summary');
  const [page, setPage] = useState(1);

  const { data: catalog, isLoading } = useProductionCatalog();
  const { data: tableDetail, isLoading: tableLoading } = useProductionTable(selectedTable, page, PAGE_SIZE);

  // Reset page when table changes
  useEffect(() => { setPage(1); }, [selectedTable]);

  useEffect(() => {
    if (!catalog?.tables.length) return;
    if (!catalog.tables.some((t) => t.table_name === selectedTable)) {
      setSelectedTable(catalog.tables[0].table_name);
    }
  }, [catalog?.tables, selectedTable]);

  const totalEstimatedRows = useMemo(() =>
    (catalog?.tables || []).reduce((sum, t) => sum + t.estimated_rows, 0),
    [catalog?.tables]
  );

  const selectedMeta = catalog?.tables.find(t => t.table_name === selectedTable);
  const totalPages = selectedMeta ? Math.ceil(selectedMeta.estimated_rows / PAGE_SIZE) : 1;

  return (
    <>
      <TopBar
        title="Configuration"
        subtitle="Production database catalog & schema explorer"
        showFiltersButton={false}
        showExportButton={false}
      />

      <div className="flex flex-col gap-[14px] px-5 py-4">
        {/* KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KPICard label="Production Tables" value={(catalog?.tables.length || 0).toString()} iconBg="var(--accent-blue-dim)" />
          <KPICard label="Stored Procedures" value={(catalog?.procedures.length || 0).toString()} iconBg="var(--accent-green-dim)" />
          <KPICard label="Estimated Total Rows" value={totalEstimatedRows.toLocaleString()} iconBg="var(--accent-amber-dim)" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-4">

          {/* ── Table catalog sidebar ── */}
          <div className="rounded-xl border border-border bg-bg-card p-4 flex flex-col gap-3">
            <div>
              <div className="text-[13px] font-semibold text-text-primary">Production Tables</div>
              <div className="text-[11px] text-text-muted mt-0.5">
                {catalog?.tables.length || 0} tables in the <code className="text-[10px]">nifi</code> database
              </div>
            </div>

            <div className="space-y-1.5 max-h-[680px] overflow-y-auto pr-1">
              {(catalog?.tables || []).map((table) => {
                const selected = table.table_name === selectedTable;
                return (
                  <button
                    key={table.table_name}
                    type="button"
                    onClick={() => setSelectedTable(table.table_name)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? 'border-accent-blue/40 bg-accent-blue/10'
                        : 'border-border bg-bg-input hover:border-border-strong hover:bg-bg-card'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className={`text-[11px] font-semibold ${selected ? 'text-accent-blue' : 'text-text-primary'}`}>
                        {table.table_name}
                      </code>
                      <Badge className={selected ? badgeColor.blue : badgeColor.teal}>{table.category}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted">
                      <span>{table.estimated_rows.toLocaleString()} rows</span>
                      <span>·</span>
                      <span>{table.column_count} cols</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Procedures */}
            <div className="border-t border-border pt-3">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.5px] mb-2">Procedures</div>
              <div className="space-y-1.5">
                {(catalog?.procedures || []).map((proc) => (
                  <div key={proc.name} className="rounded-lg border border-border bg-bg-input p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-[11px] font-semibold text-text-primary">{proc.name}</code>
                      <Badge className={badgeColor.green}>live</Badge>
                    </div>
                    <div className="mt-0.5 text-[10px] text-text-muted">{proc.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Table data panel ── */}
          <div className="flex flex-col gap-3">

            {/* Selected table info */}
            {selectedMeta && (
              <div className="rounded-xl border border-border bg-bg-card px-4 py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <code className="text-[13px] font-bold text-text-primary">{selectedMeta.table_name}</code>
                    <Badge className={badgeColor.blue}>{selectedMeta.category}</Badge>
                  </div>
                  <div className="text-[11px] text-text-muted mt-0.5">{selectedMeta.description}</div>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-text-muted flex-shrink-0">
                  <span><span className="text-text-primary font-semibold">{selectedMeta.column_count}</span> columns</span>
                  <span><span className="text-text-primary font-semibold">{selectedMeta.estimated_rows.toLocaleString()}</span> rows</span>
                </div>
              </div>
            )}

            {/* RecordTable — all columns, column visibility modal built-in */}
            <RecordTable
              title={tableDetail?.label || selectedTable}
              subtitle={
                tableLoading
                  ? 'Loading rows from production…'
                  : `Showing ${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, selectedMeta?.estimated_rows || 0)} of ${(selectedMeta?.estimated_rows || 0).toLocaleString()} rows · ${tableDetail?.columns.length || 0} columns · click "Columns" to show/hide`
              }
              columns={tableDetail?.columns.map((c) => c.name) || []}
              rows={tableDetail?.rows || []}
            />

            {/* Row pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] text-text-muted">
                  Page <span className="text-text-primary font-semibold">{page}</span> of{' '}
                  <span className="text-text-primary font-semibold">{totalPages.toLocaleString()}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(1)}
                    className="h-7 px-2 rounded-md border border-border bg-bg-input text-[11px] text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    «
                  </button>
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="h-7 px-2 rounded-md border border-border bg-bg-input text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  {/* Page number pills */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number;
                    if (totalPages <= 5) p = i + 1;
                    else if (page <= 3) p = i + 1;
                    else if (page >= totalPages - 2) p = totalPages - 4 + i;
                    else p = page - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`min-w-[28px] h-7 rounded-md text-[11px] font-medium transition-all ${
                          p === page
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
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="h-7 px-2 rounded-md border border-border bg-bg-input text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                    className="h-7 px-2 rounded-md border border-border bg-bg-input text-[11px] text-text-secondary hover:bg-bg-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="text-xs text-text-secondary">Loading production catalog…</div>
        )}
      </div>
    </>
  );
}
