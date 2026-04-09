'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Column } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

function toLocalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toIsoDate(date?: Date): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface ColumnFilterProps<TData> {
  column: Column<TData, unknown>;
  filterType?: 'text' | 'select' | 'date-range' | 'number-range';
}

export function ColumnFilter<TData>({ column, filterType = 'text' }: ColumnFilterProps<TData>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const calcPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 288; // w-72
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const top = spaceBelow >= 260 ? rect.bottom + 6 : rect.top - 6;
    const translateY = spaceBelow >= 260 ? '0%' : '-100%';

    // Horizontal: prefer aligning right edge of dropdown to right edge of button,
    // but clamp so it never goes off-screen on either side.
    let left = rect.right - dropdownWidth;
    if (left < 8) left = 8;
    if (left + dropdownWidth > viewportWidth - 8) left = viewportWidth - dropdownWidth - 8;

    setDropdownStyle({ position: 'fixed', top, left, transform: `translateY(${translateY})`, zIndex: 9999 });
  }, []);
  
  const columnFilterValue = column.getFilterValue();
  
  // Get unique values from the column
  const uniqueValues = React.useMemo(() => {
    const facetedValues = column.getFacetedUniqueValues();
    return Array.from(facetedValues.keys()).sort();
  }, [column]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const inTrigger = triggerRef.current?.contains(target);
      const inPopover = popoverRef.current?.contains(target);
      if (!inTrigger && !inPopover) setIsOpen(false);
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [isOpen]);

  // Check if any filter is active
  const hasActiveFilter = columnFilterValue !== undefined && columnFilterValue !== null && columnFilterValue !== '';

  // For select/checkbox filters
  const selectedValues = (columnFilterValue as string[]) || [];
  
  const toggleValue = (value: string) => {
    const currentValues = (column.getFilterValue() as string[]) || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    column.setFilterValue(newValues.length > 0 ? newValues : undefined);
  };

  const filteredUniqueValues = uniqueValues.filter(value =>
    String(value).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render based on filter type
  const renderFilterContent = () => {
    switch (filterType) {
      case 'select':
        return (
          <div className="w-72 bg-bg-card/95 backdrop-blur border border-border-strong rounded-xl shadow-2xl py-2">
            {/* Search */}
            <div className="px-3 pb-2 border-b border-border">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="h-8 text-xs"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Options */}
            <div className="max-h-60 overflow-y-auto">
              {/* Select All / Clear All */}
              <div className="px-3 py-2 border-b border-border flex justify-between">
                <button
                  onClick={() => column.setFilterValue(filteredUniqueValues)}
                  className="text-[10px] text-accent-blue hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={() => column.setFilterValue(undefined)}
                  className="text-[10px] text-text-muted hover:text-accent-red hover:underline"
                >
                  Clear
                </button>
              </div>

              {filteredUniqueValues.length === 0 ? (
                <div className="px-3 py-4 text-xs text-text-muted text-center">
                  No options found
                </div>
              ) : (
                filteredUniqueValues.map((value) => {
                  const isSelected = selectedValues.includes(value as string);
                  const count = column.getFacetedUniqueValues().get(value) || 0;
                  
                  return (
                    <label
                      key={String(value)}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent-blue-dim cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleValue(value as string)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="text-xs flex-1 truncate">{String(value)}</span>
                      <span className="text-[10px] text-text-muted">({count})</span>
                    </label>
                  );
                })
              )}
            </div>

            {/* Selected count */}
            {selectedValues.length > 0 && (
              <div className="px-3 py-2 border-t border-border text-[10px] text-text-muted">
                {selectedValues.length} selected
              </div>
            )}
          </div>
        );

      case 'date-range':
        const dateRange = (columnFilterValue as [string, string]) || ['', ''];
        const fromDate = toLocalDate(dateRange[0]);
        const endDate = toLocalDate(dateRange[1]);
        return (
          <div className="w-72 bg-bg-card/95 backdrop-blur border border-border-strong rounded-xl shadow-2xl p-3">
            <div className="space-y-3">
              <Calendar
                mode="range"
                selected={{ from: fromDate, to: endDate }}
                defaultMonth={fromDate || endDate || new Date()}
                numberOfMonths={1}
                onSelect={(range) => {
                  const start = toIsoDate(range?.from);
                  const end = toIsoDate(range?.to);
                  column.setFilterValue(start || end ? [start, end] : undefined);
                }}
              />

              <div className="text-[10px] text-text-muted px-1">
                {dateRange[0] || dateRange[1]
                  ? `${dateRange[0] || '...'} to ${dateRange[1] || '...'}`
                  : 'Select a start and end date'}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => column.setFilterValue(undefined)}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        );

      case 'number-range':
        const numRange = (columnFilterValue as [number, number]) || [0, 0];
        return (
          <div className="w-72 bg-bg-card/95 backdrop-blur border border-border-strong rounded-xl shadow-2xl p-3">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Min</label>
                <Input
                  type="number"
                  value={numRange[0] || ''}
                  onChange={(e) => {
                    const newRange: [number, number] = [Number(e.target.value), numRange[1]];
                    column.setFilterValue(newRange[0] || newRange[1] ? newRange : undefined);
                  }}
                  placeholder="Minimum value"
                  className="h-8 text-xs"
                />
              </div>
              
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Max</label>
                <Input
                  type="number"
                  value={numRange[1] || ''}
                  onChange={(e) => {
                    const newRange: [number, number] = [numRange[0], Number(e.target.value)];
                    column.setFilterValue(newRange[0] || newRange[1] ? newRange : undefined);
                  }}
                  placeholder="Maximum value"
                  className="h-8 text-xs"
                />
              </div>

              <Button variant="outline" size="sm" className="w-full h-8" onClick={() => column.setFilterValue(undefined)}>
                Clear
              </Button>
            </div>
          </div>
        );

      case 'text':
      default:
        return (
          <div className="w-72 bg-bg-card/95 backdrop-blur border border-border-strong rounded-xl shadow-2xl p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wide text-text-muted">Text Filter</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[10px] text-text-muted hover:text-text-primary"
              >
                Close
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={(columnFilterValue ?? '') as string}
                onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                placeholder="Type to filter..."
                className="flex-1 min-w-0 h-8 text-xs"
                autoFocus
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => column.setFilterValue(undefined)}
              >
                Clear
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="relative inline-flex">
      {/* Filter Icon Button */}
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen) calcPosition();
          setIsOpen(!isOpen);
        }}
        className={`p-1 rounded-md border transition-all ${
          hasActiveFilter
            ? 'border-accent-blue/40 bg-accent-blue/15 text-accent-blue'
            : 'border-transparent text-text-muted opacity-0 group-hover:opacity-100 hover:opacity-100 hover:border-border hover:bg-bg-input'
        }`}
        title="Filter column"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {hasActiveFilter && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-blue rounded-full" />
        )}
      </button>

      {/* Popover — rendered in portal so table overflow can't clip it */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div ref={popoverRef} style={dropdownStyle} onClick={(e) => e.stopPropagation()}>
          {renderFilterContent()}
        </div>,
        document.body
      )}
    </div>
  );
}
