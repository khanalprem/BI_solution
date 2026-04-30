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
  return new Set();
}

// Persist the explicit-collapse list. No-op if localStorage is unavailable
// (SSR, private mode quota errors, etc.) — failure to persist must not crash
// the UI.
export function saveCollapsedSections(_set: Set<SidebarSectionId>): void {
  // intentionally empty until Task 3
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
export function defaultExpanded(_id: SidebarSectionId, _hasSelection: boolean): boolean {
  // stub: real logic lands in Task 3
  return true;
}
