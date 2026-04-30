# Pivot Sidebar — Collapsible Top-Level Sections — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Pivot Analysis sidebar fit a normal viewport by adding a collapse/expand control to each of three top-level sections (Dimensions, Measures, Period Comparisons), with smart-default expand state and per-section persistence in localStorage.

**Architecture:** A small pure helper (`sidebarCollapseState.ts`) handles localStorage I/O and smart-default logic — fully unit-tested. A new module-scope `SidebarSection` component in `PivotClient.tsx` wraps each section's existing JSX with a clickable header, chevron, count badge, and collapsed-state summary line. The existing `Measures` `<section>` is split into two siblings so Standard Aggregations and Period Comparisons can collapse independently. No changes to the data table, filters, or any inner section behavior.

**Tech Stack:** Next.js 15, React, TypeScript, Vitest, Tailwind. Existing tokens: `text-text-primary`, `bg-bg-card`, `border-border`, `hover:bg-row-hover`, `cn()`. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-04-30-pivot-sidebar-collapsible-sections-design.md](../specs/2026-04-30-pivot-sidebar-collapsible-sections-design.md)

---

## Task 1: Pure helper — types + skeleton

**Files:**
- Create: `frontend/app/dashboard/pivot/sidebarCollapseState.ts`

- [ ] **Step 1: Create the file with type defs and stub functions**

```ts
// Pure helpers for the Pivot sidebar collapse state.
// No React / Next deps — unit-tested in __tests__/pivot-sidebar-collapse.test.ts.

export type SidebarSectionId = 'dimensions' | 'measures' | 'comparisons';

export const SIDEBAR_SECTION_IDS: readonly SidebarSectionId[] = [
  'dimensions',
  'measures',
  'comparisons',
] as const;

const STORAGE_KEY = 'pivot-sidebar-collapsed';

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
  return true;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: exit 0, no new errors.

- [ ] **Step 3: Commit**

Run:
```bash
git add frontend/app/dashboard/pivot/sidebarCollapseState.ts
git commit -m "feat(pivot-sidebar): scaffold collapsible-sections helper"
```

---

## Task 2: Failing tests for the helper

**Files:**
- Create: `frontend/__tests__/pivot-sidebar-collapse.test.ts`

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadCollapsedSections,
  saveCollapsedSections,
  hasStoredCollapseState,
  defaultExpanded,
  type SidebarSectionId,
} from '@/app/dashboard/pivot/sidebarCollapseState';

const STORAGE_KEY = 'pivot-sidebar-collapsed';

describe('loadCollapsedSections', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty set when key is missing', () => {
    expect([...loadCollapsedSections()]).toEqual([]);
  });

  it('returns empty set when value is not valid JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    expect([...loadCollapsedSections()]).toEqual([]);
  });

  it('returns empty set when value is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ measures: true }));
    expect([...loadCollapsedSections()]).toEqual([]);
  });

  it('parses a valid array of known section ids', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['measures', 'comparisons']));
    const result = loadCollapsedSections();
    expect(result.has('measures')).toBe(true);
    expect(result.has('comparisons')).toBe(true);
    expect(result.has('dimensions')).toBe(false);
  });

  it('drops unknown ids defensively', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['measures', 'bogus', 42]));
    const result = loadCollapsedSections();
    expect([...result]).toEqual(['measures']);
  });
});

describe('saveCollapsedSections', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes the set as a JSON array of ids', () => {
    saveCollapsedSections(new Set<SidebarSectionId>(['measures']));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(['measures']));
  });

  it('round-trips through loadCollapsedSections', () => {
    const before = new Set<SidebarSectionId>(['dimensions', 'comparisons']);
    saveCollapsedSections(before);
    const after = loadCollapsedSections();
    expect(after.has('dimensions')).toBe(true);
    expect(after.has('comparisons')).toBe(true);
    expect(after.has('measures')).toBe(false);
  });

  it('writes an empty array when the set is empty', () => {
    saveCollapsedSections(new Set());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });
});

describe('hasStoredCollapseState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when the key has never been written', () => {
    expect(hasStoredCollapseState()).toBe(false);
  });

  it('returns true after saveCollapsedSections is called, even with empty set', () => {
    saveCollapsedSections(new Set());
    expect(hasStoredCollapseState()).toBe(true);
  });

  it('returns true when the key exists even if the value is malformed', () => {
    localStorage.setItem(STORAGE_KEY, 'garbage');
    expect(hasStoredCollapseState()).toBe(true);
  });
});

describe('defaultExpanded', () => {
  it('returns true for dimensions regardless of selection', () => {
    expect(defaultExpanded('dimensions', false)).toBe(true);
    expect(defaultExpanded('dimensions', true)).toBe(true);
  });

  it('returns hasSelection for measures', () => {
    expect(defaultExpanded('measures', false)).toBe(false);
    expect(defaultExpanded('measures', true)).toBe(true);
  });

  it('returns hasSelection for comparisons', () => {
    expect(defaultExpanded('comparisons', false)).toBe(false);
    expect(defaultExpanded('comparisons', true)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- --run pivot-sidebar-collapse 2>&1 | tail -30`

