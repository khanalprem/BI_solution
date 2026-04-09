---
name: rails-nextjs-postgres-stack
description: Full-stack implementation guide for BankBI (Rails 7 API + Next.js 14 + PostgreSQL nifi production database). Use for end-to-end changes across backend, frontend, and database.
---

# Rails + Next.js + PostgreSQL (BankBI)

Use this skill when making changes that span backend API, frontend, and database.

## User Roles & Access Control (RBAC)

### Roles (stored in `users.role`)

| Role | Level | Access |
|------|-------|--------|
| `superadmin` | 5 | Everything including user management |
| `admin` | 4 | All dashboards + user management, no system config |
| `manager` | 3 | All dashboards + customer PII |
| `analyst` | 2 | Dashboards, KPI, pivot — no customer PII |
| `branch_staff` | 1 | Own branch only — scoped via `user_branch_cluster` |
| `auditor` | 0 | Read-only financial/risk — no PII |

### Branch Scoping (production table)
`branch_staff` users are scoped via the production `user_branch_cluster` table:
- `user_id` matches `user_master.user_id` (pattern: `"user {rails_user_id}"`)
- `sol_id` → allowed branch SOL IDs
- `cluster_id` → allowed cluster
- `access_level` = `'I'` (Inquiry/read-only)

```ruby
# In ApplicationController — auto-applied for branch_staff
def scoped_branch_filter(filters)
  return filters unless current_user&.branch_scoped?
  allowed = current_user.allowed_branch_names  # from user_branch_cluster
  filters.merge(branch: allowed)
end
```

### Frontend auth helpers (`frontend/lib/auth.ts`)
```typescript
import { can, getStoredUser } from '@/lib/auth';
const user = getStoredUser();
if (can(user, 'customers')) { /* show customer data */ }
if (user?.can_see_pii) { /* show PII fields */ }
```
- Frontend `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1`
- Rails runs locally on port 3001, connects directly to production `nifi` DB at 10.1.1.161:5432
- No separate deployed API — run `bundle exec rails s -p 3001` in `backend/`



---

## Project Layout

```
BI_solution/
├── backend/
│   ├── app/controllers/api/v1/
│   │   ├── base_controller.rb       # shared filter_params, parse_date, error handling
│   │   ├── dashboards_controller.rb # executive, branch_performance, province_summary, channel_breakdown, daily_trend, customers_top, customer_profile, financial_summary, digital_channels, risk_summary, kpi_summary, employer_summary
│   │   ├── filters_controller.rb    # /values, /branches, /statistics
│   │   └── production_controller.rb # /catalog, /table, /lookup, /explorer (all 19 production tables)
│   ├── app/services/
│   │   ├── dynamic_dashboard_service.rb  # all aggregation logic
│   │   └── segment_classifier.rb         # customer segmentation
│   ├── app/models/
│   │   ├── tran_summary.rb   # primary_key nil, apply_filters scope
│   │   ├── eab.rb            # production columns: eod_date, end_eod_date, tran_date_bal
│   │   ├── branch.rb
│   │   └── customer.rb
│   ├── config/routes.rb
│   └── .env                  # DB_HOST=10.1.1.161, DB_NAME=nifi
├── frontend/
│   ├── app/dashboard/
│   │   ├── layout.tsx                   # Sidebar + main wrapper
│   │   ├── executive/page.tsx           # Executive dashboard
│   │   ├── branch/page.tsx              # Branch & regional
│   │   ├── branch/[branchCode]/page.tsx # Branch detail
│   │   ├── customer/page.tsx            # Customer list
│   │   ├── customer/[cifId]/page.tsx    # Customer profile
│   │   ├── financial/page.tsx
│   │   ├── kpi/page.tsx
│   │   ├── risk/page.tsx
│   │   ├── digital/page.tsx
│   │   ├── employer/page.tsx
│   │   ├── board/page.tsx
│   │   ├── scheduled/page.tsx
│   │   ├── config/page.tsx
│   │   └── pivot/page.tsx
│   ├── components/
│   │   ├── layout/Sidebar.tsx
│   │   ├── layout/TopBar.tsx
│   │   └── ui/AdvancedFilters.tsx       # dynamic DB-backed filters
│   ├── lib/
│   │   ├── api.ts                       # axios client → localhost:3001/api/v1
│   │   ├── hooks/useDashboardData.ts    # all React Query hooks
│   │   └── formatters.ts               # formatNPR, getDateRange, parseISODateToLocal
│   └── types/index.ts                  # DashboardFilters, DashboardSummary, etc.
└── bankbi/                             # HTML reference design (read-only reference)
    └── pages/*.html
```

