'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { RecordTable } from '@/components/ui/RecordTable';
import { Select } from '@/components/ui/Select';
import { SearchableMultiSelect } from '@/components/ui/Select';
import { useFilterStatistics, useProductionCatalog, useProductionExplorer } from '@/lib/hooks/useDashboardData';
import { getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

export default function PivotDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [dimension, setDimension] = useState('gam_branch');
  const [measures, setMeasures] = useState<string[]>(['total_amount', 'transaction_count']);
  const [filters, setFilters] = useState<DashboardFilters>({
    ...getDateRange('ALL'),
  });

  const { data: filterStats } = useFilterStatistics();
  const { data: catalog } = useProductionCatalog();
  const { data: explorer, isLoading } = useProductionExplorer(filters, dimension, measures, 1, 25);

  const referenceDate = useMemo(() => (
    parseISODateToLocal(filterStats?.date_range?.max) || new Date()
  ), [filterStats?.date_range?.max]);

  const minReferenceDate = useMemo(() => (
    parseISODateToLocal(filterStats?.date_range?.min)
  ), [filterStats?.date_range?.min]);

  useEffect(() => {
    if (period === 'CUSTOM') return;
    const dateRange = getDateRange(period, referenceDate, minReferenceDate || undefined);
    setFilters((prev) => (
      prev.startDate === dateRange.startDate && prev.endDate === dateRange.endDate
        ? prev
        : { ...prev, ...dateRange }
    ));
  }, [period, referenceDate, minReferenceDate]);

  const handleClearFilters = () => {
    if (period === 'CUSTOM') {
      setFilters((prev) => ({ startDate: prev.startDate, endDate: prev.endDate }));
      return;
    }

    setFilters(getDateRange(period, referenceDate, minReferenceDate || undefined));
  };

  return (
    <>
      <TopBar
        title="Pivot Analysis"
        subtitle="Production get_tran_summary explorer"
        period={period}
        onPeriodChange={setPeriod}
        customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onCustomRangeChange={(range) => {
          setPeriod('CUSTOM');
          setFilters((prev) => ({ ...prev, ...range }));
        }}
        minDate={filterStats?.date_range?.min || undefined}
        maxDate={filterStats?.date_range?.max || undefined}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        filtersOpen={filtersOpen}
        showExportButton={false}
      />

      <div className="flex flex-col gap-4 p-6">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KPICard label="Returned Rows" value={(explorer?.rows.length || 0).toLocaleString()} iconBg="var(--accent-blue-dim)" />
          <KPICard label="Total Result Rows" value={(explorer?.total_rows || 0).toLocaleString()} iconBg="var(--accent-green-dim)" />
          <KPICard label="Selected Measures" value={measures.length.toString()} iconBg="var(--accent-amber-dim)" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4">
          <div className="rounded-xl border border-border bg-bg-card p-4">
            <div className="text-[13px] font-semibold text-text-primary">Procedure Controls</div>
            <div className="mt-1 text-[11px] text-text-muted">
              This page executes the production `get_tran_summary` procedure using the selected dimension, measures, date range, and filters.
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Dimension</div>
                <Select
                  value={dimension}
                  onChange={setDimension}
                  options={catalog?.dimension_options || []}
                  placeholder="Select dimension"
                />
              </div>

              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">Measures</div>
                <SearchableMultiSelect
                  value={measures}
                  onChange={(nextMeasures) => setMeasures(nextMeasures.length > 0 ? nextMeasures : ['total_amount'])}
                  options={catalog?.measure_options || []}
                  placeholder="Select measures"
                />
              </div>

              <div className="rounded-xl border border-border bg-bg-input p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">SQL Preview</div>
                <pre className="mt-2 overflow-x-auto text-[10px] text-text-secondary whitespace-pre-wrap">
                  {explorer
                    ? [
                      explorer.sql_preview.select_inner,
                      explorer.sql_preview.where_clause,
                      explorer.sql_preview.groupby_clause,
                      explorer.sql_preview.orderby_clause,
                    ].join('\n')
                    : 'Run a live production query to see the generated procedure fragments.'}
                </pre>
              </div>
            </div>
          </div>

          <RecordTable
            title="Procedure Result"
            subtitle={isLoading
              ? 'Running get_tran_summary against production...'
              : `${catalog?.dimension_options.find((option) => option.value === dimension)?.label || dimension} grouped result`}
            columns={explorer?.columns || []}
            rows={explorer?.rows || []}
          />
        </div>
      </div>
    </>
  );
}
