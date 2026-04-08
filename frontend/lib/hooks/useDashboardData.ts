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
  EmployerSummaryData,
  ExecutiveDashboardData,
  FilterStatisticsResponse,
  FilterValuesResponse,
  FinancialSummaryData,
  KpiSummaryData,
  ProductionCatalogResponse,
  ProductionExplorerResponse,
  ProductionTableDetailResponse,
  ProvinceMetrics,
  RiskSummaryData,
  TopCustomer,
  TrendData,
} from '@/types';

function serializeFilterValue(value?: string | string[]): string | undefined {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => item.trim())
      .filter(Boolean);

    return normalized.length > 0 ? normalized.join(',') : undefined;
  }

  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function toApiFilters(filters: DashboardFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {};
  const province = serializeFilterValue(filters.province);
  const branchCode = serializeFilterValue(filters.branchCode);
  const district = serializeFilterValue(filters.district);
  const municipality = serializeFilterValue(filters.municipality);
  const cluster = serializeFilterValue(filters.cluster);
  const solid = serializeFilterValue(filters.solid);
  const schemeType = serializeFilterValue(filters.schemeType);
  const tranType = serializeFilterValue(filters.tranType);
  const partTranType = serializeFilterValue(filters.partTranType);
  const tranSource = serializeFilterValue(filters.tranSource);
  const product = serializeFilterValue(filters.product);
  const service = serializeFilterValue(filters.service);
  const merchant = serializeFilterValue(filters.merchant);
  const glSubHeadCode = serializeFilterValue(filters.glSubHeadCode);
  const entryUser = serializeFilterValue(filters.entryUser);
  const vfdUser = serializeFilterValue(filters.vfdUser);

  if (filters.startDate) params.start_date = filters.startDate;
  if (filters.endDate) params.end_date = filters.endDate;
  if (province) params.province = province;
  if (branchCode) params.branch_code = branchCode;
  if (district) params.district = district;
  if (municipality) params.municipality = municipality;
  if (cluster) params.cluster = cluster;
  if (solid) params.solid = solid;
  if (schemeType) params.scheme_type = schemeType;
  if (tranType) params.tran_type = tranType;
  if (partTranType) params.part_tran_type = partTranType;
  if (tranSource) params.tran_source = tranSource;
  if (product) params.product = product;
  if (service) params.service = service;
  if (merchant) params.merchant = merchant;
  if (glSubHeadCode) params.gl_sub_head_code = glSubHeadCode;
  if (entryUser) params.entry_user = entryUser;
  if (vfdUser) params.vfd_user = vfdUser;
  if (typeof filters.minAmount === 'number') params.min_amount = filters.minAmount;
  if (typeof filters.maxAmount === 'number') params.max_amount = filters.maxAmount;
  if (filters.acctNum) params.acct_num = filters.acctNum;
  if (filters.cifId) params.cif_id = filters.cifId;

  return params;
}

