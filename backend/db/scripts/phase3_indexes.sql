-- BankBI Phase 3 Performance Indexes
-- ==================================
-- FOR DBA REVIEW: Run manually during a low-traffic window.
-- All statements are additive (CREATE INDEX CONCURRENTLY IF NOT EXISTS) and
-- non-locking. They do NOT modify schema, NOT NULL, types, or data.
--
-- Authored: 2026-04-25
-- See: CLAUDE.md "Performance & Caching" for the apply order and the
--      EXPLAIN-first workflow rationale.
-- Companion: db/scripts/performance_indexes.sql (4 earlier indexes — already
--            recommended; this file adds 8 more without overlap).
--
-- WORKFLOW (for the DBA — please follow):
--   1. Pick ONE statement at a time.
--   2. EXPLAIN ANALYZE the motivating query (see "From query…" comment on each
--      block) BEFORE creating the index, capture the plan.
--   3. CREATE INDEX CONCURRENTLY (no transaction).
--   4. EXPLAIN ANALYZE again, confirm the index is being used.
--   5. If pg_stat_user_indexes shows zero idx_scan after a week of normal
--      traffic, drop it (CONCURRENTLY).
--
-- All BankBI Rails code is read-only against this warehouse; nothing in the
-- application requires these indexes to be present — they only affect speed.
--
-- ────────────────────────────────────────────────────────────────────────────

-- 1. tran_summary (cif_id, tran_date DESC)
--    From query: dashboards_controller.rb#customer_profile
--      scope.order(tran_date: :desc).limit(20).map { ... } (recent_transactions)
--    Also speeds up: the customer detail page's apply_filters chain
--    (where cif_id = ? AND tran_date BETWEEN ? AND ?), which is the busiest
--    customer-scoped query in the app.
--    Why DESC: matches the ORDER BY direction so Postgres reads the index
--    backwards (no in-memory sort).
--    Why this is safe: pure additive btree on existing columns.
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_tran_summary_cif_id_date
  ON tran_summary (cif_id, tran_date DESC);

-- 2. tran_summary (acct_num, tran_date DESC)
--    From query: dashboards_controller.rb#risk_summary anomaly_data CTE
--      SELECT acct_num, MAX(tran_date) … GROUP BY acct_num
--    Also: any "drill into one account" flow (htd_detail row_dims include
--    acct_num) that hits tran_summary directly.
--    Why DESC: same MAX(tran_date)-style queries get index-only or backward
--    scans. Cardinality of acct_num is high → narrow index leaf pages.
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_tran_summary_acct_num_date
  ON tran_summary (acct_num, tran_date DESC);

-- 3. tran_summary (year_quarter)
--    From query: dashboards_controller.rb#kpi_summary by_quarter
--      scope.group(:year_quarter).order(:year_quarter)
--    Companion to the existing index_tran_summary_year_month (Phase 1 file).
--    Quarterly aggregations currently fall back to a sort on a derived
--    column unless year_quarter is indexed.
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_tran_summary_year_quarter
  ON tran_summary (year_quarter);

-- 4. tran_summary (tran_date, tran_source)
--    From query: dashboards_controller.rb#digital_channels trend
--      scope.where.not(tran_source: nil).group(:tran_date, :tran_source) …
--    A single composite covers both the date filter AND the channel grouping
--    in one index lookup → no merge with another index, no sort.
--    Selectivity: tran_source has only ~3-4 values (mobile/internet/null),
--    but the date column makes the prefix selective.
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_tran_summary_date_source
  ON tran_summary (tran_date, tran_source);

-- 5. EXPRESSION INDEX: tran_summary ((gl_sub_head_code::varchar))
--    From query: dashboards_controller.rb#financial_summary by_gl
--      JOIN gsh ON gsh.gl_sub_head_code::varchar
--                 = tran_summary.gl_sub_head_code::varchar
--    The ::varchar cast on BOTH sides currently prevents Postgres from using
--    any plain index on gl_sub_head_code — the join falls back to a hash
--    join over a sequential scan. An expression index that mirrors the cast
--    makes the column usable for the join again.
--    NOTE: ideally fix the schema so both columns are the same varchar() type
--    and remove the casts entirely. That's a real schema change, so it goes
--    on the DBA's roadmap, not this file.
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_tran_summary_gsh_cast
  ON tran_summary ((gl_sub_head_code::varchar));

