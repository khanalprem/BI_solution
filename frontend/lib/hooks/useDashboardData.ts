import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api';
import type {
  BranchPerformanceData,
  ChannelMetrics,
  CustomerProfileData,
  DashboardFilters,
  DemographicsData,
  DigitalChannelsData,
  EmployeeDetailData,
  EmployerSummaryData,
  ExecutiveDashboardData,
  FilterStatisticsResponse,
  FilterValuesResponse,
  FinancialSummaryData,
  HtdDetailResponse,
  KpiSummaryData,
  ProductionCatalogResponse,
  ProductionExplorerResponse,
  ProductionTableDetailResponse,
  ProvinceMetrics,
  RiskSummaryData,
  TopCustomer,
  TrendData,
} from '@/types';

// ─── Filter serialization ─────────────────────────────────────────────────────

function serializeFilterValue(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    const normalized = value.map((v) => v.trim()).filter(Boolean);
    return normalized.length > 0 ? normalized.join(',') : undefined;
  }
  const normalized = value?.trim();
  return normalized || undefined;
}

export function toApiFilters(filters: DashboardFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  const map: [string, string | undefined][] = [
    ['start_date',       filters.startDate],
    ['end_date',         filters.endDate],
    ['province',         serializeFilterValue(filters.province)],
    ['branch_code',      serializeFilterValue(filters.branchCode)],
    ['district',         serializeFilterValue(filters.district)],
    ['municipality',     serializeFilterValue(filters.municipality)],
    ['cluster',          serializeFilterValue(filters.cluster)],
    ['solid',            serializeFilterValue(filters.solid)],
    ['scheme_type',      serializeFilterValue(filters.schemeType)],
    ['tran_type',        serializeFilterValue(filters.tranType)],
    ['part_tran_type',   serializeFilterValue(filters.partTranType)],
    ['tran_source',      serializeFilterValue(filters.tranSource)],
    ['product',          serializeFilterValue(filters.product)],
    ['service',          serializeFilterValue(filters.service)],
    ['merchant',         serializeFilterValue(filters.merchant)],
    ['gl_sub_head_code', serializeFilterValue(filters.glSubHeadCode)],
    ['entry_user',       serializeFilterValue(filters.entryUser)],
    ['vfd_user',         serializeFilterValue(filters.vfdUser)],
    ['acct_num',         filters.acctNum],
    ['cif_id',           filters.cifId],
    // Date dimension exact-match filters
    ['tran_date',         serializeFilterValue(filters.tranDate)],
    ['year_month',        serializeFilterValue(filters.yearMonth)],
    ['year_quarter',      serializeFilterValue(filters.yearQuarter)],
    ['year',              serializeFilterValue(filters.year)],
    // Date dimension range filters
    ['tran_date_from',    filters.tranDateFrom],
    ['tran_date_to',      filters.tranDateTo],
    ['year_month_from',   filters.yearMonthFrom],
    ['year_month_to',     filters.yearMonthTo],
    ['year_quarter_from', filters.yearQuarterFrom],
    ['year_quarter_to',   filters.yearQuarterTo],
    ['year_from',         filters.yearFrom],
    ['year_to',           filters.yearTo],
  ];
  map.forEach(([key, val]) => { if (val) params[key] = val; });
  if (typeof filters.minAmount === 'number') params.min_amount = filters.minAmount;
  if (typeof filters.maxAmount === 'number') params.max_amount = filters.maxAmount;
  return params;
}

// ─── Generic factory ──────────────────────────────────────────────────────────

function useDashboardQuery<T>(
  queryKey: string,
  endpoint: string,
  filters: DashboardFilters,
  staleTime = 5 * 60 * 1000,
  extraParams?: Record<string, string | number>,
) {
  const params = useMemo(
    () => ({ ...toApiFilters(filters), ...extraParams }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, JSON.stringify(extraParams)],
  );
  return useQuery<T>({
    queryKey: [queryKey, params],
    queryFn: async () => {
      const { data } = await apiClient.get<T>(`/dashboards/${endpoint}`, { params });
      return data;
    },
    staleTime,
  });
}

// ─── Dashboard hooks ──────────────────────────────────────────────────────────

export const useDashboardData      = (f: DashboardFilters) => useDashboardQuery<ExecutiveDashboardData>('dashboard-executive',   'executive',          f, 5*60*1000);
export const useBranchPerformance  = (f: DashboardFilters) => useDashboardQuery<BranchPerformanceData>('branch-performance',     'branch_performance', f);
export const useProvinceSummary    = (f: DashboardFilters) => useDashboardQuery<ProvinceMetrics[]>    ('province-summary',       'province_summary',   f);
export const useChannelBreakdown   = (f: DashboardFilters) => useDashboardQuery<ChannelMetrics[]>     ('channel-breakdown',      'channel_breakdown',  f);
export const useDailyTrend         = (f: DashboardFilters) => useDashboardQuery<TrendData[]>          ('daily-trend',            'daily_trend',        f);
export const useFinancialSummary   = (f: DashboardFilters) => useDashboardQuery<FinancialSummaryData> ('financial-summary',      'financial_summary',  f);
export const useDigitalChannels    = (f: DashboardFilters) => useDashboardQuery<DigitalChannelsData>  ('digital-channels',       'digital_channels',   f);
export const useRiskSummary        = (f: DashboardFilters) => useDashboardQuery<RiskSummaryData>      ('risk-summary',           'risk_summary',       f);
export const useKpiSummary         = (f: DashboardFilters) => useDashboardQuery<KpiSummaryData>       ('kpi-summary',            'kpi_summary',        f);
export const useEmployerSummary    = (f: DashboardFilters) => useDashboardQuery<EmployerSummaryData>  ('employer-summary',       'employer_summary',   f);

