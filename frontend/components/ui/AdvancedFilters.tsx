'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  hideStats?: boolean;
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
  return parsed.toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}

function labelForValue(filterKey: MultiFilterKey, value: string): string {
  if (filterKey === 'province') {
    const normalized = value.toLowerCase();
    return PROVINCE_LABELS[normalized] ? `${PROVINCE_LABELS[normalized]} (${value})` : value;
  }
  if (filterKey === 'tranSource') return CHANNEL_LABELS[value] || value;
  return value;
}

// Extract only the "advanced" (non-quick, non-date) fields from a filter object
function advancedFieldsFrom(f: DashboardFilters) {
  return {
    tranType:     f.tranType,
    cluster:      f.cluster,
    solid:        f.solid,
    schemeType:   f.schemeType,
    product:      f.product,
    service:      f.service,
    merchant:     f.merchant,
    glSubHeadCode: f.glSubHeadCode,
    entryUser:    f.entryUser,
    vfdUser:      f.vfdUser,
    minAmount:    f.minAmount,
    maxAmount:    f.maxAmount,
    acctNum:      f.acctNum,
    cifId:        f.cifId,
  };
}

function hasDiff(a: DashboardFilters, b: DashboardFilters): boolean {
  const keys = Object.keys(advancedFieldsFrom(a)) as (keyof DashboardFilters)[];
  return keys.some((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
}

function DataStat({ label, value, hint }: { label: string; value: string; hint: string }) {
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
  hideStats = false,
}: AdvancedFiltersProps) {
  const { data: filterValues, isLoading, error } = useFilterValues();
  const { data: filterStats } = useFilterStatistics();
  const [internalShowAdvanced, setInternalShowAdvanced] = useState(false);
  const showAdvanced = advancedOpen ?? internalShowAdvanced;

  // Draft state — only for the advanced panel fields.
  // Quick-bar fields (province, branchCode, tranSource, partTranType) apply immediately.
  const [draft, setDraft] = useState<DashboardFilters>(() => ({ ...filters }));

  // When external filters change (e.g. period date range reset, or clear), sync draft.
  useEffect(() => {
    setDraft((prev) => ({ ...prev, ...filters }));
  }, [filters]);

  const hasPendingChanges = hasDiff(draft, filters);

  const setShowAdvanced = (nextOpen: boolean) => {
    onAdvancedOpenChange?.(nextOpen);
    if (advancedOpen === undefined) setInternalShowAdvanced(nextOpen);
  };

  // Quick-bar filters: apply immediately
  const setQuickFilter = useCallback((key: MultiFilterKey, values: string[]) => {
    const updated = { ...filters, [key]: values.length > 0 ? values : undefined };
    setDraft(updated);
    onChange(updated);
  }, [filters, onChange]);

  // Draft-only setters (advanced panel)
  const setDraftMulti = useCallback((key: MultiFilterKey, values: string[]) => {
    setDraft((prev) => ({ ...prev, [key]: values.length > 0 ? values : undefined }));
  }, []);

  const setDraftText = useCallback((key: 'acctNum' | 'cifId', value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value.trim() ? value : undefined }));
  }, []);

  const setDraftNumber = useCallback((key: 'minAmount' | 'maxAmount', value: string) => {
    const parsed = value.trim() ? Number(value.trim()) : undefined;
    setDraft((prev) => ({ ...prev, [key]: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined }));
  }, []);

  const handleApply = () => {
    onChange(draft);
  };

  const handleClear = () => {
    setDraft((prev) => ({ startDate: prev.startDate, endDate: prev.endDate } as DashboardFilters));
    onClear();
  };

  const activeFilterCount = useMemo(() => (
    Object.entries(filters).reduce((count, [key, value]) => {
      if (key === 'startDate' || key === 'endDate' || value === undefined || value === null || value === '') return count;
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
          onRemove: () => {
            const next = asArray(filters[key]).filter((v) => v !== selectedValue);
            const updated = { ...filters, [key]: next.length > 0 ? next : undefined };
            setDraft(updated);
            onChange(updated);
          },
        });
      });
    });

    if (typeof filters.minAmount === 'number') {
      pills.push({ id: 'min-amount', label: `Min Amount: ${formatNPR(filters.minAmount)}`, onRemove: () => { const u = { ...filters, minAmount: undefined }; setDraft(u); onChange(u); } });
    }
    if (typeof filters.maxAmount === 'number') {
      pills.push({ id: 'max-amount', label: `Max Amount: ${formatNPR(filters.maxAmount)}`, onRemove: () => { const u = { ...filters, maxAmount: undefined }; setDraft(u); onChange(u); } });
    }
    if (filters.acctNum) {
      pills.push({ id: 'acct-num', label: `Account: ${filters.acctNum}`, onRemove: () => { const u = { ...filters, acctNum: undefined }; setDraft(u); onChange(u); } });
    }
    if (filters.cifId) {
      pills.push({ id: 'cif-id', label: `CIF: ${filters.cifId}`, onRemove: () => { const u = { ...filters, cifId: undefined }; setDraft(u); onChange(u); } });
    }

    return pills;
  }, [filters, onChange]);

  if (error) return <div className="text-accent-red text-xs">{(error as Error)?.message || 'Unable to load filter values'}</div>;
  if (isLoading || !filterValues) return <div className="text-text-secondary text-xs">Loading filters...</div>;

  const provinceOptions = filterValues.provinces.map((p) => ({ value: p, label: labelForValue('province', p) }));
  const branchOptions = filterValues.branches.map((b) => ({ value: b, label: b }));
  const channelOptions = filterValues.tran_sources.filter(Boolean).map((c) => ({ value: c, label: labelForValue('tranSource', c) }));
  const partTypeOptions = filterValues.part_tran_types.map((p) => ({ value: p, label: p }));
  const tranTypeOptions = filterValues.tran_types.map((t) => ({ value: t, label: t }));
  const clusterOptions = filterValues.clusters.map((c) => ({ value: c, label: c }));
  const solidOptions = filterValues.solids.map((s) => ({ value: s, label: `SOL ${s}` }));
  const schemeTypeOptions = filterValues.scheme_types.filter(Boolean).map((s) => ({ value: s, label: s }));
  const productOptions = filterValues.products.filter(Boolean).map((p) => ({ value: p, label: p }));
  const serviceOptions = filterValues.services.filter(Boolean).map((s) => ({ value: s, label: s }));
  const merchantOptions = filterValues.merchants.filter(Boolean).map((m) => ({ value: m, label: m }));
  const glOptions = filterValues.gl_sub_head_codes.filter(Boolean).map((g) => ({ value: g, label: g }));
  const entryUserOptions = filterValues.entry_users.filter(Boolean).map((u) => ({ value: u, label: u }));
  const vfdUserOptions = filterValues.vfd_users.filter(Boolean).map((u) => ({ value: u, label: u }));

  return (
    <div className="space-y-3">
      {/* Quick FilterBar — always first, applies immediately */}
      <FilterBar onClear={handleClear}>
        <FilterLabel>Province</FilterLabel>
        <div className="min-w-[220px] flex-1 sm:flex-none">
          <SearchableMultiSelect
            value={asArray(filters.province)}
            onChange={(v) => setQuickFilter('province', v)}
            options={provinceOptions}
            placeholder="All provinces"
          />
        </div>

        <FilterDivider />

        <FilterLabel>Branch</FilterLabel>
        <div className="min-w-[240px] flex-1 sm:flex-none">
          <SearchableMultiSelect
            value={asArray(filters.branchCode)}
            onChange={(v) => setQuickFilter('branchCode', v)}
            options={branchOptions}
            placeholder="All branches"
          />
        </div>

        <FilterDivider />

        <FilterLabel>Channel</FilterLabel>
        <div className="min-w-[190px] flex-1 sm:flex-none">
          <SearchableMultiSelect
            value={asArray(filters.tranSource)}
            onChange={(v) => setQuickFilter('tranSource', v)}
            options={channelOptions}
            placeholder="All channels"
          />
        </div>

        <FilterDivider />

        <FilterLabel>Part Type</FilterLabel>
        <div className="min-w-[160px] flex-1 sm:flex-none">
          <SearchableMultiSelect
            value={asArray(filters.partTranType)}
            onChange={(v) => setQuickFilter('partTranType', v)}
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

      {/* Active filter pills */}
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

      {/* Data stats — shown below filter bar, hidden on detail pages */}
      {!hideStats && (
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
      )}

      {/* Advanced panel — draft mode, requires Apply */}
      {showAdvanced && (
        <div className="space-y-4 rounded-xl border border-border bg-bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-primary">Advanced Filters</h3>
              <p className="mt-1 text-[11px] text-text-secondary">
                Stage your selections below, then click <strong className="text-text-primary">Apply Filters</strong> to load results.
              </p>
            </div>
            {hasPendingChanges && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-1 text-[10.5px] font-medium text-accent-amber">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
                Unapplied changes
              </span>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <FilterLabel>Transaction Type</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.tranType)} onChange={(v) => setDraftMulti('tranType', v)} options={tranTypeOptions} placeholder="All transaction types" />
            </div>
            <div>
              <FilterLabel>Cluster</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.cluster)} onChange={(v) => setDraftMulti('cluster', v)} options={clusterOptions} placeholder="All clusters" />
            </div>
            <div>
              <FilterLabel>Scheme Type</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.schemeType)} onChange={(v) => setDraftMulti('schemeType', v)} options={schemeTypeOptions} placeholder="All account schemes" />
            </div>
            <div>
              <FilterLabel>Product</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.product)} onChange={(v) => setDraftMulti('product', v)} options={productOptions} placeholder="All products" />
            </div>
            <div>
              <FilterLabel>Service</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.service)} onChange={(v) => setDraftMulti('service', v)} options={serviceOptions} placeholder="All services" />
            </div>
            <div>
              <FilterLabel>Merchant</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.merchant)} onChange={(v) => setDraftMulti('merchant', v)} options={merchantOptions} placeholder="All merchants" />
            </div>
            <div>
              <FilterLabel>GL Sub Head</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.glSubHeadCode)} onChange={(v) => setDraftMulti('glSubHeadCode', v)} options={glOptions} placeholder="All GL codes" />
            </div>
            <div>
              <FilterLabel>Entry User</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.entryUser)} onChange={(v) => setDraftMulti('entryUser', v)} options={entryUserOptions} placeholder="All entry users" />
            </div>
            <div>
              <FilterLabel>Verified User</FilterLabel>
              <SearchableMultiSelect value={asArray(draft.vfdUser)} onChange={(v) => setDraftMulti('vfdUser', v)} options={vfdUserOptions} placeholder="All verified users" />
            </div>
            <div>
              <FilterLabel>Min Amount (NPR)</FilterLabel>
              <input
                type="number"
                value={draft.minAmount ?? ''}
                onChange={(e) => setDraftNumber('minAmount', e.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                placeholder="0"
              />
            </div>
            <div>
              <FilterLabel>Max Amount (NPR)</FilterLabel>
              <input
                type="number"
                value={draft.maxAmount ?? ''}
                onChange={(e) => setDraftNumber('maxAmount', e.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                placeholder="No limit"
              />
            </div>
            <div>
              <FilterLabel>Account Number</FilterLabel>
              <input
                type="text"
                value={draft.acctNum ?? ''}
                onChange={(e) => setDraftText('acctNum', e.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                placeholder="Full or partial account number"
              />
            </div>
            <div>
              <FilterLabel>Customer ID (CIF)</FilterLabel>
              <input
                type="text"
                value={draft.cifId ?? ''}
                onChange={(e) => setDraftText('cifId', e.target.value)}
                className="w-full rounded-md border border-border bg-bg-input px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-blue"
                placeholder="Full or partial CIF"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-medium text-accent-red hover:underline"
            >
              Clear all filters
            </button>
            <div className="flex items-center gap-2">
              {hasPendingChanges && (
                <button
                  type="button"
                  onClick={() => setDraft({ ...filters })}
                  className="rounded-lg border border-border bg-bg-input px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Discard
                </button>
              )}
              <button
                type="button"
                onClick={handleApply}
                disabled={!hasPendingChanges}
                className={`rounded-lg px-4 py-1.5 text-[11px] font-semibold transition-all ${
                  hasPendingChanges
                    ? 'bg-accent-blue text-white shadow-sm shadow-accent-blue/30 hover:bg-accent-blue/90'
                    : 'bg-bg-input text-text-muted border border-border cursor-not-allowed opacity-50'
                }`}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
