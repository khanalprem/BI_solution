// Single source of truth for the LookupOption → SelectOption adapter.
// The backend's `static_lookup` (FiltersController#values + most filter dropdowns)
// returns rows shaped `{ name, value }`, but every Select-family component in
// `components/ui/Select.tsx` consumes `{ value, label }`. Without this helper
// the inline `arr.map(o => ({ value: o.value, label: o.name }))` was duplicated
// across pivot/page.tsx, deposits/page.tsx, segmentation/page.tsx, and
// AdvancedFilters.tsx. See CLAUDE.md "Filter dropdowns…" entry under Known Issues.

import type { LookupOption } from '@/types';

export interface SelectOption {
  value: string;
  label: string;
}

export function lookupOptions(arr: LookupOption[] | undefined | null): SelectOption[] {
  if (!arr) return [];
  return arr.map(({ name, value }) => ({ value, label: name }));
}

// Reverse lookup — given a stored `value`, return the human `name` if known,
// else fall back to the value itself. Used by AdvancedFilters and segmentation
// for chip / breadcrumb labels.
export function valueToName(arr: LookupOption[] | undefined | null, value: string): string {
  return arr?.find((o) => o.value === value)?.name ?? value;
}