Expected: `loadCollapsedSections > parses a valid array of known section ids` fails (current stub returns empty set even when storage has data); `saveCollapsedSections > writes...` fails (stub is no-op); `defaultExpanded > returns hasSelection for measures` fails for the `false` case (stub returns `true`).

These three failures are the proof that the tests exercise real behavior. Other tests may pass against the stub coincidentally.

---

## Task 3: Implement the helper to make tests pass

**Files:**
- Modify: `frontend/app/dashboard/pivot/sidebarCollapseState.ts` (replace stub bodies)

- [ ] **Step 1: Replace `loadCollapsedSections`**

Replace the body of `loadCollapsedSections`:

```ts
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
```

- [ ] **Step 2: Replace `saveCollapsedSections`**

Replace the body of `saveCollapsedSections`:

```ts
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
```

The `filter`-then-stringify pattern guarantees a stable key order regardless of insertion order, which keeps the test assertions deterministic and makes hand-edited values easier to read.

- [ ] **Step 3: Replace `defaultExpanded`**

Replace the body of `defaultExpanded`:

```ts
export function defaultExpanded(id: SidebarSectionId, hasSelection: boolean): boolean {
  if (id === 'dimensions') return true;
  return hasSelection;
}
```

- [ ] **Step 4: Run the tests, expect green**

Run: `cd frontend && npm test -- --run pivot-sidebar-collapse 2>&1 | tail -15`

Expected: `Tests 14 passed (14)` for the file (5 load + 3 save + 3 hasStored + 3 defaultExpanded).

- [ ] **Step 5: Run the full suite + tsc**

Run: `cd frontend && npm test -- --run 2>&1 | tail -10 && npx tsc --noEmit && echo "TSC OK"`

Expected: all test files pass; `TSC OK`.

- [ ] **Step 6: Commit**

Run:
```bash
git add frontend/app/dashboard/pivot/sidebarCollapseState.ts frontend/__tests__/pivot-sidebar-collapse.test.ts
git commit -m "feat(pivot-sidebar): implement collapse-state helper with tests"
```

---

## Task 4: Add `SidebarSection` component to PivotClient

**Files:**
- Modify: `frontend/app/dashboard/pivot/PivotClient.tsx` — add import + new module-scope component

- [ ] **Step 1: Add the import next to the existing pivot-layout import**

Find this line (currently around line 22):

```ts
import { dateDimCount, shouldCollapseDisplayDims } from './pivotLayout';
```

Add immediately after it:

```ts
import {
  loadCollapsedSections,
  saveCollapsedSections,
  defaultExpanded,
  type SidebarSectionId,
} from './sidebarCollapseState';
```

