'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronRight } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate?: string;
  endDate?: string;
  minDate?: string;
  maxDate?: string;
  active?: boolean;
  onApply: (range: { startDate: string; endDate: string }) => void;
}

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toIsoDate(value?: Date): string {
  if (!value) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function clampDate(value: Date, minDate?: Date, maxDate?: Date): Date {
  if (minDate && value < minDate) return minDate;
  if (maxDate && value > maxDate) return maxDate;
  return value;
}

export function DateRangePicker({
  startDate,
  endDate,
  minDate,
  maxDate,
  active = false,
  onApply,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(startDate || '');
  const [localEndDate, setLocalEndDate] = useState(endDate || '');
  const minAvailableDate = useMemo(() => toDate(minDate), [minDate]);
  const maxAvailableDate = useMemo(() => toDate(maxDate) || new Date(), [maxDate]);

  useEffect(() => {
    setLocalStartDate(startDate || '');
    setLocalEndDate(endDate || '');
  }, [startDate, endDate]);

  const selectedRange = useMemo<DateRange | undefined>(() => {
    const from = toDate(localStartDate);
    const to = toDate(localEndDate);
    if (!from && !to) return undefined;
    return { from, to };
  }, [localStartDate, localEndDate]);

  const triggerLabel = useMemo(() => {
    const from = toDate(startDate);
    const to = toDate(endDate);
    if (!from && !to) return 'Custom range';
    if (from && to) return `${format(from, 'MMM d, yyyy')} to ${format(to, 'MMM d, yyyy')}`;
    if (from) return `${format(from, 'MMM d, yyyy')} to ...`;
    return `... to ${format(to as Date, 'MMM d, yyyy')}`;
  }, [startDate, endDate]);

  const applyPresetRange = (days: number) => {
    const end = maxAvailableDate;
    const start = clampDate(subDays(end, days - 1), minAvailableDate, maxAvailableDate);
    setLocalStartDate(toIsoDate(start));
    setLocalEndDate(toIsoDate(end));
  };

  const applyFullRange = () => {
    setLocalStartDate(toIsoDate(minAvailableDate));
    setLocalEndDate(toIsoDate(maxAvailableDate));
  };

  const applyRange = () => {
    if (!localStartDate || !localEndDate) return;
    const normalized =
      localStartDate <= localEndDate
        ? { startDate: localStartDate, endDate: localEndDate }
        : { startDate: localEndDate, endDate: localStartDate };
    onApply(normalized);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 min-w-[220px] justify-between gap-3 rounded-xl px-3 text-xs font-medium',
            active && 'border-accent-blue bg-accent-blue text-white hover:text-white'
          )}
        >
          <span className="flex items-center gap-2 min-w-0">
            <CalendarRange className="h-4 w-4 shrink-0" />
            <span className="truncate">{triggerLabel}</span>
          </span>
          <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] rounded-2xl border-border p-4 sm:w-[420px]">
        <div className="mb-3">
          <div className="text-[13px] font-semibold text-text-primary">Custom Date Range</div>
          <div className="mt-1 text-[11px] text-text-muted">
            Available data: {minDate || 'N/A'} to {maxDate || 'N/A'}
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Start Date</span>
            <input
              type="date"
              value={localStartDate}
              min={minDate}
              max={maxDate}
              onChange={(event) => setLocalStartDate(event.target.value)}
              className="w-full rounded-lg border border-border bg-bg-input px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-blue"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">End Date</span>
            <input
              type="date"
              value={localEndDate}
              min={minDate}
              max={maxDate}
              onChange={(event) => setLocalEndDate(event.target.value)}
              className="w-full rounded-lg border border-border bg-bg-input px-3 py-2 text-xs text-text-primary outline-none focus:border-accent-blue"
            />
          </label>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyPresetRange(7)}
            className="rounded-full border border-border bg-bg-input px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
          >
            Last 7 days
          </button>
          <button
            type="button"
            onClick={() => applyPresetRange(30)}
            className="rounded-full border border-border bg-bg-input px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
          >
            Last 30 days
          </button>
          <button
            type="button"
            onClick={() => applyPresetRange(90)}
            className="rounded-full border border-border bg-bg-input px-2.5 py-1 text-[11px] text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
          >
            Last 90 days
          </button>
          <button
            type="button"
            onClick={applyFullRange}
            className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-2.5 py-1 text-[11px] text-accent-blue transition-colors hover:border-accent-blue/50"
          >
            Full range
          </button>
        </div>

        <Calendar
          mode="range"
          selected={selectedRange}
          defaultMonth={toDate(localStartDate) || toDate(maxDate) || new Date()}
          onSelect={(range) => {
            setLocalStartDate(toIsoDate(range?.from));
            setLocalEndDate(toIsoDate(range?.to));
          }}
          numberOfMonths={1}
          fromDate={minAvailableDate}
          toDate={maxAvailableDate}
          className="rounded-xl border border-border bg-bg-card"
        />
        <div className="mt-2 text-[11px] text-text-muted">
          {localStartDate && localEndDate
            ? `${format(toDate(localStartDate) as Date, 'PPP')} - ${format(toDate(localEndDate) as Date, 'PPP')}`
            : 'Choose start and end dates from calendar'}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => {
              setLocalStartDate(startDate || '');
              setLocalEndDate(endDate || '');
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button size="sm" className="h-8" onClick={applyRange} disabled={!localStartDate || !localEndDate}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
