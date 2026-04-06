'use client';

import { useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
}: TopBarProps) {
  const [internalPeriod, setInternalPeriod] = useState<PeriodOption>('ALL');
  const [customStart, setCustomStart] = useState(customRange?.startDate || '');
  const [customEnd, setCustomEnd] = useState(customRange?.endDate || '');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);
  const customStartDate = customRange?.startDate;
  const customEndDate = customRange?.endDate;

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

  useEffect(() => {
    if (!customStartDate && !customEndDate) return;
    setCustomStart(customStartDate || '');
    setCustomEnd(customEndDate || '');
  }, [customStartDate, customEndDate]);
  
  const toggleTheme = (checked: boolean) => {
    const newTheme = checked ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem('bankbi-theme', newTheme);
  };
  
  return (
    <header className="bg-bg-surface border-b border-border px-6 h-14 flex items-center gap-4 sticky top-0 z-[90]">
      <div className="flex-1 min-w-0">
        <span className="text-[15px] font-semibold">{title}</span>
        {subtitle && (
          <span className="text-text-muted font-normal text-[13px] ml-2">
            › {subtitle}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <RadioGroup
          value={currentPeriod === 'CUSTOM' ? '' : currentPeriod}
          onValueChange={(value) => {
            if (!value) return;
            handlePeriodChange(value as PeriodOption);
          }}
          className="flex bg-bg-input border border-border rounded-lg overflow-hidden gap-0"
        >
          {BASE_PERIOD_OPTIONS.map((p) => (
            <div key={p}>
              <RadioGroupItem value={p} id={`period-${p}`} className="sr-only peer" />
              <label
                htmlFor={`period-${p}`}
                className={`
                block cursor-pointer px-3 py-1 text-[11px] font-medium transition-all
                ${currentPeriod === p
                    ? 'bg-accent-blue text-white'
                    : 'text-text-secondary hover:text-text-primary'
                  }
              `}
              >
                {p}
              </label>
            </div>
          ))}
        </RadioGroup>

        <DateRangePicker
          startDate={customStart}
          endDate={customEnd}
          minDate={minDate}
          maxDate={maxDate}
          active={currentPeriod === 'CUSTOM'}
          onApply={(range) => {
            setCustomStart(range.startDate);
            setCustomEnd(range.endDate);
            onCustomRangeChange?.(range);
            handlePeriodChange('CUSTOM');
          }}
        />
        
        {showFiltersButton && (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            ⚙ Filters
          </Button>
        )}

        {showExportButton && (
          <Button size="sm" className="h-8 gap-1.5 text-xs">
            ⬇ Export
          </Button>
        )}
        
        {mounted && (
          <div className="flex items-center gap-2 px-2 h-8 rounded-lg border border-border bg-bg-card">
            <span className="text-[11px] text-text-muted">{theme === 'dark' ? '☀' : '🌙'}</span>
            <Switch
              checked={theme === 'light'}
              onCheckedChange={toggleTheme}
              aria-label="Toggle theme"
            />
          </div>
        )}
      </div>
    </header>
  );
}
