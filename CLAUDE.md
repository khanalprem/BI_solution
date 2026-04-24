# BankBI — Claude Code Guide

Nepal Banking Intelligence Platform · Rails 7 API + Next.js 15 + PostgreSQL

---

## Quick Start

```bash
# Backend (port 3001)
cd backend && bundle install && rails s -p 3001

# Frontend (port 3000)
cd frontend && npm install && npm run dev

# TypeScript check (run after every edit)
cd frontend && npx tsc --noEmit
```

---

## ⚠️ Golden Rules — Non-Negotiable for Every Change

These rules apply to **every fix, every feature, every refactor** — no exceptions.

### Rule 1 — Run tests BEFORE making any fix
```bash
# Frontend (vitest)
cd frontend && npm test

# Backend (RSpec)
cd backend && bundle exec rspec
```
- If tests are already failing → fix them first before touching anything else
- If no tests exist for the area you're changing → write one before the fix

### Rule 2 — Update `skills/page.tsx` for EVERY data model change

| What changed | What to update in skills/page.tsx |
|---|---|
| New dimension added | `DIMENSIONS` array + count in stat pill + section header |
| Dimension removed/renamed | Same |
| New measure added | `MEASURES` array + count in stat pill + section header |
| Measure removed/renamed | Same |
| New period comparison | `PERIODS` array |
| New page added | Page Status table |
| Stored procedure param changed | Procedure Params section |

### Rule 3 — Update `CLAUDE.md` for EVERY architectural change

| What changed | What to update in CLAUDE.md |
|---|---|
| New dimension | DIMENSIONS hash example |
| New measure | MEASURES hash + "Adding a new measure" checklist |
| Comparison period logic change | Comparison Period Architecture section |
| New file/component | Project Structure tree |
| New convention | Relevant convention section |
| New shadcn component added | UI Design System Rules section |
| New known issue / tech debt | Known Issues section |

### Rule 4 — TypeScript check after every frontend edit
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "pivot/page\|skills/page"
```
Pre-existing errors in `board/`, `branch/`, `customer/`, `executive/` — ignore those.

### Rule 5 — Run tests AFTER your fix to confirm nothing broke
```bash
cd frontend && npm test
cd backend && bundle exec rspec
```

### Change Completion Checklist
Before declaring any task done, verify:
- [ ] `npm test` passes (frontend)
- [ ] `bundle exec rspec` passes (backend)
- [ ] `npx tsc --noEmit` has no new errors
- [ ] `skills/page.tsx` updated if data model changed
- [ ] `CLAUDE.md` updated if architecture changed

---

## Architecture

```
Browser (Next.js 15, Tailwind CSS, shadcn/ui, TanStack Query, PremiumCharts)
    ↓ REST/JSON
Rails 7 API  →  ProductionDataService  →  get_tran_summary (stored proc)
                                                ↓
                                    tran_summary (partitioned fact)
                                    eab (balance table, optional LEFT JOIN)
