import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api';
import type {
  BranchPerformanceData,
  ChannelMetrics,
  CustomerProfileData,
  DashboardFilters,
  ExecutiveDashboardData,
  FilterStatisticsResponse,
  FilterValuesResponse,
  ProvinceMetrics,
  TopCustomer,
  TrendData,
} from '@/types';

function toApiFilters(filters: DashboardFilters): Record<string, string | number> {
  const params: Record<string, string | number> = {};

  if (filters.startDate) params.start_date = filters.startDate;
  if (filters.endDate) params.end_date = filters.endDate;
  if (filters.province) params.province = filters.province;
  if (filters.branchCode) params.branch_code = filters.branchCode;
  if (filters.district) params.district = filters.district;
  if (filters.municipality) params.municipality = filters.municipality;
  if (filters.cluster) params.cluster = filters.cluster;
  if (filters.solid) params.solid = filters.solid;
  if (filters.tranType) params.tran_type = filters.tranType;
  if (filters.partTranType) params.part_tran_type = filters.partTranType;
  if (filters.tranSource) params.tran_source = filters.tranSource;
  if (filters.product) params.product = filters.product;
  if (filters.service) params.service = filters.service;
  if (filters.merchant) params.merchant = filters.merchant;
  if (filters.glSubHeadCode) params.gl_sub_head_code = filters.glSubHeadCode;
  if (filters.entryUser) params.entry_user = filters.entryUser;
  if (filters.vfdUser) params.vfd_user = filters.vfdUser;
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
