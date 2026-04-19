export type MultiValueFilter = string | string[];

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  // Categorical filters — each one maps 1:1 to a column in tran_summary and is
  // applied as a SQL IN-clause by the backend. Filters that the backend cannot
  // apply (district, municipality, schemeType) were removed.
  province?: MultiValueFilter;
  branchCode?: MultiValueFilter;
  cluster?: MultiValueFilter;
  solid?: MultiValueFilter;
  tranType?: MultiValueFilter;
  partTranType?: MultiValueFilter;
  tranSource?: MultiValueFilter;
  product?: MultiValueFilter;
  service?: MultiValueFilter;
  merchant?: MultiValueFilter;
  glSubHeadCode?: MultiValueFilter;
  entryUser?: MultiValueFilter;
  vfdUser?: MultiValueFilter;
  minAmount?: number;
  maxAmount?: number;
  acctNum?: MultiValueFilter;
  cifId?: MultiValueFilter;
  acctName?: MultiValueFilter;
  acid?: MultiValueFilter;
  // Date dimension exact-match filters (pivot explorer)
  tranDate?: MultiValueFilter;    // specific YYYY-MM-DD date(s) on tran_date column
  yearMonth?: MultiValueFilter;   // e.g., ['2024-01', '2024-02']
  yearQuarter?: MultiValueFilter; // e.g., ['2024-Q1', '2024-Q2']
  year?: MultiValueFilter;        // e.g., ['2024', '2023']
  // Date dimension range filters (pivot explorer — from/to)
  tranDateFrom?: string;
  tranDateTo?: string;
  yearMonthFrom?: string;
  yearMonthTo?: string;
  yearQuarterFrom?: string;
  yearQuarterTo?: string;
  yearFrom?: string;
  yearTo?: string;
}

export interface DashboardSummary {
  total_amount: number;
  total_count: number;
  unique_accounts: number;
  unique_customers: number;
  avg_transaction_size: number;
  credit_amount: number;
  debit_amount: number;
  net_flow: number;
  credit_count: number;
  debit_count: number;
  credit_ratio: number;
}

// These dashboard aggregate shapes are rendered both in typed lists AND inside
// chart components that read fields via dynamic keys (d[xAxisKey], d[dataKey]).
// Extending Record<string, unknown> tells TS they are index-accessible, so they
// can be passed directly to PremiumBarChart / PremiumLineChart / etc. without
// casts. The known fields retain their specific types for everywhere else.
export interface BranchMetrics extends Record<string, unknown> {
  branch_code: string;
  province: string;
  total_amount: number;
  transaction_count: number;
  unique_accounts: number;
  avg_transaction: number;
}

export interface ProvinceMetrics extends Record<string, unknown> {
  province: string;
  total_amount: number;
  transaction_count: number;
  branch_count: number;
  unique_accounts: number;
  avg_per_branch: number;
}

export interface ChannelMetrics extends Record<string, unknown> {
  channel: string;
  total_amount: number;
  transaction_count: number;
}

export interface TrendData extends Record<string, unknown> {
  date: string;
  amount: number;
  count: number;
}

export interface ExecutiveDashboardData {
  summary: DashboardSummary;
  by_branch: BranchMetrics[];
  by_province: ProvinceMetrics[];
  by_channel: ChannelMetrics[];
  trend: TrendData[];
}

export interface TopCustomer {
  cif_id: string;
  name: string;
  segment: string;
  amount: number;
  accounts: number;
  risk: number;
  transaction_count: number;
}

export interface CustomerProfileData {
  cif_id: string;
  requested_cif_id: string;
  customer_name: string;
  // Personal info from customers table
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  account_status?: string | null;
  customer_id?: number | null;
  age?: number | null;
  segment: string;
  risk_tier: number;
  accounts: CustomerAccountDetail[];
  account_columns: string[];
  summary: DashboardSummary;
  by_branch: BranchMetrics[];
  by_channel: ChannelMetrics[];
  trend: TrendData[];
  recent_transactions: CustomerRecentTransaction[];
}

// All GAM columns returned dynamically — content depends on the production GAM schema
export type CustomerAccountDetail = Record<string, string | number | boolean | null>;

export interface CustomerRecentTransaction {
  date: string;
  description: string;
  category: string;
  type: 'income' | 'expense';
  part_tran_type: string;
  amount: number;
  balance_after: number;
  account_number: string;
  acid: string;
}

export interface BranchPerformanceData {
  branches: BranchMetrics[];
  provinces: ProvinceMetrics[];
  total_amount: number;
  total_count: number;
  unique_accounts: number;
  unique_customers: number;
}

export interface FilterValuesResponse {
  provinces: string[];
  branches: string[];
  clusters: string[];
  solids: string[];
  tran_types: string[];
  part_tran_types: string[];
  tran_sources: string[];
  products: string[];
  services: string[];
  merchants: string[];
  gl_sub_head_codes: string[];
  entry_users: string[];
  vfd_users: string[];
}

export interface FinancialSummaryData {
  credit_amount: number; debit_amount: number; net_flow: number; total_amount: number;
  credit_count: number; debit_count: number; credit_ratio: number;
  avg_credit: number; avg_debit: number;
  monthly_trend: { month: string; credit: number; debit: number; net: number }[];
  by_gl: { gl_code: string; type: string; amount: number; count: number }[];
}

