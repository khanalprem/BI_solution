// Pure helpers for the Pivot sidebar collapse state.
// No React / Next deps — unit-tested in __tests__/pivot-sidebar-collapse.test.ts.

export type SidebarSectionId = 'dimensions' | 'measures' | 'comparisons';

export const SIDEBAR_SECTION_IDS: readonly SidebarSectionId[] = [
  'dimensions',
  'measures',
  'comparisons',
] as const;

export const STORAGE_KEY = 'pivot-sidebar-collapsed';

// Read the explicit-collapse list from localStorage. Returns an empty set
// when storage is unavailable, the key is missing, or the contents are not
// a valid JSON array of known section ids.
export function loadCollapsedSections(): Set<SidebarSectionId> {
  const empty = new Set<SidebarSectionId>();
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return empty;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return empty;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }
  if (!Array.isArray(parsed)) return empty;
  const known = new Set<string>(SIDEBAR_SECTION_IDS);
  const out = new Set<SidebarSectionId>();
  for (const v of parsed) {
    if (typeof v === 'string' && known.has(v)) {
      out.add(v as SidebarSectionId);
    }
  }
  return out;
}

// Persist the explicit-collapse list. No-op if localStorage is unavailable
// (SSR, private mode quota errors, etc.) — failure to persist must not crash
// the UI.
export function saveCollapsedSections(set: Set<SidebarSectionId>): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }
  const arr = SIDEBAR_SECTION_IDS.filter((id) => set.has(id));
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Quota / private-mode errors are non-fatal — silently drop.
  }
}

// True when the user has ever toggled a section (the storage key exists,
// even if the saved set is empty). Used by the consumer to decide whether
// to apply the smart default for first-time visitors or honor the saved
// state.
export function hasStoredCollapseState(): boolean {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return false;
  }
  return window.localStorage.getItem(STORAGE_KEY) !== null;
}

// Smart default for first-time visitors (no storage entry yet). Returns the
// initial expanded state given the section id and whether the section
// currently has any selected items. Rules:
//   • dimensions  → always expanded (entry-point default)
//   • measures    → expanded iff hasSelection
//   • comparisons → expanded iff hasSelection
export function defaultExpanded(id: SidebarSectionId, hasSelection: boolean): boolean {
  if (id === 'dimensions') return true;
  return hasSelection;
}