- [ ] **Step 2: Add the `SidebarSection` component above the `function PivotTable` definition**

Find `function PivotTable(` (currently around line 897). Immediately above it, paste:

```tsx
// Top-level collapsible sidebar section. Module-scope so React doesn't see a
// new component type on each parent render.
function SidebarSection({
  id,
  title,
  description,
  selectedCount,
  summary,
  expanded,
  onToggle,
  headerExtra,
  children,
}: {
  id: SidebarSectionId;
  title: string;
  description?: string;
  selectedCount: number;
  summary?: string;
  expanded: boolean;
  onToggle: () => void;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const sectionId = `pivot-sidebar-${id}`;
  return (
    <section className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <header className="border-b border-border">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={sectionId}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            <svg
              viewBox="0 0 16 16"
              className={`w-3 h-3 flex-shrink-0 text-text-muted transition-transform duration-150 ${
                expanded ? 'rotate-90' : ''
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="5,3 10,8 5,13" />
            </svg>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-primary">
                  {title}
                </p>
                {selectedCount > 0 && (
                  <span className="text-[9px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded border border-accent-blue/30 bg-accent-blue/10 text-accent-blue">
                    {selectedCount} selected
                  </span>
                )}
              </div>
              {expanded && description && (
                <p className="text-[10.5px] text-text-secondary mt-0.5">{description}</p>
              )}
              {!expanded && summary && (
                <p className="text-[10.5px] text-text-secondary mt-0.5 truncate">{summary}</p>
              )}
            </div>
          </button>
          {headerExtra}
        </div>
      </header>
      {expanded && <div id={sectionId}>{children}</div>}
    </section>
  );
}
```

Notes for the engineer:
- `headerExtra` is a slot for content that must stay clickable in the header (the existing "Clear filters (N)" button on the Dimensions header).
- `aria-expanded` / `aria-controls` keep keyboard + screen-reader behavior reasonable.
- The chevron is the same shape used elsewhere in the app (`449f241` style) — rotates 0° / 90°.

- [ ] **Step 3: Verify tsc compiles (no usage yet, just the new component)**

Run: `cd frontend && npx tsc --noEmit && echo "TSC OK"`
Expected: `TSC OK`.

- [ ] **Step 4: Commit**

Run:
```bash
git add frontend/app/dashboard/pivot/PivotClient.tsx
git commit -m "feat(pivot-sidebar): add SidebarSection component (unused)"
```

---

## Task 5: Wire collapse state into the PivotClient component

**Files:**
- Modify: `frontend/app/dashboard/pivot/PivotClient.tsx`

- [ ] **Step 1: Add the collapse state at the top of the inner state block**

Find the existing `useState` block at the top of the main component. Search for `const [pageSize, setPageSize]` to anchor (currently around line 1416). Immediately after that line, add:

```ts
  const [collapsedSections, setCollapsedSections] = useState<Set<SidebarSectionId>>(
    () => (typeof window === 'undefined' ? new Set() : loadCollapsedSections()),
  );

  const toggleSection = useCallback((id: SidebarSectionId) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveCollapsedSections(next);
      return next;
    });
  }, []);
```

- [ ] **Step 2: Compute per-section selection counts**

Find the existing `useMemo` block that computes `displayAsMeasureDims` (search for `const displayAsMeasureDims = useMemo`, currently around line 1487). Immediately above it, add:

```ts
  // Per-section "selected" counts, drives the count-badge in each SidebarSection
  // header and the expanded/collapsed summary line.
  const dimensionSelectedCount = useMemo(() => {
    const amountActive = (filters.minAmount ?? '') !== '' || (filters.maxAmount ?? '') !== '';
    return selectedDimensions.length + (amountActive ? 1 : 0);
  }, [selectedDimensions, filters.minAmount, filters.maxAmount]);

  const measureSelectedCount = useMemo(
    () => selectedMeasures.filter((k) => STANDARD_MEASURES.some((m) => m.key === k)).length,
    [selectedMeasures],
  );

  const comparisonSelectedCount = useMemo(() => {
    const periods = new Set<string>();
    for (const k of selectedMeasures) {
      const def = COMPARISON_MEASURES.find((m) => m.key === k);
      if (def?.period) periods.add(def.period);
    }
    return periods.size;
  }, [selectedMeasures]);