export function useTopCustomers(filters: DashboardFilters, limit = 20) {
  return useDashboardQuery<TopCustomer[]>('customers-top', 'customers_top', filters, 5*60*1000, { limit });
}

export function useCustomerProfile(filters: DashboardFilters, cifId: string) {
  const params = useMemo(() => ({ ...toApiFilters(filters), cif_id: cifId }), [filters, cifId]);
  return useQuery<CustomerProfileData>({
    queryKey: ['customer-profile', params],
    queryFn: async () => {
      const { data } = await apiClient.get<CustomerProfileData>('/dashboards/customer_profile', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(cifId),
  });
}

export function useEmployeeDetail(filters: DashboardFilters, userId: string) {
  const params = useMemo(() => ({ ...toApiFilters(filters), entry_user: userId }), [filters, userId]);
  return useQuery<EmployeeDetailData>({
    queryKey: ['employee-detail', params],
    queryFn: async () => {
      const { data } = await apiClient.get<EmployeeDetailData>('/dashboards/employee_detail', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(userId),
  });
}

export function useDemographics() {
  return useQuery<DemographicsData>({
    queryKey: ['demographics'],
    queryFn: async () => {
      const { data } = await apiClient.get<DemographicsData>('/dashboards/demographics');
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

// ─── Filter hooks ─────────────────────────────────────────────────────────────

export function useFilterStatistics() {
  return useQuery<FilterStatisticsResponse>({
    queryKey: ['filter-statistics'],
    queryFn: async () => {
      const { data } = await apiClient.get<FilterStatisticsResponse>('/filters/statistics');
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useFilterValues() {
  return useQuery<FilterValuesResponse>({
    queryKey: ['filter-values'],
    queryFn: async () => {
      const { data } = await apiClient.get<FilterValuesResponse>('/filters/values');
      return data;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

// ─── Production explorer hooks ────────────────────────────────────────────────

export function useProductionCatalog() {
  return useQuery<ProductionCatalogResponse>({
    queryKey: ['production-catalog'],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductionCatalogResponse>('/production/catalog');
      return data;
    },
    staleTime: 30 * 60 * 1000,
  });
}

export function useProductionTable(tableName: string, page = 1, pageSize = 25) {
  return useQuery<ProductionTableDetailResponse>({
    queryKey: ['production-table', tableName, page, pageSize],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductionTableDetailResponse>('/production/table', {
        params: { table_name: tableName, page, page_size: pageSize },
      });
      return data;
    },
    enabled: Boolean(tableName),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductionExplorer(
  filters: DashboardFilters,
  dimensions: string[],
  measures: string[],
  timeComparisons: string[] = [],
  page = 1,
  pageSize = 10,
  partitionbyClause = '',
  orderbyClause = '',
) {
  const params = useMemo(
    () => ({
      ...toApiFilters(filters),
      dimensions: dimensions.join(','),
      measures: measures.join(','),
      ...(timeComparisons.length > 0 ? { time_comparisons: timeComparisons.join(',') } : {}),
      ...(partitionbyClause ? { partitionby_clause: partitionbyClause } : {}),
      ...(orderbyClause     ? { orderby_clause: orderbyClause }         : {}),
      page,
      page_size: pageSize,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, JSON.stringify(dimensions), JSON.stringify(measures), JSON.stringify(timeComparisons), partitionbyClause, orderbyClause, page, pageSize],
  );
  return useQuery<ProductionExplorerResponse>({
    queryKey: ['production-explorer', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductionExplorerResponse>('/production/explorer', { params });
      return data;
    },
    enabled: dimensions.length > 0 && measures.length > 0,
    staleTime: 60 * 1000,
    retry: 1, // Limit retries — explorer queries can be expensive stored procedure calls
    placeholderData: (prev) => prev,
  });
}

export function useHtdDetail(
  filters: DashboardFilters,
  rowDims: Record<string, string>,
  enabled: boolean,
  page = 1,
  pageSize = 50,
) {
  const params = useMemo(() => {
    const p: Record<string, string | number> = {
      ...toApiFilters(filters),
      page,
      page_size: pageSize,
    };
    for (const [k, v] of Object.entries(rowDims)) {
      p[`row_dims[${k}]`] = v;
    }
    return p;
  }, [filters, rowDims, page, pageSize]);

  return useQuery<HtdDetailResponse>({
    queryKey: ['htd-detail', params],
    queryFn: async () => {
      const { data } = await apiClient.get<HtdDetailResponse>('/production/htd_detail', { params });
      return data;
    },
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
