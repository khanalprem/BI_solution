'use client';

import { useEffect, useState } from 'react';
import { Filter, MoonStar, SunMedium } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    // Load theme from localStorage on mount
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
    <header className="sticky top-0 z-[90] border-b border-border bg-bg-surface/95 px-5 py-2.5 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-0">
        <span className="text-[13px] font-semibold">{title}</span>
        {subtitle && (
          <span className="text-text-muted font-normal text-[11px] ml-2">
            › {subtitle}
          </span>
        )}
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center rounded-lg border border-border bg-bg-input p-0.5">
          {BASE_PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handlePeriodChange(p)}
              aria-pressed={currentPeriod === p}
              className={`
                rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all
                ${currentPeriod === p
                    ? 'bg-accent-blue text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
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
              rounded-md px-2.5 py-1 text-[10px] font-semibold transition-all
              ${currentPeriod === 'CUSTOM'
                  ? 'bg-accent-blue text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
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
          <Button
            variant="outline"
            size="sm"
            className={`
              h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold
              ${filtersOpen ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : ''}
            `}
            onClick={onToggleFilters}
          >
            <Filter className="h-3.5 w-3.5" />
            {filtersOpen ? 'Hide Filters' : 'Show Filters'}
          </Button>
        )}

        {showExportButton && onExport && (
          <Button size="sm" className="h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold" onClick={onExport}>
            ⬇ Export
          </Button>
        )}
        
        {mounted && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-card px-3 h-9">
            {theme === 'dark' ? (
              <SunMedium className="h-3.5 w-3.5 text-text-muted" />
            ) : (
              <MoonStar className="h-3.5 w-3.5 text-text-muted" />
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
