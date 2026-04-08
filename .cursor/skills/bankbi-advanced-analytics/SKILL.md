---
name: bankbi-advanced-analytics
description: Guide for implementing advanced analytics in BankBI using production procedures and data. Covers get_tran_summary procedure usage, multi-period comparison, pivot analysis, and KPI drill-down backed by live nifi database.
---

# BankBI Advanced Analytics

Use this skill when implementing KPI tree, pivot analysis, multi-period comparison, branch drill-down, or any feature that uses the `get_tran_summary` stored procedure.

## What Is Live vs Scaffold

### Live (production data today)
- Executive overview — full CR/DR/Net metrics from `tran_summary`
- Branch & regional — live branch/province aggregations
- Customer & portfolio — live customer top/profile endpoints
- Branch detail and customer detail — live drill-down pages
- All filters — Province, Branch, Channel, Product, Service, GL Code, Entry User

### Scaffold (needs implementation)
- KPI tree / DuPont analysis (`frontend/app/dashboard/kpi/page.tsx`)
- Pivot analysis (`frontend/app/dashboard/pivot/page.tsx`)
- Risk deep-dive (`frontend/app/dashboard/risk/page.tsx`)
- Board packs (`frontend/app/dashboard/board/page.tsx`)
- Scheduled reports (`frontend/app/dashboard/scheduled/page.tsx`)
- Employer/payroll (`frontend/app/dashboard/employer/page.tsx`)
- Digital channels (`frontend/app/dashboard/digital/page.tsx`)

---

## Using `get_tran_summary` Procedure

This is the primary procedure for any multi-period or paginated analytics.

### Rails — calling the procedure

```ruby
def call_tran_summary(where_clause:, select_inner:, groupby:, page: 1, page_size: 50)
  conn = ActiveRecord::Base.connection
  conn.execute(<<~SQL)
    CALL public.get_tran_summary(
      select_outer => 'SELECT tb2.*',
      select_inner => #{conn.quote(select_inner)},
      where_clause => #{conn.quote(where_clause)},
      prevdate_where => '',
      thismonth_where => '',
      thisyear_where => '',
      prevmonth_where => '',
      prevyear_where => '',
      prevmonthmtd_where => '',
      prevyearytd_where => '',
      prevmonthsamedate_where => '',
      prevyearsamedate_where => '',
      groupby_clause => #{conn.quote(groupby)},
      having_clause => '',
      orderby_clause => 'ORDER BY tran_date',
      partitionby_clause => '',
      eab_join => '',
      user_id => '',
      page => #{page},
      page_size => #{page_size}
    )
  SQL
  conn.execute("SELECT * FROM result").to_a
end
```

### Multi-period comparison example

```sql
-- Compare this month vs previous month
CALL public.get_tran_summary(
  select_inner => 'SELECT tran_branch, SUM(tran_amt) tran_amt, SUM(tran_count) cnt',
  where_clause => 'WHERE tran_date BETWEEN ''2024-06-01'' AND ''2024-06-30''',
  prevmonth_where => 'WHERE tran_date BETWEEN ''2024-05-01'' AND ''2024-05-31''',
  -- all other wheres => ''
  groupby_clause => 'GROUP BY tran_branch',
  partitionby_clause => 'PARTITION BY tran_branch',
  orderby_clause => 'ORDER BY SUM(tran_amt) DESC',
  page => 1,
  page_size => 100
);
SELECT * FROM result;
```

---

## Using `get_static_data` for Filter Lookups

```ruby
conn = ActiveRecord::Base.connection

# Get branches
conn.execute("CALL get_static_data('branch')")
branches = conn.execute("SELECT * FROM static_data").to_a
# → [{ "value" => "1", "name" => "branch 1" }, ...]

# Get GL sub-heads
conn.execute("CALL get_static_data('gsh')")
gl_codes = conn.execute("SELECT * FROM static_data").to_a
```

---

## KPI Tree / DuPont Analysis

The `tran_summary` table supports these derivable KPI metrics for a DuPont-style breakdown:

```
Total Volume
├── Credit Inflow (CR)  = SUM(tran_amt) WHERE part_tran_type='CR'
├── Debit Outflow (DR)  = SUM(tran_amt) WHERE part_tran_type='DR'
└── Net Flow            = CR - DR

Transaction Efficiency
├── Avg Transaction     = AVG(tran_amt)
├── Transactions/Account= total_count / unique_accounts
└── Credit Ratio        = CR / (CR+DR) * 100

Portfolio Spread
├── By Province         = GROUP BY gam_province
├── By Branch           = GROUP BY gam_branch
├── By Channel          = GROUP BY tran_source
└── By GL Code          = GROUP BY gl_sub_head_code (join gsh for description)
```

---

## Pivot Analysis

Production data supports pivoting on these dimensions:

**Row dimensions:** `gam_branch`, `gam_province`, `gam_cluster`, `tran_source`, `gl_sub_head_code`, `product`, `service`, `merchant`, `part_tran_type`, `year`, `month`, `quarter`

**Value metrics:** `SUM(tran_amt)`, `SUM(tran_count)`, `AVG(tran_amt)`, `COUNT(DISTINCT acct_num)`, `COUNT(DISTINCT cif_id)`

Use `get_tran_summary` procedure with dynamic `select_inner`, `groupby_clause` for backend-computed pivots.

---

## Data Dictionary Usage

The `data_dictionary` table stores query templates for dynamic reports:

```ruby
# Look up a procedure and its parameters
DataDictionary = Struct.new(:item_id, :item_name, :item_type, :sql, :procedure, :parameter_ordinal)

result = ActiveRecord::Base.connection.execute(
  "SELECT * FROM data_dictionary WHERE item_type = 'procedure' ORDER BY parameter_ordinal"
)
```

---

## Date Dimension Joins

Join `tran_summary` to `dates` for fiscal period grouping:

```sql
SELECT d.year_quarter, SUM(ts.tran_amt)
FROM tran_summary ts
JOIN dates d ON d.date = ts.tran_date
WHERE ts.tran_date BETWEEN '2023-01-01' AND '2024-07-01'
GROUP BY d.year_quarter
ORDER BY d.year_quarter
```

---

## Performance Notes

- Always filter by `tran_date` first — it's the partition key
- `tran_summary` is partitioned by year; queries within one year are fastest
- Add `LIMIT` to all exploratory queries — 164K rows but can expand per partition
- Use `get_tran_summary` procedure for paginated results in the UI
- Cache procedure results in Rails.cache with 15-minute TTL
