// Pure helpers for the Pivot sidebar expanded-section state.
// No React / Next deps — unit-tested in __tests__/pivot-sidebar-collapse.test.ts.

export type SidebarSectionId = 'dimensions' | 'measures' | 'comparisons';

export const SIDEBAR_SECTION_IDS: readonly SidebarSectionId[] = [
  'dimensions',
  'measures',
  'comparisons',
] as const;

export const STORAGE_KEY = 'pivot-sidebar-expanded';

// Default set of expanded sections on first visit (no storage entry yet).
// Only Dimensions opens automatically — Measures and Period Comparisons stay
// collapsed until the user explicitly opens them.
const DEFAULT_EXPANDED: readonly SidebarSectionId[] = ['dimensions'];

// Read the expanded-section set from localStorage. Returns a fresh copy of
// DEFAULT_EXPANDED when storage is unavailable, the key is missing, or the
// contents are not a valid JSON array of known section ids. An explicitly
// stored empty array means "user has collapsed everything" and is honored.
export function loadExpandedSections(): Set<SidebarSectionId> {
  const fallback = () => new Set<SidebarSectionId>(DEFAULT_EXPANDED);
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return fallback();
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return fallback();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback();
  }
  if (!Array.isArray(parsed)) return fallback();
  const known = new Set<string>(SIDEBAR_SECTION_IDS);
  const out = new Set<SidebarSectionId>();
  for (const v of parsed) {
    if (typeof v === 'string' && known.has(v)) {
      out.add(v as SidebarSectionId);
    }
  }
  return out;
}

// Persist the expanded-section set. No-op if localStorage is unavailable
// (SSR, private mode, quota errors) — failure to persist must not crash UI.
export function saveExpandedSections(set: Set<SidebarSectionId>): void {
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