```

`comparisonSelectedCount` counts each comparison **period** at most once (matches the spec — a period with both `tran_amt` and `tran_count` checked counts as one).

- [ ] **Step 3: Add the `summarizeLabels` helper at module scope**

This helper is used by all three summaries below. Add it just above the `SidebarSection` component you added in Task 4:

```ts
// Format a list of selected-field labels as a concise summary line:
//   ["A", "B"]                 → "A · B"
//   ["A", "B", "C"]            → "A · B · C"
//   ["A", "B", "C", "D"]       → "A · B · C +1"
//   ["A", "B", "C", "D", "E"]  → "A · B · C +2"
function summarizeLabels(labels: string[]): string {
  if (labels.length <= 3) return labels.join(' · ');
  return `${labels.slice(0, 3).join(' · ')} +${labels.length - 3}`;
}
```

- [ ] **Step 4: Compute the collapsed-state summary lines**

Immediately after the count `useMemo`s from Step 2, add:

```ts
  // First three labels of selected items, with a "+N" suffix for the rest.
  // Used as the one-liner under a collapsed section header.
  const dimensionSummary = useMemo(() => {
    if (dimensionSelectedCount === 0) return undefined;
    const labels = selectedDimensions
      .map((k) => DIMENSION_FIELDS.find((f) => f.key === k)?.label ?? k);
    const amountActive = (filters.minAmount ?? '') !== '' || (filters.maxAmount ?? '') !== '';
    if (amountActive) labels.push('Amount Range');
    return summarizeLabels(labels);
  }, [selectedDimensions, dimensionSelectedCount, filters.minAmount, filters.maxAmount]);

  const measureSummary = useMemo(() => {
    if (measureSelectedCount === 0) return undefined;
    const labels = selectedMeasures
      .map((k) => STANDARD_MEASURES.find((m) => m.key === k))
      .filter((m): m is typeof STANDARD_MEASURES[number] => Boolean(m))
      .map((m) => m.label);
    return summarizeLabels(labels);
  }, [selectedMeasures, measureSelectedCount]);

  const comparisonSummary = useMemo(() => {
    if (comparisonSelectedCount === 0) return undefined;
    const periodLabels = new Map<string, string>();
    for (const m of COMPARISON_MEASURES) {
      if (m.period && !periodLabels.has(m.period)) {
        periodLabels.set(m.period, PERIOD_DISPLAY[m.period] ?? m.period);
      }
    }
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const k of selectedMeasures) {
      const def = COMPARISON_MEASURES.find((m) => m.key === k);
      if (def?.period && !seen.has(def.period)) {
        seen.add(def.period);
        labels.push(periodLabels.get(def.period) ?? def.period);
      }
    }
    return summarizeLabels(labels);
  }, [selectedMeasures, comparisonSelectedCount]);
```

- [ ] **Step 5: Compute per-section expanded booleans**

Immediately after the summary `useMemo`s, add:

```ts
  // Render-side decision: a section is expanded when not in the explicit-collapse
  // set AND (storage exists → honor "expanded" inferred from absence; or first
  // visit → apply the smart default).
  //
  // collapsedSections is a state value that updates on every toggle, so this
  // re-runs any time the user clicks a header — no need for hasStoredCollapseState
  // to be reactive.
  const isExpanded = useCallback(
    (id: SidebarSectionId, hasSelection: boolean): boolean => {
      if (collapsedSections.has(id)) return false;
      if (!hasStoredCollapseState()) return defaultExpanded(id, hasSelection);
      return true;
    },
    [collapsedSections],
  );

  const dimensionsExpanded  = isExpanded('dimensions',  dimensionSelectedCount  > 0);
  const measuresExpanded    = isExpanded('measures',    measureSelectedCount    > 0);
  const comparisonsExpanded = isExpanded('comparisons', comparisonSelectedCount > 0);