---

## API Endpoints (current)

```
GET /api/v1/dashboards/executive          → summary + by_branch + by_province + by_channel + trend
GET /api/v1/dashboards/branch_performance → branches + provinces + totals
GET /api/v1/dashboards/province_summary   → by_province[]
GET /api/v1/dashboards/channel_breakdown  → by_channel[]
GET /api/v1/dashboards/daily_trend        → trend[]
GET /api/v1/dashboards/customers_top      → top customers[]
GET /api/v1/dashboards/customer_profile   → full customer profile

GET /api/v1/filters/values      → provinces, branches, clusters, tran_types, tran_sources, products, services, merchants, gl_sub_head_codes, entry_users, vfd_users
GET /api/v1/filters/branches    → branches (optionally filtered by province)
GET /api/v1/filters/statistics  → date_range{min,max}, amount_range, counts
```

**Common query params:** `start_date`, `end_date`, `province`, `branch_code`, `cluster`, `tran_type`, `part_tran_type`, `tran_source`, `product`, `service`, `merchant`, `gl_sub_head_code`, `entry_user`, `vfd_user`, `min_amount`, `max_amount`, `acct_num`, `cif_id`

## DashboardSummary Response Shape

```typescript
{
  total_amount: number
  total_count: number
  unique_accounts: number
  unique_customers: number
  avg_transaction_size: number
  credit_amount: number      // SUM where part_tran_type='CR'
  debit_amount: number       // SUM where part_tran_type='DR'
  net_flow: number           // credit - debit
  credit_count: number
  debit_count: number
  credit_ratio: number       // credit/total * 100
}
```

---

## Data Facts

- **Primary table:** `tran_summary` (partitioned, 164K rows)
- **Date range:** 2021-02-18 → 2024-07-01
- **Transaction types:** only `J` (journal)
- **Part types:** `CR` (credit/inflow) and `DR` (debit/outflow)
- **Provinces:** "province 1" … "province 7" (numeric labels from production)
- **Channels:** `tran_source` — "mobile", "internet", NULL (branch)

---

## Adding a New Endpoint

1. Add route in `config/routes.rb`
2. Add method in `dashboards_controller.rb` — use shared helpers:
   - `build_by_branch(scope, limit:)` — branch grouping
   - `build_by_province(scope)` — province grouping
   - `build_by_channel(scope)` — channel grouping
   - `build_daily_trend(scope)` — date trend
   - `build_summary(scope)` — CR/DR/net summary
3. Add TypeScript type in `frontend/types/index.ts`
4. Add one-liner hook in `frontend/lib/hooks/useDashboardData.ts` using the factory:
   ```typescript
   export const useMyData = (f: DashboardFilters) =>
     useDashboardQuery<MyType>('my-key', 'my_endpoint', f);
   ```
5. Use `useDashboardPage()` hook in the page component — eliminates ~40 lines of boilerplate:
   ```typescript
   const { filters, setFilters, filtersOpen, handleClearFilters, topBarProps } = useDashboardPage();
   ```
6. Use hook in page component

## Frontend Architecture

### Shared Hooks (eliminate boilerplate)

```typescript
// useDashboardPage — use in every dashboard page instead of 40 lines of state/effect boilerplate
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';

export default function MyPage() {
  const { filters, setFilters, filtersOpen, handleClearFilters, topBarProps } = useDashboardPage();
  const { data } = useMyHook(filters);
  return <TopBar title="My Page" {...topBarProps} />;
}

// useDashboardQuery factory — use for new dashboard hooks
export const useMyData = (f: DashboardFilters) =>
  useDashboardQuery<MyType>('my-key', 'my_endpoint', f);
```

### Backend Shared Query Builders

```ruby
# In DashboardsController private section — use these instead of inline queries:
build_by_branch(scope, limit: 20)   # → [{branch_code, province, total_amount, ...}]
build_by_province(scope)             # → [{province, total_amount, branch_count, avg_per_branch, ...}]
build_by_channel(scope)              # → [{channel, total_amount, transaction_count}]
build_daily_trend(scope)             # → [{date, amount, count}]
build_summary(scope)                 # → {total_amount, credit_amount, debit_amount, net_flow, ...}
```
