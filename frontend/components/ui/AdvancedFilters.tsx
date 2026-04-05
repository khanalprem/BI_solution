'use client';

import { useState, useEffect } from 'react';
import { FilterBar, FilterLabel, FilterDivider } from './FilterBar';
import { Select, SearchableSelect } from './Select';
import apiClient from '@/lib/api';
import type { DashboardFilters, FilterValuesResponse } from '@/types';

interface AdvancedFiltersProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  onClear: () => void;
}

export function AdvancedFilters({ filters, onChange, onClear }: AdvancedFiltersProps) {
  const [filterValues, setFilterValues] = useState<FilterValuesResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    let active = true;

    apiClient
      .get<FilterValuesResponse>('/filters/values')
      .then(({ data }) => {
        if (!active) return;
        setFilterValues(data);
        setLoadError(null);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error?.message || 'Unable to load filter values');
      });

    return () => {
      active = false;
    };
  }, []);

  if (loadError) {
    return <div className="text-accent-red text-xs">{loadError}</div>;
  }

  if (!filterValues) {
    return <div className="text-text-secondary text-xs">Loading filters...</div>;
  }

  const updateFilter = <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K] | '') => {
    onChange({
      ...filters,
      [key]: value === '' ? undefined : value,
    });
  };

  const parseNumberInput = (value: string): number | undefined => {
    if (value.trim() === '') return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  // Count active filters (excluding date range)
  const activeCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'startDate' || key === 'endDate') return false;
    return value !== undefined && value !== null && value !== '';
  }).length;

  return (
    <div className="space-y-3">
      {/* Basic Filters */}
      <FilterBar onClear={onClear}>
        <FilterLabel>Province</FilterLabel>
        <div className="min-w-[150px]">
          <Select
            value={filters.province || ''}
            onChange={(value) => updateFilter('province', value)}
            options={[
              { value: '', label: 'All Provinces' },
              ...filterValues.provinces.map(p => ({ value: p, label: p }))
            ]}
          />
        </div>
        
        <FilterDivider />
        
        <FilterLabel>Branch</FilterLabel>
        <div className="min-w-[180px]">
          <SearchableSelect
            value={filters.branchCode || ''}
            onChange={(value) => updateFilter('branchCode', value)}
            options={[
              { value: '', label: 'All Branches' },
              ...filterValues.branches.map(b => ({ value: b, label: b }))
            ]}
          />
        </div>
        
        <FilterDivider />
        
        <FilterLabel>Transaction Type</FilterLabel>
        <div className="min-w-[140px]">
          <Select
            value={filters.tranType || ''}
            onChange={(value) => updateFilter('tranType', value)}
            options={[
              { value: '', label: 'All Types' },
              ...filterValues.tran_types.map(t => ({ value: t, label: t }))
            ]}
          />
        </div>
        
        <FilterDivider />
        
        <FilterLabel>Channel</FilterLabel>
        <div className="min-w-[140px]">
          <Select
            value={filters.tranSource || ''}
            onChange={(value) => updateFilter('tranSource', value)}
            options={[
              { value: '', label: 'All Channels' },
              ...filterValues.tran_sources.filter(s => s).map(s => ({ value: s, label: s }))
            ]}
          />
        </div>
        
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`
            ml-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all
            ${showAdvanced
              ? 'border-accent-blue/40 bg-accent-blue/15 text-accent-blue'
              : 'border-border bg-bg-input text-text-secondary hover:text-text-primary hover:border-border-strong'
            }
          `}
        >
          <span>{showAdvanced ? 'Hide Filters' : 'More Filters'}</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-accent-blue/20 px-1.5 py-0.5 text-[10px] leading-none text-accent-blue">
              {activeCount}
            </span>
          )}
        </button>
      </FilterBar>
      
      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm animate-in fade-in-0 duration-150">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide">Additional Filters</h3>
            <span className="text-[10px] text-text-muted">{activeCount} active</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Product Dimensions */}
            <div>
              <FilterLabel>Product</FilterLabel>
              <Select
                value={filters.product || ''}
                onChange={(value) => updateFilter('product', value)}
                options={[
                  { value: '', label: 'All Products' },
                  ...filterValues.products.filter(p => p).map(p => ({ value: p, label: p }))
                ]}
              />
            </div>
            
            <div>
              <FilterLabel>Service</FilterLabel>
              <Select
                value={filters.service || ''}
                onChange={(value) => updateFilter('service', value)}
                options={[
                  { value: '', label: 'All Services' },
                  ...filterValues.services.filter(s => s).map(s => ({ value: s, label: s }))
                ]}
              />
            </div>
            
            <div>
              <FilterLabel>Merchant</FilterLabel>
              <SearchableSelect
                value={filters.merchant || ''}
                onChange={(value) => updateFilter('merchant', value)}
                options={[
                  { value: '', label: 'All Merchants' },
                  ...filterValues.merchants.filter(m => m).map(m => ({ value: m, label: m }))
                ]}
              />
            </div>
            
            {/* Branch Dimensions */}
            <div>
              <FilterLabel>Cluster</FilterLabel>
              <Select
                value={filters.cluster || ''}
                onChange={(value) => updateFilter('cluster', value)}
                options={[
                  { value: '', label: 'All Clusters' },
                  ...filterValues.clusters.map(c => ({ value: c, label: c }))
                ]}
              />
            </div>
            
            <div>
              <FilterLabel>Part Transaction Type</FilterLabel>
              <Select
                value={filters.partTranType || ''}
                onChange={(value) => updateFilter('partTranType', value)}
                options={[
                  { value: '', label: 'All Part Types' },
                  ...filterValues.part_tran_types.map(pt => ({ value: pt, label: pt }))
                ]}
              />
            </div>
            
            <div>
              <FilterLabel>GL Sub Head</FilterLabel>
              <SearchableSelect
                value={filters.glSubHeadCode || ''}
                onChange={(value) => updateFilter('glSubHeadCode', value)}
                options={[
                  { value: '', label: 'All GL Codes' },
                  ...filterValues.gl_sub_head_codes.filter(gl => gl).map(gl => ({ value: gl, label: gl }))
                ]}
              />
            </div>
            
            {/* User Tracking */}
            <div>
              <FilterLabel>Entry User</FilterLabel>
              <SearchableSelect
                value={filters.entryUser || ''}
                onChange={(value) => updateFilter('entryUser', value)}
                options={[
                  { value: '', label: 'All Entry Users' },
                  ...filterValues.entry_users.filter(u => u).map(u => ({ value: u, label: u }))
                ]}
              />
            </div>
            
            <div>
              <FilterLabel>Verified User</FilterLabel>
              <SearchableSelect
                value={filters.vfdUser || ''}
                onChange={(value) => updateFilter('vfdUser', value)}
                options={[
                  { value: '', label: 'All Verified Users' },
                  ...filterValues.vfd_users.filter(u => u).map(u => ({ value: u, label: u }))
                ]}
              />
            </div>
            
            {/* Amount Range */}
            <div>
              <FilterLabel>Min Amount (NPR)</FilterLabel>
              <input
                type="number"
                value={filters.minAmount || ''}
                onChange={(e) => updateFilter('minAmount', parseNumberInput(e.target.value))}
                className="w-full bg-bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-xs outline-none focus:border-accent-blue"
                placeholder="0"
              />
            </div>
            
            <div>
              <FilterLabel>Max Amount (NPR)</FilterLabel>
              <input
                type="number"
                value={filters.maxAmount || ''}
                onChange={(e) => updateFilter('maxAmount', parseNumberInput(e.target.value))}
                className="w-full bg-bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-xs outline-none focus:border-accent-blue"
                placeholder="No limit"
              />
            </div>
            
            {/* Account/Customer Search */}
            <div>
              <FilterLabel>Account Number</FilterLabel>
              <input
                type="text"
                value={filters.acctNum || ''}
                onChange={(e) => updateFilter('acctNum', e.target.value)}
                className="w-full bg-bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-xs outline-none focus:border-accent-blue"
                placeholder="Search account..."
              />
            </div>
            
            <div>
              <FilterLabel>Customer ID (CIF)</FilterLabel>
              <input
                type="text"
                value={filters.cifId || ''}
                onChange={(e) => updateFilter('cifId', e.target.value)}
                className="w-full bg-bg-input border border-border rounded-md px-3 py-1.5 text-text-primary text-xs outline-none focus:border-accent-blue"
                placeholder="Search CIF..."
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <div className="text-xs text-text-muted">
              {Object.values(filters).filter((value) => value !== undefined && value !== null && value !== '').length} filters applied
            </div>
            <button
              onClick={onClear}
              className="text-xs text-accent-red hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