export interface DigitalChannelsData {
  channels: { channel: string; total_amount: number; transaction_count: number; unique_accounts: number; credit_amount: number; debit_amount: number }[];
  trend: { date: string; channel: string; amount: number; count: number }[];
  digital_amount: number; branch_amount: number; digital_ratio: number; total_digital_accounts: number;
}

export interface RiskSummaryData {
  total_amount: number; credit_amount: number; debit_amount: number; net_flow: number;
  high_value_count: number; high_value_threshold: number; top3_branch_share: number;
  top3_branches: { branch: string; amount: number }[];
  monthly_volatility: number; avg_monthly_volume: number; mom_volume_change: number;
  thresholds: {
    concentration_warn: number; concentration_high: number;
    volatility_warn: number; volatility_high: number;
  };
  by_gl: { gl_code: string; amount: number; count: number; accounts: number }[];
  by_province: { province: string; amount: number; accounts: number; debit_amount: number }[];
  by_branch: { branch: string; amount: number }[];
  npa_classification: { classification: string; accounts: number; amount: number }[];
  dormancy: { status: string; accounts: number; amount: number }[];
  hhi_index: number;
  anomaly_alerts: { acct_num: string; total_amt: number; txn_count: number; last_txn: string; z_score: number }[];
}

export interface KpiSummaryData {
  total_amount: number; total_count: number; credit_amount: number; debit_amount: number;
  net_flow: number; avg_transaction: number; credit_ratio: number;
  unique_accounts: number; unique_customers: number; unique_branches: number; unique_provinces: number;
  txn_per_account: number; vol_per_account: number;
  txn_velocity: number; active_days: number;
  casa: { by_gl: { gl_code: string; deposit_amount: number }[]; total_deposits: number };
  mom_trends: { month: string; amount: number; count: number; mom_change: number | null }[];
  by_quarter: { period: string; amount: number; count: number; accounts: number }[];
  by_product: { product: string; amount: number; count: number }[];
  by_service: { service: string; amount: number; count: number }[];
}

export interface EmployerSummaryData {
  total_entry_users: number; total_vfd_users: number; total_branches: number;
  total_amount: number; total_count: number;
  by_user: { user: string; amount: number; count: number; accounts: number; credit: number }[];
  by_branch: { branch: string; province: string; users: number; amount: number; count: number }[];
}

export interface EmployeeDetailData {
  user_id: string;
  active_branches: number;
  summary: DashboardSummary;
  by_branch: { branch: string; province: string; amount: number; count: number; accounts: number }[];
  by_account: { acct_num: string; amount: number; count: number }[];
  daily_trend: { date: string; amount: number; count: number }[];
  monthly_trend: { month: string; amount: number; count: number; credit: number; debit: number }[];
  by_product: { product: string; amount: number; count: number }[];
}

export interface DemographicsData {
  age_groups: {
    age_group: string;
    customers: number;
    accounts: number;
    total_amount: number;
    transaction_count: number;
    credit_amount: number;
    debit_amount: number;
  }[];
  total_customers: number;
}

export interface FilterStatisticsResponse {
  date_range: {
    min: string | null;
    max: string | null;
  };
  amount_range: {
    min: number | null;
    max: number | null;
  };
  counts: {
    total_transactions: number;
    unique_accounts: number;
    unique_customers: number;
    provinces: number;
    branches: number;
  };
}

export interface ProductionOption {
  value: string;
  label: string;
}

export interface ProductionPeriodComparisonOption {
  value: string;
  label: string;
  description: string;
}

export interface ProductionTimeComparisonFieldOption {
  value: string;
  label: string;
  period: string;
  metric: string;
}

export interface ProductionTableSummary {
  table_name: string;
  label: string;
  description: string;
  category: string;
  estimated_rows: number;
  column_count: number;
}

export interface ProductionProcedure {
  name: string;
  description: string;
  signature?: string;
}

export interface ProductionCatalogResponse {
  tables: ProductionTableSummary[];
  procedures: ProductionProcedure[];
  lookup_types: string[];
  dimension_options: ProductionOption[];
  measure_options: ProductionOption[];
  period_comparison_options: ProductionPeriodComparisonOption[];
  time_comparison_field_options: ProductionTimeComparisonFieldOption[];
}

export interface ProductionColumn {
  name: string;
  data_type: string;
}

export interface ProductionTableDetailResponse {
  table_name: string;
  label: string;
  description: string;
  category: string;
  estimated_rows: number;
  columns: ProductionColumn[];
  rows: Array<Record<string, string | number | boolean | null>>;
  page: number;
  page_size: number;
}

export interface ProductionExplorerResponse {
  dimensions: string[];
  measures: string[];
  empty_periods: string[];
  time_comparisons: string[];
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  total_rows: number;
  page: number;
  page_size: number;
  sql_preview: {
    select_outer:       string;
    select_inner:       string;
    where_clause:       string;
    groupby_clause:     string;
    having_clause:      string;
    orderby_clause:     string;
    partitionby_clause: string;
    eab_join:           string;
    include_eab:        boolean;
    period_wheres:      Record<string, string>;
    page:               number;
    page_size:          number;
  };
}

export interface HtdDetailResponse {
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
  total_rows: number;
  page: number;
  page_size: number;
  sql_preview: {
    join_clause: string;
    page: number;
    page_size: number;
  };
}