-- 6. gam (cif_id)  — only if not already present
--    From query: AccountMasterLookup#customer_accounts
--      Gam.where(cif_id: cif_id) → ORDER BY eod_balance DESC
--    Also: AccountMasterLookup#customer_name_for, #customer_names_for
--    Probably already exists as part of any "customer 360" workload, but
--    confirming with IF NOT EXISTS is the safe approach.
--    Cardinality: high (customer count); ideal for a btree.
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_gam_cif_id
  ON gam (cif_id);

-- 7. htd (acid, tran_date)
--    From procedure: public.get_tran_detail (called by ProductionDataService#htd_detail)
--      htd h JOIN gam g ON g.acid = h.acid AND <join_clause>
--      The join_clause is filtered on a row's acid + tran_date pair.
--    htd is the largest table in the warehouse (20M+ rows). Without this
--    index, every drill-down from the pivot page does a sequential scan.
--    EXPECTED IMPACT: 100-500x faster htd_detail responses on first hit.
--    POTENTIAL COST: index build will take a while at this size — use
--    CONCURRENTLY (already specified) and run during a low-traffic window.
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_htd_acid_date
  ON htd (acid, tran_date);

-- 8. user_master (user_name)
--    From query: User#production_branch_access
--      JOIN user_master um ON um.user_id = ubc.user_id
--      WHERE um.user_name = 'user 42'
--    Tiny table (~104 rows), so impact is small per call — but this query
--    runs on every authenticated request that doesn't hit the 15-minute
--    cache, so saving 1ms × QPS adds up.
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_user_master_user_name
  ON user_master (user_name);

-- ────────────────────────────────────────────────────────────────────────────
-- INDEXES INTENTIONALLY NOT INCLUDED
--
-- These were considered and rejected:
--
--   tran_summary (part_tran_type)  — only 2 distinct values ('CR'/'DR').
--     Postgres won't pick a btree with selectivity ~50%; would just bloat.
--     Filter applied AFTER the date predicate; cost there is negligible.
--
--   tran_summary (tran_type)  — same problem, low cardinality.
--
--   tran_summary (tran_amt) for min_amount / max_amount filters.
--     Range queries on a money column rarely benefit from a single btree
--     unless they're the leading predicate. Date is always the leading
--     predicate here, so the existing partition pruning already does the
--     heavy lifting.
--
--   Materialized views for the dashboard summaries.
--     Out of scope — would need a refresh strategy + DBA-owned schedule.
--     Discuss separately if cache TTL of 15 min isn't tight enough.
--
-- ────────────────────────────────────────────────────────────────────────────
-- PARTITION PRUNING NOTES (no DDL — advisory)
--
-- tran_summary is partitioned by year (tran_summary_2021..2025).
-- Queries with `WHERE tran_date BETWEEN ? AND ?` should prune to the
-- relevant year(s). To verify on a sample query:
--
--   EXPLAIN (ANALYZE, BUFFERS)
--   SELECT count(*) FROM tran_summary
--   WHERE tran_date BETWEEN '2024-02-01' AND '2024-02-29';
--
-- Look for "Append" with exactly one child plan ("Index Scan on
-- tran_summary_2024"). If you see all five children scanned, the partition
-- key constraint is not being inferred — investigate the partition DDL.
--
-- Queries that filter on year_month / year_quarter / year columns ALONE
-- (without tran_date) will NOT prune unless the partitions are defined with
-- those columns in the partition constraint. They almost certainly are not.
-- Two safe paths:
--   (a) Always include the date range from the period selector in the WHERE
--       clause — already done by BaseController#filter_params for filtered
--       endpoints, and by explorer_where_clause when start_date/end_date
--       are present.
--   (b) Add a CHECK constraint per partition that includes year_month etc.
--       — that IS a schema change; out of scope for this file.
--
-- ────────────────────────────────────────────────────────────────────────────
-- HOW TO REMOVE AN INDEX SAFELY (if any of these turns out to be unused)
--
--   DROP INDEX CONCURRENTLY IF EXISTS index_tran_summary_…;
--
-- Run AFTER confirming pg_stat_user_indexes shows idx_scan = 0 for at least
-- one full reporting cycle (typically 30 days for monthly reports).