```

**Key ports:** Frontend `localhost:3000` · Backend `localhost:3001/api/v1`

No ETL, no cache — every query hits live PostgreSQL (production DB: `10.1.1.161/nifi`).

**SAFETY:** Both development and production Rails envs connect to the **same production NiFi warehouse**. NEVER run `db:migrate`, `db:schema:load`, or destructive operations without DBA review. Index changes go in `backend/db/scripts/*.sql` for manual DBA execution.

---

## Project Structure

```
BI_solution/
├── CLAUDE.md                       ← you are here
├── backend/
│   ├── app/
│   │   ├── controllers/api/v1/     ← REST endpoints (production_data, filters, auth)
│   │   │   └── production_controller.rb  ← SQL clause sanitizer (whitelist validation)
│   │   ├── services/
│   │   │   └── production_data_service.rb  ← THE core service (dimensions, measures,
│   │   │                                      period WHERE generation, proc call)
│   │   └── models/                 ← User, Branch, Customer (Rails DB)
│   ├── config/routes.rb
│   └── db/scripts/                 ← SQL scripts for DBA manual execution (NOT migrations)
│       └── performance_indexes.sql ← Additive indexes for EAB, year_month, etc.
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── pivot/page.tsx      ← Pivot Analysis (most complex page, URL state sync)
│   │   │   ├── executive/page.tsx
│   │   │   ├── branch/page.tsx
│   │   │   ├── branch/[branchCode]/page.tsx  ← Branch detail (uses production explorer)
│   │   │   ├── customer/page.tsx
│   │   │   ├── skills/page.tsx     ← Platform Guide / Data Dictionary (this UI)
│   │   │   └── error.tsx           ← Dashboard-level Next.js error boundary
│   │   └── signin/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx         ← Collapsible rail (220px ↔ 56px), CSS var sync
│   │   │   └── TopBar.tsx
│   │   └── ui/                     ← shadcn + custom: Badge, KPICard, ChartCard, etc.
│   ├── lib/
│   │   ├── api.ts                  ← Axios client (baseURL = :3001)
│   │   ├── hooks/
│   │   │   ├── useDashboardPage.ts ← shared filter/period state hook (used by ALL pages)
│   │   │   └── useDashboardData.ts ← TanStack Query wrappers
│   │   ├── formatters.ts           ← NPR formatting, date helpers
│   │   └── exportCsv.ts            ← CSV export utility
│   ├── types/index.ts              ← DashboardFilters, FilterValuesResponse, etc.
│   └── components.json             ← shadcn/ui CLI config
└── docker-compose.yml
```

---

## Key Service: ProductionDataService

`backend/app/services/production_data_service.rb` — **read this first before touching any data logic.**

### DIMENSIONS hash

Every available GROUP BY field. Adding a new field = add to this hash.
```ruby
DIMENSIONS = {
  'gam_branch'     => { label: 'GAM Branch',    sql: 'gam_branch' },
  'eod_balance'    => { label: 'GAM Balance', sql: 'g.eod_balance',
                         gam_required: true, outer_join_field: true },
  'tran_date_bal'  => { label: 'TRAN Date Balance', sql: 'e.tran_date_bal',
                         eab_required: true, outer_join_field: true },
  # ... see service file for full list
}
```

- `eab_required: true` → adds `LEFT JOIN eab ON ...` to the query
- `gam_required: true` → adds `LEFT JOIN gam g ON g.acid = tb2.acid` to the query
- `outer_join_field: true` → field lives in outer SELECT only (cannot be in GROUP BY)

When either flag is set, `acid` is automatically injected into the inner SELECT/GROUP BY so the outer join has something to match on. The two flags compose: both joins are concatenated and passed through the `eab_join` procedure parameter.

### MEASURES hash

Every selectable aggregation. Keys must match frontend `STANDARD_MEASURES` keys exactly.
```ruby
MEASURES = {
  'tran_amt'        => { label: 'TRAN Amount',        select_sql: 'SUM(tran_amt) AS tran_amt',           order_sql: 'SUM(tran_amt) DESC' },
  'tran_count'      => { label: 'TRAN Count',         select_sql: 'SUM(tran_count) AS tran_count',        order_sql: 'SUM(tran_count) DESC' },
  'signed_tranamt'  => { label: 'Signed TRAN Amount', select_sql: 'SUM(signed_tranamt) AS signed_tranamt', order_sql: 'SUM(signed_tranamt) DESC' },
  'cr_amt'          => { label: 'CR Amount',          select_sql: "SUM(CASE WHEN part_tran_type='CR' ...) AS cr_amt",   ... },
  'cr_count'        => { label: 'CR Count',           ... },
  'dr_amt'          => { label: 'DR Amount',          ... },
  'dr_count'        => { label: 'DR Count',           ... },
  'tran_acct_count' => { label: 'TRAN Acct Count',   select_sql: 'COUNT(DISTINCT acct_num) AS tran_acct_count', ... },
  'tran_maxdate'    => { label: 'TRAN Max Date',      select_sql: 'MAX(tran_date) AS tran_maxdate',       ... },
  # RFM composite (formula from data dictionary.xlsx) — higher = more valuable customer:
  # SUM(count)·0.001 + SUM(amt)·0.0001 − days_since_last_tx·0.001
  # NOTE: MAX(tran_date) must be cast `::date` because the stored procedure's inner CTE
  # casts tran_date to varchar(15); without the cast Postgres errors on `date - text`.
  'rfm_score'       => { label: 'RFM Score',          select_sql: 'SUM(tran_count)*0.001 + SUM(tran_amt)*0.0001 + (CURRENT_DATE-MAX(tran_date)::date)*(-0.001) AS rfm_score', ... },
  # Legacy aliases kept for backwards compatibility:
  # 'total_amount', 'transaction_count', 'unique_accounts', 'unique_customers',
  # 'credit_amount', 'debit_amount', 'net_flow'
}
```

All 9 direct-column keys exist in `tran_summary` (confirmed from `information_schema`); `rfm_score` is a composite formula (not a raw column) — 10 canonical measure keys total.
`tran_date_bal` is a **display-as-measure dimension**: listed under Dimensions in the sidebar and sent to the backend as a DIMENSION (outer_join_field path), but RENDERED under pivoted column headings as a measure cell (so users see the daily balance alongside tran_amt, cr_amt, etc.). It is never aggregated — the backend's `outer_join_field: true` flag keeps it out of the inner GROUP BY and injects the raw `e.tran_date_bal` value into `select_outer` after the EAB LEFT JOIN. The frontend uses `DISPLAY_AS_MEASURE_DIMS` in `pivot/page.tsx` to exclude it from `rowDims` and append it to the pivot measure axis. Do not add it to the backend MEASURES hash.

### Period WHERE generation

`build_period_where(period_key, filters)` builds the comparison-period WHERE clause.
- `thismonth` = full calendar month (1st → last day)
- `thisyear` = full calendar year (Jan 1 → Dec 31)
- Comparison rows get their date-dim value prefixed: `"this_month:2024-02-01"` — parsed in frontend by `parsePivotHeader()`

### `non_date_filter_clauses(filters)` 

Used by period WHERE to include all non-date filters (categorical, ILIKE text, amount range).

---

## Pivot Analysis Architecture (`pivot/page.tsx`)

The most sophisticated page. Key concepts:

### Separator constants
```typescript
const PIVOT_SEP     = '\x00';  // pivotValue + SEP + measureKey  → cell lookup key
const PIVOT_DIM_SEP = '\x01';  // dim1Value  + SEP + dim2Value   → composite pivot column key
```

### State model
| State | Purpose |
|-------|---------|
| `selectedDimensions` | All active GROUP BY fields |
| `datePivotEnabled` | Whether date fields pivot to columns |
| `dateSortEnabled` | Whether date fields control ORDER BY |
| `nonDatePartitions` | Non-date fields pivoted to columns (`part_tran_type`, `tran_type`, `gl_sub_head_code`) |
| `orderFields` | Manual ORDER BY additions |

### Derived memos
- `partitionDimensions` = datePivotFields + nonDatePartitions (in `DATE_FIELD_ORDER`)
- `rowDims` = selectedDimensions − partitionDimensions (these become left-side rows)
- `partitionbyClause` → sent to backend as `PARTITION BY ...`

### Multi-level pivot headers (Excel-style)
When ≥2 dimensions are pivoted (e.g. `tran_date` + `part_tran_type`):
- `_pivot_key` = `"2024-02-01\x01CR"` (joined with `PIVOT_DIM_SEP`)
- `PivotTable` detects `PIVOT_DIM_SEP` in `pivotValues`, builds `level1Groups`
- Renders **3 header rows**: date (spanning) → CR/DR → measures (if multi)
- Cell lookup: `row["2024-02-01\x01CR\x00tran_amt"]`

### `buildPivotData(rows, pivotFieldKey, rowDimKeys, measureKeys)`
Pandas `df.pivot()` equivalent. Stores cells as `${pivotValue}\x00${measureKey}`.
Appends a **grand totals row** (`__isTotal: true`) that sums all numeric pivot cells.

### `renderCell(v, measureKey?)`
Amount measures (`tran_amt`, `cr_amt`, `dr_amt`, `signed_tranamt`) use `formatNPR()`. Count/date measures use `toLocaleString()`. The `AMOUNT_MEASURES` set controls which keys get NPR formatting.

### URL state sync
Pivot state (`dims`, `measures`, `page`) syncs to URL search params via `useSearchParams` + `router.replace()`. Enables shareable analysis links (e.g., `/dashboard/pivot?dims=gam_branch,tran_date&measures=tran_amt`).

### HTD drill-down (row expansion)
Each pivot row has a `+`/`−` toggle in the first column. Clicking `+` fetches raw ledger rows from the `htd` table and shows them inline below the row.

- **Endpoint**: `GET /api/v1/production/htd_detail`
  - Params: all standard filters + `row_dims[dim_key]=value` for row's dimension values + `page`, `page_size` (default 10, max 50)
- **Stored procedure**: `public.get_tran_detail(join_clause text, page int, page_size int)` — builds `htd h JOIN gam g ON g.acid = h.acid AND <join_clause>`, applies `ROW_NUMBER()` pagination, joins with `eab` for `tran_date_bal`, and drops results into TEMP TABLE `tran_detail` with a `total_rows` column for pagination.
- **Service method**: `ProductionDataService#htd_detail` — builds a boolean `join_clause` string from filters + row_dims, calls the procedure inside a transaction (temp table is connection-scoped), then `SELECT * FROM tran_detail` and maps the result columns to the stable frontend names.
- **Columns returned to frontend**: `cif_id, acid, acct_num, acct_name, tran_date, tran_type, part_tran_type, tran_branch, gl_sub_head_code, entry_user, vfd_user, tran_amt, opening_bal, running_bal`
  - `opening_bal` is `eab.tran_date_bal` (same period start balance) — frontend renders it ONLY on the first row of each `(tran_date, acct_num)` pair (subsequent rows within the same date AND acct_num show empty). Grouping on acct_num matters because a cif_id may have multiple acct_nums, each with its own daily opening balance.
  - `running_bal` is `opening_bal + sum(signed_tran_amt) over (partition by acid, date order by tran_date)` — accumulated balance per row, shown on every row.
  - Both are right-aligned + NPR-formatted via `HTD_AMOUNT_COLS` set + `htdDateKey()` helper in `pivot/page.tsx`.
- **Column mapping**: Procedure returns raw HTD/GAM columns (`entry_user_id`, `vfd_user_id`, `sol_id`). Service renames them to the stable frontend keys (`entry_user`, `vfd_user`, `tran_branch`). Frontend-requested columns that do not exist in HTD or GAM (e.g. `tran_source`, `product`, `merchant`, `service`) are NOT included — they only exist in `tran_summary`.
- **`join_clause` builder** (`build_htd_join_clause`): produces a pure boolean expression (NO leading WHERE/AND — procedure prepends the `AND`). **Only row dimension values are included** — mapped to HTD/GAM columns via `HTD_DIM_MAP`. Returns `'1=1'` when no row dims apply. Global date range and categorical filters are intentionally omitted because the row itself carries the dimension values that scope the detail (e.g. a row with `tran_date=2024-02-19` and `acct_num=100011` is already fully specified).
- **Frontend components**:
  - `HtdDetailPanel` — the only renderer (header with proc-call toggle + row count, optional procedure preview, table, pagination). Reused inside the Dialog for both drill-down paths.
  - **Drill-down is modal-only via shadcn `Dialog`** — both the row-level `+` icon AND any clickable pivot cell open the same modal. Single state: `cellDrill` (PivotTable). The DialogContent uses `bg-bg-surface` + `rounded-xl border border-border` to visually match the inline panel, with `[&>div:first-child]:pr-10` reserving space for the close (X) button. `DialogTitle` is `sr-only` since the panel header already shows the dim chips.
  - Row-level `+`: opens modal with `row_dims = rowDimKeys + uniform pivotDimKeys` (when all pivot values share the same value for a given dim). Useful for aggregate drill-down ("everything for this account on this date").
  - Per-cell click: opens modal with `row_dims = rowDimKeys + this cell's pivot dim values` (decoded from the composite pivot value via `PIVOT_DIM_SEP`). Helpers: `buildCellRowDims()`, `buildCellLabel()`. Period-prefixed pivot values (e.g. `this_month:2024-03`) are excluded — only raw dim values are passed to the procedure.
  - Cells get `cursor-pointer hover:bg-accent-blue/10 hover:text-accent-blue` + `title="Click to view Transaction Details"` tooltip.
- `useHtdDetail()` hook in `useDashboardData.ts`. Pagination UI (page pills + «/»/Prev/Next) matches main pivot pagination style. `placeholderData: prev` keeps previous page visible while fetching.
- **Procedure call preview**: Response includes `sql_preview: { join_clause, page, page_size }`. `HtdDetailRow` has a `+ proc call` toggle button (top-right of the detail header) that expands a `CALL public.get_tran_detail(...)` preview using the same `SqlLine[]` / `KIND_CLS` styling as the main `get_tran_summary` preview. Uses the shared `SqlLine` type defined at the top of `pivot/page.tsx`.
- **Adding a new HTD detail column**:
  1. Update `public.get_tran_detail` procedure to SELECT the new column from `htd`/`gam`/`eab`
  2. Add the new key to `HTD_DETAIL_COLUMNS` constant in service
  3. Add a mapping line in the `rows.map` block of `htd_detail` (raw proc column → frontend key)
  4. If it's an amount-type column, update the amount-alignment check in `HtdDetailRow` (currently `col === 'tran_amt'` for `text-right` + NPR formatting)

---

## Frontend Conventions

### Component patterns
- No `useMemo`/`useCallback` inside nested components
- Module-level helper components defined **before** their parent (avoids new component type on re-render)
- `useCallback` dep arrays must include all referenced state/props

### Adding a new dimension (checklist)
1. Add to `DIMENSIONS` hash in `production_data_service.rb`
2. Add to `DIMENSION_FIELDS` array in `pivot/page.tsx`
3. If date-like → add to `DATE_DIM_KEYS` set and `DATE_FIELD_ORDER`
4. If pivot-capable (non-date) → add to `PIVOT_CAPABLE_NON_DATE` set
5. Update `skills/page.tsx` `DIMENSIONS` constant

### Adding a new measure (checklist)
1. Add to `MEASURES` hash in `production_data_service.rb` (key = column alias returned to frontend)
2. Add to `STANDARD_MEASURES` array in `pivot/page.tsx` (same key)
3. Update `skills/page.tsx` `MEASURES` constant and count (stat pill + section header)
4. Update `CLAUDE.md` MEASURES hash summary above

### TypeScript check
```bash
cd frontend && npx tsc --noEmit 2>&1 | grep "pivot/page"
```
Pre-existing errors exist in `board/`, `branch/`, `customer/`, `executive/` pages — ignore those.

### Styling

**Fonts**
- Body text: Inter → `font-sans` (CSS var `--font-sans`)
- Headings / KPI labels: Plus Jakarta Sans → `font-display` (CSS var `--font-display`)
- Numeric cells / amounts: JetBrains Mono → `font-mono` (CSS var `--font-mono`)
- `.font-mono` applies `font-variant-numeric: tabular-nums` + `letter-spacing: -0.01em` globally — do NOT override these (tabular-nums keeps NPR columns aligned across rows)
- Use `font-mono text-xs` for numeric cells in tables (NOT `text-[11px]`)
- Body font-size is **14px** (`globals.css`); Tailwind fontSize scale: `3xs=9/13` `2xs=11/15` `xs=12/16` `sm=13/19` `base=14/21` `lg=18/26` `xl=22/30` `2xl=28/36` `3xl=36/44` (size/line-height in px)
- **Table headers (`<th>`)** use `text-text-secondary` (NOT `text-text-muted`) — muted is reserved for metadata/placeholders/axis labels, secondary is for structural labels like column headings

**Design tokens** — always use Tailwind token classes, never `style={{ color: '...' }}`
- Backgrounds: `bg-bg-base`, `bg-bg-surface`, `bg-bg-card`, `bg-bg-card-hover`, `bg-bg-input`
- Borders: `border-border`, `border-border-strong`
- Text: `text-text-primary`, `text-text-secondary`, `text-text-muted` — all three tuned to pass WCAG AA in both themes (light muted = `#64748B` 4.8:1; dark muted = `#94A3B8` 7.5:1)
- Accents: `text-accent-blue`, `bg-accent-blue-dim`, etc.

**Color palette** (updated — indigo primary, not blue)
- `accent-blue` = `#6366F1` (indigo) — primary actions, active states
- `accent-green` = `#10B981` — positive, credit, growth
- `accent-red` = `#F43F5E` — negative, debit, critical
- `accent-amber` = `#F59E0B` — warning, date periods
- `accent-purple` = `#8B5CF6` — pivot / analysis
- `accent-teal` = `#14B8A6` — EAB / balance data

**Page layout pattern** — all dashboard pages use:
```tsx
<div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
```
KPI card row:
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
```
Chart grid:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
```

---

## UI Design System Rules

### shadcn/ui Components — Golden Rules

**Never create custom implementations** of these — always use shadcn:

| Need | Use | Import from |
|------|-----|-------------|
| Status badge / pill | `Badge` + `badgeColor` | `@/components/ui/badge` |
| Table | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` | `@/components/ui/table` |
| Divider line | `Separator` | `@/components/ui/separator` |
| Hover tooltip | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` | `@/components/ui/tooltip` |
| Loading state | `Skeleton` | `@/components/ui/skeleton` |
| Button | `Button` | `@/components/ui/button` |
| Dropdown / context menu | `DropdownMenu` (+ sub-components) | `@/components/ui/dropdown-menu` |

**`Pill.tsx` is deleted** — do not recreate it. Use:
```tsx
import { Badge, badgeColor } from '@/components/ui/badge';

// Static variant
<Badge className={badgeColor.green}>Active</Badge>

// Dynamic variant
<Badge className={row.risk === 1 ? badgeColor.green : badgeColor.red}>Risk</Badge>

// From function returning string
<Badge className={badgeColor[getStatus() as BadgeColor]}>...</Badge>
```

Available `badgeColor` keys: `green` · `red` · `amber` · `blue` · `purple` · `teal` · `muted`

### Class Merging

Always use `cn()` for conditional classes — never string concatenation:
```typescript
import { cn } from '@/lib/utils';

// ✅ Correct
<div className={cn('base-class', isActive && 'active-class', variant === 'blue' && 'text-accent-blue')} />

// ❌ Wrong
<div className={`base-class ${isActive ? 'active-class' : ''}`} />
```

### No Inline Style for Tokens

Never use `style={{ color: '#6366F1' }}` when a token class exists:
```tsx
// ✅ Correct
<span className="text-accent-blue">

// ❌ Wrong
<span style={{ color: '#6366F1' }}>
```

### Sidebar Collapse

The sidebar supports collapse (220px ↔ 56px icon rail). State persists in `localStorage('bankbi-sidebar-collapsed')`. The collapse toggle sets a CSS variable `--sidebar-width` on `document.documentElement` and dispatches a `sidebar-toggle` event. The dashboard `layout.tsx` uses `lg:ml-[var(--sidebar-width,220px)]` for reactive margin. Do not duplicate this logic.

### `useDashboardPage` hook — ALL dashboard pages must use this

Every dashboard page uses `useDashboardPage()` for period/filter state. Do NOT inline period management. Pattern:
```tsx
const { filters, setFilters, filtersOpen, setFiltersOpen, handleClearFilters, topBarProps } = useDashboardPage();
// For detail pages with extra filters:
const extraFilters = useMemo(() => ({ branchCode }), [branchCode]);
const { filters, ... } = useDashboardPage({ extraFilters });
// TopBar: always spread topBarProps
<TopBar title="Page Title" subtitle="..." {...topBarProps} />
```

**Exception: self-contained pages that build their own filter UI** (currently `/dashboard/segmentation`) skip `useDashboardPage` entirely and hide the TopBar period/filter chrome with `showPeriodSelector={false}` + `showFiltersButton={false}`. Use this escape hatch only when the page's filter model is genuinely different from the shared period + AdvancedFilters model — otherwise use `useDashboardPage`.

### `formatNPR` — null vs zero distinction

`formatNPR(null)` returns `'—'` (em dash), `formatNPR(0)` returns `'Rs. 0'`. This distinguishes missing data from actual zero. All KPI cards should NOT use `?? 0` fallback — let null propagate so the dash shows.

### Pivot URL state

Pivot page syncs `selectedDimensions`, `selectedMeasures`, and `page` to URL search params (`?dims=...&measures=...`). This enables shareable analysis links.

### Pivot grand totals row

`buildPivotData` appends a `__isTotal: true` row that sums all numeric pivot cells. Styled with `bg-bg-surface font-semibold sticky bottom-0`.

### KPICard `drillDownUrl` prop

KPICard accepts an optional `drillDownUrl` string. When provided, an invisible `<Link>` overlay covers the card for navigation to Pivot with pre-set dimensions.

### CSV export utility

`lib/exportCsv.ts` provides `exportTableToCsv(filename, headers, rows)`. Wire into TopBar's `onExport` prop per page.

### Error boundary

`app/dashboard/error.tsx` provides a dashboard-level Next.js error boundary with retry button. Catches runtime errors in any dashboard page.

---

## Backend Conventions

### Adding a new period comparison
1. Add entry to `PERIOD_COMPARISONS` hash in `production_data_service.rb`
2. Add `*_where` param to `ALL_PERIOD_PARAMS` in `pivot/page.tsx`
3. Add measure entries to `COMPARISON_MEASURES` in `pivot/page.tsx`
4. Add to `PERIOD_DISPLAY` map and `PERIODS` in `skills/page.tsx`

### SQL clause sanitization
`production_controller.rb` has `sanitize_sql_clause()` that whitelists tokens in `orderby_clause` and `partitionby_clause` against known DIMENSIONS/MEASURES keys. Unknown tokens reject the entire clause. This prevents SQL injection via the stored procedure.

### ORDER BY tiebreaker
The service adds `acct_num ASC` as a pagination tiebreaker ONLY when `acct_num` is in the selected dimensions (GROUP BY). Without this guard, the tiebreaker breaks grouped queries like `GROUP BY gam_branch` with a "must appear in GROUP BY" error.

Callers can opt out by sending `disable_tiebreaker=true` to `/production/explorer` (maps to `disable_tiebreaker: true` kwarg on `tran_summary_explorer`). The segmentation page uses this so RFM ranking isn't diluted by a secondary alphabetical sort on `acct_num` when scores tie. Pivot analysis leaves it unset — determinism across pages matters more than ranking purity there.

### WHERE clauses must end with a trailing space

`explorer_where_clause` and `build_period_where` both return strings that end with a space (e.g. `"WHERE 1=1 "`, `"WHERE tran_date BETWEEN ... "`). The stored procedure's internal SQL template concatenates these clauses directly with `union all` and other keywords without space padding — Postgres 16+ rejects patterns like `1=1union` (`trailing junk after numeric literal`). Any new clause-builder that feeds into `get_tran_summary` must preserve this trailing-space invariant.

### ORDER BY — outer_join_field stripping
`outer_join_field: true` dim keys (`tran_date_bal`, `eod_balance`) are stripped from the incoming `orderby_clause` before the procedure is called. The procedure applies ORDER BY inside `ROW_NUMBER() OVER(...)` in the inner CTE, where outer-join columns don't yet exist — they only resolve after the LEFT JOINs at the outer SELECT. Leaving them in produces `column "eod_balance" does not exist`. If stripping empties the clause, it falls back to `default_orderby`. Frontend may still send them; the service is the authoritative filter.

### `build_summary` — single aggregate query
`dashboards_controller.rb#build_summary` uses a SINGLE `SELECT` with `SUM(CASE WHEN ...)` for all metrics (was 8 separate queries). Returns: `total_amount`, `transaction_count`, `credit_amount`, `debit_amount`, `credit_count`, `debit_count`, `unique_accounts`, `unique_customers`, `avg_transaction_size`, `net_flow`, `credit_ratio`.

### `net_flow` — standardized formula
**Always `credit_amount - debit_amount`** across all endpoints (executive, financial, risk, KPI). Previously `risk_summary` used `signed_tranamt` column which could diverge. Do not use `signed_tranamt` for net_flow.

### `monthly_volatility` — coefficient of variation
`risk_summary` returns `monthly_volatility` as **CV percentage** = `(sample_std_dev / mean) × 100`. NOT raw standard deviation. The frontend displays it with `formatPercent()`. Typical values: 10-40%.

### Quote safety
Always use `@connection.quote(value)` or `ActiveRecord::Base.sanitize_sql_like()` — never string interpolation with user input.

### Running Rails commands
```bash
cd backend
bundle exec rails c        # console
bundle exec rails routes   # route list
bundle exec rails db:migrate
```

---

## Data Model Quick Reference

| Table | Rows | Role |
|-------|------|------|
| `tran_summary` | 164 K | Primary partitioned fact (yearly: 2021–2025) |
| `eab` | 150 K | EOD balance snapshots (acid + balance_date) |
| `htd` | 20 M+ | Raw ledger detail — always filter by tran_date |
| `gam` | 50 K | Account master (acid PK, cif_id FK) |
| `branch` / `branch_cdc` | ~100 | Branch dimension (sol_id PK) |
| `cluster` | ~10 | Cluster hierarchy above branches |
| `dates` | 7 306 | Calendar dimension (pre-computed period boundaries) |
| `gsh` | 101 | GL sub-head code → description |
| `user_branch_cluster` | — | Row-level security: user ↔ branch/cluster |

**Join pattern:** `tran_summary` ← `acid` → `eab` (LEFT JOIN, only when `tran_date_bal` selected)

**EAB as-of reference date:** The `LEFT JOIN eab` uses a reference date that is compared against `eod_date` / `end_eod_date`. When a coarse date dimension is in the GROUP BY the reference is automatically switched to that row's period-end column so every pivot row shows the balance at the end of ITS own period:

| Date dim selected | EAB reference (main query) |
|---|---|
| `year_month`   | `tb2.month_enddate` |
| `year_quarter` | `tb2.quarter_enddate` |
| `year`         | `tb2.year_enddate` |
| *none of the above (or `tran_date` only)* | `calc_end_date` (global filter end) |

When one of these dims is selected, the service injects its matching `*_enddate` column into `select_inner` and `groupby_clause` so `tb2.*_enddate` is available for the join. The enddate columns are stripped from the response rows before returning (`SUPPRESSED_OUTER_COLUMNS`) — they are an internal implementation detail, not user-visible columns. Finest-granularity wins if several are selected (`year_month` > `year_quarter` > `year`). Comparison queries always use `calc_end_date` because their GROUP BY excludes the date dim, so tb2 does not contain the `*_enddate` column.

---

## Available Skills (Superpowers v5.0.7)

Invoke with the `Skill` tool before any significant task:

| Skill | When to use |
|-------|------------|
| `brainstorming` | Before starting any new feature |
| `systematic-debugging` | When a bug isn't obvious |
| `writing-plans` | Before complex multi-file changes |
| `executing-plans` | While working through a plan |
| `test-driven-development` | When adding testable backend logic |
| `requesting-code-review` | After completing a feature |
| `finishing-a-development-branch` | Before merging |
| `subagent-driven-development` | For large parallel tasks |
| `verification-before-completion` | Final check before declaring done |

---

## Page Status

| Route | Status | Notes |
|-------|--------|-------|
| `/dashboard/pivot` | ✅ Live | Full pivot analysis, two-tier Excel-style headers |
| `/dashboard/executive` | ✅ Live | KPIs, trend charts |
| `/dashboard/branch` | ✅ Live | Branch performance |
| `/dashboard/branch/[code]` | ✅ Live | Branch detail |
| `/dashboard/customer` | ✅ Live | Customer portfolio |
| `/dashboard/customer/[cifId]` | ✅ Live | Customer detail |
| `/dashboard/segmentation` | ✅ Live | Customer Segmentation — RFM score ranking. Self-contained page (NO TopBar period / AdvancedFilters). Inline pivot-style controls: dim checkboxes (`acct_num, acct_name, cif_id, acid, gam_branch, gam_province`) with per-dim multi-value filters, + measure checkboxes (`rfm_score, tran_amt, tran_count, tran_maxdate`) with per-measure comparison filter (`= <= >= < >`) and asc/desc sort. Uses `production/explorer`; omits `orderby_clause` when sort = default `rfm_score DESC` so the full composite `order_sql` applies. `TopBar` invoked with `showPeriodSelector={false} showFiltersButton={false}`. |
| `/dashboard/skills` | ✅ Live | Platform Guide / Data Dictionary |
| `/dashboard/financial` | ✅ Live | Financial summary — CR/DR/net, monthly trend, GL breakdown |
| `/dashboard/digital` | ✅ Live | Digital channels — `digital_channels` endpoint |
| `/dashboard/kpi` | ✅ Live | KPI tree — `kpi_summary` endpoint |
| `/dashboard/risk` | ✅ Live | Risk summary — `risk_summary` endpoint |
| `/dashboard/employer` | ✅ Live | Employer/payroll — `employer_summary` endpoint |
| `/dashboard/employer/[userId]` | ✅ Live | Employee detail — `employee_detail` endpoint |
| `/dashboard/config` | ✅ Live | DB browser — `production/catalog` + `production/table` |
| `/dashboard/users` | ✅ Live | User management — `GET/POST/PATCH/DELETE /users` |
| `/dashboard/profile` | ✅ Live | Profile page — reads/writes localStorage only |
| `/dashboard/scheduled` | ✅ Live | Data dictionary — `production/catalog` + `production/table` |
| `/dashboard/board` | 🔧 Scaffold | Imports executive API but renders no data — board UI not built |
| `/dashboard/loans` | 🏷️ Placeholder | Loan portfolio dashboard with sector-average sample data (NPL 4.44%, LDR 85%). Uses `PlaceholderBanner` + `PlaceholderPanel`. Wire loan-master feed to replace `SAMPLE_*` constants. |
| `/dashboard/deposits` | 🏷️ Placeholder | Deposit portfolio — CASA, cost of funds, top depositors. Sample data aligned to sector averages. Wire deposit-master + daily COF feed. |
| `/dashboard/regulatory` | 🏷️ Placeholder | NRB Basel III ratios — CAR, CCAR, NPL, LDR, CD. Sample values from NRB FSR 2022/23. Wire capital ledger + NRB returns feed. Linked from Executive Overview via `NrbComplianceStrip`. |

---

## Comparison Period Architecture (important)

The comparison query is a **second call** to `get_tran_summary` with the period's WHERE clause. Key design decisions:

- **Reference date split by period type**:
  - **"THIS" periods** (`thismonth`, `thisyear`) → use **end_date** (max of user's range) as reference
  - **"PREV" periods** (`prevdate`, `prevmonth`, `prevyear`, `prevmonthmtd`, `prevyearytd`, `prevmonthsamedate`, `prevyearsamedate`) → use **start_date** (min of user's range) as reference
  - Example: range `2024-02-01 → 2024-03-15` with "This Month" → `WHERE tran_date BETWEEN '2024-03-01' AND '2024-03-31'` (full March, based on end_date). With "Prev Date" → `WHERE tran_date = '2024-01-31'` (day before start_date).
- **Comparison GROUP BY excludes date dimensions** — If we kept `GROUP BY acct_num, tran_date` for "this month", the comparison would return 28 separate rows (one per day in Feb), and pagination would cut most off. The first row is often the same date as the main filter, making comparison values look identical to main values.
- **Fix (implemented)**: `comparison_inner_dim_keys` excludes date dims. Comparison returns **one aggregated row per account** summing the whole period.
- **Date dim is stamped with period-natural label**: After the comparison query, `sanitized[date_dim] = "#{period_label}:#{stamp_date}"` where `stamp_date` is computed by `period_stamp_date(period:, reference_date:)`:
  - `thismonth` → `"2024-03"` (YYYY-MM, from end_date)
  - `thisyear` → `"2024"` (YYYY, from end_date)
  - `prevmonth` → `"2024-01"` (YYYY-MM, from start_date)
  - `prevyear` → `"2023"` (YYYY, from start_date)
  - `prevdate` → `"2024-01-31"` (YYYY-MM-DD, from start_date)
  - So the pivot column is `"this_month:2024-03"`, displayed as `THIS MONTH / 2024-03`.
- **Comparison restricted to current page**: `dim_value_clauses` restricts comparison query to `acct_num IN (...)` values from the current main page, so comparison columns never show data for different accounts.
- **ORDER BY**: comparison uses measure-based ORDER BY (`SUM(tran_amt) DESC`), never the date-based ORDER BY from the main query.

---

## Known Issues / Tech Debt

- Shared aggregate interfaces (`BranchMetrics`, `ProvinceMetrics`, `ChannelMetrics`, `TrendData`, `SegmentData`) extend `Record<string, unknown>` so they are directly assignable to chart `data` props that read via dynamic keys. If you add a new shape that's consumed by `PremiumBarChart`, `PremiumLineChart`, `PremiumAreaChart`, `PremiumComposedChart`, or `PremiumScatterChart`, extend the same way — or cast at call site.
- `eod_balance` was removed from `DIMENSIONS` in the service and pivot page — it does not exist in `tran_summary` directly; use `tran_date_bal` (from EAB outer join) instead
- **Sidebar dimensions are sourced from `data dictionary.xlsx`** (rows where `type = "dimension"`) — 25 entries (`tran_date_bal` and `eod_balance` are additions on top of the 23 raw dict dims). `gam_solid` is not in the dimension sidebar (not in the dict); the backend `DIMENSIONS` hash retains it for URL-param backward compatibility. `tran_date_bal` is listed in the Dimensions sidebar but renders as a measure column under pivoted headings (via `DISPLAY_AS_MEASURE_DIMS` in `pivot/page.tsx`). `eod_balance` (GAM Balance) is a normal dimension that renders as a row label.
- **Dimension prerequisites** (`DIM_PREREQS` in `pivot/page.tsx`) gate dims that depend on a companion selection:
  - `tran_date_bal` → requires a date dim (year / quarter / month / day) to resolve the EAB as-of date
  - `eod_balance` → requires an account identifier (`cif_id` / `acid` / `acct_num`) for the GAM join to be unique
  The UI disables the sidebar row with an explanatory tooltip when the prereq isn't met, and `toggleDimension` cascades the drop so deselecting the last companion removes any dependent dim automatically.
- **Pivot defaults are empty.** `selectedDimensions` and `selectedMeasures` start as `[]`. The pivot hook is gated on `dimensions.length > 0` only — **measures are optional**. When no measure is selected the query becomes `SELECT <dims> GROUP BY <dims>` (distinct dim-value combinations). The backend `tran_summary_explorer` handles this: it strips the leading `, ` before measures in `select_inner`, falls back to ORDER BY first dim when no measure exists, and skips the comparison block entirely when `selected_measures` is empty (comparisons are measure-dependent). The pivot page shows a "Select at least one dimension to start" empty-state card when `selectedDimensions.length === 0`.
- `DATE_FIELD_ORDER` enforces fixed date ordering: `year → year_quarter → year_month → tran_date`
- Legacy measure aliases (`total_amount`, `transaction_count`, `unique_accounts`, `unique_customers`, `credit_amount`, `debit_amount`, `net_flow`) remain in the backend MEASURES hash for backwards compatibility but are no longer shown in the pivot sidebar — canonical data-dictionary keys are used instead (`tran_amt`, `tran_count`, etc.)
- `rfm_score` is no longer in the Pivot sidebar's `STANDARD_MEASURES`. It is still a valid backend measure (used by `/dashboard/segmentation`), but intentionally hidden from generic pivoting because it's a composite formula — mixing it with other aggregates in arbitrary pivot layouts produces meaningless column comparisons. To add RFM elsewhere, call `production/explorer` with `measures=rfm_score` directly.
- `AdvancedDataTable.tsx` still uses hand-rolled table primitives — future work to migrate internals to shadcn `Table` components
- `Select.tsx` / `SearchableMultiSelect` kept as-is (complex search+checkbox multi-select not achievable with shadcn Select); shadcn `select.tsx` is available for new simple single-select usage going forward
- API auth is optional (`authenticate_user_optional!` in BaseController) — TODO: switch to required auth once frontend auth flow is fully hardened
- `customer/page.tsx` segment/risk charts derive from top-20 customers only — should use a dedicated backend aggregate
- `FY` period start date hardcoded to July 16 — Nepal's fiscal year start varies by Bikram Sambat calendar (±1-2 days)
- `db/scripts/performance_indexes.sql` contains 4 pending indexes for DBA execution (eab composite, year_month, entry_user, gl_sub_head_code)
- Risk page thresholds now configurable via env vars: `RISK_HIGH_VALUE_THRESHOLD`, `RISK_CONCENTRATION_WARN/HIGH`, `RISK_VOLATILITY_WARN/HIGH`
- `digital_channels` assumes NULL `tran_source` = branch — verify with data owners
- **Numeric/decimal PG columns are returned as JSON strings** (Rails serializes `BigDecimal` as string). Frontend must coerce with `Number(v)` before arithmetic (e.g., TOTAL row summation in `buildPivotData`) and before passing to `formatNPR`. The `renderCell()` helper handles this automatically by detecting numeric-looking strings via `/^-?\d+(\.\d+)?$/`. When writing new components that consume measure columns, always coerce.
- Hover row backgrounds must use theme tokens (`hover:bg-row-hover`), not hardcoded `rgba(255,255,255,0.04)` which is invisible on white in light theme. `--row-hover` adapts automatically: white-tint on dark, slate-tint on light.
- Card / panel shadows must use `style={{ boxShadow: 'var(--shadow-card)' }}` (or `var(--shadow-freeze-divider)` for sticky-column dividers), never hardcoded `rgba(0,0,0,0.xx)` values. Heavy black shadows look muddy on white in light theme; these tokens automatically switch to softer slate-tinted shadows.
- Brand / avatar gradients must use `var(--gradient-brand)` and `var(--gradient-avatar)` tokens (globals.css), not inline hex gradients.
- **Default theme is LIGHT.** The inline script in `app/layout.tsx` sets `data-theme="light"` unless the user has saved a preference in `localStorage('bankbi-theme')`. Does NOT follow OS `prefers-color-scheme`.
- **Placeholder pages pattern** (for features awaiting data-source integration): use `PlaceholderBanner` at the top of the page and `PlaceholderPanel` for individual "not connected" cards. Pages `/loans`, `/deposits`, `/regulatory` follow this pattern with sector-average sample data. Sample constants are all named `SAMPLE_*` so replacing them with live feeds is a search-and-replace. Do NOT delete the sample constants until the replacement feed is tested — the placeholder UI relies on them to render the layout.
- **Filter set is fixed by what the backend WHERE clauses support.** Valid filter keys (DashboardFilters + backend `filter_params`): `province, branchCode, cluster, tranProvince, tranCluster, tranBranch, solid, tranType, partTranType, tranSource, product, service, merchant, glSubHeadCode, entryUser, vfdUser, acctNum, cifId, acctName, acid, minAmount, maxAmount` + date-dimension filters (`tranDate, yearMonth, yearQuarter, year` with exact + from/to). GAM-side (`province, branchCode, cluster`) and TRAN-side (`tranProvince, tranCluster, tranBranch`) are first-class separate filters backed by distinct columns in `tran_summary`. `district`, `municipality`, `schemeType` were removed — they were rendered but produced no SQL. Adding a new filter requires adding it to: (1) `DashboardFilters` type, (2) `toApiFilters()` serializer, (3) backend `filter_params`, (4) `explorer_where_clause` WHERE generation, (5) `AdvancedFilters.tsx` (if needed in the UI), (6) `filter_values` endpoint + `FilterValuesResponse` type (if it needs a dropdown).
- **Filter dropdowns come from `public.get_static_data(<type>)`, not `SELECT DISTINCT`.** `FiltersController#values` calls `ProductionDataService#static_lookup(type)` for each of: `branch, cluster, province, gsh, product, service, merchant, acctnum, acid, cifid, user`. The procedure returns `{name, value}` rows dropped into temp table `static_data` (connection-scoped, so the call runs inside `with_connection`). `FilterValuesResponse` fields are typed `LookupOption[]` (`{ name: string; value: string }`) — display `name` in the UI, submit `value` to the filter payload. The `LookupOption → { value, label: name }` adapter is inlined at each consumer (pivot `getOptions`, segmentation `opts`, AdvancedFilters). `tran_type`, `part_tran_type`, and `tran_source` are intentionally NOT in `filter_values`: they render as free-text chip inputs (`MultiValueChipInput`) because their values are short and user-driven, and the cardinality didn't warrant a dropdown.
- **Filter values cached once per session.** `useFilterValues` uses `staleTime: Infinity` and `refetchOnWindowFocus: false` — dropdowns populate on first mount and never refetch for the life of the browser tab. This is deliberate (the underlying `static_data` lookup is near-static), so don't add a TTL. If a new value must appear, the user reloads.
- **Account-scoped filters are all multi-value.** `acctNum`, `cifId`, `acctName`, `acid` accept `string | string[]`. Exact-match on numeric-like columns (`acct_num::text IN (...)`, `acid::text IN (...)`). Partial-match on text columns (`cif_id::text ILIKE 'a%' OR cif_id::text ILIKE 'b%' ...`, same for `acct_name`). `tran_summary.rb#apply_partial_text_filter` handles array values via OR'd ILIKE placeholders — keep it array-safe when adding text-filter columns.
- **Measure-level HAVING filters via structured params.** `production/explorer` accepts `having[<measure_key>][op]=<op>&having[<measure_key>][value]=<val>` where `<op>` is one of `= <= >= < >` and `<val>` is numeric (or ISO date for `tran_maxdate`). Whitelist lives in `HAVING_EXPR` in `production_controller.rb` and must mirror each measure's `select_sql` aggregate. Frontend sends these through the `havingFilters` param of `useProductionExplorer`. The controller builds a safe `HAVING ...` string — raw HAVING input from the client is never accepted. Used by `/dashboard/segmentation` and `/dashboard/pivot` for per-measure thresholds (standard measures only — comparison measures like `thismonth_amt` are not in `HAVING_EXPR`).
- **Pivot per-measure sort direction.** Pivot page `orderFields: string[]` tracks which keys are in the ORDER BY list; companion `orderDirs: Record<string, 'asc' | 'desc'>` tracks direction per key. The sort button on each measure row cycles OFF → DESC → ASC → OFF. `orderbyClause` appends ` DESC` only for keys flipped to desc (ASC is the implicit SQL default, leaving it off keeps the sanitizer's token whitelist happy). The backend also substitutes measure aliases (e.g. `rfm_score`, `tran_amt`) with their `order_sql` aggregate expression before passing the clause to `get_tran_summary`, because PG doesn't resolve SELECT-list aliases inside window-function ORDER BY at the inner CTE level.
- **Pivot per-dim filter modes.** Date dims (`tran_date`, `year_month`, `year_quarter`, `year`) offer `Multi | Range` — no Single mode (Multi with one chip is equivalent). Default is `Multi`; state lives in `dateFilterModes`. Categorical dims (dropdown-backed: `gam_branch`, `cif_id`, `acid`, `acct_num`, `gsh`, `product`, `service`, `merchant`, `cluster`, `province`, TRAN-side variants) offer `Single | Multi`; state lives in `categoricalFilterModes`, default `multi`. Single mode uses `SearchableMultiSelect mode="single"` which replaces the value instead of toggling and closes on selection; Multi mode is the standard multi-select with "Select all / Clear" bar. Switching modes clears the current filter value for that dim to prevent carrying stale multi-selections into single mode. Text / text-multi dims (`acct_name`, `tran_type`, `part_tran_type`, `tran_source`) retain free-text chip inputs (`MultiValueChipInput`) unchanged.
- **Detail pages use `useDashboardPage({ extraFilters })`** to pin a dimension (e.g., `cifId`, `branchCode`). This keeps the period/filter panel state identical to list pages while preventing accidental clearing of the pinned filter. Pages using this pattern: `branch/[branchCode]`, `customer/[cifId]`. Do NOT build custom period state on detail pages.
