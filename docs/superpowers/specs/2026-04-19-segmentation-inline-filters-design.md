# Customer Segmentation — Inline Controls & Self-Contained Filters

**Date:** 2026-04-19
**Scope:** `/dashboard/segmentation` page only (backend filter additions are minimal and shared).
**Status:** Approved for implementation.

---

## Goal

Replace the shared TopBar period/filter controls on the Customer Segmentation page with an always-visible, page-local control strip that exposes:
- Six selectable **dimensions** (column toggle + GROUP BY)
- Four selectable **measures** (column toggle — `rfm_score` locked on)
- Six single-value **filters** — one per dimension

No date-range filter. No period selector. No filter drawer.

---

## Motivation

The current page uses the shared `useDashboardPage` → `AdvancedFilters` drawer + TopBar period selector, which exposes filter keys that are not meaningful to an RFM ranking workflow (`tranSource`, `product`, `service`, `partTranType`, etc.). Users only care about narrowing by account/customer identity and branch/province when segmenting customers. A flatter, inline control surface — similar in feel to the Pivot page sidebar, but compressed to a horizontal strip — makes the page self-documenting and removes cognitive overhead.

---

## Scope

### In scope
- `frontend/app/dashboard/segmentation/page.tsx` — full rewrite of controls & state model (table rendering unchanged).
- `frontend/types/index.ts` — add `acctName?: string` and `acid?: string` to `DashboardFilters`.
- `frontend/lib/api.ts` (or wherever `toApiFilters` lives) — map `acctName` → `acct_name`, `acid` → `acid`.
- `backend/app/controllers/api/v1/base_controller.rb` — whitelist `acct_name` / `acid` in `filter_params`.
- `backend/app/services/production_data_service.rb` — add `acct_name` ILIKE + `acid` exact-match clauses to `explorer_where_clause`.
- `CLAUDE.md` — update the "Filter set is fixed…" known-issue block with the two new keys.

### Out of scope
- No changes to `AdvancedFilters.tsx` (other pages keep using it).
- No changes to `TopBar.tsx`.
- No changes to `skills/page.tsx` (no new dimension / measure / period introduced).
- No changes to any other dashboard page.
- No changes to the RFM formula or `production_data_service` MEASURES hash.
- No tests for the new backend filters (no existing tests for the companion filters like `cif_id` either — keep parity).

---

## UX Design

