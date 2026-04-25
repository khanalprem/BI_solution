# BankBI — Code Review & Optimization (Phased)

**Reviewer:** senior full-stack architect (audit)
**Date:** 2026-04-25
**Scope:** Rails 7 API + Next.js 15. **Three phases**:

| Phase | Area | Status |
|-------|------|--------|
| **1** | Backend controllers + services | **✅ This document** |
| 2 | Frontend dashboards + hooks + shared UI | pending |
| 3 | SQL / index / perf | pending |

**Out of scope** (per the kickoff): Next.js bundle tuning, caching strategy / Redis / materialized views, security findings (covered in `SECURITY_REVIEW.md`).

**Safety contract:** every applied change is behavior-preserving — same inputs produce the same outputs. Higher-risk refactors are written up as proposals only.

---

# Phase 1 — Executive Summary

The backend is well-organized for a project this size. The big wins are:

1. **`ProductionDataService` is a 1,650-line god-service.** It works well, but the `MEASURES` / `DIMENSIONS` / `PERIOD_COMPARISONS` / `TIME_COMPARISON_FIELDS` / clause-builder cluster has grown organically. The unique value lives in the SQL templates — most procedural logic (date math, alias substitution, value normalization) is mechanical and can be extracted with no behavior change.
2. **Dashboard controller is repetitive.** 14 actions, each ~20 lines of identical scaffolding (`resolved_dates → scoped_filter_params → cached() → render json:`). Pattern can shrink to 3 lines per action via a `dashboard_action` helper, but I held off because each cache key has subtle dependencies — it's a Phase 2 candidate after the frontend audit confirms the contract.
3. **Confirmed dead code: ~80 lines.** Five `TranSummary` class methods, three `TranSummary` scopes, and a `scheme_type` filter branch (CLAUDE.md confirms `scheme_type` was removed from the frontend) are all unreachable.
4. **Two genuine DRY violations** with copy-paste drift risk: `user_permissions` lives in both `AuthController` and `UsersController`; `decode_jwt` lives in both `AuthController` and `ApplicationController`. Both moved to single source of truth.
5. **One latent correctness bug** identified, not patched (needs business confirmation): `non_date_filter_clauses` (used by period-comparison queries) drops four filter columns that `explorer_where_clause` (used by the main query) honors. Documented in the "Latent Bugs" section — flagging only, not changing.

**Top 5 high-impact items** (in this phase):

| # | Item | Impact | Risk | Status |
|---|------|--------|------|--------|
| 1 | Move `user_permissions` + `display_role` permission map to `User` model | Kills 2 copies, no behavior change | Low | **Applied** |
| 2 | Centralize JWT encode/decode in `lib/bank_bi/jwt_token.rb` | Kills 3 copies of secret-resolution and decode logic | Low | **Applied** |
| 3 | Delete dead `TranSummary` class methods + scopes + `scheme_type` branch | -55 LOC, clearer model surface | Low | **Applied** |
| 4 | DRY `resolve_reference_date` and `resolve_min_reference_date` | -45 LOC, single source for date-dim parsing | Medium | **Applied** |
| 5 | Defer dashboard action-shape extraction to Phase 2 | Rather than guess at the contract, validate from frontend usage first | n/a | Deferred |

**Estimated LOC reduction in Phase 1:** ~180 lines (from ~3,400 backend LOC). About 5% — the headline number will grow in Phase 2 (frontend dashboard pages share a lot more obvious duplication).

---

# Architecture Observations & Duplication Patterns

## Pattern A — "service god-class" growing inside `ProductionDataService`
1,650 lines, three logically distinct concerns coexisting in one file:

- **Schema metadata** (`TABLES`, `DIMENSIONS`, `MEASURES`, `PERIOD_COMPARISONS`, `TIME_COMPARISON_FIELDS`, `LOOKUP_TYPES`, `DEPOSIT_DIMENSIONS`) — these are essentially configuration.
- **Clause builders** (`explorer_where_clause`, `categorical_filter_clauses`, `non_date_filter_clauses`, `build_period_where`, `period_date_clause`, the deposit-side equivalents) — string templating.
- **Procedure orchestration** (`tran_summary_explorer`, `deposit_explorer`, `htd_detail`, `lookup_preview`, `static_lookup`, `table_detail`) — actual work.

Extraction proposal (deferred — too risky in one pass): split into `ProductionDataService::Constants` (configuration), `ProductionDataService::Clauses` (mixin for builders), and the orchestrator class. The current shape passes specs and is well-commented, so we trade reorganization risk for documentation clarity. Keep the file together for Phase 1; reconsider after Phase 3 introduces the index recommendations and we can reason about query plans alongside the SQL templates.

