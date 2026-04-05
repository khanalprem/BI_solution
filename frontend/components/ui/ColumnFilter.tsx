'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Column } from '@tanstack/react-table';

interface ColumnFilterProps<TData> {
  column: Column<TData, unknown>;
  filterType?: 'text' | 'select' | 'date-range' | 'number-range';
}

export function ColumnFilter<TData>({ column, filterType = 'text' }: ColumnFilterProps<TData>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const columnFilterValue = column.getFilterValue();
  
  // Get unique values from the column
  const uniqueValues = React.useMemo(() => {
    const facetedValues = column.getFacetedUniqueValues();
    return Array.from(facetedValues.keys()).sort();
  }, [column]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
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
          <div className="w-72 max-w-[calc(100vw-2rem)] bg-bg-card/95 backdrop-blur border border-border-strong rounded-xl shadow-2xl py-2">
            {/* Search */}
            <div className="px-3 pb-2 border-b border-border">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1.5 text-xs bg-bg-input border border-border rounded outline-none focus:border-accent-blue"
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
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleValue(value as string)}
                        className="w-3 h-3 rounded border-border text-accent-blue focus:ring-accent-blue focus:ring-offset-0"
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
        return (
          <div className="w-72 max-w-[calc(100vw-2rem)] bg-bg-card/95 backdrop-blur border border-border-strong rounded-xl shadow-2xl p-3">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-muted block mb-1">From Date</label>
                <input
                  type="date"
                  value={dateRange[0] || ''}
                  onChange={(e) => {
                    const newRange: [string, string] = [e.target.value, dateRange[1]];
                    column.setFilterValue(newRange[0] || newRange[1] ? newRange : undefined);
                  }}
                  className="w-full px-2 py-1.5 text-xs bg-bg-input border border-border rounded outline-none focus:border-accent-blue"
                />
              </div>
              
              <div>
                <label className="text-[10px] text-text-muted block mb-1">To Date</label>
                <input
                  type="date"
                  value={dateRange[1] || ''}
                  onChange={(e) => {
                    const newRange: [string, string] = [dateRange[0], e.target.value];
                    column.setFilterValue(newRange[0] || newRange[1] ? newRange : undefined);
                  }}
                  className="w-full px-2 py-1.5 text-xs bg-bg-input border border-border rounded outline-none focus:border-accent-blue"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => column.setFilterValue(undefined)}
                  className="flex-1 px-3 py-1.5 text-xs bg-bg-input border border-border rounded hover:bg-bg-card-hover"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        );

      case 'number-range':
        const numRange = (columnFilterValue as [number, number]) || [0, 0];
        return (
          <div className="w-72 max-w-[calc(100vw-2rem)] bg-bg-card/95 backdrop-blur border border-border-strong rounded-xl shadow-2xl p-3">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Min</label>
                <input
                  type="number"
                  value={numRange[0] || ''}
                  onChange={(e) => {
                    const newRange: [number, number] = [Number(e.target.value), numRange[1]];
                    column.setFilterValue(newRange[0] || newRange[1] ? newRange : undefined);
                  }}
                  placeholder="Minimum value"
                  className="w-full px-2 py-1.5 text-xs bg-bg-input border border-border rounded outline-none focus:border-accent-blue"
                />
              </div>
              
              <div>
                <label className="text-[10px] text-text-muted block mb-1">Max</label>
                <input
                  type="number"
                  value={numRange[1] || ''}
                  onChange={(e) => {
                    const newRange: [number, number] = [numRange[0], Number(e.target.value)];
                    column.setFilterValue(newRange[0] || newRange[1] ? newRange : undefined);
                  }}
                  placeholder="Maximum value"
                  className="w-full px-2 py-1.5 text-xs bg-bg-input border border-border rounded outline-none focus:border-accent-blue"
                />
              </div>

              <button
                onClick={() => column.setFilterValue(undefined)}
                className="w-full px-3 py-1.5 text-xs bg-bg-input border border-border rounded hover:bg-bg-card-hover"
              >
                Clear
              </button>
            </div>
          </div>
        );

      case 'text':
      default:
        return (
          <div className="w-72 max-w-[calc(100vw-2rem)] bg-bg-card/95 backdrop-blur border border-border-strong rounded-xl shadow-2xl p-3">
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
              <input
                type="text"
                value={(columnFilterValue ?? '') as string}
                onChange={(e) => column.setFilterValue(e.target.value || undefined)}
                placeholder="Type to filter..."
                className="flex-1 min-w-0 px-2.5 py-2 text-xs bg-bg-input border border-border rounded-lg outline-none focus:border-accent-blue"
                autoFocus
              />
              <button
                onClick={() => column.setFilterValue(undefined)}
                className="px-3 py-2 text-[11px] bg-bg-input border border-border rounded-lg hover:bg-bg-card-hover"
              >
                Clear
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="relative inline-flex" ref={popoverRef}>
      {/* Filter Icon Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-1 rounded-md border transition-all ${
          hasActiveFilter
            ? 'border-accent-blue/40 bg-accent-blue/15 text-accent-blue'
            : 'border-transparent text-text-muted opacity-0 group-hover:opacity-100 hover:opacity-100 hover:border-border hover:bg-bg-input'
        }`}
        title="Filter column"
      >
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        {hasActiveFilter && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent-blue rounded-full"></span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 z-[70]"
          onClick={(e) => e.stopPropagation()}
        >
          {renderFilterContent()}
        </div>
      )}
    </div>
  );
}
