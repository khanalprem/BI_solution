'use client';

import { useState, useEffect, useMemo } from 'react';
import { getDateRange, parseISODateToLocal } from '@/lib/formatters';
import { useFilterStatistics } from '@/lib/hooks/useDashboardData';
import type { DashboardFilters } from '@/types';

export type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'PYTD' | 'FY' | 'CUSTOM';

interface UseDashboardPageOptions {
  extraFilters?: Partial<DashboardFilters>;
  /**
   * Initial period on first mount. Defaults to 'ALL'. Override for pages where
   * the underlying query is expensive over multi-year windows — e.g. /deposits
   * hits public.get_deposit which scans EAB × GAM × DATES and times out on ALL.
   */
  defaultPeriod?: DashboardPeriod;
}

/**
 * Shared hook for all dashboard pages.
 * Handles period selection, date range sync, filter state, and clear logic.
 * Eliminates ~40 lines of boilerplate duplicated across 14 pages.
 */
export function useDashboardPage(options: UseDashboardPageOptions = {}) {
  const [period, setPeriod] = useState<DashboardPeriod>(options.defaultPeriod ?? 'ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Default to production data range until filterStats loads
  const [filters, setFilters] = useState<DashboardFilters>({
    ...options.extraFilters,
  } as DashboardFilters);

  const { data: filterStats } = useFilterStatistics();

  const referenceDate = useMemo(
    () => parseISODateToLocal(filterStats?.date_range?.max) || new Date(),
    [filterStats?.date_range?.max]
  );

  const minReferenceDate = useMemo(
    () => parseISODateToLocal(filterStats?.date_range?.min) ?? undefined,
    [filterStats?.date_range?.min]
  );

  useEffect(() => {
    if (period === 'CUSTOM') return;
    const dr = getDateRange(period, referenceDate, minReferenceDate);
    setFilters((prev) =>
      prev.startDate === dr.startDate && prev.endDate === dr.endDate
        ? prev
        : { ...prev, ...dr, ...options.extraFilters }
    );
  }, [period, referenceDate, minReferenceDate]);

  const handlePeriodChange = (p: DashboardPeriod) => setPeriod(p);

  const handleCustomRangeChange = (range: { startDate: string; endDate: string }) => {
    setPeriod('CUSTOM');
    setFilters((prev) => ({ ...prev, ...range, ...options.extraFilters }));
  };

  const handleClearFilters = () => {
    if (period === 'CUSTOM') {
      setFilters((prev) => ({
        startDate: prev.startDate,
        endDate: prev.endDate,
        ...options.extraFilters,
      }));
      return;
    }
    setFilters({
      ...getDateRange(period, referenceDate, minReferenceDate),
      ...options.extraFilters,
    });
  };

  const topBarProps = {
    period,
    onPeriodChange: handlePeriodChange,
    customRange: { startDate: filters.startDate, endDate: filters.endDate },
    onCustomRangeChange: handleCustomRangeChange,
    minDate: filterStats?.date_range?.min ?? undefined,
    maxDate: filterStats?.date_range?.max ?? undefined,
    onToggleFilters: () => setFiltersOpen((v) => !v),
    filtersOpen,
  };

  return {
    period,
    filters,
    setFilters,
    filtersOpen,
    setFiltersOpen,
    filterStats,
    referenceDate,
    minReferenceDate,
    handleClearFilters,
    handlePeriodChange,
    handleCustomRangeChange,
    topBarProps,
  };
}
