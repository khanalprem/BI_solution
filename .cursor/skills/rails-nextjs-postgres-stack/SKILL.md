---
name: rails-nextjs-postgres-stack
description: Full-stack implementation guide for this BankBI codebase (Rails API + Next.js app + PostgreSQL tran_summary data model).
---

# Rails + Next.js + PostgreSQL (BankBI)

Use this skill when making end-to-end changes across backend API, frontend dashboards, and database-backed analytics.

## Actual Project Layout

Backend:
- `backend/app/controllers/api/v1/`
- `backend/app/services/`
- `backend/app/models/` (notably `TranSummary`)
- `backend/config/routes.rb`

Frontend:
- `frontend/app/` (App Router)
- `frontend/components/`
- `frontend/lib/` (API client, hooks, formatters)
- `frontend/types/index.ts`

## Runtime Defaults

- Frontend URL: `http://localhost:3000`
- API base URL: `http://localhost:3001/api/v1`
- Frontend env key: `NEXT_PUBLIC_API_URL`

## Data Model Reality

Primary analytics source is existing table `tran_summary`.
Do not create replacement fact tables unless there is a migration plan.

Core columns used in filters/aggregations:
- `tran_date`, `tran_amt`, `tran_count`
- `gam_province`, `gam_branch`, `gam_cluster`, `gam_solid`
- `tran_type`, `part_tran_type`, `tran_source`
- `product`, `service`, `merchant`
- `acct_num`, `cif_id`

## End-to-End Change Workflow

1. Backend: add/adjust endpoint and aggregation logic.
2. Backend: preserve filter alias support in `BaseController`.
3. Frontend: add/update typed hook and query params mapping.
4. Frontend: update `types/index.ts` to match API.
5. Frontend page: wire real data into KPI/chart/table components.
6. Validate with lint/build and syntax checks.

## Date and Period Handling

Important for this repo:
- Dashboard period presets (`MTD`, `QTD`, etc.) should be able to anchor to latest dataset date, not only system date.
- Use `/filters/statistics` as reference for available date window.

## Performance and Stability Rules

- Cache read-heavy dashboard/filter endpoints.
- Keep DB aggregation in SQL (`group`, `sum`, `distinct`) instead of Ruby post-processing.
- Keep API payload keys stable to avoid frontend regressions.
- Avoid duplicate type definitions; maintain one shared type source in `frontend/types/index.ts`.

## Release Checklist

- `frontend`: `npm run lint` and `npm run build` pass.
- `backend`: changed Ruby files pass syntax check.
- No stray progress/debug markdown files are introduced.
- API and frontend type contracts remain aligned.
