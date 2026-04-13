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
  'tran_date_bal'  => { label: 'TRAN Date Balance', sql: 'e.tran_date_bal',
                         eab_required: true, outer_join_field: true },
  # ... see service file for full list
}
```

- `eab_required: true` → adds `LEFT JOIN eab ON ...` to the query
- `outer_join_field: true` → field lives in outer SELECT only (cannot be in GROUP BY)

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
  # Legacy aliases kept for backwards compatibility:
  # 'total_amount', 'transaction_count', 'unique_accounts', 'unique_customers',
  # 'credit_amount', 'debit_amount', 'net_flow'
}
```

All 9 canonical keys exist as columns in `tran_summary` (confirmed from `information_schema`).
`tran_date_bal` is a DIMENSION (EAB join), not a MEASURE — do not add it to MEASURES.

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
- Use `font-mono text-xs` for numeric cells in tables (NOT `text-[11px]`)

**Design tokens** — always use Tailwind token classes, never `style={{ color: '...' }}`
- Backgrounds: `bg-bg-base`, `bg-bg-surface`, `bg-bg-card`, `bg-bg-card-hover`, `bg-bg-input`
- Borders: `border-border`, `border-border-strong`
- Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`
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

- Pre-existing TypeScript errors in `board/`, `branch/`, `customer/`, `executive/` pages (unrelated to pivot work)
- `eod_balance` was removed from `DIMENSIONS` in the service and pivot page — it does not exist in `tran_summary` directly; use `tran_date_bal` (from EAB outer join) instead
- `DATE_FIELD_ORDER` enforces fixed date ordering: `year → year_quarter → year_month → tran_date`
- Legacy measure aliases (`total_amount`, `transaction_count`, `unique_accounts`, `unique_customers`, `credit_amount`, `debit_amount`, `net_flow`) remain in the backend MEASURES hash for backwards compatibility but are no longer shown in the pivot sidebar — canonical data-dictionary keys are used instead (`tran_amt`, `tran_count`, etc.)
- `AdvancedDataTable.tsx` still uses hand-rolled table primitives — future work to migrate internals to shadcn `Table` components
- `Select.tsx` / `SearchableMultiSelect` kept as-is (complex search+checkbox multi-select not achievable with shadcn Select); shadcn `select.tsx` is available for new simple single-select usage going forward
- API auth is optional (`authenticate_user_optional!` in BaseController) — TODO: switch to required auth once frontend auth flow is fully hardened
- `customer/page.tsx` segment/risk charts derive from top-20 customers only — should use a dedicated backend aggregate
- `FY` period start date hardcoded to July 16 — Nepal's fiscal year start varies by Bikram Sambat calendar (±1-2 days)
- `db/scripts/performance_indexes.sql` contains 4 pending indexes for DBA execution (eab composite, year_month, entry_user, gl_sub_head_code)
- Risk page thresholds now configurable via env vars: `RISK_HIGH_VALUE_THRESHOLD`, `RISK_CONCENTRATION_WARN/HIGH`, `RISK_VOLATILITY_WARN/HIGH`
- `digital_channels` assumes NULL `tran_source` = branch — verify with data owners
