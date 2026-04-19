# Merge Customer & Portfolio into Customer Segmentation

**Date:** 2026-04-19
**Status:** Approved (brainstorm), pending implementation plan
**Owner:** prem

---

## Goal

Consolidate the Customer & Portfolio dashboard into the Customer Segmentation page. Customer Segmentation already lists every customer (RFM-ranked); adding a portfolio summary (KPI cards + charts) makes the standalone Customer & Portfolio list page redundant.

All data on the merged page must come from the same `public.get_tran_summary` procedure call pattern that already powers the segmentation table — no mixed data sources.

## Non-goals

- Modifying the customer detail page (`/dashboard/customer/[cifId]`) beyond a single back-link change.
- Adding a period selector to the merged page (intentionally absent — all-time data, consistent with current segmentation behavior).
- Recreating the existing "Segmentation by tier" or "Risk Tier Distribution" charts (those required `segment` / `risk_tier` columns from the Rails `customers` table; portfolio-by-province and portfolio-by-branch replace them).
- Changing the segmentation page's existing inline dim/measure controls or the RFM ranking algorithm.

## User-visible behavior

The merged Customer Segmentation page renders top-to-bottom:

1. **TopBar** — title "Customer Segmentation", existing subtitle. Period selector and filters button stay hidden.
2. **Procedure Call panel** (collapsible) — tabbed view across the four `get_tran_summary` calls that power the page: `[Summary]` `[Provinces]` `[Branches]` `[Ranked Customers]`.
3. **KPI row** (4 cards): Total Customers · Portfolio Value · Active Accounts · Avg per Customer.
4. **Charts row** (2 cards): Top Provinces by Portfolio · Top Branches by Portfolio (both `PremiumBarChart`, top 10).
5. **Inline SegmentationControls** (existing) — dim checkboxes + dim filters + measure checkboxes + measure HAVING filters + sort.
6. **Top Customers by RFM** table (existing). The CIF column becomes a `<Link>` that navigates to `/dashboard/customer/[cifId]`.

The standalone `/dashboard/customer` route is removed (returns 404). Sidebar entry "Customer & Portfolio" is removed; "Customer Segmentation" remains and now also highlights when the user is on a customer detail page.

## Architecture

### Data layer — four `production/explorer` calls, one filter source

Every call uses the same `apiFilters` derived from the inline dim filters. When the user picks a province / branch / cif in controls, all four calls re-fetch.

| # | Purpose            | dimensions       | measures                                                  | page_size | orderby                | Notes |
|---|--------------------|------------------|-----------------------------------------------------------|-----------|------------------------|-------|
| 1 | KPI summary        | `[]`             | `tran_amt, tran_count, tran_acct_count, unique_customers` | 1         | (default)              | Returns one row of grand totals |
| 2 | Top Provinces chart| `[gam_province]` | `tran_amt`                                                | 10        | `ORDER BY tran_amt DESC` | |
| 3 | Top Branches chart | `[gam_branch]`   | `tran_amt`                                                | 10        | `ORDER BY tran_amt DESC` | |
| 4 | Main RFM table     | user-selected    | user-selected                                             | 200       | user-selected (default RFM DESC) | Existing call, unchanged |

All four pass `disableTiebreaker=true` (avoids the `acct_num ASC` pagination tiebreaker diluting the chart/KPI ordering).

### New backend measure: `unique_customers`

Add to `MEASURES` hash in `backend/app/services/production_data_service.rb`:

```ruby
'unique_customers' => {
  label: 'Unique Customers',
  select_sql: 'COUNT(DISTINCT cif_id) AS unique_customers',
  order_sql:  'COUNT(DISTINCT cif_id) DESC',
}
```

Also add to `HAVING_EXPR` whitelist in `backend/app/controllers/api/v1/production_controller.rb` for completeness:

```ruby
'unique_customers' => 'COUNT(DISTINCT cif_id)',
```

