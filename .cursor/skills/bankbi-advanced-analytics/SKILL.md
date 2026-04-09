---
name: bankbi-advanced-analytics
description: Guide for implementing advanced analytics in BankBI using production procedures and data. Covers get_tran_summary procedure usage, multi-period comparison, pivot analysis, and KPI drill-down backed by live nifi database.
---

# BankBI Advanced Analytics

Use this skill when implementing KPI tree, pivot analysis, multi-period comparison, branch drill-down, or any feature that uses the `get_tran_summary` stored procedure.

## What Is Live

All dashboard pages are live with production data:
- Executive overview, Branch & regional, Customer & portfolio, Financial results
- Digital channels, Employer & payroll, Risk & exposure, KPI tree
- Pivot analysis (dynamic procedure explorer), Configuration (DB browser)
- User management (RBAC with 6 roles)

---

## Using `get_tran_summary` Procedure

### Critical Rules (verified by debugging)

1. **`partitionby_clause` must be empty `''`** for pagination to work.
   - `PARTITION BY <dim>` makes `ROW_NUMBER()` reset per group → `WHERE RN > 0 AND RN <= 5` returns 5 rows × N groups = all rows.
   - Empty partition = global RN = correct pagination.

2. **Use `ActiveRecord::Base.connection` directly** — not `@connection` or `with_connection`.
   - The procedure creates a temp table `result` which is connection-scoped.
   - Both `CALL` and `SELECT * FROM result` must run on the exact same connection object.

3. **`DROP TABLE IF EXISTS result`** before every CALL — prevents stale data from previous calls on the same connection.

4. **Time comparisons require two separate procedure calls:**
   - Call 1: Main query with `page` and `page_size` → procedure handles pagination
   - Call 2 (per comparison period): Restricted to same low-cardinality dimension values from Call 1
   - Only restrict by low-cardinality dims (branch, province, cluster) — NOT by acct_num, cif_id, entry_user (those accounts may not exist in the comparison period)
   - Label comparison rows with period prefix: `"this_year:2022-02-18"` so pivot creates clean columns

5. **`thisyear_where` uses full year** (Jan 1 → Dec 31), not YTD.

6. **EAB join**: `>= eod_date::date AND < end_eod_date::date` (exclusive end). Use `e.tran_date_bal` for balance.

### Rails — correct procedure call pattern

```ruby
conn = ActiveRecord::Base.connection
conn.execute('DROP TABLE IF EXISTS result')
conn.execute(<<~SQL.squish)
  CALL public.get_tran_summary(
    select_outer => 'SELECT tb2.*',
    select_inner => #{conn.quote(select_inner)},
    where_clause => #{conn.quote(where_clause)},
    prevdate_where => '', thismonth_where => '', thisyear_where => '',
    prevmonth_where => '', prevyear_where => '', prevmonthmtd_where => '',
    prevyearytd_where => '', prevmonthsamedate_where => '', prevyearsamedate_where => '',
    groupby_clause => #{conn.quote(groupby_clause)},
    having_clause => '',
    orderby_clause => #{conn.quote(orderby_clause)},
    partitionby_clause => '',
    eab_join => '',
    user_id => '',
    page => #{page},
    page_size => #{page_size}
  )
SQL
rows = conn.exec_query('SELECT * FROM result').to_a
total_rows = rows.first&.[]('pivoted_totalrows') || rows.length
```

### Time comparison — two-call pattern

```ruby
# Call 1: Main query (paginated)
conn.execute('DROP TABLE IF EXISTS result')
conn.execute("CALL get_tran_summary(...page => 1, page_size => 10)")
main_rows = conn.exec_query('SELECT * FROM result').to_a

# Call 2: Comparison (restricted to same branches, NOT same accounts)
period_where = "WHERE tran_date BETWEEN '2022-01-01' AND '2022-12-31' AND gam_branch IN ('branch 35', ...)"
conn.execute('DROP TABLE IF EXISTS result')
conn.execute("CALL get_tran_summary(...where_clause => period_where, page => 1, page_size => 10)")
comp_rows = conn.exec_query('SELECT * FROM result').to_a
comp_rows.each { |r| r['tran_date'] = "this_year:#{r['tran_date']}" }  # label for pivot
```

### Available data months (demo data)

Only 3 months per year have data: February, May, July.
`prevmonth` for Feb → Jan = empty. This is expected with demo data.

---

## Pivot Analysis Page

The pivot page (`frontend/app/dashboard/pivot/page.tsx`) is a fully dynamic procedure explorer:

- **Multi-dimension selection** via checkboxes (not radio buttons)
- **Date filters**: single value, from-to range, or multi-select for tran_date/year_month/year_quarter/year
- **Standard measures**: total_amount, transaction_count, unique_accounts, unique_customers, credit_amount, debit_amount, net_flow, eod_balance
- **Period comparisons**: 9 comparison windows (prevdate, thismonth, thisyear, prevmonth, prevyear, prevmonthmtd, prevyearytd, prevmonthsamedate, prevyearsamedate) × 2 metrics each
- **Pagination**: page and page_size sent to procedure, shown in SQL preview
- **Auto-pivot**: when a date dimension + non-date dimensions are selected, date values become column headers

### Frontend pivot logic

```typescript
// pivotRows() in pivot/page.tsx
// Only pass effectiveMeasures (NOT timeComparisons) to pivotRows
// Time comparisons are already represented by period-prefixed date values
const { pivotedColumns, pivotedRows } = pivotRows(
  explorer.rows, dateDim, rowDims, effectiveMeasures  // NOT [...effectiveMeasures, ...timeComparisons]
);
```

---

## Performance Notes

- Always filter by `tran_date` first
- `tran_summary` has 178K rows (rebuilt from htd), date range 2021-02-18 → 2024-07-01
- Use `get_tran_summary` procedure for paginated results — never load all rows into Ruby
- Cache dashboard responses with 15-minute TTL
- Production data months: Feb, May, Jul only (3 per year)
