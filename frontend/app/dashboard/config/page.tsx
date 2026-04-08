'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { KPICard } from '@/components/ui/KPICard';
import { Pill } from '@/components/ui/Pill';
import { RecordTable } from '@/components/ui/RecordTable';
import { useProductionCatalog, useProductionTable } from '@/lib/hooks/useDashboardData';

export default function ConfigDashboard() {
  const [selectedTable, setSelectedTable] = useState('tran_summary');
  const { data: catalog, isLoading } = useProductionCatalog();
  const { data: tableDetail, isLoading: tableLoading } = useProductionTable(selectedTable, 1, 25);

  useEffect(() => {
    if (!catalog?.tables.length) return;
    if (!catalog.tables.some((table) => table.table_name === selectedTable)) {
      setSelectedTable(catalog.tables[0].table_name);
    }
  }, [catalog?.tables, selectedTable]);

  const totalEstimatedRows = useMemo(() => (
    (catalog?.tables || []).reduce((sum, table) => sum + table.estimated_rows, 0)
  ), [catalog?.tables]);

  return (
    <>
      <TopBar title="Configuration" subtitle="Production database catalog & schema explorer" showFiltersButton={false} showExportButton={false} />

      <div className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KPICard label="Production Tables" value={(catalog?.tables.length || 0).toString()} iconBg="var(--accent-blue-dim)" />
          <KPICard label="Stored Procedures" value={(catalog?.procedures.length || 0).toString()} iconBg="var(--accent-green-dim)" />
          <KPICard label="Estimated Rows" value={totalEstimatedRows.toLocaleString()} iconBg="var(--accent-amber-dim)" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4">
          <div className="rounded-xl border border-border bg-bg-card p-4">
            <div className="text-[13px] font-semibold text-text-primary">Production Table Catalog</div>
            <div className="mt-1 text-[11px] text-text-muted">
              Live table metadata from the production `nifi` database.
            </div>

            <div className="mt-4 space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {(catalog?.tables || []).map((table) => {
                const selected = table.table_name === selectedTable;

                return (
                  <button
                    key={table.table_name}
                    type="button"
                    onClick={() => setSelectedTable(table.table_name)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      selected
                        ? 'border-accent-blue bg-accent-blue/10'
                        : 'border-border bg-bg-input hover:border-border-strong'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-text-primary">{table.label}</div>
                      <Pill variant={selected ? 'blue' : 'teal'}>{table.category}</Pill>
                    </div>
                    <div className="mt-1 text-[11px] text-text-secondary">{table.description}</div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-text-muted">
                      <span>{table.estimated_rows.toLocaleString()} rows</span>
                      <span>{table.column_count} cols</span>
                      <code>{table.table_name}</code>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-bg-card p-4">
              <div className="text-[13px] font-semibold text-text-primary">Production Procedures</div>
              <div className="mt-1 text-[11px] text-text-muted">
                get_tran_summary and get_static_data are available in production and can be used by the UI.
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(catalog?.procedures || []).map((procedure) => (
                  <div key={procedure.name} className="rounded-xl border border-border bg-bg-input p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-text-primary">{procedure.name}</div>
                      <Pill variant="green">live</Pill>
                    </div>
                    <div className="mt-1 text-[11px] text-text-secondary">{procedure.description}</div>
                    {procedure.signature && (
                      <pre className="mt-3 overflow-x-auto rounded-lg bg-bg-surface p-2 text-[10px] text-text-muted">
                        {procedure.signature}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <RecordTable
              title={tableDetail?.label || 'Table Preview'}
              subtitle={tableLoading
                ? 'Loading live production rows...'
                : `${tableDetail?.table_name || selectedTable} · ${(tableDetail?.estimated_rows || 0).toLocaleString()} estimated rows`}
              columns={tableDetail?.columns.map((column) => column.name) || []}
              rows={tableDetail?.rows || []}
              actions={
                tableDetail && (
                  <div className="flex items-center gap-2 text-[11px] text-text-muted">
                    <span>{tableDetail.columns.length} columns</span>
                    <span>·</span>
                    <span>{tableDetail.category}</span>
                  </div>
                )
              }
            />
          </div>
        </div>

        {isLoading && (
          <div className="text-xs text-text-secondary">Loading production catalog...</div>
        )}
      </div>
    </>
  );
}