```

Once any toggle persists state via `saveCollapsedSections`, `hasStoredCollapseState()` flips to true and the smart default is permanently replaced by the user's explicit choices.

- [ ] **Step 6: Verify compile**

Run: `cd frontend && npx tsc --noEmit && echo "TSC OK"`
Expected: `TSC OK`. The new state and memos are not yet referenced in JSX, so no behavior change.

- [ ] **Step 7: Commit**

Run:
```bash
git add frontend/app/dashboard/pivot/PivotClient.tsx
git commit -m "feat(pivot-sidebar): wire collapse state + counts + summaries"
```

---

## Task 6: Wrap the Dimensions section

**Files:**
- Modify: `frontend/app/dashboard/pivot/PivotClient.tsx`

The existing Dimensions JSX is a `<section>` spanning roughly lines 1975–2452 (anchor: `{/* DIMENSIONS */}` comment). The structural change: replace the outer `<section>` + `<header>` with `<SidebarSection>`, keeping every child div intact.

- [ ] **Step 1: Replace the section opener**

Find the block starting with `{/* DIMENSIONS */}` (around line 1974). Replace from `{/* DIMENSIONS */}` through the closing `</header>` of that section's header (around line 1986):

```tsx
            {/* DIMENSIONS */}
            <section className="rounded-xl border border-border bg-bg-card overflow-hidden">
              <header className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-primary">Dimensions</p>
                  <p className="text-[10.5px] text-text-secondary mt-0.5">Check one or more fields to group results by</p>
                </div>
                {activeFilterCount > 0 && (
                  <button type="button" onClick={handleClearFilters} className="text-[10px] font-medium text-accent-red hover:underline">
                    Clear filters ({activeFilterCount})
                  </button>
                )}
              </header>
```

with:

```tsx
            {/* DIMENSIONS */}
            <SidebarSection
              id="dimensions"
              title="Dimensions"
              description="Check one or more fields to group results by"
              selectedCount={dimensionSelectedCount}
              summary={dimensionSummary}
              expanded={dimensionsExpanded}
              onToggle={() => toggleSection('dimensions')}
              headerExtra={
                activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-[10px] font-medium text-accent-red hover:underline flex-shrink-0"
                  >
                    Clear filters ({activeFilterCount})
                  </button>
                ) : null
              }
            >
```

- [ ] **Step 2: Replace the section closer**

Find the closing `</section>` of the Dimensions section (around line 2452, immediately before `{/* MEASURES — standard + period comparisons in one panel */}`). Replace `</section>` with `</SidebarSection>`.

- [ ] **Step 3: Verify the table still renders + tsc passes**

Run: `cd frontend && npx tsc --noEmit && echo "TSC OK"`
Expected: `TSC OK`.

- [ ] **Step 4: Commit**

Run:
```bash
git add frontend/app/dashboard/pivot/PivotClient.tsx
git commit -m "feat(pivot-sidebar): wrap Dimensions in SidebarSection"
```

---

## Task 7: Split the Measures section into Measures + Period Comparisons peers

**Files:**
- Modify: `frontend/app/dashboard/pivot/PivotClient.tsx`

The current Measures `<section>` (anchor: `{/* MEASURES — standard + period comparisons in one panel */}` around line 2454) contains two sub-blocks. Split it into two sibling `<SidebarSection>`s.

- [ ] **Step 1: Replace the Measures section opener through the Standard Aggregations sub-header**

Find this block (around lines 2454–2466):

```tsx
            {/* MEASURES — standard + period comparisons in one panel */}
            <section className="rounded-xl border border-border bg-bg-card overflow-hidden">
              <header className="px-4 py-3 border-b border-border">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-primary">Measures</p>
                <p className="text-[10.5px] text-text-secondary mt-0.5">
                  Standard aggregations and period-comparison <span className="font-mono">*_where</span> fields
                </p>
              </header>

              {/* Standard group */}
              <div className="px-4 pt-3 pb-1">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-text-muted">Standard Aggregations</p>
              </div>
