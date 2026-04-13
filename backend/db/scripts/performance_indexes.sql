-- BankBI Performance Indexes
-- FOR DBA REVIEW: Run manually during maintenance window.
-- These are additive (CREATE INDEX) only — no data modification.
-- Use CONCURRENTLY to avoid table locks on production.
--
-- Date: 2026-04-13
-- Reason: Audit found missing composite/single indexes causing slow queries.

-- 1. EAB composite index for LEFT JOIN in tran_date_bal lookups
--    Current: separate single-column indexes on acid, eod_date
--    Impact: 5-10x faster EAB joins
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_eab_composite_join
  ON eab (acid, eod_date, end_eod_date);

-- 2. tran_summary year_month for financial_summary, monthly trend queries
--    GROUP BY year_month currently does full partition scan
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_tran_summary_year_month
  ON tran_summary (year_month);

-- 3. tran_summary entry_user for employer_summary GROUP BY
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_tran_summary_entry_user
  ON tran_summary (entry_user);

-- 4. tran_summary gl_sub_head_code for financial by_gl and risk by_gl
CREATE INDEX CONCURRENTLY IF NOT EXISTS index_tran_summary_gl_sub_head_code
  ON tran_summary (gl_sub_head_code);
