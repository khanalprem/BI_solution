export interface DashboardFilters {
  startDate: string;
  endDate: string;
  province?: string;
  branchCode?: string;
  district?: string;
  municipality?: string;
  cluster?: string;
  solid?: string;
  tranType?: string;
  partTranType?: string;
  tranSource?: string;
  product?: string;
  service?: string;
  merchant?: string;
  glSubHeadCode?: string;
  entryUser?: string;
  vfdUser?: string;
  minAmount?: number;
  maxAmount?: number;
  acctNum?: string;
  cifId?: string;
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

export interface BranchMetrics {
  branch_code: string;
  province: string;
  total_amount: number;
  transaction_count: number;
  unique_accounts: number;
  avg_transaction: number;
}

export interface ProvinceMetrics {
  province: string;
  total_amount: number;
  transaction_count: number;
  branch_count: number;
  unique_accounts: number;
  avg_per_branch: number;
}

export interface ChannelMetrics {
  channel: string;
  total_amount: number;
  transaction_count: number;
}

export interface TrendData {
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
  segment: string;
  risk_tier: number;
  summary: DashboardSummary;
  by_branch: BranchMetrics[];
  by_channel: ChannelMetrics[];
  trend: TrendData[];
  recent_transactions: CustomerRecentTransaction[];
}

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
  districts: string[];
  municipalities: string[];
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
  monthly_volatility: number; avg_monthly_volume: number;
  by_gl: { gl_code: string; amount: number; count: number; accounts: number }[];
  by_province: { province: string; amount: number; accounts: number; debit_amount: number }[];
}

export interface KpiSummaryData {
  total_amount: number; total_count: number; credit_amount: number; debit_amount: number;
  net_flow: number; avg_transaction: number; credit_ratio: number;
  unique_accounts: number; unique_customers: number; unique_branches: number; unique_provinces: number;
  txn_per_account: number; vol_per_account: number;
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
