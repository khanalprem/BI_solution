---
name: rails-nextjs-postgres-stack
description: Full-stack implementation guide for this BankBI codebase (Rails API + Next.js app + PostgreSQL tran_summary data model).
---

# Rails + Next.js + PostgreSQL (BankBI)

Use this skill when making end-to-end changes across backend API, frontend dashboards, and database-backed analytics.

## Actual Project Layout

Backend:
- `backend/app/controllers/api/v1/` — Dashboard + filter endpoints
- `backend/app/services/` — `DynamicDashboardService`, `SegmentClassifier`
- `backend/app/models/` — `TranSummary`, `Eab`, `Branch`, `Customer`
- `backend/config/routes.rb`

Frontend:
- `frontend/app/dashboard/layout.tsx` — Shared layout (Sidebar + main wrapper)
- `frontend/app/dashboard/*/page.tsx` — Dashboard pages (14 routes)
- `frontend/components/` — UI primitives + layout
- `frontend/lib/` — API client, hooks, formatters
- `frontend/types/index.ts` — All TypeScript interfaces

Data:
- `data/sql/` — PostgreSQL stored procedures
- `data/samples/` — CSV sample data
- `data/README.md` — Schema documentation

## Runtime Defaults

- Frontend URL: `http://localhost:3000`
- API base URL: `http://localhost:3001/api/v1`
- Frontend env key: `NEXT_PUBLIC_API_URL`

## Data Model

Primary analytics source is existing table `tran_summary` (id-less fact table).
Do not create replacement fact tables unless there is a migration plan.

Core columns used in filters/aggregations:
- `tran_date`, `tran_amt`, `tran_count`
- `gam_province`, `gam_branch`, `gam_cluster`, `gam_solid`
- `tran_type`, `part_tran_type`, `tran_source`
- `product`, `service`, `merchant`
- `acct_num`, `cif_id`

## End-to-End Change Workflow

1. Backend: add/adjust endpoint and aggregation logic.
2. Backend: preserve filter alias support in `BaseController#filter_params`.
3. Frontend: add/update typed hook in `frontend/lib/hooks/useDashboardData.ts`.
4. Frontend: update `frontend/types/index.ts` to match API response.
5. Frontend page: wire real data into KPI/chart/table components.
6. Validate with lint/build and syntax checks.

## Key Architecture Patterns

### Selective Aggregation
`DynamicDashboardService#execute(only:)` accepts an array of section keys.
Each controller action should only request the sections it needs:
```ruby
service.execute(only: %i[summary by_branch by_province])
```
Do NOT call `execute` without `only:` unless you need all five sections.

### Shared Dashboard Layout
`frontend/app/dashboard/layout.tsx` provides Sidebar + main container.
Individual pages should NOT import `Sidebar` directly.
Each page renders its own `<TopBar>` with page-specific props.

### Filter Values via React Query
Use `useFilterValues()` from `useDashboardData.ts` for filter dimension values.
Do NOT fetch filter values with raw `useEffect` + axios calls.

### Segment Classification
Use `SegmentClassifier.segment_for(amount)` and `SegmentClassifier.risk_tier_for(avg)`
instead of inline case statements. Single source of truth.

### Cache Strategy
- Dashboard endpoints: 15 minutes
- Filter dimension values: 1 hour
- Filter statistics: 30 minutes
- Cache keys include resolved (not raw) dates to prevent stale data

## Date and Period Handling

- Dashboard period presets (`MTD`, `QTD`, etc.) anchor to latest dataset date from `/filters/statistics`.
- Use `toLocalDate()` and `toIsoDate()` from `frontend/lib/formatters.ts` for date parsing.
- Do NOT use `new Date("YYYY-MM-DD")` directly (timezone shift risk).

## Performance Rules

- Use `only:` parameter in `DynamicDashboardService#execute` to avoid running unnecessary queries.
- Cache read-heavy endpoints with appropriate TTLs.
- Keep DB aggregation in SQL (`GROUP BY`, `SUM`, `DISTINCT`) instead of Ruby post-processing.
- Use composite indexes (see migration `20260406000001_add_composite_indexes_to_tran_summary`).

## Release Checklist

- `frontend`: `npm run lint` and `npm run build` pass.
- `backend`: changed Ruby files pass syntax check.
- No stray progress/debug markdown files are introduced.
- API and frontend type contracts remain aligned.
- No `import { Sidebar }` in individual dashboard pages.
