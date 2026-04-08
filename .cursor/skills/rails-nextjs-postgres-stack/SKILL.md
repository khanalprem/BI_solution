---
name: rails-nextjs-postgres-stack
description: Full-stack implementation guide for BankBI (Rails 7 API + Next.js 14 + PostgreSQL nifi production database). Use for end-to-end changes across backend, frontend, and database.
---

# Rails + Next.js + PostgreSQL (BankBI)

Use this skill when making changes that span backend API, frontend, and database.

## Stack

| Layer | Tech | Port |
|-------|------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts | 3000 |
| Backend | Rails 7 API-only, Ruby | 3001 |
| Database | PostgreSQL — `nifi` db at 10.1.1.161:5432 | 5432 |
| Cache | Redis (localhost:6379) | 6379 |

---

## Project Layout

```
BI_solution/
├── backend/
│   ├── app/controllers/api/v1/
│   │   ├── base_controller.rb       # shared filter_params, parse_date, error handling
│   │   ├── dashboards_controller.rb # executive, branch_performance, customer_profile, etc.
│   │   └── filters_controller.rb    # /values, /branches, /statistics
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
2. Add method in `dashboards_controller.rb` or `filters_controller.rb`
3. Use `DynamicDashboardService` or direct `TranSummary` queries
4. Add TypeScript type in `frontend/types/index.ts`
5. Add React Query hook in `frontend/lib/hooks/useDashboardData.ts`
6. Use hook in page component

## Caching

- Dashboard responses: `Rails.cache.fetch(key, expires_in: 15.minutes)`
- Filter values: 1 hour
- Filter statistics: 30 minutes
- Clear cache: `bundle exec rails runner "Rails.cache.clear"`