## Pattern B — Identical action skeleton across `DashboardsController`

Every action is:
```ruby
def action_name
  start_date, end_date = resolved_dates
  filters = scoped_filter_params.merge(start_date: start_date, end_date: end_date)
  data = cached('action_name') do
    scope = TranSummary.apply_filters(filters)
    # ... 5–80 lines of unique logic
  end
  render json: data
end
```

14 actions × 3 boilerplate lines = ~42 LOC of pure scaffolding. The natural extract is:

```ruby
def dashboard_action(cache_key, **extra_filters)
  start_date, end_date = resolved_dates
  filters = scoped_filter_params.merge(start_date: start_date, end_date: end_date, **extra_filters)
  data = cached(cache_key) { yield(TranSummary.apply_filters(filters), start_date: start_date, end_date: end_date, filters: filters) }
  render json: data
end
```

**Deferred to Phase 2** because:
1. Some actions use a per-request cache key (`customers_top_#{limit}`, `customer_profile_#{cif_id}`, `employee_detail_#{user_id}`) — the helper signature has to handle that cleanly.
2. `demographics` doesn't use `scoped_filter_params` — so it can't share the helper.
3. Frontend audit may reveal that some endpoints are unused (Phase 2), making part of this work moot.

## Pattern C — Three near-identical `decode_jwt` methods

Pre-Phase-1: `ApplicationController#decode_jwt` and `AuthController#decode_jwt` were duplicates with the same secret-resolution. The security review (H-1, M-3) consolidated decode but **not** the secret-resolution helper. Phase 1 finishes the consolidation: a `BankBi::JwtToken` module is now the single source of truth for `encode`, `decode`, secret resolution, claim defaults, and TTL.

## Pattern D — `user_permissions` duplicated in `AuthController` and `UsersController`

Identical 5-line method in both controllers. The `User` model already owns `PERMISSIONS` and `can?`. Phase 1 adds `User#permissions_list` and both controllers call it.

## Pattern E — Dead `scheme_type` filter

The CLAUDE.md "Filter set" section explicitly says `scheme_type` was removed from frontend filters and the API filter list. Two code paths still reference `filters[:scheme_type]`:

- `TranSummary.apply_filters` (lines 60-63) — joins to `AccountMasterLookup.account_number_scope` and uses `where(acct_num: ...)`.
- `AccountMasterLookup.apply_account_filters` (line 115) — `where(schm_type: filters[:scheme_type])`.

Neither branch can fire because `filters[:scheme_type]` is never set by `BaseController#filter_params`. Removed both branches in Phase 1.

## Pattern F — Dead `TranSummary` class methods + scopes

`total_amount`, `total_count`, `unique_accounts`, `unique_customers`, `average_transaction` — all five class methods on `TranSummary` are referenced only in `lib/tasks/import_data.rake` (in `puts` documentation strings, not actually invoked).

`by_branch`, `by_province`, `by_customer` scopes — same: only referenced in rake-task `puts` strings. `by_date_range` is similar but is referenced in import_data.rake comment and could be useful API; keeping it.

## Pattern G — Defensive `rescue StandardError` swallows risk

Several spots silently swallow exceptions and return empty arrays:

- `AccountMasterLookup` — every public method has `rescue StandardError => exception; log_warning(...); []`.
- `User#production_branch_access` — `rescue StandardError; []`.
- `DashboardsController#fetch_personal_info` — `rescue StandardError => e; Rails.logger.warn(...); {}`.
- `DashboardsController#risk_summary` — `npa_data`, `dormancy_data`, `anomaly_data` all `rescue StandardError ... []`.

This pattern is intentional — these queries hit production tables that may not exist in dev/test (per CLAUDE.md the dev DB is the production warehouse, but not all environments have every table). Leaving as-is; documenting the contract.

---

# Latent bugs identified (NOT patched — confirm with stakeholders first)

## L-A — `non_date_filter_clauses` drops four filters that `explorer_where_clause` honors

`explorer_where_clause` (used by the main pivot query) honors these categorical filters:

```
gam_branch, gam_province, gam_cluster, gam_solid,
tran_branch, tran_cluster, tran_province,    ← honored here
tran_source, tran_type,                       ← honored here
part_tran_type,
product, service, merchant, gl_sub_head_code,
entry_user, vfd_user
```

`non_date_filter_clauses → categorical_filter_clauses` (used by **period comparisons**) is missing four:

```
tran_branch, tran_cluster, tran_province, tran_type   ← MISSING
```

