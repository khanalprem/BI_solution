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
