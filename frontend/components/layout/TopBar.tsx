'use client';

import { useEffect, useState } from 'react';
import { Filter, MoonStar, SunMedium, Download } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DateRangePicker } from '@/components/ui/date-range-picker';

const BASE_PERIOD_OPTIONS = ['ALL', '1D', 'WTD', 'MTD', 'QTD', 'YTD', 'FY'] as const;
type PeriodOption = (typeof BASE_PERIOD_OPTIONS)[number] | 'CUSTOM';

interface TopBarProps {
  title: string;
  subtitle?: string;
  period?: PeriodOption;
  onPeriodChange?: (period: PeriodOption) => void;
  customRange?: { startDate: string; endDate: string };
  onCustomRangeChange?: (range: { startDate: string; endDate: string }) => void;
  minDate?: string;
  maxDate?: string;
  showFiltersButton?: boolean;
  showExportButton?: boolean;
  filtersOpen?: boolean;
  onToggleFilters?: () => void;
  onExport?: () => void;
}

export function TopBar({
  title,
  subtitle,
  period: controlledPeriod,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
  minDate,
  maxDate,
  showFiltersButton = true,
  showExportButton = true,
  filtersOpen = false,
  onToggleFilters,
  onExport,
}: TopBarProps) {
  const [internalPeriod, setInternalPeriod] = useState<PeriodOption>('ALL');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  const currentPeriod = controlledPeriod ?? internalPeriod;

  const handlePeriodChange = (nextPeriod: PeriodOption) => {
    if (onPeriodChange) {
      onPeriodChange(nextPeriod);
      return;
    }
    setInternalPeriod(nextPeriod);
  };

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('bankbi-theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.dataset.theme = savedTheme;
    }
  }, []);

  const toggleTheme = (checked: boolean) => {
    const newTheme = checked ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('bankbi-theme', newTheme);
  };

  return (
    <header className="sticky top-0 z-[90] border-b border-border bg-bg-surface/95 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-3 px-5 py-2.5">

        {/* ── Title block ── */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div>
            <h1 className="font-display text-[13.5px] font-bold tracking-tight leading-none text-text-primary">{title}</h1>
            {subtitle && (
              <p className="text-text-muted font-normal text-[10.5px] mt-0.5 leading-none">{subtitle}</p>
            )}
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Period picker */}
          <div className="flex items-center rounded-lg border border-border bg-bg-input p-0.5 gap-px">
            {BASE_PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodChange(p)}
                aria-pressed={currentPeriod === p}
                className={`
                  rounded-md px-2.5 py-[5px] text-[10px] font-semibold transition-all duration-150 leading-none
                  ${currentPeriod === p
                    ? 'bg-accent-blue text-white shadow-sm shadow-accent-blue/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                  }
                `}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handlePeriodChange('CUSTOM')}
              aria-pressed={currentPeriod === 'CUSTOM'}
              className={`
                rounded-md px-2.5 py-[5px] text-[10px] font-semibold transition-all duration-150 leading-none
                ${currentPeriod === 'CUSTOM'
                  ? 'bg-accent-blue text-white shadow-sm shadow-accent-blue/30'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                }
              `}
            >
              Custom
            </button>
          </div>

          <DateRangePicker
            startDate={customRange?.startDate}
            endDate={customRange?.endDate}
            minDate={minDate}
            maxDate={maxDate}
            active={currentPeriod === 'CUSTOM'}
            onApply={(range) => {
              onCustomRangeChange?.(range);
              handlePeriodChange('CUSTOM');
            }}
          />

          {showFiltersButton && onToggleFilters && (
            <button
              type="button"
              onClick={onToggleFilters}
              className={`
                h-[30px] flex items-center gap-1.5 px-3 rounded-lg border text-[10.5px] font-semibold transition-all duration-150
                ${filtersOpen
                  ? 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue'
                  : 'border-border bg-bg-input text-text-secondary hover:text-text-primary hover:bg-bg-card'
                }
              `}
            >
              <Filter className="h-3 w-3" />
              {filtersOpen ? 'Hide' : 'Filters'}
            </button>
          )}

          {showExportButton && onExport && (
            <button
              type="button"
              onClick={onExport}
              className="h-[30px] flex items-center gap-1.5 px-3 rounded-lg border border-border bg-bg-input text-text-secondary hover:text-text-primary hover:bg-bg-card text-[10.5px] font-semibold transition-all duration-150"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
          )}

          {/* Theme toggle */}
          {mounted && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-input px-2.5 h-[30px]">
              {theme === 'dark' ? (
                <SunMedium className="h-3 w-3 text-text-muted" />
              ) : (
                <MoonStar className="h-3 w-3 text-text-muted" />
              )}
              <Switch
                checked={theme === 'light'}
                onCheckedChange={toggleTheme}
                aria-label="Toggle theme"
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
