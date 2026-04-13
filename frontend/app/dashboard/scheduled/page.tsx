'use client';

import { TopBar } from '@/components/layout/TopBar';
import { RecordTable } from '@/components/ui/RecordTable';
import { Badge, badgeColor } from '@/components/ui/badge';
import { useProductionCatalog, useProductionTable } from '@/lib/hooks/useDashboardData';

export default function ScheduledDashboard() {
  const { data: catalog } = useProductionCatalog();
  const { data: dictionaryTable, isLoading } = useProductionTable('data_dictionary', 1, 25);

  return (
    <>
      <TopBar title="Scheduled & Regulatory Runs" subtitle="Production procedures & dictionary metadata" showFiltersButton={false} showExportButton={false} />
      <div className="flex flex-col gap-[14px] px-5 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(catalog?.procedures || []).map((procedure) => (
            <div key={procedure.name} className="rounded-xl border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[13px] font-semibold text-text-primary">{procedure.name}</div>
                <Badge className={badgeColor.green}>production</Badge>
              </div>
              <div className="mt-1 text-[11px] text-text-secondary">{procedure.description}</div>
              {procedure.signature && (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-bg-input p-2 text-[10px] text-text-muted">
                  {procedure.signature}
                </pre>
              )}
            </div>
          ))}
        </div>

        <RecordTable
          title="Data Dictionary Preview"
          subtitle={isLoading ? 'Loading live production metadata...' : 'First 25 rows from production data_dictionary'}
          columns={dictionaryTable?.columns.map((column) => column.name) || []}
          rows={dictionaryTable?.rows || []}
        />
      </div>
    </>
  );
}
