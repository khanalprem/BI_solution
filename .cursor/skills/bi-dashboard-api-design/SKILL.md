---
name: bi-dashboard-api-design
description: API design standards for this BankBI repo (Rails + Next.js) including endpoint contracts, filter mapping, caching, and response shaping. Use when adding or changing dashboard endpoints.
---

# BI Dashboard API Design

Use this skill when you touch `backend/app/controllers/api/v1/*`, dashboard services, or frontend data hooks.

## Current API Contract (Source of Truth)

Base path: `/api/v1`

Dashboard endpoints:
- `GET /dashboards/executive`
- `GET /dashboards/branch_performance`
- `GET /dashboards/province_summary`
- `GET /dashboards/channel_breakdown`
- `GET /dashboards/daily_trend`

Filter endpoints:
- `GET /filters/values`
- `GET /filters/branches`
- `GET /filters/statistics`

## Query Parameter Rules

Primary date params:
- `start_date`, `end_date` (preferred)

Backward-compatible aliases accepted by backend:
- `startDate`, `endDate`

Filter params accepted by backend (`BaseController#filter_params`):
- `branch_code`/`branchCode`/`branch`
- `province`
- `district`, `municipality`
- `cluster`, `solid`
- `tran_type`/`tranType`
- `part_tran_type`/`partTranType`
- `tran_source`/`tranSource`/`channel`
- `product`, `service`, `merchant`
- `gl_sub_head_code`/`glSubHeadCode`
- `entry_user`/`entryUser`
- `vfd_user`/`vfdUser`
- `min_amount`/`minAmount`
- `max_amount`/`maxAmount`
- `acct_num`/`acctNum`
- `cif_id`/`cifId`

Frontend should keep sending camelCase from UI state and convert to snake_case in `frontend/lib/hooks/useDashboardData.ts`.

## Response Shape Rules

Keep JSON stable and explicit for charts/tables:
- Numeric values must be numbers (not formatted strings)
- Include both `amount/count` and `total_amount/transaction_count` only where existing pages depend on both
- Branch performance payload must contain:
  - `branches`, `provinces`
  - `total_amount`, `total_count`, `unique_accounts`, `unique_customers`

Do not rename keys without updating:
- `frontend/types/index.ts`
- `frontend/lib/hooks/useDashboardData.ts`
- affected dashboard pages

## Controller Pattern

For each endpoint:
1. Parse date from snake_case or camelCase.
2. Use `filter_params` from `BaseController`.
3. Build cache key from `request.query_parameters` (stable ordering).
4. Delegate aggregation to service/model scopes.
5. Return frontend-friendly JSON (avoid leaking DB column names).

Current reference files:
- `backend/app/controllers/api/v1/base_controller.rb`
- `backend/app/controllers/api/v1/dashboards_controller.rb`
- `backend/app/services/dynamic_dashboard_service.rb`

## Performance Rules

- Prefer DB aggregation (`group`, `sum`, `count distinct`) over Ruby loops.
- Keep endpoints cacheable (15m for dashboards, 1h for filter dimensions).
- Use `distinct + order + limit` for filter value lists.
- Preserve support for `min_amount = 0` / `max_amount = 0` (nil check, not presence check).

## Done Checklist

- Endpoint works with both snake_case and camelCase date/filter params.
- Frontend hook/types updated if payload changed.
- `npm run lint` and `npm run build` pass in `frontend/`.
- Ruby syntax check passes for changed backend files.
- No temporary/debug markdown files added.
