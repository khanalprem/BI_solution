'use client';

import { useState } from 'react';

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionHeader({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[16px] font-bold text-text-primary tracking-tight">{label}</h2>
      <p className="text-[11.5px] text-text-secondary mt-0.5">{sub}</p>
    </div>
  );
}

function Badge({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    blue:   'bg-accent-blue/10   border-accent-blue/25   text-accent-blue',
    green:  'bg-accent-green/10  border-accent-green/25  text-accent-green',
    amber:  'bg-accent-amber/10  border-accent-amber/25  text-accent-amber',
    purple: 'bg-accent-purple/10 border-accent-purple/25 text-accent-purple',
    teal:   'bg-accent-teal/10   border-accent-teal/25   text-accent-teal',
    red:    'bg-accent-red/10    border-accent-red/25    text-accent-red',
    muted:  'bg-bg-input         border-border           text-text-muted',
  };
  return (
    <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${map[color] ?? map.blue}`}>
      {children}
    </span>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[10px] text-accent-amber bg-accent-amber/8 border border-accent-amber/15 px-1 py-0.5 rounded">{children}</code>;
}

// ─── Collapsible table card ───────────────────────────────────────────────────

function CollapsibleCard({
  title,
  badge,
  badgeColor = 'muted',
  children,
  defaultOpen = false,
}: {
  title: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-bg-hover transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] font-semibold text-text-primary">{title}</span>
          {badge && <Badge color={badgeColor}>{badge}</Badge>}
        </div>
        <svg
          width="11" height="11" viewBox="0 0 12 12" fill="none"
          className={`text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

// ─── Scrollable table wrapper ─────────────────────────────────────────────────

function ScrollTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[600px]">
        <thead>
          <tr className="bg-bg-input border-b border-border">
            {headers.map((h) => (
              <th key={h} className="px-4 py-2 text-[9.5px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, ri) => (
            <tr key={ri} className="hover:bg-bg-hover transition-colors">
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-[11px] text-text-secondary align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Production / warehouse tables ───────────────────────────────────────────

const FACT_TABLES = [
  {
    name: 'tran_summary',
    label: 'Transaction Summary',
    category: 'fact',
    rowCount: '164 K',
    description: 'Primary partitioned fact table. One row per account × transaction date × channel combination. Yearly partitions 2021–2025.',
    columns: [
      { name: 'acct_num',         type: 'string',          note: 'Account number — ILIKE searchable' },
      { name: 'acid',             type: 'string',          note: 'Internal account identifier (links to gam, eab)' },
      { name: 'cif_id',           type: 'string',          note: 'Customer CIF — ILIKE searchable' },
      { name: 'acct_name',        type: 'string',          note: 'Account holder name' },
      { name: 'gam_solid',        type: 'string',          note: 'SOL ID from GAM (account branch SOL)' },
      { name: 'gam_branch',       type: 'string',          note: 'Branch name from GAM — dimension' },
      { name: 'gam_province',     type: 'string',          note: 'Province from GAM — dimension' },
      { name: 'gam_cluster_id',   type: 'string',          note: 'Cluster ID from GAM' },
      { name: 'gam_cluster',      type: 'string',          note: 'Cluster name from GAM — dimension' },
      { name: 'tran_branch',      type: 'string',          note: 'Branch where transaction occurred' },
      { name: 'tran_cluster',     type: 'string',          note: 'Cluster of transaction branch' },
      { name: 'tran_province',    type: 'string',          note: 'Province of transaction branch' },
      { name: 'tran_solid',       type: 'string',          note: 'SOL ID of transaction branch' },
      { name: 'tran_date',        type: 'date',            note: 'Transaction date — primary filter key' },
      { name: 'date',             type: 'date',            note: 'Alias of tran_date' },
      { name: 'year',             type: 'integer',         note: 'Calendar year — dimension' },
      { name: 'quarter',          type: 'integer',         note: 'Calendar quarter (1–4)' },
      { name: 'month',            type: 'integer',         note: 'Calendar month (1–12)' },
      { name: 'year_quarter',     type: 'string',          note: 'Format YYYY-Qn — dimension' },
      { name: 'year_month',       type: 'string',          note: 'Format YYYY-MM — dimension' },
      { name: 'month_startdate',  type: 'date',            note: 'First day of the month' },
      { name: 'month_enddate',    type: 'date',            note: 'Last day of the month' },
      { name: 'quarter_startdate',type: 'date',            note: 'First day of the quarter' },
      { name: 'quarter_enddate',  type: 'date',            note: 'Last day of the quarter' },
      { name: 'year_startdate',   type: 'date',            note: 'Jan 1 of the year' },
      { name: 'year_enddate',     type: 'date',            note: 'Dec 31 of the year' },
      { name: 'tran_type',        type: 'string',          note: 'Transaction type code' },
      { name: 'part_tran_type',   type: 'string',          note: '"CR" or "DR" — dimension' },
      { name: 'tran_amt',         type: 'decimal(18,2)',   note: 'Transaction amount in NPR — primary measure base' },
      { name: 'tran_count',       type: 'integer',         note: 'Number of transactions in this summary row' },
      { name: 'signed_tranamt',   type: 'decimal(18,2)',   note: 'Signed amount (CR positive, DR negative)' },
      { name: 'gl_sub_head_code', type: 'string',          note: 'GL sub-head code — dimension' },
      { name: 'entry_user',       type: 'string',          note: 'User who entered the transaction — dimension' },
      { name: 'entry_user_id',    type: 'string',          note: 'Numeric ID of entry user' },
      { name: 'vfd_user',         type: 'string',          note: 'User who verified — dimension' },
      { name: 'vfd_user_id',      type: 'string',          note: 'Numeric ID of verified user' },
      { name: 'eod_balance',      type: 'decimal(18,2)',   note: 'Current balance from gam — surfaced as the GAM Balance dimension (static per account). For per-date balance snapshots use the TRAN Date Balance dimension (pulled from eab).' },
      { name: 'merchant',         type: 'string',          note: 'Merchant name — dimension' },
      { name: 'service',          type: 'string',          note: 'Service type — dimension' },
      { name: 'product',          type: 'string',          note: 'Banking product — dimension' },
      { name: 'tran_source',      type: 'string',          note: 'Digital channel — dimension' },
      { name: 'row_id',           type: 'string',          note: 'Internal row identifier' },
    ],
  },
  {
    name: 'eab',
    label: 'End-of-Day Balance',
    category: 'fact',
    rowCount: '150 K',
    description: 'Balance snapshots keyed by account (ACID) and effective date range. Joined into tran_summary for EOD Balance measure.',
    columns: [
      { name: 'acct_num',     type: 'string',        note: 'Account number' },
      { name: 'acid',         type: 'string',        note: 'Internal account identifier — join key to tran_summary' },
      { name: 'balance_date', type: 'date',          note: 'Snapshot date' },
      { name: 'eod_balance',  type: 'decimal(18,2)', note: 'End-of-day closing balance in NPR' },
      { name: 'currency',     type: 'string',        note: 'Currency code (default: NPR)' },
    ],
  },
  {
    name: 'htd',
    label: 'Historical Transaction Detail',
    category: 'fact',
    rowCount: '20 M+',
    description: 'Raw ledger-level transaction history. Very large — always filter by tran_date to avoid full scans. Use tran_summary for aggregations.',
    columns: [
      { name: 'tran_id',          type: 'bigint',       note: 'Primary key' },
      { name: 'tran_date',        type: 'datetime',     note: 'Transaction timestamp — always filter this' },
      { name: 'part_tran_srl_num',type: 'string(50)',   note: 'Serial number within the transaction' },
      { name: 'del_flg',          type: 'string(5)',    note: 'Deletion flag' },
      { name: 'tran_type',        type: 'string(5)',    note: 'Transaction type code' },
      { name: 'part_tran_type',   type: 'string(5)',    note: '"CR" or "DR"' },
      { name: 'gl_sub_head_code', type: 'string(50)',   note: 'GL sub-head code' },
      { name: 'acid',             type: 'string(50)',   note: 'Account identifier' },
      { name: 'value_date',       type: 'string(50)',   note: 'Value date of transaction' },
      { name: 'tran_amt',         type: 'decimal',      note: 'Transaction amount' },
      { name: 'tran_particular',  type: 'string(500)',  note: 'Transaction narration' },
      { name: 'entry_user_id',    type: 'integer',      note: 'Entry user ID' },
      { name: 'pstd_user_id',     type: 'string(50)',   note: 'Posted user ID' },
      { name: 'vfd_user_id',      type: 'integer',      note: 'Verified user ID' },
      { name: 'sol_id',           type: 'integer',      note: 'SOL ID of branch' },
      { name: 'tran_sub_type',    type: 'string(50)',   note: 'Transaction sub-type' },
      { name: 'entry_date',       type: 'datetime',     note: 'Entry timestamp' },
      { name: 'pstd_date',        type: 'datetime',     note: 'Posting timestamp' },
      { name: 'vfd_date',         type: 'datetime',     note: 'Verification timestamp' },
      { name: 'ref_num',          type: 'string(50)',   note: 'Reference number' },
      { name: 'tran_rmks',        type: 'string(500)',  note: 'Transaction remarks' },
      { name: 'tran_crncy_code',  type: 'string(50)',   note: 'Transaction currency' },
      { name: 'lchg_time',        type: 'datetime',     note: 'Last change timestamp' },
    ],
  },
];

const MASTER_TABLES = [
  {
    name: 'gam',
    label: 'General Account Master',
    category: 'master',
    rowCount: '50 K',
    description: 'Core account master table. Every account in the bank. Keyed by ACID (internal account identifier). Account details, scheme, balances, flags.',
    columns: [
      { name: 'acid',              type: 'string(100)',  note: 'Primary key — internal account ID' },
      { name: 'sol_id',            type: 'integer',      note: 'Branch SOL ID' },
      { name: 'acct_num',          type: 'string(100)',  note: 'Account number' },
      { name: 'foracid',           type: 'string(100)',  note: 'Foreign acid / CASA number' },
      { name: 'acct_name',         type: 'string(100)',  note: 'Account holder name' },
      { name: 'acct_short_name',   type: 'string(100)',  note: 'Short name' },
      { name: 'cif_id',            type: 'string(50)',   note: 'Customer CIF ID — links to customer' },
      { name: 'gl_sub_head_code',  type: 'string(100)',  note: 'GL sub-head code' },
      { name: 'schm_code',         type: 'string(100)',  note: 'Scheme code' },
      { name: 'schm_type',         type: 'string(100)',  note: 'Scheme type (SB, CA, FD, OD, etc.)' },
      { name: 'acct_opn_date',     type: 'string(100)',  note: 'Account opening date' },
      { name: 'acct_cls_flg',      type: 'string(100)',  note: 'Account closure flag' },
      { name: 'acct_cls_date',     type: 'string(100)',  note: 'Account closure date' },
      { name: 'clr_bal_amt',       type: 'string(100)',  note: 'Clear balance amount' },
      { name: 'drwng_power',       type: 'string(100)',  note: 'Drawing power (for OD/CC accounts)' },
      { name: 'sanct_lim',         type: 'string(100)',  note: 'Sanctioned limit' },
      { name: 'eod_balance',       type: 'decimal(18,2)',note: 'End-of-day balance' },
      { name: 'crncy_code',        type: 'string(100)',  note: 'Currency code' },
      { name: 'acct_crncy_code',   type: 'string(100)',  note: 'Account currency code' },
      { name: 'mode_of_oper_code', type: 'string(100)',  note: 'Mode of operation (SELF, EITHER, etc.)' },
      { name: 'acct_ownership',    type: 'string(100)',  note: 'Ownership type' },
      { name: 'lchg_user_id',      type: 'string(100)',  note: 'Last changed by user ID' },
      { name: 'lchg_time',         type: 'datetime',     note: 'Last change timestamp' },
    ],
  },
  {
    name: 'branch',
    label: 'Branch Master',
    category: 'dimension',
    rowCount: '~100',
    description: 'Primary branch dimension. Keyed by SOL ID. Contains branch name, province, and cluster linkage.',
    columns: [
      { name: 'sol_id',      type: 'integer',     note: 'Primary key — SOL identifier' },
      { name: 'branch_name', type: 'string(100)', note: 'Full branch name' },
      { name: 'province',    type: 'string(20)',  note: 'Nepal province (province 1–7)' },
      { name: 'cluster_id',  type: 'integer',     note: 'Links to cluster table' },
    ],
  },
  {
    name: 'branch_cdc',
    label: 'Branch CDC Replica',
    category: 'dimension',
    rowCount: '~100',
    description: 'Change-data-capture copy of the branch table. Same structure as branch.',
    columns: [
      { name: 'sol_id',      type: 'integer',     note: 'Primary key' },
      { name: 'branch_name', type: 'string(100)', note: 'Full branch name' },
      { name: 'province',    type: 'string(20)',  note: 'Nepal province' },
      { name: 'cluster_id',  type: 'integer',     note: 'Links to cluster table' },
    ],
  },
  {
    name: 'cluster',
    label: 'Branch Cluster',
    category: 'dimension',
    rowCount: '~10',
    description: 'Cluster hierarchy above branches. Clusters group branches for regional management.',
    columns: [
      { name: 'cluster_id',   type: 'integer',    note: 'Cluster identifier' },
      { name: 'cluster_name', type: 'string(10)', note: 'Cluster name (e.g. Eastern, Western)' },
    ],
  },
  {
    name: 'province',
    label: 'Province',
    category: 'dimension',
    rowCount: '7',
    description: 'Nepal\'s 7 provinces. Simple lookup for province name normalisation.',
    columns: [
      { name: 'name', type: 'string(20)', note: 'Province name (e.g. "province 1" through "province 7")' },
    ],
  },
  {
    name: 'gsh',
    label: 'GL Sub-Head',
    category: 'dimension',
    rowCount: '101',
    description: 'General Ledger sub-head lookup. Maps gl_sub_head_code to human-readable descriptions and parent GL codes.',
    columns: [
      { name: 'gl_sub_head_code', type: 'string(50)',  note: 'GL sub-head code — join key to tran_summary' },
      { name: 'gl_sub_head_desc', type: 'string(100)', note: 'Human-readable description' },
      { name: 'gl_code',          type: 'string(50)',  note: 'Parent GL code' },
    ],
  },
  {
    name: 'dates',
    label: 'Date Dimension',
    category: 'dimension',
    rowCount: '7 306',
    description: 'Full calendar dimension — 20 years of daily rows with pre-computed period boundaries. Used by stored procedures for period WHERE clause generation.',
    columns: [
      { name: 'date',               type: 'date',       note: 'Calendar date — primary key' },
      { name: 'year',               type: 'integer',    note: 'Calendar year' },
      { name: 'quarter',            type: 'string(2)',  note: 'Quarter (Q1–Q4)' },
      { name: 'month',              type: 'string(2)',  note: 'Month (01–12)' },
      { name: 'year_quarter',       type: 'string(7)',  note: 'YYYY-Qn format' },
      { name: 'year_month',         type: 'string(7)',  note: 'YYYY-MM format' },
      { name: 'month_startdate',    type: 'date',       note: 'First day of the month' },
      { name: 'month_enddate',      type: 'date',       note: 'Last day of the month' },
      { name: 'quarter_startdate',  type: 'date',       note: 'First day of the quarter' },
      { name: 'quarter_enddate',    type: 'date',       note: 'Last day of the quarter' },
      { name: 'year_startdate',     type: 'date',       note: 'Jan 1 of year' },
      { name: 'year_enddate',       type: 'date',       note: 'Dec 31 of year' },
    ],
  },
];

const LOOKUP_TABLES = [
  {
    name: 'merchant',
    label: 'Merchant',
    description: 'Merchant name lookup.',
    columns: [{ name: 'merchant', type: 'string(100)', note: 'Merchant identifier used in tran_summary' }],
  },
  {
    name: 'product',
    label: 'Product',
    description: 'Banking product lookup.',
    columns: [{ name: 'product', type: 'string(100)', note: 'Product name used in tran_summary' }],
  },
  {
    name: 'service',
    label: 'Service',
    description: 'Service type lookup.',
    columns: [{ name: 'service', type: 'string(100)', note: 'Service name used in tran_summary' }],
  },
  {
    name: 'data_dictionary',
    label: 'Data Dictionary',
    description: 'Dynamic query metadata. Stores SQL expressions and stored procedure references referenced by the platform.',
    columns: [
      { name: 'item_id',           type: 'integer',     note: 'Primary key' },
      { name: 'related_itemid',    type: 'integer',     note: 'Parent item reference' },
      { name: 'item_name',         type: 'string(100)', note: 'Name of the field or procedure' },
      { name: 'item_type',         type: 'string(20)',  note: 'Type: dimension / measure / procedure' },
      { name: 'sql',               type: 'string(500)', note: 'SQL expression for the field' },
      { name: 'procedure',         type: 'string(200)', note: 'Stored procedure reference' },
      { name: 'parameter_ordinal', type: 'integer',     note: 'Parameter order position' },
    ],
  },
  {
    name: 'user_master',
    label: 'User Master',
    description: 'Production user list for entry/verify user lookups.',
    columns: [
      { name: 'user_id',   type: 'integer',    note: 'User identifier' },
      { name: 'user_name', type: 'string(50)', note: 'User login name' },
    ],
  },
  {
    name: 'user_branch_cluster',
    label: 'User Branch Cluster',
    description: 'Row-level security map. Controls which branches and clusters each user can access.',
    columns: [
      { name: 'user_id',      type: 'integer',   note: 'Links to users table' },
      { name: 'sol_id',       type: 'integer',   note: 'Branch SOL ID — allowed branch' },
      { name: 'cluster_id',   type: 'integer',   note: 'Cluster ID — allowed cluster' },
      { name: 'access_level', type: 'string(5)', note: '"R" (read) or "W" (write)' },
    ],
  },
];

const RAILS_TABLES = [
  {
    name: 'users',
    columns: [
      { name: 'id',                  type: 'bigint',         note: 'Primary key' },
      { name: 'email',               type: 'string',         note: 'Login email' },
      { name: 'password_digest',     type: 'string',         note: 'bcrypt hash (has_secure_password)' },
      { name: 'first_name',          type: 'string',         note: '' },
      { name: 'last_name',           type: 'string',         note: '' },
      { name: 'role',                type: 'string',         note: 'default: analyst — one of: superadmin | admin | manager | analyst | branch_staff | auditor' },
      { name: 'is_active',           type: 'boolean',        note: 'Soft-delete flag — false = deactivated, cannot sign in' },
      { name: 'is_staff',            type: 'boolean',        note: 'Legacy flag — kept in sync with role automatically by the controller' },
      { name: 'is_superuser',        type: 'boolean',        note: 'Legacy flag — true only when role = superadmin' },
      { name: 'assigned_branches',   type: 'text[]',         note: 'Reserved for future use — branch_staff access is controlled by production user_branch_cluster table' },
      { name: 'assigned_provinces',  type: 'text[]',         note: 'Reserved for future use — province filter applied server-side' },
      { name: 'reset_password_token',type: 'string',         note: 'One-time password reset token' },
    ],
  },
  {
    name: 'branches',
    columns: [
      { name: 'branch_code', type: 'string',  note: 'Unique branch code' },
      { name: 'name',        type: 'string',  note: 'Branch display name' },
      { name: 'province',    type: 'string',  note: 'Province name' },
      { name: 'district',    type: 'string',  note: 'District' },
      { name: 'municipality',type: 'string',  note: 'Municipality' },
      { name: 'cluster',     type: 'string',  note: 'Cluster name' },
      { name: 'category',    type: 'string',  note: 'Branch category' },
      { name: 'active',      type: 'boolean', note: 'Active flag' },
    ],
  },
  {
    name: 'customers',
    columns: [
      { name: 'customer_id',   type: 'string',  note: 'CIF ID (matches tran_summary.cif_id)' },
      { name: 'full_name',     type: 'string',  note: 'Full customer name' },
      { name: 'segment',       type: 'string',  note: 'Mass Retail | Affluent | SME | Private Banking' },
      { name: 'kyc_risk_tier', type: 'integer', note: 'KYC risk tier (1=low, 3=high)' },
      { name: 'status',        type: 'string',  note: 'active | inactive' },
    ],
  },
  {
    name: 'accounts',
    columns: [
      { name: 'account_id',     type: 'integer',        note: 'Primary key' },
      { name: 'customer_id',    type: 'integer',        note: 'Links to customers' },
      { name: 'account_type',   type: 'string(50)',     note: 'Account type' },
      { name: 'account_number', type: 'string(20)',     note: 'Account number' },
      { name: 'balance',        type: 'decimal(15,2)',  note: 'Current balance' },
      { name: 'currency',       type: 'string(10)',     note: 'Currency code' },
      { name: 'account_status', type: 'string(20)',     note: 'Account status' },
    ],
  },
];

// ─── Dimensions ───────────────────────────────────────────────────────────────

// Aligned with /Users/premprasadkhanal/Downloads/data dictionary.xlsx (rows where type = "dimension").
// Display labels match the dictionary's "display" column verbatim.
// Order: broad → narrow drill-down hierarchy (matches the pivot sidebar render order).
const DIMENSIONS = [
  // ── Date (broad → narrow, all pivot-capable) ────────────────────────────────
  { key: 'year',             label: 'Year',               type: 'year',        sql: 'year',              description: 'Calendar year YYYY — pivotable' },
  { key: 'year_quarter',     label: 'Year Quarter',       type: 'quarter',     sql: 'year_quarter',      description: 'Quarterly period YYYY-Qn — pivotable (e.g. 2024-Q1)' },
  { key: 'year_month',       label: 'Year Month',         type: 'month',       sql: 'year_month',        description: 'Monthly period YYYY-MM — pivotable (e.g. 2024-03)' },
  { key: 'tran_date',        label: 'Tran Date',          type: 'date',        sql: 'tran_date',         description: 'Daily granularity YYYY-MM-DD — pivots to column headers' },
  // ── Customer / Account (geo broad → narrow, then identity) ──────────────────
  { key: 'gam_province',     label: 'GAM Province',       type: 'categorical', sql: 'gam_province',      description: 'Province of the account branch (GAM)' },
  { key: 'gam_cluster',      label: 'GAM Cluster',        type: 'categorical', sql: 'gam_cluster',       description: 'Cluster grouping of the account branch (GAM)' },
  { key: 'gam_branch',       label: 'GAM Branch',         type: 'categorical', sql: 'gam_branch',        description: 'Branch where the account is registered (GAM)' },
  { key: 'cif_id',           label: 'CIF Id',             type: 'text',        sql: 'cif_id',            description: 'Full or partial customer CIF ID (ILIKE pattern)' },
  { key: 'acid',             label: 'ACID',               type: 'text',        sql: 'acid',              description: 'Internal account identifier' },
  { key: 'acct_num',         label: 'ACCT Num',           type: 'text',        sql: 'acct_num',          description: 'Full or partial account number (ILIKE pattern)' },
  { key: 'acct_name',        label: 'ACCT Name',          type: 'text',        sql: 'acct_name',         description: 'Account holder name' },
  { key: 'tran_date_bal',    label: 'TRAN Date Balance',  type: 'text',        sql: 'e.tran_date_bal',   description: 'Balance snapshot from EAB via acid LEFT JOIN — listed as a dimension but rendered under pivoted headings as a measure column. Never aggregated. Requires a date dimension to resolve the EAB as-of date.' },
  { key: 'eod_balance',      label: 'GAM Balance',        type: 'text',        sql: 'g.eod_balance',     description: 'Current balance from GAM via acid LEFT JOIN — normal dimension, static per account (does not vary by date). Requires an account identifier (CIF Id / ACID / ACCT Num) for the GAM join to be unique.' },
  // ── Transaction (geo broad → narrow, then channel / type, then accounting) ──
  { key: 'tran_province',    label: 'TRAN Province',      type: 'categorical', sql: 'tran_province',     description: 'Province of the transaction branch' },
  { key: 'tran_cluster',     label: 'TRAN Cluster',       type: 'categorical', sql: 'tran_cluster',      description: 'Cluster of the transaction branch' },
  { key: 'tran_branch',      label: 'TRAN Branch',        type: 'categorical', sql: 'tran_branch',       description: 'Branch where the transaction was processed' },
  { key: 'tran_source',      label: 'TRAN Source',        type: 'categorical', sql: 'tran_source',       description: 'Transaction channel: mobile, internet, branch, ATM, etc.' },
  { key: 'tran_type',        label: 'TRAN Type',          type: 'categorical', sql: 'tran_type',         description: 'Transaction type code — pivot-capable' },
  { key: 'part_tran_type',   label: 'PART Tran Type',     type: 'categorical', sql: 'part_tran_type',    description: 'Credit or debit side of the transaction (CR / DR) — pivot-capable' },
  { key: 'gl_sub_head_code', label: 'GL Sub Head',        type: 'categorical', sql: 'gl_sub_head_code',  description: 'General ledger sub-head code — join to gsh for description — pivot-capable' },
  { key: 'product',          label: 'Product',            type: 'categorical', sql: 'product',           description: 'Banking product associated with the account' },
  { key: 'service',          label: 'Service',            type: 'categorical', sql: 'service',           description: 'Service type applied to the transaction' },
  { key: 'merchant',         label: 'Merchant',           type: 'categorical', sql: 'merchant',          description: 'Merchant identifier for payment transactions' },
  // ── User ────────────────────────────────────────────────────────────────────
  { key: 'entry_user',       label: 'ENTRY User',         type: 'categorical', sql: 'entry_user',        description: 'User who entered the transaction' },
  { key: 'vfd_user',         label: 'VFD User',           type: 'categorical', sql: 'vfd_user',          description: 'User who verified the transaction' },
];

// ─── Measures ─────────────────────────────────────────────────────────────────

const MEASURES = [
  // Core totals
  { key: 'tran_amt',        label: 'TRAN Amount',        selectSql: 'SUM(tran_amt) tran_amt',                                                                              orderSql: 'SUM(tran_amt) DESC' },
  { key: 'tran_count',      label: 'TRAN Count',         selectSql: 'SUM(tran_count) tran_count',                                                                          orderSql: 'SUM(tran_count) DESC' },
  { key: 'signed_tranamt',  label: 'Signed TRAN Amount', selectSql: 'SUM(signed_tranamt) signed_tranamt',                                                                   orderSql: 'SUM(signed_tranamt) DESC' },
  // Credit leg
  { key: 'cr_amt',          label: 'CR Amount',          selectSql: "SUM(CASE WHEN part_tran_type='CR' THEN tran_amt ELSE 0 END) cr_amt",                                   orderSql: "SUM(CASE WHEN part_tran_type='CR' THEN tran_amt ELSE 0 END) DESC" },
  { key: 'cr_count',        label: 'CR Count',           selectSql: "SUM(CASE WHEN part_tran_type='CR' THEN tran_count ELSE 0 END) cr_count",                               orderSql: "SUM(CASE WHEN part_tran_type='CR' THEN tran_count ELSE 0 END) DESC" },
  // Debit leg
  { key: 'dr_amt',          label: 'DR Amount',          selectSql: "SUM(CASE WHEN part_tran_type='DR' THEN tran_amt ELSE 0 END) dr_amt",                                   orderSql: "SUM(CASE WHEN part_tran_type='DR' THEN tran_amt ELSE 0 END) DESC" },
  { key: 'dr_count',        label: 'DR Count',           selectSql: "SUM(CASE WHEN part_tran_type='DR' THEN tran_count ELSE 0 END) dr_count",                               orderSql: "SUM(CASE WHEN part_tran_type='DR' THEN tran_count ELSE 0 END) DESC" },
  // Distinct counts
  { key: 'tran_acct_count', label: 'TRAN Acct Count',   selectSql: 'COUNT(DISTINCT acct_num) tran_acct_count',                                                             orderSql: 'COUNT(DISTINCT acct_num) DESC' },
  // Date / EAB
  { key: 'tran_maxdate',    label: 'TRAN Max Date',      selectSql: 'MAX(tran_date) tran_maxdate',                                                                          orderSql: 'MAX(tran_date) DESC' },
  // Composite RFM score — higher = more valuable customer
  { key: 'rfm_score',       label: 'RFM Score',          selectSql: 'SUM(tran_count)*0.001 + SUM(tran_amt)*0.0001 + (CURRENT_DATE-MAX(tran_date))*(-0.001) rfm_score',       orderSql: 'SUM(tran_count)*0.001 + SUM(tran_amt)*0.0001 + (CURRENT_DATE-MAX(tran_date))*(-0.001) DESC', note: 'Recency–Frequency–Monetary composite (formula from data dictionary). Higher = better customer.' },
];
// Note: eod_balance does NOT exist in tran_summary directly.
// Account balance data comes from the EAB table via the tran_date_bal column,
// surfaced inside the Transaction Details drill-down modal (opening_bal / running_bal columns).

// ─── Periods ──────────────────────────────────────────────────────────────────

// Order: grouped by time scale (Day → Month → Year). Within each scale:
// "this" first, then full-prior, then to-date, then same-date variants.
const PERIODS = [
  // ── Day-level ──
  { key: 'prevdate',          param: 'prevdate_where',          label: 'Previous Date',          desc: '1 calendar day before the end date' },
  // ── Month-level ──
  { key: 'thismonth',         param: 'thismonth_where',         label: 'This Month',             desc: 'Full calendar month containing the end date (1st → last day of month)' },
  { key: 'prevmonth',         param: 'prevmonth_where',         label: 'Previous Month',         desc: 'Full prior calendar month (1st → last day)' },
  { key: 'prevmonthmtd',      param: 'prevmonthmtd_where',      label: 'Prev Month MTD',         desc: 'Prior month day 1 → same day-of-month as end date' },
  { key: 'prevmonthsamedate', param: 'prevmonthsamedate_where', label: 'Prev Month Same Date',   desc: 'Exact same day-of-month in the previous calendar month' },
  // ── Year-level ──
  { key: 'thisyear',          param: 'thisyear_where',          label: 'This Year',              desc: 'Full calendar year containing the end date (Jan 1 → Dec 31)' },
  { key: 'prevyear',          param: 'prevyear_where',          label: 'Previous Year',          desc: 'Full prior calendar year (Jan 1 → Dec 31)' },
  { key: 'prevyearytd',       param: 'prevyearytd_where',       label: 'Prev Year YTD',          desc: 'Prior year Jan 1 → same calendar date as end date' },
  { key: 'prevyearsamedate',  param: 'prevyearsamedate_where',  label: 'Prev Year Same Date',    desc: 'Exact same calendar date in the previous year' },
];

// ─── Stored procedure params ──────────────────────────────────────────────────

const PROC_PARAMS = [
  { name: 'select_outer',            type: 'text',    desc: 'Outer SELECT clause — used when EAB join adds extra columns' },
  { name: 'select_inner',            type: 'text',    desc: 'Inner SELECT with dimension fields + measure aggregations' },
  { name: 'where_clause',            type: 'text',    desc: 'WHERE conditions for the main date range and all applied filters' },
  { name: 'groupby_clause',          type: 'text',    desc: 'GROUP BY expression (selected dimension keys joined by comma)' },
  { name: 'having_clause',           type: 'text',    desc: 'HAVING conditions (e.g. minimum amount threshold)' },
  { name: 'orderby_clause',          type: 'text',    desc: 'ORDER BY expression from the first selected measure' },
  { name: 'partitionby_clause',      type: 'text',    desc: 'PARTITION BY for ROW_NUMBER window used for server-side pagination' },
  { name: 'eab_join',                type: 'text',    desc: 'LEFT JOIN to EAB table — injected only when eod_balance measure is selected' },
  { name: 'prevdate_where',          type: 'text',    desc: 'WHERE for "Previous Date" period comparison (empty string = inactive)' },
  { name: 'thismonth_where',         type: 'text',    desc: 'WHERE for "This Month" MTD comparison' },
  { name: 'thisyear_where',          type: 'text',    desc: 'WHERE for "This Year" YTD comparison' },
  { name: 'prevmonth_where',         type: 'text',    desc: 'WHERE for "Previous Month" full-month comparison' },
  { name: 'prevyear_where',          type: 'text',    desc: 'WHERE for "Previous Year" full-year comparison' },
  { name: 'prevmonthmtd_where',      type: 'text',    desc: 'WHERE for "Prev Month MTD" (same MTD slice, prior month)' },
  { name: 'prevyearytd_where',       type: 'text',    desc: 'WHERE for "Prev Year YTD" (same YTD slice, prior year)' },
  { name: 'prevmonthsamedate_where', type: 'text',    desc: 'WHERE for "Prev Month Same Date" (exact same day, prior month)' },
  { name: 'prevyearsamedate_where',  type: 'text',    desc: 'WHERE for "Prev Year Same Date" (exact same date, prior year)' },
  { name: 'user_id',                 type: 'integer', desc: 'Requesting user ID — used by procedure for row-level security checks' },
  { name: 'page',                    type: 'integer', desc: 'Pagination page number (1-based)' },
  { name: 'page_size',               type: 'integer', desc: 'Rows per page (1–100, clamped server-side)' },
];

// ─── User roles ───────────────────────────────────────────────────────────────

const ROLES = [
  { role: 'superadmin',   level: 6, color: 'red',    permissions: 'All modules including config, users, and system settings' },
  { role: 'admin',        level: 5, color: 'purple',  permissions: 'dashboard, analytics, customers, branches, financial, risk, digital, employer, kpi, pivot, config, users' },
  { role: 'manager',      level: 4, color: 'blue',   permissions: 'dashboard, analytics, customers, branches, financial, risk, digital, employer, kpi, pivot' },
  { role: 'analyst',      level: 3, color: 'teal',   permissions: 'dashboard, analytics, branches, financial, risk, digital, kpi, pivot' },
  { role: 'branch_staff', level: 2, color: 'green',  permissions: 'dashboard, branches only — branch-scoped row-level filtering applied' },
  { role: 'auditor',      level: 1, color: 'amber',  permissions: 'dashboard, analytics, branches, financial, risk' },
];

// ─── Architecture steps ───────────────────────────────────────────────────────

const ARCH = [
  { step: '1', label: 'Next.js Frontend', detail: 'TanStack Query fires API call with filters, dimensions, measures, and page params', color: 'border-accent-blue/30 bg-accent-blue/8 text-accent-blue', dot: 'bg-accent-blue' },
  { step: '2', label: 'Rails 7 API :3001', detail: 'ProductionDataService validates params → builds select_inner, where_clause, groupby, period WHERE strings', color: 'border-accent-purple/30 bg-accent-purple/8 text-accent-purple', dot: 'bg-accent-purple' },
  { step: '3', label: 'get_tran_summary()', detail: 'Stored procedure receives 20 parameters, executes paged window query on partitioned tran_summary', color: 'border-accent-red/30 bg-accent-red/8 text-accent-red', dot: 'bg-accent-red' },
  { step: '4', label: 'tran_summary + EAB', detail: 'Partitioned fact table (2021–2025) optionally LEFT JOINed to EAB for EOD Balance measure', color: 'border-accent-amber/30 bg-accent-amber/8 text-accent-amber', dot: 'bg-accent-amber' },
  { step: '5', label: 'JSON Response', detail: 'rows[], columns[], total_rows, sql_preview, empty_periods returned to frontend pivot logic', color: 'border-accent-green/30 bg-accent-green/8 text-accent-green', dot: 'bg-accent-green' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function SkillsPage() {
  const typeColor: Record<string, string> = {
    categorical: 'blue',
    text:        'green',
    date:        'amber',
    month:       'amber',
    quarter:     'amber',
    year:        'amber',
    eab:         'teal',
  };

  return (
    <div className="min-h-screen bg-bg-base">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#2563eb 0%,#3b82f6 50%,#06b6d4 100%)' }}>
              <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
                <rect x="1"   y="7"   width="3" height="6"    rx="0.8" fill="white" opacity="0.9"/>
                <rect x="5.5" y="4"   width="3" height="9"    rx="0.8" fill="white"/>
                <rect x="10"  y="1.5" width="3" height="11.5" rx="0.8" fill="white" opacity="0.7"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-text-primary tracking-tight">BankBI Platform Guide</h1>
                <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-accent-green border border-accent-green/30 bg-accent-green/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-live-pulse" />
                  Live · Production · Nepal NPR
                </span>
              </div>
              <p className="text-[13px] text-text-secondary leading-relaxed max-w-2xl">
                Complete reference for the warehouse BI platform — database schema, table columns and data types,
                dimensions, measure SQL, stored procedure parameters, period comparisons, and user-role permissions.
                All data is queried directly from the production PostgreSQL warehouse with no ETL delay.
              </p>
            </div>
          </div>

          {/* Stat pills */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              { label: '19 Production Tables', color: 'blue' },
              { label: '23 Dimensions',         color: 'purple' },
              { label: '10 Measures',            color: 'green' },
              { label: '9 Period Comparisons',   color: 'amber' },
              { label: '20 Procedure Params',    color: 'red' },
              { label: '6 User Roles',           color: 'teal' },
            ].map((s) => (
              <Badge key={s.label} color={s.color}>{s.label}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-12">

        {/* ── Architecture ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            label="Data Flow Architecture"
            sub="Every request travels from the browser to a live PostgreSQL stored procedure and back."
          />
          <div className="rounded-xl border border-border bg-bg-card p-6">
            <div className="flex flex-col md:flex-row items-stretch gap-3">
              {ARCH.map((a, i) => (
                <div key={a.step} className="flex md:flex-col items-center gap-3 flex-1">
                  <div className={`rounded-lg border px-3 py-3 flex-1 w-full ${a.color} flex flex-col gap-1.5`}>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${a.dot}`}>{a.step}</span>
                      <p className="text-[11px] font-semibold leading-tight">{a.label}</p>
                    </div>
                    <p className="text-[10px] leading-relaxed opacity-80">{a.detail}</p>
                  </div>
                  {i < ARCH.length - 1 && (
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" className="text-text-muted flex-shrink-0 md:rotate-90">
                      <path d="M3 6h6M6 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2 border-t border-border pt-4">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-live-pulse mt-1.5 flex-shrink-0" />
              <p className="text-[10.5px] text-text-muted leading-relaxed">
                <strong className="text-text-secondary">No ETL, no cache.</strong> Filters, pagination, and field selections are converted into
                PostgreSQL stored-procedure arguments including dynamic <Mono>WHERE</Mono> clauses.
                Authentication is JWT — role-based access controls which modules a user can reach and row-level security restricts
                which branches appear in results via the <Mono>user_branch_cluster</Mono> table.
              </p>
            </div>
          </div>
        </section>

        {/* ── Fact Tables ──────────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            label="Fact Tables"
            sub="Core transactional data. tran_summary is the primary analytics table — all Pivot Analysis queries run against it."
          />
          <div className="space-y-3">
            {FACT_TABLES.map((t, ti) => (
              <CollapsibleCard
                key={t.name}
                title={t.name}
                badge={`${t.category} · ${t.rowCount}`}
                badgeColor={t.category === 'fact' ? 'red' : 'teal'}
                defaultOpen={ti === 0}
              >
                <div className="px-4 py-3 border-b border-border bg-bg-input/40">
                  <p className="text-[10.5px] text-text-secondary">{t.description}</p>
                </div>
                <ScrollTable
                  headers={['Column', 'Data Type', 'Notes']}
                  rows={t.columns.map((c) => [
                    <Mono key={c.name}>{c.name}</Mono>,
                    <span key="type" className="font-mono text-[10px] text-accent-purple">{c.type}</span>,
                    <span key="note" className="text-text-muted text-[10.5px]">{c.note}</span>,
                  ])}
                />
              </CollapsibleCard>
            ))}
          </div>
        </section>

        {/* ── Master / Dimension Tables ─────────────────────────────────────── */}
        <section>
          <SectionHeader
            label="Master &amp; Dimension Tables"
            sub="Reference tables providing context for fact data — branches, accounts, GL codes, calendars."
          />
          <div className="space-y-3">
            {MASTER_TABLES.map((t) => (
              <CollapsibleCard
                key={t.name}
                title={t.name}
                badge={`${t.category} · ${t.rowCount}`}
                badgeColor={t.category === 'master' ? 'purple' : 'blue'}
              >
                <div className="px-4 py-3 border-b border-border bg-bg-input/40">
                  <p className="text-[10.5px] text-text-secondary">{t.description}</p>
                </div>
                <ScrollTable
                  headers={['Column', 'Data Type', 'Notes']}
                  rows={t.columns.map((c) => [
                    <Mono key={c.name}>{c.name}</Mono>,
                    <span key="type" className="font-mono text-[10px] text-accent-purple">{c.type}</span>,
                    <span key="note" className="text-text-muted text-[10.5px]">{c.note}</span>,
                  ])}
                />
              </CollapsibleCard>
            ))}
          </div>
        </section>

        {/* ── Lookup / Security Tables ──────────────────────────────────────── */}
        <section>
          <SectionHeader
            label="Lookup &amp; Security Tables"
            sub="Small reference tables and row-level security mappings."
          />
          <div className="space-y-3">
            {LOOKUP_TABLES.map((t) => (
              <CollapsibleCard
                key={t.name}
                title={t.name}
                badge="lookup"
                badgeColor="amber"
              >
                <div className="px-4 py-3 border-b border-border bg-bg-input/40">
                  <p className="text-[10.5px] text-text-secondary">{t.description}</p>
                </div>
                <ScrollTable
                  headers={['Column', 'Data Type', 'Notes']}
                  rows={t.columns.map((c) => [
                    <Mono key={c.name}>{c.name}</Mono>,
                    <span key="type" className="font-mono text-[10px] text-accent-purple">{c.type}</span>,
                    <span key="note" className="text-text-muted text-[10.5px]">{c.note}</span>,
                  ])}
                />
              </CollapsibleCard>
            ))}
          </div>
        </section>

        {/* ── Rails-managed Tables ─────────────────────────────────────────── */}
        <section>
          <SectionHeader
            label="Rails-Managed Tables"
            sub="Application tables owned by Rails migrations — not part of the production banking warehouse."
          />
          <div className="space-y-3">
            {RAILS_TABLES.map((t) => (
              <CollapsibleCard key={t.name} title={t.name} badge="rails" badgeColor="green">
                <ScrollTable
                  headers={['Column', 'Data Type', 'Notes']}
                  rows={t.columns.map((c) => [
                    <Mono key={c.name}>{c.name}</Mono>,
                    <span key="type" className="font-mono text-[10px] text-accent-purple">{c.type}</span>,
                    <span key="note" className="text-text-muted text-[10.5px]">{c.note}</span>,
                  ])}
                />
              </CollapsibleCard>
            ))}
          </div>
        </section>

        {/* ── Dimensions ───────────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            label="Pivot Dimensions (25)"
            sub="All GROUP BY fields available in Pivot Analysis. Each becomes a column in the SELECT and GROUP BY clause of get_tran_summary. Fields marked pivot-capable can become column headers (tran_type, part_tran_type, gl_sub_head_code, and all date fields)."
          />
          <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
            <ScrollTable
              headers={['Key', 'Label', 'Type', 'SQL Expression', 'Description']}
              rows={DIMENSIONS.map((d) => [
                <Mono key={d.key}>{d.key}</Mono>,
                <span key="label" className="font-medium text-text-primary text-[11px]">{d.label}</span>,
                <Badge key="type" color={typeColor[d.type] ?? 'muted'}>{d.type}</Badge>,
                <Mono key="sql">{d.sql}</Mono>,
                <span key="desc" className="text-text-muted">{d.description}</span>,
              ])}
            />
          </div>
        </section>

        {/* ── Measures ─────────────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            label="Measures (10)"
            sub="Aggregation expressions injected into the SELECT clause of get_tran_summary. At least one must be selected. EOD Balance is not a measure — select the TRAN Date Balance dimension to trigger the EAB LEFT JOIN."
          />
          <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
            <ScrollTable
              headers={['Key', 'Label', 'SELECT SQL', 'ORDER BY SQL', 'Notes']}
              rows={MEASURES.map((m) => [
                <Mono key={m.key}>{m.key}</Mono>,
                <span key="label" className="font-medium text-text-primary text-[11px]">{m.label}</span>,
                <span key="sel" className="font-mono text-[9.5px] text-accent-green leading-relaxed">{m.selectSql}</span>,
                <span key="ord" className="font-mono text-[9.5px] text-text-muted">{m.orderSql}</span>,
                <span key="note" className="text-[10px] text-text-muted italic">{(m as { note?: string }).note ?? ''}</span>,
              ])}
            />
          </div>
        </section>

        {/* ── Stored Procedure ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            label="Stored Procedure — get_tran_summary"
            sub="All 20 parameters accepted by the production analytics procedure. Called by ProductionDataService on every Pivot Analysis query."
          />

          {/* Procedure signature box */}
          <div className="rounded-xl border border-border bg-bg-card p-5 mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Signature</p>
            <pre className="text-[10.5px] leading-relaxed text-accent-green font-mono whitespace-pre-wrap bg-bg-input rounded-lg p-3 border border-border overflow-x-auto">{`CALL public.get_tran_summary(
  select_outer             => '...',
  select_inner             => 'gam_branch, SUM(tran_amt) AS total_amount',
  where_clause             => 'tran_date BETWEEN ''2024-01-01'' AND ''2024-03-31''',
  groupby_clause           => 'gam_branch',
  having_clause            => '',
  orderby_clause           => 'SUM(tran_amt) DESC',
  partitionby_clause       => 'gam_branch',
  eab_join                 => '',        -- or LEFT JOIN eab ON ...
  prevdate_where           => '',        -- empty = inactive
  thismonth_where          => 'tran_date BETWEEN ''2024-03-01'' AND ''2024-03-31''',
  thisyear_where           => '',
  prevmonth_where          => '',
  prevyear_where           => '',
  prevmonthmtd_where       => '',
  prevyearytd_where        => '',
  prevmonthsamedate_where  => '',
  prevyearsamedate_where   => '',
  user_id                  => 42,
  page                     => 1,
  page_size                => 25
)`}</pre>
          </div>

          <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
            <ScrollTable
              headers={['Parameter', 'Type', 'Description']}
              rows={PROC_PARAMS.map((p) => [
                <Mono key={p.name}>{p.name}</Mono>,
                <span key="type" className="font-mono text-[10px] text-accent-purple">{p.type}</span>,
                <span key="desc" className="text-text-muted text-[10.5px]">{p.desc}</span>,
              ])}
            />
          </div>
        </section>

        {/* ── Period Comparisons ───────────────────────────────────────────── */}
        <section>
          <SectionHeader
            label="Period Comparisons (9)"
            sub="Each period translates to a WHERE clause passed to get_tran_summary. Empty string = inactive. Both tran_amt and tran_count can be computed per period."
          />
          <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
            <ScrollTable
              headers={['Period Key', 'Procedure Parameter', 'Label', 'What it computes']}
              rows={PERIODS.map((p) => [
                <Mono key={p.key}>{p.key}</Mono>,
                <Mono key="param">{p.param}</Mono>,
                <span key="label" className="font-medium text-text-primary text-[11px]">{p.label}</span>,
                <span key="desc" className="text-text-muted">{p.desc}</span>,
              ])}
            />
          </div>
          <div className="mt-3 rounded-lg border border-border bg-bg-input px-4 py-3">
            <p className="text-[10.5px] text-text-muted leading-relaxed">
              <strong className="text-text-secondary">Frontend fields:</strong> Each period generates two selectable measures —
              <Mono>prevdate_amt</Mono> / <Mono>prevdate_count</Mono> — giving <strong className="text-text-secondary">18 time-comparison columns</strong> in total (9 periods × 2 metrics).
              These are passed as the <Mono>time_comparisons</Mono> array to the API and trigger separate procedure calls that are merged into the result.
            </p>
          </div>
        </section>

        {/* ── User Roles & Permissions ─────────────────────────────────────── */}
        <section>
          <SectionHeader
            label="User Roles &amp; Permissions"
            sub="Six roles with hierarchical access. branch_staff gets row-level filtering via user_branch_cluster table."
          />
          <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
            <ScrollTable
              headers={['Role', 'Level', 'Accessible Modules']}
              rows={ROLES.map((r) => [
                <div key={r.role} className="flex items-center gap-2">
                  <Badge color={r.color}>{r.role}</Badge>
                </div>,
                <span key="level" className="font-mono text-[10px] text-text-muted">{r.level}</span>,
                <span key="perm" className="text-[10.5px] text-text-secondary leading-relaxed">{r.permissions}</span>,
              ])}
            />
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-bg-input px-4 py-3">
              <p className="text-[11px] font-semibold text-text-primary mb-1">Row-Level Security</p>
              <p className="text-[10.5px] text-text-muted leading-relaxed">
                <Badge color="green">branch_staff</Badge> role automatically scopes all queries
                to only branches listed in <Mono>user_branch_cluster</Mono> for that user.
                Results from <Mono>get_tran_summary</Mono> include only their permitted branches.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-bg-input px-4 py-3">
              <p className="text-[11px] font-semibold text-text-primary mb-1">PII Visibility</p>
              <p className="text-[10.5px] text-text-muted leading-relaxed">
                Only <Badge color="red">superadmin</Badge>, <Badge color="purple">admin</Badge>, and <Badge color="blue">manager</Badge> roles
                can see PII fields (account numbers, CIF IDs, customer names).
                Lower roles see masked or aggregated data.
              </p>
            </div>
          </div>
        </section>

        {/* ── Quick Tips ───────────────────────────────────────────────────── */}
        <section>
          <SectionHeader label="Quick Tips" sub="Get the most out of Pivot Analysis." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { color: 'border-l-accent-blue',   title: 'Start with one dimension',          tip: 'Add Branch first, check the row count, then add Channel or Product to build a cross-tab gradually.' },
              { color: 'border-l-accent-purple',  title: 'Year Month → auto pivot',           tip: 'Selecting Year Month dimension turns results into column-per-month — ideal for 12-month rolling views.' },
              { color: 'border-l-accent-amber',   title: 'Period comparison without date dim', tip: 'Without a date dimension, comparison rows appear as main vs prev. Add a date dimension to merge into columns.' },
              { color: 'border-l-accent-green',   title: 'Inspect the SQL preview',           tip: 'The SQL preview card on Pivot Analysis shows the exact CALL statement. Copy and run it directly in psql or DBeaver.' },
              { color: 'border-l-accent-teal',    title: 'Filter first for speed',            tip: 'Apply Branch or Province filters before choosing dimensions — smaller WHERE clause = faster procedure execution.' },
              { color: 'border-l-accent-red',     title: 'EOD Balance requires EAB join',     tip: 'Selecting EOD Balance measure injects a LEFT JOIN to the eab table via the eab_join procedure parameter — slightly slower.' },
            ].map((t) => (
              <div key={t.title} className={`rounded-lg border border-border bg-bg-card px-4 py-3.5 border-l-4 ${t.color}`}>
                <p className="text-[12px] font-semibold text-text-primary mb-1">{t.title}</p>
                <p className="text-[10.5px] text-text-secondary leading-relaxed">{t.tip}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="pb-6" />
      </div>
    </div>
  );
}
