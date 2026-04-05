'use client';

import { useEffect, useState } from 'react';

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
  const [showCustomPicker, setShowCustomPicker] = useState(false);
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

  const applyCustomRange = () => {
    if (!customStart || !customEnd) return;
    const normalized = customStart <= customEnd
      ? { startDate: customStart, endDate: customEnd }
      : { startDate: customEnd, endDate: customStart };

    onCustomRangeChange?.(normalized);
    handlePeriodChange('CUSTOM');
    setShowCustomPicker(false);
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
  
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
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
        <div className="flex bg-bg-input border border-border rounded-lg overflow-hidden">
          {BASE_PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`
                px-3 py-1 text-[11px] font-medium transition-all
                ${currentPeriod === p
                  ? 'bg-accent-blue text-white'
                  : 'text-text-secondary hover:text-text-primary'
                }
              `}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowCustomPicker((prev) => !prev)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
              ${currentPeriod === 'CUSTOM'
                ? 'bg-accent-blue text-white border-accent-blue'
                : 'bg-bg-card border-border text-text-secondary hover:border-border-strong hover:text-text-primary'
              }
            `}
          >
            📅 Custom
          </button>

          {showCustomPicker && (
            <div className="absolute right-0 top-10 w-[280px] p-3 rounded-xl border border-border bg-bg-card shadow-lg z-[120]">
              <div className="text-[11px] text-text-muted mb-2">Select custom date range</div>
              <div className="grid grid-cols-1 gap-2">
                <label className="text-[10px] text-text-muted uppercase tracking-wider">
                  Start Date
                  <input
                    type="date"
                    value={customStart}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 w-full bg-bg-input border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                  />
                </label>
                <label className="text-[10px] text-text-muted uppercase tracking-wider">
                  End Date
                  <input
                    type="date"
                    value={customEnd}
                    min={minDate}
                    max={maxDate}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1 w-full bg-bg-input border border-border rounded-md px-2.5 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setShowCustomPicker(false)}
                  className="px-2.5 py-1.5 text-xs rounded-md border border-border text-text-secondary hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={applyCustomRange}
                  disabled={!customStart || !customEnd}
                  className="px-2.5 py-1.5 text-xs rounded-md bg-accent-blue text-white disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
        
        {showFiltersButton && (
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-secondary text-xs font-medium hover:border-border-strong hover:text-text-primary transition-all">
            ⚙ Filters
          </button>
        )}

        {showExportButton && (
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-medium hover:opacity-90 transition-opacity">
            ⬇ Export
          </button>
        )}
        
        {mounted && (
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
        )}
      </div>
    </header>
  );
}