The measure is **excluded** from `STANDARD_MEASURES` in `frontend/app/dashboard/pivot/page.tsx` and from `MEASURE_DEFS` in `frontend/app/dashboard/segmentation/page.tsx`. It is an internal-use measure (mirrors the rationale already documented for `rfm_score`: composite-style measures don't pivot meaningfully alongside row-level aggregates).

### Frontend changes

**`frontend/app/dashboard/segmentation/page.tsx`** (modified):

- Add three additional `useProductionExplorer(...)` hook calls (calls 1, 2, 3 above) keyed by `apiFilters`.
- Compute KPI numerics from call 1's single row; coerce to `Number` per CLAUDE.md numeric-string rule.
- Render a 4-card KPI row (`grid grid-cols-2 sm:grid-cols-4 gap-4`), token-driven `iconBg` colors, all values via `formatNPR` / `toLocaleString` / `KPICard`.
- Render a 2-card chart row (`grid grid-cols-1 lg:grid-cols-2 gap-4`); each card uses `ChartCard` + `PremiumBarChart`.
- Replace the single SQL preview block with a tabbed view across all four call previews. Reuse the existing `SqlLine` / `KIND_CLS` styling.
- Wrap the CIF cell in `<Link href={`/dashboard/customer/${encodeURIComponent(cifId)}`}>` with `text-accent-blue hover:underline` styling.

**`frontend/app/dashboard/customer/[cifId]/page.tsx`** (modified, one line):

- Change back-link `href="/dashboard/customer"` → `href="/dashboard/segmentation"` and label "← Back to Customer & Portfolio" → "← Back to Customer Segmentation".

**`frontend/components/layout/Sidebar.tsx`** (modified):

- Remove the "Customer & Portfolio" `<NavItem>` block (~lines 186–200).
- Broaden Customer Segmentation active condition: `pathname === '/dashboard/segmentation'` → `pathname?.startsWith('/dashboard/segmentation') || pathname?.startsWith('/dashboard/customer/') ?? false`.

**`frontend/app/dashboard/customer/page.tsx`** (deleted).

### Documentation updates

**`CLAUDE.md`** (Rule 3):

- MEASURES hash summary — append `unique_customers` entry; bump canonical-measure-keys count from 10 → 11.
- Page Status table — remove the `/dashboard/customer` row; rewrite the `/dashboard/segmentation` row to describe the new KPI+charts+table layout, the four-call data flow, and the CIF-link → detail-page handoff.
- Customer detail page note — clarify it is still reached via the segmentation table CIF link (no longer reached from a list page).

**`frontend/app/dashboard/skills/page.tsx`** (Rule 2):

- `MEASURES` constant: add `unique_customers` entry; bump count in stat pill and section header.
- Page Status table: drop the Customer & Portfolio row; rewrite the Customer Segmentation row.

## Loading & error states

- KPI cards: render value `'—'` (em dash) while call 1 is loading. `formatNPR(null)` already produces this.
- Charts: render `<ChartEmptyState title="Loading…" />` while their respective call is loading; `<ChartEmptyState title="No data" />` when zero rows.
- Main table: existing `StandardDashboardSkeleton` covers full-page initial load when call 4 is loading.
- Errors are isolated per call. A failed chart call shows `<ChartEmptyState title="Failed to load" />` but does not block the table or other cards.

## Edge cases

- **No filters applied** → KPIs show all-time totals across the entire database; charts show top 10 globally. This is the intended baseline view.
- **User filters to a single CIF** → KPIs recompute (`unique_customers = 1`, totals = that customer's totals); charts show 1–2 bars. No crash.
- **`unique_customers` with `cif_id` filter** → `COUNT(DISTINCT cif_id)` correctly returns 1.
- **Detail-page back-link** → always returns to `/dashboard/segmentation` regardless of how the user arrived (acceptable because there is no other list-page surface for customers).
- **Direct navigation to deleted route** → `/dashboard/customer` returns Next.js 404; no redirect added (the dynamic `[cifId]` route remains intact).

## Testing

**Per-CLAUDE.md golden rules:**

1. Run baselines before any change:
   - `cd frontend && npm test`
   - `cd backend && bundle exec rspec`
2. Implement the changes.
3. Re-run both suites.
4. `cd frontend && npx tsc --noEmit 2>&1 | grep "segmentation/page\|customer/\[cifId\]\|skills/page"` — no new errors in those files.

**New backend test** (`backend/spec/services/production_data_service_spec.rb`):

- Assert `ProductionDataService::MEASURES['unique_customers'][:select_sql]` equals `'COUNT(DISTINCT cif_id) AS unique_customers'`.
- Run an explorer query with `measures: ['unique_customers']` and assert the returned `sql_preview.select_inner` contains `COUNT(DISTINCT cif_id)`.

**Manual smoke test:**

1. `/dashboard/segmentation` loads — KPI row populates within ~2s, both charts render, table populates.
2. Pick a province in inline controls → all four sections re-fetch and update consistently.
3. Click a CIF link in the table → navigates to `/dashboard/customer/<cifId>`. Back-link returns to `/dashboard/segmentation`.
4. `/dashboard/customer` returns 404.
5. Sidebar highlights "Customer Segmentation" both on the segmentation page and on the customer detail page.
6. Procedure Call panel — switch tabs, verify each tab shows that call's `get_tran_summary(...)` parameters.

## Files changed (summary)

```
backend/app/services/production_data_service.rb       # add unique_customers measure
backend/app/controllers/api/v1/production_controller.rb # add unique_customers to HAVING_EXPR
backend/spec/services/production_data_service_spec.rb # add measure assertion + sql_preview check
frontend/app/dashboard/segmentation/page.tsx          # KPIs + charts + tabbed SQL preview + CIF link
frontend/app/dashboard/customer/page.tsx              # DELETE
frontend/app/dashboard/customer/[cifId]/page.tsx      # back-link href + label
frontend/components/layout/Sidebar.tsx                # remove Customer & Portfolio NavItem; broaden Segmentation active state
frontend/app/dashboard/skills/page.tsx                # MEASURES count + Page Status table
CLAUDE.md                                             # MEASURES hash summary + Page Status table
```
