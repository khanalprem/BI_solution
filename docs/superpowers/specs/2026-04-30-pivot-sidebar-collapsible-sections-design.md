# Pivot Sidebar — Collapsible Top-Level Sections

**Date:** 2026-04-30
**Status:** Approved (awaiting implementation plan)
**Scope:** `frontend/app/dashboard/pivot/PivotClient.tsx` only

## Problem

The Pivot Analysis sidebar runs ~3,500 px on a 1,080 px viewport. Users have to scroll past ~25 dimension fields, 10 standard aggregations, and 9 period-comparison rows to reach the section they care about. The table area (which the user is happy with) sits beside an interface that demands constant vertical scrolling and dwarfs the actual data.

The user has explicitly excluded the data table from this change — only the sidebar needs work.

## Goal

Let the user fold sections they aren't using so the sidebar fits a normal viewport without scroll for typical workflows. Preserve every existing interaction inside an expanded section.

Non-goals (deferred):
- Shrinking row height or hiding field descriptions
- Sub-categorising the dimension list (Branch / Scheme / Account / etc.)
- Adding a global field-search input
- Changing the data table, TopBar, or filter behaviour

## Design

### Section structure

Three top-level peer sections, in this order:

1. **Dimensions** — existing Dimensions section, including the Date Dimensions sub-group (which keeps its own internal collapse) and the Amount Range (NPR) input.
2. **Measures** — Standard Aggregations only (the 10 measures and their HAVING / sort controls).
3. **Period Comparisons** — promoted from a sub-section of Measures to a peer.

Promoting Period Comparisons is a structural change: in `PivotClient.tsx` it currently lives under the same `<div>` as Standard Aggregations under one MEASURES heading. After the change, the two render as siblings of Dimensions.

### Header pattern

Each section header is a clickable button strip:

```
[chevron] DIMENSIONS                  (3 selected)
```

- **Chevron**: same rotating SVG used by the existing Date Dimensions sub-collapse (commit `449f241`). Rotates 0° when collapsed, 90° when expanded.
- **Title**: existing uppercase tracked-out text style.
- **Count badge**: shown only when ≥1 item is selected in that section. Uses the existing badge token. "Selected" counts:
  - Dimensions: number of checked dimension fields (Date Dims + main dim list + TRAN Date Balance). The Amount Range (NPR) input is included only when min or max has a value.
  - Measures: number of checked standard measures.
  - Period Comparisons: number of comparison rows with at least one of their `tran_amt` / `tran_count` buttons active (each row counts at most once).
- **Click target**: the entire header row, not just the chevron.

When a section is **collapsed AND has ≥1 selected**, a single-line summary renders directly under the header:

```
Year · GAM Province · ACCT Num +1
```

- Up to three labels, then `+N` for the rest. Truncate with CSS ellipsis if it overflows the sidebar width.
- Skipped when the section has no selections (the count badge is the only feedback).

### Default expand state

On a fresh visit (no localStorage entry, nothing selected, no URL state):
- **Dimensions**: expanded
- **Measures**: collapsed
- **Period Comparisons**: collapsed

When URL state or presets pre-select fields:
- A section that has ≥1 selected field starts expanded.
- A section with no selections starts collapsed.

This "smart default" is computed only when no localStorage entry exists for that section.

### Persistence

Per-section collapse state is persisted to `localStorage` under the key `pivot-sidebar-collapsed`. The value is a JSON array of section IDs that the user has explicitly **collapsed** (e.g. `["measures", "comparisons"]`).

- Once the user toggles a section, the explicit choice wins on every subsequent load — even if selections later appear in that section.
- If the key is absent or unparseable, fall back to the smart default.
- Sections not present in the array → expanded.

This intentionally one-sided storage keeps the data shape minimal and preserves the smart-default behaviour for first-time users.

### Auto-expand trigger

None. There is no programmatic auto-expand in this change — section state is driven entirely by the smart default (first visit) and the user's explicit toggle (thereafter, persisted to localStorage). This keeps behavior predictable; if the user collapsed Period Comparisons, nothing surprises them by re-opening it.

(Earlier draft of this spec proposed auto-expanding Dimensions on a "measure-prereq violation". On inspection the only prereqs in this codebase are dimension-level — `DIM_PREREQS` — and the existing code already early-returns on those, so an auto-expand wouldn't fire. Dropped to keep the change simple.)

### Component shape

Add one module-scope component to `PivotClient.tsx`:

```ts
function SidebarSection({
  id, title, selectedCount, summary, defaultExpanded, children,
}: {
  id: 'dimensions' | 'measures' | 'comparisons';
  title: string;
  selectedCount: number;
  summary?: string;
  defaultExpanded: boolean;
  children: React.ReactNode;
}) { ... }
```

Plus a small persistence helper extracted to a sibling pure file:

```
frontend/app/dashboard/pivot/sidebarCollapseState.ts
```

Exports:
- `loadCollapsedSections(): Set<SectionId>` — reads localStorage, returns parsed set or empty set
- `saveCollapsedSections(set: Set<SectionId>): void` — writes back
- `defaultExpanded(id, hasSelection): boolean` — applies the smart-default rule

Pure helper with no React deps, unit-tested.

The existing in-section logic (sort buttons, pivot toggles, prereq disabled state, HAVING inputs, sort badges, etc.) is reused unchanged — the new component is a thin wrapper around the existing JSX.

### Test plan

**Vitest** (`frontend/__tests__/pivot-sidebar-collapse.test.ts`):
- `loadCollapsedSections` returns empty set on missing key, malformed JSON, and non-array contents
- `saveCollapsedSections` round-trips through `loadCollapsedSections`
- `defaultExpanded`:
  - Dimensions with no selection → expanded (entry-point default)
  - Dimensions with selection → expanded
  - Measures with no selection → collapsed
  - Measures with selection → expanded
  - Comparisons with no selection → collapsed
  - Comparisons with selection → expanded

**Manual smoke test**:
1. Fresh load (clear localStorage) → only Dimensions expanded
2. Click each section header → toggle works, chevron rotates, count badge accurate
3. Collapse Dimensions, reload → still collapsed (persistence works)
4. Existing inner controls behave identically when expanded (sort buttons, pivot toggles, HAVING inputs, prereq disabled states)
5. Mobile / narrow viewport: section header still wraps cleanly; summary line truncates

### Verification per CLAUDE.md golden rules

- Rule 1 / 5: `npm test` and `bundle exec rspec` before and after
- Rule 4: `npx tsc --noEmit` after every edit (filtered to pivot files)
- Rule 2 / 3: skills/page.tsx is unaffected (no data-model change); CLAUDE.md frontend conventions section gets a short note about the new pure helper file and the section structure

## Risks

| Risk | Mitigation |
|---|---|
| Promoting Period Comparisons to a peer changes the existing visual hierarchy | Same component children, same styles inside; only the wrapping `<div>` changes |
| URL state restoration triggering smart-default before localStorage hydrates → flicker | Compute initial state synchronously from localStorage on first render (useState initializer), not in `useEffect` |
| Selected-summary line could overflow on long field labels | CSS truncate with `text-overflow: ellipsis` and the existing sidebar width guarantees |

## Out of scope (follow-ups)

- Compact-row mode (single-line dim rows, descriptions on hover)
- Sub-grouping the 25 dim rows into accordion categories (Account / Branch / Scheme / etc.)
- Global field-search input across the sidebar
- Sticky/floating sidebar that scrolls independently from main content