```

with:

```tsx
            {/* MEASURES — standard aggregations only */}
            <SidebarSection
              id="measures"
              title="Measures"
              description="Standard aggregations applied to the selected dimensions"
              selectedCount={measureSelectedCount}
              summary={measureSummary}
              expanded={measuresExpanded}
              onToggle={() => toggleSection('measures')}
            >
```

- [ ] **Step 2: Find the boundary between Standard and Period Comparisons**

Inside the existing Measures section, the boundary is the `</ul>` that closes the Standard Aggregations list, followed by `{/* Comparison group — grouped by period */}` (around lines 2555–2557). Currently:

```tsx
              </ul>

              {/* Comparison group — grouped by period */}
              <div className="px-4 pt-4 pb-1 border-t border-border mt-1">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-text-muted">Period Comparisons</p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  WHERE clauses are built relative to the selected dimension and filter date.
                </p>
              </div>
```

Replace this with:

```tsx
              </ul>
            </SidebarSection>

            {/* PERIOD COMPARISONS */}
            <SidebarSection
              id="comparisons"
              title="Period Comparisons"
              description="WHERE clauses built relative to the selected dimension and filter date"
              selectedCount={comparisonSelectedCount}
              summary={comparisonSummary}
              expanded={comparisonsExpanded}
              onToggle={() => toggleSection('comparisons')}
            >
```

The two `</ul>`-then-divider lines collapse into a clean section break.

- [ ] **Step 3: Replace the Measures section closer**

Find the closing `</section>` that ends the (former) Measures section — currently around line 2662, the line that closes the comparison-group rendering. Replace `</section>` with `</SidebarSection>`.

- [ ] **Step 4: Verify tsc**

Run: `cd frontend && npx tsc --noEmit && echo "TSC OK"`
Expected: `TSC OK`.

- [ ] **Step 5: Run the full test suite**

Run: `cd frontend && npm test -- --run 2>&1 | tail -10`
Expected: all pass.

- [ ] **Step 6: Commit**

Run:
```bash
git add frontend/app/dashboard/pivot/PivotClient.tsx
git commit -m "feat(pivot-sidebar): split Measures into Measures + Period Comparisons peers"
```

---

## Task 8: Manual smoke test in the browser

**Files:**
- None modified.

- [ ] **Step 1: Start the dev server**

Run: `cd frontend && npm run dev` (in a background terminal).

- [ ] **Step 2: Open `http://localhost:3000/dashboard/pivot` in a browser**

Make sure you're signed in (the page redirects to login otherwise — sign in via `/auth/signin`).

- [ ] **Step 3: Verify fresh-load default**

Clear localStorage (`localStorage.clear()` in DevTools) and refresh. Expected:
- Dimensions section is **expanded**
- Measures section is **collapsed** (chevron points right, no content visible)
- Period Comparisons section is **collapsed**

- [ ] **Step 4: Verify chevron rotation + toggle**

Click each section header. Expected:
- Chevron rotates 90° on expand, snaps back on collapse
- Content shows / hides
- The "Clear filters (N)" button still works on the Dimensions header (only visible when filters are active)
- Header click target is the whole row (cursor pointer, keyboard space/enter works)

- [ ] **Step 5: Verify count badge accuracy**