### Page layout (top → bottom)
1. **TopBar** — title `Customer Segmentation`, subtitle `RFM score ranking — top customers first`, export button. **No** period dropdown, **no** filter drawer toggle.
2. **`SegmentationControls` card** (new) — single `rounded-xl border border-border bg-bg-surface` card with three labeled sections separated by `Separator`:
   - Dimensions row — 6 checkbox chips laid out in a responsive `flex-wrap`.
   - Measures row — 4 checkbox chips; `rfm_score` is rendered as locked/disabled (`cursor-not-allowed opacity-60`, explanatory `title`).
   - Filters row — a 6-cell responsive grid (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3`). Each cell contains the label above the control:
     - `GAM Province` — shadcn `Select` single-select (options from `useFilterValues().provinces`)
     - `GAM Branch` — shadcn `Select` single-select (options from `useFilterValues().branches`)
     - `CIF Id` — text input (ILIKE on backend)
     - `ACCT Num` — text input (exact match on backend)
     - `ACCT Name` — text input (ILIKE on backend — new)
     - `ACID` — text input (exact match on backend — new)
3. **`AdvancedDataTable`** — unchanged wiring; `columns` memo filters by the selected measures/dimensions.

### Interaction details
- Dimension checkbox toggle:
  - Unchecked dims are removed from both the backend `DIMENSIONS` request array **and** the table `columns`.
  - At least one dim must remain checked — unchecking the last one is a no-op (chip stays checked, no toast).
- Measure checkbox toggle:
  - Unchecked measures are removed from both the backend `MEASURES` request array and the table `columns`.
  - `rfm_score` cannot be unchecked (it is the ORDER BY key and the page's raison d'être).
- Filter inputs:
  - Text inputs fire on `blur` **and** on Enter (`onKeyDown` / `e.key === 'Enter'`). They do **not** fire on every keystroke — this avoids re-querying on every character.
  - Dropdowns fire immediately on change.
  - All filters go into a single `SegmentFilters` state object; the query hook re-runs when that object changes.
- No "Clear filters" button needed — every filter has its own empty state; dropdowns have an "All" option that maps to `undefined`.

### What's preserved
- Export button (wired to `handleExport`, exports only the currently-visible columns).
- RFM formula and ORDER BY (unchanged).
- Page size 200, table pageSize 25 (unchanged).
- Skeleton loading state (unchanged).

---

## Data Flow

```
SegmentationControls
    ↓ (dims, measures, filters)
useProductionExplorer(
    filters = toApiFilters(segmentFilters),
    dims    = checkedDims,                 // subset of 6
    measures= checkedMeasures,             // subset of 4
    orderby = ORDERBY                       // unchanged RFM formula
)
    ↓
GET /api/v1/production/explorer?
    dimensions=acct_num,cif_id,...
    &measures=rfm_score,tran_amt
    &province=...&branch_code=...
    &cif_id=...&acct_num=...
    &acct_name=...&acid=...
    &orderby_clause=ORDER BY <rfm formula> DESC
    &page_size=200
```

### Filter serialization (`toApiFilters`)
Add two new mappings alongside `acctNum → acct_num` and `cifId → cif_id`:
- `acctName → acct_name`
- `acid → acid`

No multi-value handling — these are all single strings.

### Backend filter clauses (`explorer_where_clause`)
Append two clauses alongside the existing `acct_num` / `cif_id` handlers:

```ruby
if filters[:acct_name].present?
  pattern = "%#{ActiveRecord::Base.sanitize_sql_like(filters[:acct_name].to_s.strip)}%"
  clauses << "acct_name::text ILIKE #{conn.quote(pattern)}"
end

if filters[:acid].present?
  clauses << "acid::text = #{conn.quote(filters[:acid].to_s.strip)}"
end
```

### Backend permit (`filter_params`)
Add:
```ruby
acct_name: param_value(:acct_name, :acctName),
acid:      param_value(:acid),
```

---

## State Model

```ts
type SegmentFilters = {
  province?: string;   // single value — maps to backend province (which accepts IN but we send one)
  branch?:   string;   // single value — maps to backend branch_code
  cifId?:    string;
  acctNum?:  string;
  acctName?: string;   // NEW
  acid?:     string;   // NEW
};

const ALL_DIMENSIONS = ['acct_num', 'acct_name', 'cif_id', 'acid', 'gam_branch', 'gam_province'] as const;
const ALL_MEASURES   = ['rfm_score', 'tran_amt', 'tran_count', 'tran_maxdate'] as const;

const [dims,     setDims]     = useState<string[]>([...ALL_DIMENSIONS]);
const [measures, setMeasures] = useState<string[]>([...ALL_MEASURES]);
const [filters,  setFilters]  = useState<SegmentFilters>({});
```

Note: `province` and `branch` filters on the backend accept arrays and produce `IN (...)` clauses. The UI is single-select; serialization wraps the single value into a one-element array to match existing call sites (`[filters.province]`). This keeps behavior identical to how other pages send these filters.

### Why not use `DashboardFilters`?
The shared `DashboardFilters` type is a wide superset that includes date ranges, amount ranges, and every categorical filter. Using a narrow `SegmentFilters` type keeps the component's contract obvious and prevents accidental use of removed filters. Conversion happens once via a tiny local helper:

```ts
const apiFilters: DashboardFilters = {
  province:  filters.province  ? [filters.province]  : undefined,
  branch:    filters.branch    ? [filters.branch]    : undefined,
  cifId:     filters.cifId,
  acctNum:   filters.acctNum,
  acctName:  filters.acctName,
  acid:      filters.acid,
};
```

---

## Components

### `SegmentationControls` (new, inline or co-located in the same file)
Props:
```ts
{
  dims:     string[];
  measures: string[];
  filters:  SegmentFilters;
  onDimsChange:     (next: string[]) => void;
  onMeasuresChange: (next: string[]) => void;
  onFiltersChange:  (next: SegmentFilters) => void;
  provinces: string[];
  branches:  string[];
  filterValuesLoading: boolean;
}
```
Renders the three sections described in UX Design. Uses existing shadcn primitives — `Checkbox`, `Select`, `Input`, `Separator`, `Label`. No new UI primitives introduced.

### Keep
- `formatScore`, `formatInt`, `formatAmount`, `formatMaxDate` helpers — unchanged.
- `columns` memo — now filters by `dims` + `measures` to hide deselected columns.
- `AdvancedDataTable` usage — unchanged.

### Remove
- `useDashboardPage()` call.
- `AdvancedFilters` import & JSX.
- `{...topBarProps}` spread on `TopBar`.

---

## Error Handling
- If `useFilterValues()` is loading, Province/Branch dropdowns render disabled with a `Loading…` placeholder. Same pattern `AdvancedFilters` already uses.
- If backend returns an error, the existing `useProductionExplorer` error state propagates — we rely on the dashboard-level `error.tsx` boundary. No page-local error UI added.
- `rfm_score` lock is UI-only. If somehow `measures` is set to `[]` (e.g., via a bug), the backend falls back to a no-measure query that still returns the dims — the table will just show empty measure columns, which is acceptable.

---

## Testing Strategy
- **Manual verification only** (matches the rest of the codebase — no existing unit tests for segmentation page).
  - Golden path: uncheck a dim → column disappears and table still renders; recheck → column returns; repeat for measures.
  - Filter each of the 6 fields, one at a time, and confirm the row count drops / rises.
  - Combine two filters (e.g. Province + ACCT Num) and confirm both are applied.
  - Export CSV → confirm only visible columns are exported.
  - Run `cd frontend && npx tsc --noEmit 2>&1 | grep segmentation` — no new errors.
  - Run `cd frontend && npm test` — existing suite still passes.
  - Run `cd backend && bundle exec rspec` — existing suite still passes (new backend code has no test; neither do its siblings).

---

## Rollout / Migration
- One-shot change; no feature flag.
- URL search params are NOT introduced (unlike pivot page). Segmentation state is in-memory only.
- No database migration (filters operate on existing columns).

---

## Open Questions
None — all resolved in brainstorm.

---

## Implementation Task Breakdown (preview — full plan will be written next)
1. Backend: extend `filter_params` + `explorer_where_clause` for `acct_name` / `acid`.
2. Frontend types: add `acctName` / `acid` to `DashboardFilters`; extend `toApiFilters`.
3. Frontend page: rewrite `segmentation/page.tsx` — strip shared hook, add `SegmentationControls`, wire `dims`/`measures`/`filters` state.
4. Manual verification: run both test suites, tsc, browser walk-through.
5. Docs: update `CLAUDE.md` filter-list known-issue block.