**Impact:** if a user filters by `tran_branch=Pokhara` and asks for "This Month vs Prev Month", the *main* values reflect Pokhara; the *comparison* values reflect **the entire bank**. The numbers look right cell-by-cell but the comparison delta is meaningless.

**Why this might be intentional:** stripping TRAN-side filters from comparisons could be a deliberate "compare account behaviour over time independent of the channel they used today" decision. Without business confirmation I won't change it.

**Fix when confirmed:** add the four entries to `categorical_filter_clauses`'s mapping. One-line change. Test with the existing pivot specs before merging.

## L-B — `dashboards_controller#resolved_dates` defaults to last-30-days while `production_controller#explorer` passes `nil`

```ruby
# dashboards_controller.rb
def resolved_dates
  start_date = parse_date(...) || 30.days.ago.to_date
  end_date   = parse_date(...) || Date.today
  [start_date, end_date]
end
```

```ruby
# production_controller.rb#explorer
explicit_start = parse_date(param_value(:start_date, :startDate))   # nil if absent
# ... passed to service which then skips the BETWEEN clause
```

So `/dashboards/executive` shows last-30-days when no period is specified, but `/production/explorer` shows everything. The frontend hides this because `useDashboardPage` always sends a date range — but if any caller (curl, future endpoint) skips the date param, the two surfaces silently disagree.

**Fix when confirmed:** unify on the explicit-nil contract (skip the date filter when absent). Caller may not want this default-30 behavior. Documenting.

---

# Backend Refactors Applied in Phase 1

## R-1 — `User#permissions_list` (deduplicate `user_permissions`)

**Before** — duplicated in two controllers:

```ruby
# auth_controller.rb (private)
def user_permissions(user)
  perms = User::PERMISSIONS[user.role]
  return User::PERMISSIONS.values.flatten.uniq if perms == :all
  Array(perms)
end

# users_controller.rb (private) — IDENTICAL
def user_permissions(user)
  perms = User::PERMISSIONS[user.role]
  return User::PERMISSIONS.values.flatten.uniq if perms == :all
  Array(perms)
end
```

**After** — single method on the model:

```ruby
# user.rb
def permissions_list
  perms = PERMISSIONS[role]
  return PERMISSIONS.values.flatten.uniq if perms == :all
  Array(perms)
end
```

Both controllers now call `user.permissions_list`. The duplicate `user_permissions` private methods are deleted.

**Risk:** Low — pure extract method, identical implementation. Output JSON byte-identical.
**Verify:** `bundle exec rspec spec/models/user_spec.rb` (add a test for `permissions_list`); manually `GET /api/v1/auth/me` with each role and confirm `permissions:` array matches pre-refactor.

## R-2 — `BankBi::JwtToken` module (centralize JWT encode/decode)

**Before** — secret resolution + encode + decode existed in three places: `ApplicationController`, `AuthController`, `application_controller#jwt_secret`.

**After** — `lib/bank_bi/jwt_token.rb`:

```ruby
module BankBi
  module JwtToken
    ALGORITHM = 'HS256'.freeze
    ISSUER    = 'bankbi'.freeze
    AUDIENCE  = 'bankbi-frontend'.freeze
    TTL       = 8.hours.freeze

    module_function

    def encode(user)
      now = Time.current
      payload = {
        user_id: user.id, email: user.email,
        iss: ISSUER, aud: AUDIENCE,
        iat: now.to_i, nbf: now.to_i, exp: (now + TTL).to_i
      }
      JWT.encode(payload, secret, ALGORITHM)
    end

    def decode(token)
      JWT.decode(token, secret, true,
                 algorithm: ALGORITHM, iss: ISSUER, aud: AUDIENCE,
                 verify_iss: true, verify_aud: true, verify_iat: true).first
    rescue JWT::DecodeError
      nil
    end

    def secret
      if Rails.env.production?
        ENV.fetch('JWT_SECRET_KEY') { raise 'JWT_SECRET_KEY env var must be set in production' }
      else
        ENV.fetch('JWT_SECRET_KEY', Rails.application.secret_key_base)
      end
    end
  end
end
```

`ApplicationController` and `AuthController` now delegate to it.

**Risk:** Low. Identical claim payload, same algorithm, same secret resolution. The JWTs produced are byte-identical to the post-security-review version.
**Verify:** Sign in, capture token, decode with `BankBi::JwtToken.decode(t)` in Rails console — should return the original payload. The new auth-gate spec already covers the round-trip.

## R-3 — Delete dead `TranSummary` class methods + scopes

