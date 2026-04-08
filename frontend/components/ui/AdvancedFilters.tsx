'use client';

import { useCallback, useMemo, useState } from 'react';
import { FilterBar, FilterDivider, FilterLabel } from './FilterBar';
import { SearchableMultiSelect } from './Select';
import { useFilterStatistics, useFilterValues } from '@/lib/hooks/useDashboardData';
import { formatNPR, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters, MultiValueFilter } from '@/types';

interface AdvancedFiltersProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  onClear: () => void;
  advancedOpen?: boolean;
  onAdvancedOpenChange?: (open: boolean) => void;
}

type MultiFilterKey =
  | 'province'
  | 'branchCode'
  | 'district'
  | 'municipality'
  | 'cluster'
  | 'solid'
  | 'schemeType'
  | 'tranType'
  | 'partTranType'
  | 'tranSource'
  | 'product'
  | 'service'
  | 'merchant'
  | 'glSubHeadCode'
  | 'entryUser'
  | 'vfdUser';

const PROVINCE_LABELS: Record<string, string> = {
  'province 1': 'Koshi',
  'province 2': 'Madhesh',
  'province 3': 'Bagmati',
  'province 4': 'Gandaki',
  'province 5': 'Lumbini',
  'province 6': 'Karnali',
  'province 7': 'Sudurpashchim',
};

const CHANNEL_LABELS: Record<string, string> = {
  mobile: 'Mobile Banking',
  internet: 'Internet Banking',
};

function asArray(value?: MultiValueFilter): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function formatCoverageDate(value?: string | null): string {
  const parsed = parseISODateToLocal(value);
  if (!parsed) return 'Unavailable';

  return parsed.toLocaleDateString('en-NP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function labelForValue(filterKey: MultiFilterKey, value: string): string {
  if (filterKey === 'province') {
    const normalized = value.toLowerCase();
    return PROVINCE_LABELS[normalized] ? `${PROVINCE_LABELS[normalized]} (${value})` : value;
  }

  if (filterKey === 'tranSource') {
    return CHANNEL_LABELS[value] || value;
  }

  return value;
}

function DataStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-text-primary">{value}</div>
      <div className="mt-1 text-[11px] text-text-secondary">{hint}</div>
    </div>
  );
}