- Pick a dimension (e.g. Year) → Dimensions header shows `1 selected`
- Add `min` value to Amount Range → count goes to `2 selected`
- Pick `TRAN Amount` measure → Measures header shows `1 selected`
- Pick `Prev. Day · tran_amt` → Period Comparisons header shows `1 selected`
- Add `Prev. Day · tran_count` (same period) → still `1 selected` (per-period dedupe)
- Add `This Month · tran_amt` → `2 selected`

- [ ] **Step 6: Verify collapsed-state summary**

Collapse a section that has selections. Expected: a one-line summary appears under the title (e.g. `Year · GAM Province · ACCT Num +1`) and truncates with ellipsis on a narrow viewport.

- [ ] **Step 7: Verify persistence**

Collapse Dimensions, refresh the page. Expected: Dimensions stays collapsed even though it has selections.

- [ ] **Step 8: Verify all inner controls still work**

Expand each section. Verify:
- Dimension sort buttons / pivot toggles / chevrons / Date Dims sub-collapse all work
- Measures HAVING op + value inputs + sort buttons work
- Period Comparisons buttons toggle on/off with the same active styling
- Pivot still applies (PARTITION BY is unaffected by sidebar collapsing)

- [ ] **Step 9: Stop the dev server.**

Kill the background `npm run dev`.

- [ ] **Step 10: Commit (only if any tweaks were needed during smoke test)**

If everything passed cleanly, skip this step. If you adjusted styles or fixed a small bug found in smoke testing, commit those refinements:

```bash
git add frontend/app/dashboard/pivot/PivotClient.tsx
git commit -m "fix(pivot-sidebar): polish from smoke test"
```

---

## Task 9: Update CLAUDE.md per Rule 3

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add a note to the Frontend Conventions section**

Find the "Frontend Conventions" bullet list (search for `**Every dashboard page must use \`useDashboardPage()\``). Add a new bullet at the end of that section:

```markdown
- **Pivot sidebar sections are independently collapsible.** [`app/dashboard/pivot/PivotClient.tsx`] wraps each top-level group (Dimensions, Measures, Period Comparisons) in a `<SidebarSection>`. Collapsed-state is persisted to `localStorage` under `pivot-sidebar-collapsed` (a JSON array of explicitly-collapsed section IDs). The smart default — Dimensions expanded, Measures + Period Comparisons collapsed unless they have selections — fires only on first visit. Pure helper at `app/dashboard/pivot/sidebarCollapseState.ts`, unit-tested in `__tests__/pivot-sidebar-collapse.test.ts`. Period Comparisons is a top-level peer of Measures, not a sub-section.
```

- [ ] **Step 2: Run final verification per CLAUDE.md Rule 5**

Run all three checks:

```bash
cd frontend && npm test -- --run 2>&1 | tail -10 && npx tsc --noEmit && echo "TSC OK"
cd ../backend && bundle exec rspec 2>&1 | tail -5
```

Expected: all frontend tests pass; `TSC OK`; backend rspec `0 failures`.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): note pivot-sidebar collapsible sections + helper"
```

---

## Self-Review Notes (for the engineer executing this plan)

**Spec coverage check:**
- Three peer sections in order Dimensions → Measures → Period Comparisons → Tasks 6, 7
- Header pattern (chevron + title + count badge + summary) → Task 4 (component) + Task 6/7 (wiring)
- Default expand state on first visit → Task 5 Step 5 + Task 3 (`defaultExpanded`)
- localStorage persistence (explicit-collapse list) → Task 3 + Task 5 Step 1
- Selected-count semantics (per-period dedupe for comparisons; Amount Range counted in Dimensions) → Task 5 Step 2
- No auto-expand triggers → confirmed (none implemented)
- Tests for the helper → Task 2 + Task 3
- Documentation update → Task 9

**Type-consistency check:** `SidebarSectionId`, `loadCollapsedSections`, `saveCollapsedSections`, `defaultExpanded` consistently named across Tasks 1, 2, 3, 4, 5.

**No-placeholder check:** Every code step shows actual code; commands include the exact command and expected output.
