---
name: bankbi-advanced-analytics
description: Implementation guide for advanced analytics features in this BankBI repo, with clear boundaries between live data-backed modules and UI scaffolds.
---

# BankBI Advanced Analytics

Use this skill when implementing KPI tree, risk deep-dive, board packs, scheduled reports, or employer analytics.

## Current State (Important)

Data-backed today:
- Executive/branch/customer metrics from `tran_summary` via dashboard APIs.

Mostly UI scaffold today (static/mock data in page components):
- KPI tree page
- Board pack page
- Scheduled/regulatory runs page
- Employer/payroll page
- Large parts of risk page

Do not present scaffold pages as production analytics until backend APIs are wired.

## Integration Pattern for New Analytics

Follow this order:
1. Add or extend backend aggregation in service/model layer.
2. Expose endpoint in `backend/config/routes.rb` and controller under `api/v1`.
3. Keep filter/date contract compatible with existing `BaseController#filter_params`.
4. Add typed frontend hook in `frontend/lib/hooks/useDashboardData.ts` (or dedicated hook file).
5. Update `frontend/types/index.ts` and replace mock arrays in pages.

## Data Contract Rules

- Send raw numerics from API; format in frontend.
- Use stable keys and avoid per-page custom naming unless required.
- Keep date-filter behavior consistent with existing pages (period anchored to dataset max date when available).

## Recommended Phase Plan

### Phase 1: Replace Mock Data

Targets:
- `frontend/app/dashboard/kpi/page.tsx`
- `frontend/app/dashboard/risk/page.tsx`
- `frontend/app/dashboard/board/page.tsx`
- `frontend/app/dashboard/scheduled/page.tsx`
- `frontend/app/dashboard/employer/page.tsx`

Deliverables:
- Real API calls
- Loading/empty/error states
- Removed hardcoded demo arrays where backend exists

### Phase 2: Add Analytics Endpoints

Create dedicated controller/service pairs for:
- KPI tree decomposition
- Risk concentration and tier trends
- Board pack summary and generation history
- Schedule run history/status
- Employer/payroll breakdown

### Phase 3: Hardening

- Cache heavy endpoints.
- Add pagination for large tables.
- Add audit metadata (run time, data window, source timestamp).

## Quality Gates

- No mixed mock + live values in a single KPI block.
- Each advanced page has explicit empty-state text when data is unavailable.
- Filters and period controls work consistently across advanced modules.
- Frontend build/lint and backend syntax checks pass.