export function AdvancedFilters({
  filters,
  onChange,
  onClear,
  advancedOpen,
  onAdvancedOpenChange,
}: AdvancedFiltersProps) {
  const { data: filterValues, isLoading, error } = useFilterValues();
  const { data: filterStats } = useFilterStatistics();
  const [internalShowAdvanced, setInternalShowAdvanced] = useState(false);
  const showAdvanced = advancedOpen ?? internalShowAdvanced;

  const setShowAdvanced = (nextOpen: boolean) => {
    onAdvancedOpenChange?.(nextOpen);
    if (advancedOpen === undefined) {
      setInternalShowAdvanced(nextOpen);
    }
  };

  const setMultiFilter = useCallback((key: MultiFilterKey, values: string[]) => {
    onChange({
      ...filters,
      [key]: values.length > 0 ? values : undefined,
    });
  }, [filters, onChange]);

  const setTextFilter = useCallback((key: 'acctNum' | 'cifId', value: string) => {
    onChange({
      ...filters,
      [key]: value.trim() ? value : undefined,
    });
  }, [filters, onChange]);

  const setNumberFilter = useCallback((key: 'minAmount' | 'maxAmount', value: string) => {
    const trimmed = value.trim();
    const parsed = trimmed ? Number(trimmed) : undefined;

    onChange({
      ...filters,
      [key]: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
    });
  }, [filters, onChange]);

  const activeFilterCount = useMemo(() => (
    Object.entries(filters).reduce((count, [key, value]) => {
      if (key === 'startDate' || key === 'endDate' || value === undefined || value === null || value === '') {
        return count;
      }

      if (Array.isArray(value)) return count + value.length;
      return count + 1;
    }, 0)
  ), [filters]);

  const activeFilterPills = useMemo(() => {
    const pills: Array<{ id: string; label: string; onRemove: () => void }> = [];

    const multiFilterDefs: Array<{ key: MultiFilterKey; label: string }> = [
      { key: 'province', label: 'Province' },
      { key: 'branchCode', label: 'Branch' },
      { key: 'tranSource', label: 'Channel' },
      { key: 'partTranType', label: 'Part Type' },
      { key: 'cluster', label: 'Cluster' },
      { key: 'solid', label: 'SOL ID' },
      { key: 'schemeType', label: 'Scheme Type' },
      { key: 'tranType', label: 'Transaction Type' },
      { key: 'product', label: 'Product' },
      { key: 'service', label: 'Service' },
      { key: 'merchant', label: 'Merchant' },
      { key: 'glSubHeadCode', label: 'GL Code' },
      { key: 'entryUser', label: 'Entry User' },
      { key: 'vfdUser', label: 'Verified User' },
    ];

    multiFilterDefs.forEach(({ key, label }) => {
      asArray(filters[key]).forEach((selectedValue) => {
        pills.push({
          id: `${key}-${selectedValue}`,
          label: `${label}: ${labelForValue(key, selectedValue)}`,
          onRemove: () => setMultiFilter(key, asArray(filters[key]).filter((value) => value !== selectedValue)),
        });
      });
    });

    if (typeof filters.minAmount === 'number') {
      pills.push({
        id: 'min-amount',
        label: `Min Amount: ${formatNPR(filters.minAmount)}`,
        onRemove: () => onChange({ ...filters, minAmount: undefined }),
      });
    }

    if (typeof filters.maxAmount === 'number') {
      pills.push({
        id: 'max-amount',
        label: `Max Amount: ${formatNPR(filters.maxAmount)}`,
        onRemove: () => onChange({ ...filters, maxAmount: undefined }),
      });
    }

    if (filters.acctNum) {
      pills.push({
        id: 'acct-num',
        label: `Account: ${filters.acctNum}`,
        onRemove: () => onChange({ ...filters, acctNum: undefined }),
      });
    }

    if (filters.cifId) {
      pills.push({
        id: 'cif-id',
        label: `CIF: ${filters.cifId}`,
        onRemove: () => onChange({ ...filters, cifId: undefined }),
      });
    }

    return pills;
  }, [filters, onChange, setMultiFilter]);

  if (error) {
    return <div className="text-accent-red text-xs">{(error as Error)?.message || 'Unable to load filter values'}</div>;
  }

  if (isLoading || !filterValues) {
    return <div className="text-text-secondary text-xs">Loading filters...</div>;
  }

  const provinceOptions = filterValues.provinces.map((province) => ({
    value: province,
    label: labelForValue('province', province),
  }));
  const branchOptions = filterValues.branches.map((branch) => ({ value: branch, label: branch }));
  const channelOptions = filterValues.tran_sources
    .filter(Boolean)
    .map((channel) => ({ value: channel, label: labelForValue('tranSource', channel) }));
  const partTypeOptions = filterValues.part_tran_types.map((partType) => ({ value: partType, label: partType }));
  const tranTypeOptions = filterValues.tran_types.map((tranType) => ({ value: tranType, label: tranType }));
  const clusterOptions = filterValues.clusters.map((cluster) => ({ value: cluster, label: cluster }));
  const solidOptions = filterValues.solids.map((solid) => ({ value: solid, label: `SOL ${solid}` }));
  const schemeTypeOptions = filterValues.scheme_types.filter(Boolean).map((schemeType) => ({ value: schemeType, label: schemeType }));
  const productOptions = filterValues.products.filter(Boolean).map((product) => ({ value: product, label: product }));
  const serviceOptions = filterValues.services.filter(Boolean).map((service) => ({ value: service, label: service }));
  const merchantOptions = filterValues.merchants.filter(Boolean).map((merchant) => ({ value: merchant, label: merchant }));
  const glOptions = filterValues.gl_sub_head_codes.filter(Boolean).map((glCode) => ({ value: glCode, label: glCode }));
  const entryUserOptions = filterValues.entry_users.filter(Boolean).map((entryUser) => ({ value: entryUser, label: entryUser }));
  const vfdUserOptions = filterValues.vfd_users.filter(Boolean).map((vfdUser) => ({ value: vfdUser, label: vfdUser }));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <DataStat
          label="Data Range"
          value={`${formatCoverageDate(filterStats?.date_range?.min)} to ${formatCoverageDate(filterStats?.date_range?.max)}`}
          hint="Report dates are bounded by imported transaction history."
        />
        <DataStat
          label="Coverage"
          value={`${(filterStats?.counts.total_transactions ?? 0).toLocaleString()} records`}
          hint={`${(filterStats?.counts.unique_customers ?? 0).toLocaleString()} customers · ${(filterStats?.counts.unique_accounts ?? 0).toLocaleString()} accounts`}
        />
        <DataStat
          label="Dimensions"
          value={`${filterValues.branches.length} branches · ${filterValues.provinces.length} provinces`}
          hint={`${solidOptions.length} SOL IDs · ${schemeTypeOptions.length} schemes · ${glOptions.length} GL codes`}
        />
      </div>

      <FilterBar onClear={onClear}>
        <FilterLabel>Province</FilterLabel>
        <div className="min-w-[220px] flex-1 sm:flex-none">
          <SearchableMultiSelect
            value={asArray(filters.province)}
            onChange={(value) => setMultiFilter('province', value)}
            options={provinceOptions}
            placeholder="All provinces"
          />
        </div>

        <FilterDivider />

        <FilterLabel>Branch</FilterLabel>
        <div className="min-w-[240px] flex-1 sm:flex-none">
          <SearchableMultiSelect
            value={asArray(filters.branchCode)}
            onChange={(value) => setMultiFilter('branchCode', value)}
            options={branchOptions}
            placeholder="All branches"
          />
        </div>

        <FilterDivider />

        <FilterLabel>Channel</FilterLabel>
        <div className="min-w-[190px] flex-1 sm:flex-none">
          <SearchableMultiSelect
            value={asArray(filters.tranSource)}
            onChange={(value) => setMultiFilter('tranSource', value)}
            options={channelOptions}
            placeholder="All channels"
          />
        </div>

        <FilterDivider />

        <FilterLabel>Part Type</FilterLabel>
        <div className="min-w-[160px] flex-1 sm:flex-none">
          <SearchableMultiSelect
            value={asArray(filters.partTranType)}
            onChange={(value) => setMultiFilter('partTranType', value)}
            options={partTypeOptions}
            placeholder="CR / DR"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`
            ml-auto inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all
            ${showAdvanced
              ? 'border-accent-blue/40 bg-accent-blue/15 text-accent-blue'
              : 'border-border bg-bg-input text-text-secondary hover:border-border-strong hover:text-text-primary'}
          `}
        >
          <span>{showAdvanced ? 'Hide advanced' : 'More filters'}</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-accent-blue/20 px-1.5 py-0.5 text-[10px] leading-none text-accent-blue">
              {activeFilterCount}
            </span>
          )}
        </button>
      </FilterBar>

      {activeFilterPills.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-bg-card px-3 py-2.5">
          {activeFilterPills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={pill.onRemove}
              className="inline-flex items-center gap-2 rounded-full border border-accent-blue/25 bg-accent-blue/10 px-2.5 py-1 text-[11px] text-text-primary transition-colors hover:border-accent-red/30 hover:bg-accent-red/10"
            >
              <span>{pill.label}</span>
              <span className="text-text-muted">×</span>
            </button>
          ))}
        </div>
      )}

      {showAdvanced && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-primary">Advanced Filters</h3>
              <p className="mt-1 text-[11px] text-text-secondary">
                Refine by operational dimensions, user activity, and exact account identifiers.
              </p>
            </div>
            <div className="text-[11px] text-text-muted">{activeFilterCount} active selections</div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <FilterLabel>Transaction Type</FilterLabel>
              <SearchableMultiSelect
                value={asArray(filters.tranType)}
                onChange={(value) => setMultiFilter('tranType', value)}
                options={tranTypeOptions}
                placeholder="All transaction types"
              />
            </div>

            <div>
              <FilterLabel>Cluster</FilterLabel>
              <SearchableMultiSelect
                value={asArray(filters.cluster)}
                onChange={(value) => setMultiFilter('cluster', value)}
                options={clusterOptions}
                placeholder="All clusters"
              />
            </div>

            <div>
              <FilterLabel>SOL ID</FilterLabel>
              <SearchableMultiSelect
                value={asArray(filters.solid)}
                onChange={(value) => setMultiFilter('solid', value)}
                options={solidOptions}
                placeholder="All branch SOL IDs"
              />
            </div>

            <div>
              <FilterLabel>Scheme Type</FilterLabel>
              <SearchableMultiSelect
                value={asArray(filters.schemeType)}
                onChange={(value) => setMultiFilter('schemeType', value)}
                options={schemeTypeOptions}
                placeholder="All account schemes"
              />
            </div>

            <div>
              <FilterLabel>Product</FilterLabel>
              <SearchableMultiSelect
                value={asArray(filters.product)}
                onChange={(value) => setMultiFilter('product', value)}
                options={productOptions}
                placeholder="All products"
              />
            </div>

            <div>
              <FilterLabel>Service</FilterLabel>
              <SearchableMultiSelect
                value={asArray(filters.service)}
                onChange={(value) => setMultiFilter('service', value)}
                options={serviceOptions}
                placeholder="All services"
              />
            </div>

            <div>
              <FilterLabel>Merchant</FilterLabel>
              <SearchableMultiSelect
                value={asArray(filters.merchant)}
                onChange={(value) => setMultiFilter('merchant', value)}
                options={merchantOptions}
                placeholder="All merchants"
              />
            </div>

            <div>
              <FilterLabel>GL Sub Head</FilterLabel>
              <SearchableMultiSelect
                value={asArray(filters.glSubHeadCode)}
                onChange={(value) => setMultiFilter('glSubHeadCode', value)}
                options={glOptions}
                placeholder="All GL codes"
              />
            </div>

            <div>
              <FilterLabel>Entry User</FilterLabel>
              <SearchableMultiSelect
                value={asArray(filters.entryUser)}
                onChange={(value) => setMultiFilter('entryUser', value)}
                options={entryUserOptions}
                placeholder="All entry users"
              />
            </div>

            <div>
              <FilterLabel>Verified User</FilterLabel>
              <SearchableMultiSelect
                value={asArray(filters.vfdUser)}
                onChange={(value) => setMultiFilter('vfdUser', value)}
                options={vfdUserOptions}
                placeholder="All verified users"
              />
            </div>

            <div>
              <FilterLabel>Min Amount (NPR)</FilterLabel>
              <input
                type="number"
                value={filters.minAmount ?? ''}
                onChange={(event) => setNumberFilter('minAmount', event.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                placeholder="0"
              />
            </div>

            <div>
              <FilterLabel>Max Amount (NPR)</FilterLabel>
              <input
                type="number"
                value={filters.maxAmount ?? ''}
                onChange={(event) => setNumberFilter('maxAmount', event.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                placeholder="No limit"
              />
            </div>

            <div>
              <FilterLabel>Account Number</FilterLabel>
              <input
                type="text"
                value={filters.acctNum ?? ''}
                onChange={(event) => setTextFilter('acctNum', event.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                placeholder="Full or partial account number"
              />
            </div>

            <div>
              <FilterLabel>Customer ID (CIF)</FilterLabel>
              <input
                type="text"
                value={filters.cifId ?? ''}
                onChange={(event) => setTextFilter('cifId', event.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                placeholder="Full or partial CIF"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="text-xs text-text-muted">
              Filters apply across executive, branch, customer, financial, digital, KPI, employer, and risk dashboards.
            </div>
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-accent-red hover:underline"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
