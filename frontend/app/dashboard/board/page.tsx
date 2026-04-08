'use client';

import { useState, useMemo, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { DataTable, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/DataTable';
import { Pill } from '@/components/ui/Pill';
import { useDashboardData, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { PremiumLineChart, PremiumBarChart } from '@/components/ui/PremiumCharts';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

const BOARD_REPORTS = [
  { id: 1, name: 'Monthly Board Pack', frequency: 'Monthly', lastRun: '2024-07-01', status: 'completed' },
  { id: 2, name: 'Quarterly Governance Report', frequency: 'Quarterly', lastRun: '2024-06-30', status: 'completed' },
  { id: 3, name: 'Risk Committee Report', frequency: 'Monthly', lastRun: '2024-06-28', status: 'completed' },
  { id: 4, name: 'Audit Committee Pack', frequency: 'Quarterly', lastRun: '2024-06-15', status: 'completed' },
  { id: 5, name: 'Annual Strategic Review', frequency: 'Annual', lastRun: '2023-12-31', status: 'completed' },
];

interface BoardBranchRow {
  branch_code: string;
  province: string;
  total_amount: number;
  transaction_count: number;
  unique_accounts: number;
}

export default function BoardDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({ ...getDateRange('ALL') });

  const { data, isLoading } = useDashboardData(filters);
  const { data: filterStats } = useFilterStatistics();

  const referenceDate = useMemo(() => parseISODateToLocal(filterStats?.date_range?.max) || new Date(), [filterStats?.date_range?.max]);
  const minReferenceDate = useMemo(() => parseISODateToLocal(filterStats?.date_range?.min), [filterStats?.date_range?.min]);

  useEffect(() => {
    if (period === 'CUSTOM') return;
    const dateRange = getDateRange(period, referenceDate, minReferenceDate || undefined);
    setFilters((prev) =>
      prev.startDate === dateRange.startDate && prev.endDate === dateRange.endDate ? prev : { ...prev, ...dateRange }
    );
  }, [period, referenceDate, minReferenceDate]);

  const handleClearFilters = () => {
    if (period === 'CUSTOM') {
      setFilters((prev) => ({ startDate: prev.startDate, endDate: prev.endDate }));
      return;
    }
    setFilters(getDateRange(period, referenceDate, minReferenceDate || undefined));
  };

  const summary = data?.summary;
  const trend = data?.trend ?? [];
  const topBranches = (data?.by_branch ?? []).slice(0, 5);
  const topProvinces = (data?.by_province ?? []).slice(0, 7);
  const branchColumns = useMemo<ColumnDef<BoardBranchRow>[]>(() => [
    {
      accessorKey: 'branch_code',
      header: 'Branch',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
    },
    {
      accessorKey: 'province',
      header: 'Province',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
    },
    {
      accessorKey: 'total_amount',
      header: 'Volume',
      cell: ({ row }) => <strong className="text-text-primary">{formatNPR(row.original.total_amount)}</strong>,
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'numberRange',
      meta: { filterType: 'number-range' },
    },
    {
      accessorKey: 'transaction_count',
      header: 'Transactions',
      cell: ({ row }) => row.original.transaction_count.toLocaleString(),
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'numberRange',
      meta: { filterType: 'number-range' },
    },
    {
      accessorKey: 'unique_accounts',
      header: 'Accounts',
      cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'numberRange',
      meta: { filterType: 'number-range' },
    },
  ], []);

  return (
    <>
      <TopBar
        title="Board & Executive Packs"
        subtitle="Strategic overview & governance reporting"
        period={period}
        onPeriodChange={(p) => setPeriod(p as DashboardPeriod)}
        customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }}
        minDate={filterStats?.date_range?.min || undefined}
        maxDate={filterStats?.date_range?.max || undefined}
        onToggleFilters={() => setFiltersOpen((current) => !current)}
        filtersOpen={filtersOpen}
      />
      <div className="flex flex-col gap-4 p-6">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />
        {/* Executive KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Total Transaction Volume" value={formatNPR(summary?.total_amount ?? 0)} highlighted iconBg="var(--accent-blue-dim)" />
          <KPICard label="Total Transactions" value={(summary?.total_count ?? 0).toLocaleString()} iconBg="var(--accent-green-dim)" />
          <KPICard label="Unique Customers" value={(summary?.unique_customers ?? 0).toLocaleString()} iconBg="var(--accent-purple-dim)" />
          <KPICard label="Active Accounts" value={(summary?.unique_accounts ?? 0).toLocaleString()} iconBg="var(--accent-teal-dim)" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard label="Credit Inflow" value={formatNPR(summary?.credit_amount ?? 0)} iconBg="var(--accent-green-dim)" />
          <KPICard label="Debit Outflow" value={formatNPR(summary?.debit_amount ?? 0)} iconBg="var(--accent-red-dim)" />
          <KPICard label="Net Flow" value={formatNPR(summary?.net_flow ?? 0)} iconBg={(summary?.net_flow ?? 0) >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'} />
          <KPICard label="Avg Transaction" value={formatNPR(summary?.avg_transaction_size ?? 0)} iconBg="var(--accent-amber-dim)" />
        </div>

        {/* Trend and Province */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ChartCard title="Transaction Volume Trend" subtitle="Daily transaction volume">
            <PremiumLineChart
              data={trend.slice(-60)}
              xAxisKey="date"
              series={[{ dataKey: 'amount', name: 'Amount', color: '#3b82f6' }]}
              formatValue={formatNPR}
              formatXAxis={(v) => v.slice(5)}
              height={220}
            />
          </ChartCard>

          <ChartCard title="Province Performance" subtitle="Volume by province">
            <PremiumBarChart
              data={topProvinces}
              xAxisKey="province"
              series={[{ dataKey: 'total_amount', name: 'Volume', color: '#10b981' }]}
              formatValue={formatNPR}
              height={220}
            />
          </ChartCard>
        </div>

        {/* Top Branches */}
        <AdvancedDataTable
          title="Top Performing Branches"
          subtitle="Ranked by transaction volume"
          data={topBranches}
          columns={branchColumns}
          pageSize={10}
          enableFiltering={true}
          enableSorting={true}
          enablePagination={false}
        />

        {/* Governance Reports */}
        <DataTable title="Governance Reports" subtitle={`${BOARD_REPORTS.length} reports available`}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Report Name</TableHeader>
                <TableHeader>Frequency</TableHeader>
                <TableHeader>Last Generated</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {BOARD_REPORTS.map((report) => (
                <TableRow key={report.id}>
                  <TableCell><strong className="text-text-primary">{report.name}</strong></TableCell>
                  <TableCell><Pill variant="blue">{report.frequency}</Pill></TableCell>
                  <TableCell>{report.lastRun}</TableCell>
                  <TableCell><Pill variant="green">Completed</Pill></TableCell>
                  <TableCell>
                    <button className="text-accent-blue text-xs hover:underline">Download</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTable>
      </div>
    </>
  );
}
