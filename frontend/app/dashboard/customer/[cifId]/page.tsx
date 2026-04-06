'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { DataTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/DataTable';
import { Pill } from '@/components/ui/Pill';
import { useCustomerProfile, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { CustomerRecentTransaction, DashboardFilters } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

interface BranchTouchpoint {
  branch_code: string;
  province: string;
  total_amount: number;
  transaction_count: number;
  unique_accounts: number;
}

export default function CustomerDetailPage() {
  const params = useParams<{ cifId: string }>();
  const cifId = decodeURIComponent(params.cifId);
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [txFilter, setTxFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [filters, setFilters] = useState<DashboardFilters>({
    ...getDateRange('ALL'),
    cifId,
  });

  const { data: filterStats } = useFilterStatistics();
  const { data: profile, isLoading } = useCustomerProfile(filters, cifId);

  const referenceDate = useMemo(() => {
    return parseISODateToLocal(filterStats?.date_range?.max) || new Date();
  }, [filterStats?.date_range?.max]);

  const minReferenceDate = useMemo(() => (
    parseISODateToLocal(filterStats?.date_range?.min)
  ), [filterStats?.date_range?.min]);

  useEffect(() => {
    if (period === 'CUSTOM') return;
    const dateRange = getDateRange(period, referenceDate, minReferenceDate || undefined);
    setFilters((prev) => ({ ...prev, ...dateRange, cifId }));
  }, [period, referenceDate, minReferenceDate, cifId]);

  const handleCustomRangeChange = (range: { startDate: string; endDate: string }) => {
    setPeriod('CUSTOM');
    setFilters((prev) => ({ ...prev, ...range, cifId }));
  };

  const branchColumns = useMemo<ColumnDef<BranchTouchpoint>[]>(
    () => [
      {
        accessorKey: 'branch_code',
        header: 'Branch',
        cell: ({ row }) => (
          <Link
            href={`/dashboard/branch/${encodeURIComponent(row.original.branch_code)}`}
            className="font-medium text-accent-blue hover:underline"
          >
            {row.original.branch_code}
          </Link>
        ),
      },
      {
        accessorKey: 'province',
        header: 'Province',
        cell: (info) => String(info.getValue()),
      },
      {
        accessorKey: 'transaction_count',
        header: 'Transactions',
        cell: ({ row }) => row.original.transaction_count.toLocaleString(),
      },
      {
        accessorKey: 'total_amount',
        header: 'Amount',
        cell: ({ row }) => <strong className="text-text-primary">{formatNPR(row.original.total_amount)}</strong>,
      },
      {
        accessorKey: 'unique_accounts',
        header: 'Accounts',
        cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <>
        <TopBar
          title="Customer Detail"
          subtitle={cifId}
          period={period}
          onPeriodChange={setPeriod}
          customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
          onCustomRangeChange={handleCustomRangeChange}
          minDate={filterStats?.date_range?.min || undefined}
          maxDate={filterStats?.date_range?.max || undefined}
        />
        <div className="p-6 text-text-secondary">Loading...</div>
      </>
    );
  }

  const summary = profile?.summary;
  const byBranch = (profile?.by_branch || []) as BranchTouchpoint[];
  const channelData = profile?.by_channel || [];
  const trendData = profile?.trend || [];
  const recentTransactions = profile?.recent_transactions || [];
  const filteredTransactions = recentTransactions.filter((transaction) => (
    txFilter === 'all' ? true : transaction.type === txFilter
  ));
  const customerName = profile?.customer_name || `Customer ${profile?.requested_cif_id || cifId}`;
  const customerSegment = profile?.segment || 'Mass Retail';
  const riskTier = profile?.risk_tier || 1;

  return (
    <>
      <TopBar
        title={customerName}
        subtitle={`Customer Detail · ${profile?.cif_id || cifId}`}
        period={period}
        onPeriodChange={setPeriod}
        customRange={{ startDate: filters.startDate, endDate: filters.endDate }}
        onCustomRangeChange={handleCustomRangeChange}
        minDate={filterStats?.date_range?.min || undefined}
        maxDate={filterStats?.date_range?.max || undefined}
      />

      <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard/customer" className="text-xs text-accent-blue hover:underline">
              ← Back to Customer & Portfolio
            </Link>
            <div className="flex items-center gap-2">
              <Pill variant="blue">{customerSegment}</Pill>
              <Pill variant={riskTier === 1 ? 'green' : riskTier === 2 ? 'amber' : 'red'}>
                Tier {riskTier}
              </Pill>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <KPICard label="Total Amount" value={formatNPR(summary?.total_amount || 0)} iconBg="var(--accent-blue-dim)" />
            <KPICard label="Transactions" value={(summary?.total_count || 0).toLocaleString()} iconBg="var(--accent-green-dim)" />
            <KPICard label="Accounts" value={(summary?.unique_accounts || 0).toLocaleString()} iconBg="var(--accent-teal-dim)" />
            <KPICard
              label="Avg Transaction"
              value={formatNPR(summary?.avg_transaction_size || 0)}
              iconBg="var(--accent-purple-dim)"
            />
            <KPICard label="Active Channels" value={channelData.length.toString()} iconBg="var(--accent-amber-dim)" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard title="Daily Trend" subtitle="Amount by transaction date">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" style={{ fontSize: '10px' }} />
                  <YAxis stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Channel Mix" subtitle="Customer transaction channels">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="channel" stroke="var(--text-muted)" style={{ fontSize: '10px' }} />
                  <YAxis stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <DataTable
            title="Recent Transactions"
            subtitle="Filter by type and review latest customer activity"
            actions={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTxFilter('all')}
                  className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                    txFilter === 'all'
                      ? 'bg-accent-blue text-white border-accent-blue'
                      : 'bg-bg-input text-text-secondary border-border hover:text-text-primary'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setTxFilter('income')}
                  className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                    txFilter === 'income'
                      ? 'bg-accent-green text-white border-accent-green'
                      : 'bg-bg-input text-text-secondary border-border hover:text-text-primary'
                  }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setTxFilter('expense')}
                  className={`px-2.5 py-1 text-[11px] rounded-md border transition-colors ${
                    txFilter === 'expense'
                      ? 'bg-accent-red text-white border-accent-red'
                      : 'bg-bg-input text-text-secondary border-border hover:text-text-primary'
                  }`}
                >
                  Expenses
                </button>
              </div>
            }
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Description</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Type</TableHeader>
                  <TableHeader>Amount</TableHeader>
                  <TableHeader>Balance After</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell>No recent transactions</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction: CustomerRecentTransaction, index: number) => (
                    <TableRow key={`${transaction.date}-${transaction.account_number}-${index}`}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>
                        <strong className="text-text-primary">{transaction.description}</strong>
                      </TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>
                        <Pill variant={transaction.type === 'income' ? 'green' : 'red'}>
                          {transaction.type === 'income' ? 'Income' : 'Expense'}
                        </Pill>
                      </TableCell>
                      <TableCell>
                        <span className={transaction.type === 'income' ? 'text-accent-green font-semibold' : 'text-accent-red font-semibold'}>
                          {formatNPR(transaction.amount)}
                        </span>
                      </TableCell>
                      <TableCell>{formatNPR(transaction.balance_after)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataTable>

          <AdvancedDataTable
            title="Branch Touchpoints"
            subtitle={`${byBranch.length} branches interacted by this customer`}
            data={byBranch}
            columns={branchColumns}
            pageSize={10}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={false}
        />
      </div>
    </>
  );
}