export function useDashboardData(filters: DashboardFilters) {
  const params = useMemo(() => toApiFilters(filters), [filters]);

  return useQuery({
    queryKey: ['dashboard-executive', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ExecutiveDashboardData>('/dashboards/executive', {
        params,
      });
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useBranchPerformance(filters: DashboardFilters) {
  const params = useMemo(() => toApiFilters(filters), [filters]);

  return useQuery<BranchPerformanceData>({
    queryKey: ['branch-performance', params],
    queryFn: async () => {
      const { data } = await apiClient.get<BranchPerformanceData>('/dashboards/branch_performance', {
        params,
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProvinceSummary(filters: DashboardFilters) {
  const params = useMemo(() => toApiFilters(filters), [filters]);

  return useQuery({
    queryKey: ['province-summary', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ProvinceMetrics[]>('/dashboards/province_summary', {
        params,
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useChannelBreakdown(filters: DashboardFilters) {
  const params = useMemo(() => toApiFilters(filters), [filters]);

  return useQuery({
    queryKey: ['channel-breakdown', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ChannelMetrics[]>('/dashboards/channel_breakdown', {
        params,
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDailyTrend(filters: DashboardFilters) {
  const params = useMemo(() => toApiFilters(filters), [filters]);

  return useQuery({
    queryKey: ['daily-trend', params],
    queryFn: async () => {
      const { data } = await apiClient.get<TrendData[]>('/dashboards/daily_trend', {
        params,
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFilterStatistics() {
  return useQuery({
    queryKey: ['filter-statistics'],
    queryFn: async () => {
      const { data } = await apiClient.get<FilterStatisticsResponse>('/filters/statistics');
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useFilterValues() {
  return useQuery({
    queryKey: ['filter-values'],
    queryFn: async () => {
      const { data } = await apiClient.get<FilterValuesResponse>('/filters/values');
      return data;
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}

export function useTopCustomers(filters: DashboardFilters, limit: number = 20) {
  const params = useMemo(() => ({ ...toApiFilters(filters), limit }), [filters, limit]);

  return useQuery({
    queryKey: ['customers-top', params],
    queryFn: async () => {
      const { data } = await apiClient.get<TopCustomer[]>('/dashboards/customers_top', {
        params,
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomerProfile(filters: DashboardFilters, cifId: string) {
  const params = useMemo(() => {
    const base = toApiFilters(filters);
    if (cifId) base.cif_id = cifId;
    return base;
  }, [filters, cifId]);

  return useQuery({
    queryKey: ['customer-profile', params],
    queryFn: async () => {
      const { data } = await apiClient.get<CustomerProfileData>('/dashboards/customer_profile', {
        params,
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(cifId),
  });
}

export function useFinancialSummary(filters: DashboardFilters) {
  const params = useMemo(() => toApiFilters(filters), [filters]);

  return useQuery<FinancialSummaryData>({
    queryKey: ['financial-summary', params],
    queryFn: async () => {
      const { data } = await apiClient.get<FinancialSummaryData>('/dashboards/financial_summary', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useDigitalChannels(filters: DashboardFilters) {
  const params = useMemo(() => toApiFilters(filters), [filters]);

  return useQuery<DigitalChannelsData>({
    queryKey: ['digital-channels', params],
    queryFn: async () => {
      const { data } = await apiClient.get<DigitalChannelsData>('/dashboards/digital_channels', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRiskSummary(filters: DashboardFilters) {
  const params = useMemo(() => toApiFilters(filters), [filters]);

  return useQuery<RiskSummaryData>({
    queryKey: ['risk-summary', params],
    queryFn: async () => {
      const { data } = await apiClient.get<RiskSummaryData>('/dashboards/risk_summary', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useKpiSummary(filters: DashboardFilters) {
  const params = useMemo(() => toApiFilters(filters), [filters]);

  return useQuery<KpiSummaryData>({
    queryKey: ['kpi-summary', params],
    queryFn: async () => {
      const { data } = await apiClient.get<KpiSummaryData>('/dashboards/kpi_summary', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useEmployerSummary(filters: DashboardFilters) {
  const params = useMemo(() => toApiFilters(filters), [filters]);

  return useQuery<EmployerSummaryData>({
    queryKey: ['employer-summary', params],
    queryFn: async () => {
      const { data } = await apiClient.get<EmployerSummaryData>('/dashboards/employer_summary', { params });
      return data;
    },
    staleTime: 5 * 60 * 1000,
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

export function useProductionTable(tableName: string, page: number = 1, pageSize: number = 25) {
  return useQuery<ProductionTableDetailResponse>({
    queryKey: ['production-table', tableName, page, pageSize],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductionTableDetailResponse>('/production/table', {
        params: {
          table_name: tableName,
          page,
          page_size: pageSize,
        },
      });
      return data;
    },
    enabled: Boolean(tableName),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductionExplorer(
  filters: DashboardFilters,
  dimension: string,
  measures: string[],
  page: number = 1,
  pageSize: number = 25,
) {
  const params = useMemo(() => ({
    ...toApiFilters(filters),
    dimension,
    measures: measures.join(','),
    page,
    page_size: pageSize,
  }), [filters, dimension, measures, page, pageSize]);

  return useQuery<ProductionExplorerResponse>({
    queryKey: ['production-explorer', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ProductionExplorerResponse>('/production/explorer', { params });
      return data;
    },
    enabled: Boolean(dimension) && measures.length > 0,
    staleTime: 60 * 1000,
  });
}
