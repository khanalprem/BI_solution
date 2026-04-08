---
name: bi-dashboard-api-design
description: API design standards for BankBI (Rails + Next.js). Endpoint contracts, filter mapping, caching rules, and response shapes. Use when adding or changing dashboard or filter endpoints.
---

# BankBI API Design

Use this skill when touching `backend/app/controllers/api/v1/*`, services, or frontend hooks.

## Base Path: `/api/v1`

### Dashboard Endpoints

| Method | Path | Controller Action | Cache TTL |
|--------|------|-------------------|-----------|
| GET | `/dashboards/executive` | `DashboardsController#executive` | 15 min |
| GET | `/dashboards/branch_performance` | `#branch_performance` | 15 min |
| GET | `/dashboards/province_summary` | `#province_summary` | 15 min |
| GET | `/dashboards/channel_breakdown` | `#channel_breakdown` | 15 min |
| GET | `/dashboards/daily_trend` | `#daily_trend` | 15 min |
| GET | `/dashboards/customers_top` | `#customers_top` | 15 min |
| GET | `/dashboards/customer_profile` | `#customer_profile` | 15 min |

### Filter Endpoints

| Method | Path | Controller Action | Cache TTL |
|--------|------|-------------------|-----------|
| GET | `/filters/values` | `FiltersController#values` | 1 hour |
| GET | `/filters/branches` | `#branches` | 1 hour |
| GET | `/filters/statistics` | `#statistics` | 30 min |

---

## Query Parameters (all endpoints accept)

```
start_date       YYYY-MM-DD
end_date         YYYY-MM-DD
province         string — matches tran_summary.gam_province (e.g. "province 3")
branch_code      string — matches tran_summary.gam_branch   (e.g. "branch 35")
cluster          string — matches tran_summary.gam_cluster
tran_type        string — e.g. "J"
part_tran_type   string — "CR" or "DR"
tran_source      string — "mobile", "internet", etc.
product          string
service          string
merchant         string
gl_sub_head_code string
entry_user       string
vfd_user         string
min_amount       number
max_amount       number
acct_num         string
cif_id           string
```

---

## Response Shapes

### `/dashboards/executive`
```json
{
  "summary": {
    "total_amount": 1121183703824.0,
    "total_count": 20400008,
    "unique_accounts": 50000,
    "unique_customers": 50000,
    "avg_transaction_size": 6836485.99,
    "credit_amount": 141805643814.0,
    "debit_amount": 140739127540.0,
    "net_flow": 1066516274.0,
    "credit_count": 20725,
    "debit_count": 20703,
    "credit_ratio": 50.19
  },
  "by_branch": [
    { "branch_code": "branch 35", "province": "province 3",
      "total_amount": 12862261100.0, "transaction_count": 232504,
      "unique_accounts": 570, "avg_transaction": 55320.60 }
  ],
  "by_province": [
    { "province": "province 7", "total_amount": 180740900232.0,
      "transaction_count": 3294658, "branch_count": 16,
      "unique_accounts": 8076, "avg_per_branch": 11296306264.5 }
  ],
  "by_channel": [
    { "channel": "mobile", "total_amount": 768556046.0, "transaction_count": 14000 }
  ],
  "trend": [
    { "date": "2023-01-01", "amount": 5234100.0, "count": 842 }
  ]
}
```

### `/filters/statistics`
```json
{
  "date_range": { "min": "2021-02-18", "max": "2024-07-01" },
  "amount_range": { "min": 10.0, "max": 9999999.0 },
  "counts": {
    "total_transactions": 164000,
    "unique_accounts": 50000,
    "unique_customers": 50000,
    "provinces": 7,
    "branches": 60
  }
}
```

### `/filters/values`
```json
{
  "provinces": ["province 1", "province 2", "province 3", "province 4", "province 5", "province 6", "province 7"],
  "branches": ["branch 1", "branch 2", ...],
  "clusters": ["cluster 1", ...],
  "tran_types": ["J"],
  "part_tran_types": ["CR", "DR"],
  "tran_sources": ["mobile", "internet"],
  "products": [...],
  "services": [...],
  "merchants": [...],
  "gl_sub_head_codes": [...],
  "entry_users": [...],
  "vfd_users": [...]
}
```

---

## Controller Patterns

```ruby
# Filter extraction (from BaseController)
def filter_params
  {
    branch:          param_value(:branch_code, :branchCode, :branch),
    province:        param_value(:province),
    part_tran_type:  param_value(:part_tran_type, :partTranType),
    tran_source:     param_value(:tran_source, :tranSource, :channel),
    # ... etc
  }.compact
end

# Date resolution (from DashboardsController)
def resolved_dates
  {
    start_date: parse_date(param_value(:start_date, :startDate)) || 30.days.ago.to_date,
    end_date:   parse_date(param_value(:end_date,   :endDate))   || Date.today
  }
end

# Caching pattern
def cached(action, expires_in: 15.minutes, &block)
  key_data = request.query_parameters
               .merge('_sd' => resolved_dates[:start_date].to_s, '_ed' => resolved_dates[:end_date].to_s)
               .sort.to_h
  cache_key = "dashboard_#{action}_#{Digest::MD5.hexdigest(key_data.to_query)}"
  Rails.cache.fetch(cache_key, expires_in: expires_in, &block)
end
```

---

## Frontend Hook Pattern

```typescript
// In lib/hooks/useDashboardData.ts
export function useMyNewData(filters: DashboardFilters) {
  const params = useMemo(() => toApiFilters(filters), [filters]);
  return useQuery({
    queryKey: ['my-new-data', params],
    queryFn: async () => {
      const { data } = await apiClient.get<MyType>('/dashboards/my_endpoint', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

## Rules

- All amounts in raw NPR numbers — formatting is frontend responsibility (`formatNPR`)
- All dates as `YYYY-MM-DD` strings
- NULL channels from `tran_source` = branch transactions — filter with `.filter(c => c.channel)` on frontend
- Cache key must include resolved dates (`_sd`, `_ed`) so rolling defaults produce distinct keys
- Error responses: `{ error: "message" }` with appropriate HTTP status
