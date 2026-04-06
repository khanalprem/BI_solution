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
- `GET /dashboards/customers_top`
- `GET /dashboards/customer_profile`

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
- Province breakdown returns: `total_amount`, `transaction_count`, `branch_count`, `unique_accounts`, `avg_per_branch`
- Channel breakdown returns: `total_amount`, `transaction_count` (no duplicate `amount`/`count` aliases)
- Branch performance payload must contain: `branches`, `provinces`, `total_amount`, `total_count`, `unique_accounts`, `unique_customers`

Do not rename keys without updating:
- `frontend/types/index.ts`
- `frontend/lib/hooks/useDashboardData.ts`
- affected dashboard pages

## Controller Pattern

For each endpoint:
1. Resolve dates using `resolved_dates` helper (not inline per-action).
2. Use `filter_params` from `BaseController`.
3. Build service via `build_service` helper to avoid repetition.
4. Call `cached(action_name) { ... }` with block — cache key includes resolved dates.
5. Use `service.execute(only: [...needed_sections])` to avoid running unnecessary queries.

Current reference files:
- `backend/app/controllers/api/v1/base_controller.rb`
- `backend/app/controllers/api/v1/dashboards_controller.rb`
- `backend/app/services/dynamic_dashboard_service.rb`
- `backend/app/services/segment_classifier.rb`

## Cache Key Rules

- Cache keys include resolved dates (not raw params) to prevent stale data when default dates shift.
- Use `cached(action, expires_in: duration)` helper in controller.
- Dashboard endpoints: 15 minutes
- Filter values: 1 hour
- Filter statistics: 30 minutes

## Performance Rules

- Use `only:` parameter to run only needed aggregation sections.
- Prefer DB aggregation (`group`, `sum`, `count distinct`) over Ruby loops.
- Use `distinct + order + limit` for filter value lists.
- Preserve support for `min_amount = 0` / `max_amount = 0` (nil check, not presence check).

## Error Handling

- `BaseController` has catch-all `rescue_from StandardError` — returns 500 with logged details.
- `RecordNotFound` → 404
- `RecordInvalid` → 422
- Custom validation errors should use `render json: { error: message }, status: :unprocessable_entity`.

## Done Checklist

- Endpoint works with both snake_case and camelCase date/filter params.
- Frontend hook/types updated if payload changed.
- Uses `only:` for selective aggregation (not full `execute`).
- Uses `cached()` helper (not inline `Rails.cache.fetch`).
- `npm run lint` and `npm run build` pass in `frontend/`.
- Ruby syntax check passes for changed backend files.
- No temporary/debug markdown files added.