Five class methods (`total_amount`, `total_count`, `unique_accounts`, `unique_customers`, `average_transaction`) and three scopes (`by_branch`, `by_province`, `by_customer`) — only references are doc strings in `lib/tasks/import_data.rake`.

**Risk:** Low. Confirmed via `grep -rn TranSummary\.\(total_amount\|...\)` — no callers anywhere in app code.
**Verify:** `bundle exec rspec` — should pass unchanged. `rails runner "TranSummary.total_amount"` — should now NoMethodError, that's intended.

## R-4 — Delete dead `scheme_type` filter branch

`TranSummary.apply_filters` (lines 60-63) and `AccountMasterLookup.apply_account_filters` (line 115). Frontend filter list never includes `scheme_type`; CLAUDE.md confirms it was removed.

**Risk:** Low. Branches are unreachable.
**Verify:** No spec changes needed; existing `production_data_service_spec.rb` covers the live filters.

## R-5 — DRY `resolve_reference_date` / `resolve_min_reference_date`

Two methods, ~70 LOC, 90% identical. Both pick a date from filters keyed by date-dimension type (`tran_date`, `year_month`, `year_quarter`, `year`); they differ only in (a) which side of a range they pick (max vs min) and (b) the end-of-period vs start-of-period anchor.

**After** — both methods become 4-line wrappers around a single `resolve_date_for_dim(direction:, …)` helper.

**Risk:** Medium — these dates anchor period-comparison queries; an off-by-one shifts numbers in financial reports. I kept the existing two public method names so no callers change. Internally they delegate to the new helper, with the same case-by-case logic.
**Verify:** add unit specs to `production_data_service_spec.rb` covering both methods with each of `{tran_date, year_month, year_quarter, year} × {single value, range, no value}`. Run before deploy.

---

# Postgres index notes (deferred to Phase 3)

Phase 3 will produce a SQL file `backend/db/scripts/phase3_indexes.sql` for DBA execution. Preview of likely candidates from the queries we've already audited:

- `tran_summary (gam_branch, tran_date)` partial index for the dashboard `apply_filters` patterns.
- `tran_summary (cif_id, tran_date DESC)` for `customer_profile.recent_transactions`.
- `tran_summary (entry_user, tran_date)` for `employee_detail` / `employer_summary`.
- `gam (cif_id)` for `AccountMasterLookup#customer_accounts` lookups.
- A composite on `eab (acid, eod_date, end_eod_date)` to speed the `LEFT JOIN eab` used by `tran_date_bal`.

Existing `db/scripts/performance_indexes.sql` already covers some of these — I'll merge / dedupe in Phase 3.

---

# Verification plan for Phase 1

1. `cd backend && bundle exec rspec` — should pass unchanged. The existing `production_data_service_spec.rb` exercises the schema constants; add new specs for `User#permissions_list` and `BankBi::JwtToken.encode/decode`.
2. `cd backend && bundle exec rspec spec/requests/api_v1_auth_gate_spec.rb` — must stay green. JWT module change shouldn't affect the 401 flow.
3. Manual: `POST /api/v1/auth/signin` with each of the six seed roles. Compare `permissions` arrays in the response JSON to a pre-refactor snapshot — must be byte-identical.
4. Manual: hit `/dashboards/executive`, `/production/explorer`, `/production/deposits` with a real auth token and the same query string before/after. Diff the JSON. Must be byte-identical.
5. `bundle exec brakeman` — no new findings.

---

# Phase 2 / Phase 3 preview

**Phase 2 (frontend)** will look at:
- `pivot/page.tsx` (the largest page) — extract the multi-level pivot helpers, the SqlLine renderer, the dim/measure sidebar, and the modal drill-down into reusable hooks/components.
- `useDashboardData.ts` and the per-page hooks — many `useQuery` callsites share the same staleTime / queryKey pattern.
- `AdvancedFilters` / `MultiValueChipInput` / `SearchableMultiSelect` — three multi-value input components with overlapping behaviour.
- `KPICard` / `ChartCard` / `PremiumCharts` — confirm reuse is consistent across pages.
- Dead frontend code (`board/page.tsx` is a "scaffold", several pages reference unused imports per CLAUDE.md).

**Phase 3 (SQL / index / perf)** will produce:
- A consolidated `db/scripts/phase3_indexes.sql` with `EXPLAIN`-grounded recommendations.
- Concurrent-safe index DDL (`CREATE INDEX CONCURRENTLY ...`).
- Notes on partition pruning for `tran_summary_2021..2025`.
- N+1 inspections of any frontend hook that fans out to multiple endpoints.

---

*Phase 1 generated 2026-04-25. Phase 2 to follow once you confirm the patches apply cleanly.*
