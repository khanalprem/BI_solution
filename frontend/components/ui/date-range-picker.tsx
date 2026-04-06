'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { format } from 'date-fns';

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
    if (!from && !to) return 'Custom';
    if (from && to) return `${format(from, 'MMM d')} - ${format(to, 'MMM d')}`;
    if (from) return `${format(from, 'MMM d')} - ...`;
    return `... - ${format(to as Date, 'MMM d')}`;
  }, [startDate, endDate]);

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
            'h-8 gap-1.5 px-3 text-xs font-medium',
            active && 'bg-accent-blue text-white border-accent-blue hover:text-white'
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-3">
        <div className="text-[11px] text-text-muted mb-2">Select custom date range</div>
        <Calendar
          mode="range"
          selected={selectedRange}
          defaultMonth={toDate(localStartDate) || toDate(maxDate) || new Date()}
          onSelect={(range) => {
            setLocalStartDate(toIsoDate(range?.from));
            setLocalEndDate(toIsoDate(range?.to));
          }}
          numberOfMonths={1}
          fromDate={toDate(minDate)}
          toDate={toDate(maxDate)}
        />
        <div className="mt-1 text-[10px] text-text-muted">
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
