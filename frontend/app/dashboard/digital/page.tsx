'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { useDigitalChannels } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent } from '@/lib/formatters';
import { PremiumBarChart, PremiumDonutChart } from '@/components/ui/PremiumCharts';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';

const CHANNEL_COLORS: Record<string, string> = {
  mobile: '#3b82f6',
  internet: '#10b981',
  atm: '#f59e0b',
  pos: '#8b5cf6',
  Branch: '#64748b',
  branch: '#64748b',
};

function getChannelColor(channel: string) {
  return CHANNEL_COLORS[channel?.toLowerCase()] || CHANNEL_COLORS[channel] || '#94a3b8';
}

export default function DigitalDashboard() {
  const { filters, setFilters, filtersOpen, setFiltersOpen, handleClearFilters, topBarProps } = useDashboardPage();
  const { data, isLoading } = useDigitalChannels(filters);

  const digitalChannels = useMemo(() => (data?.channels || []).filter((c) => c.channel && c.channel !== 'Branch'), [data]);
  const allChannels = data?.channels || [];
  const totalAmount = allChannels.reduce((s, c) => s + c.total_amount, 0);
  const digitalAmount = data?.digital_amount ?? digitalChannels.reduce((s, c) => s + c.total_amount, 0);
  const branchAmount = data?.branch_amount ?? (allChannels.find((c) => c.channel === 'Branch')?.total_amount || 0);
  const digitalRatio = data?.digital_ratio ?? (totalAmount > 0 ? (digitalAmount / totalAmount) * 100 : 0);
  const totalDigitalAccounts = data?.total_digital_accounts ?? digitalChannels.reduce((s, c) => s + c.unique_accounts, 0);

  const pieData = useMemo(() => [
    { name: 'Digital', value: digitalAmount, fill: '#3b82f6' },
    { name: 'Branch', value: branchAmount, fill: '#64748b' },
  ], [digitalAmount, branchAmount]);

  if (isLoading) {
    return (
      <>
        <TopBar title="Digital Channels" subtitle="Mobile, internet & channel performance" {...topBarProps} />
        <StandardDashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <TopBar title="Digital Channels" subtitle="Mobile, internet & channel performance" {...topBarProps} />
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <KPICard label="Total Volume" value={formatNPR(totalAmount)} iconBg="var(--accent-blue-dim)" sparkData={allChannels.map(c => c.total_amount)} />
          <KPICard label="Digital Volume" value={formatNPR(digitalAmount)} iconBg="var(--accent-green-dim)" sparkData={digitalChannels.map(c => c.total_amount)} />
          <KPICard label="Branch Volume" value={formatNPR(branchAmount)} iconBg="var(--accent-amber-dim)" />
          <KPICard label="Digital Ratio" value={formatPercent(digitalRatio)} iconBg="var(--accent-purple-dim)" />
          <KPICard label="Digital Accounts" value={totalDigitalAccounts.toLocaleString()} iconBg="var(--accent-teal-dim)" sparkData={digitalChannels.map(c => c.unique_accounts)} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Digital vs Branch Split" subtitle="Volume share">
            <PremiumDonutChart
              data={pieData}
              formatValue={formatNPR}
              height={220}
              innerRadius="48%"
              outerRadius="68%"
              centerValue={formatPercent(digitalRatio)}
              centerLabel="Digital"
            />
          </ChartCard>

          <div className="lg:col-span-2">
            <ChartCard title="Channel Volume Breakdown" subtitle="Transaction amount by channel">
              <PremiumBarChart
                data={allChannels}
                xAxisKey="channel"
                series={[{ dataKey: 'total_amount', name: 'Amount' }]}
                layout="horizontal"
                itemColors={allChannels.map((c) => getChannelColor(c.channel))}
                formatValue={formatNPR}
                yAxisWidth={80}
                height={220}
              />
            </ChartCard>
          </div>
        </div>

        {/* Channel CR/DR breakdown */}
        <ChartCard title="Channel Credit vs Debit" subtitle="Inflow and outflow by channel">
          <PremiumBarChart
            data={allChannels}
            xAxisKey="channel"
            series={[
              { dataKey: 'credit_amount', name: 'Credit (CR)', color: '#10b981' },
              { dataKey: 'debit_amount',  name: 'Debit (DR)',  color: '#ef4444' },
            ]}
            formatValue={formatNPR}
            height={260}
          />
        </ChartCard>

        {/* Channel Detail Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {allChannels.map((channel) => {
            const cr = channel.credit_amount;
            const dr = channel.debit_amount;
            const net = cr - dr;
            const ratio = channel.total_amount > 0 ? (cr / channel.total_amount) * 100 : 0;
            return (
              <div key={channel.channel} className="bg-bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: getChannelColor(channel.channel) }}
                  />
                  <div className="text-sm font-display font-semibold capitalize text-text-primary">{channel.channel}</div>
                </div>
                <div className="text-2xl font-mono font-bold tracking-tight mb-1">{formatNPR(channel.total_amount)}</div>
                <div className="text-[11px] text-text-muted mb-3">{channel.transaction_count.toLocaleString()} transactions · {channel.unique_accounts.toLocaleString()} accounts</div>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-text-muted">Credit (CR)</span><span className="text-accent-green">{formatNPR(cr)}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Debit (DR)</span><span className="text-accent-red">{formatNPR(dr)}</span></div>
                  <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                    <span className="text-text-muted">Net Flow</span>
                    <span className={net >= 0 ? 'text-accent-green' : 'text-accent-red'}>{formatNPR(net)}</span>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-bg-input overflow-hidden">
                  <div className="h-full rounded-full bg-accent-green" style={{ width: `${Math.min(ratio, 100)}%` }} />
                </div>
                <div className="text-[10px] text-text-muted mt-1">{formatPercent(ratio)} credit ratio</div>
              </div>
            );
          })}
        </div>

        {/* Channel detail table — all tran_source fields from tran_summary */}
        {allChannels.length > 0 && (() => {
          type ChanRow = typeof allChannels[0];
          const chanTotal = allChannels.reduce((s, c) => s + c.total_amount, 0);
          const channelColumns: ColumnDef<ChanRow>[] = [
            {
              accessorKey: 'channel',
              header: 'Channel (tran_source)',
              enableColumnFilter: true,
              filterFn: 'arrayFilter', meta: { filterType: 'select' },
              cell: ({ row }) => <span className="capitalize font-medium text-text-primary">{row.original.channel || 'Branch / Counter'}</span>,
            },
            {
              accessorKey: 'total_amount',
              header: 'Total Amount',
              enableSorting: true, sortDescFirst: true,
              enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
              cell: ({ row }) => <strong className="font-mono text-xs">{formatNPR(row.original.total_amount)}</strong>,
            },
            {
              accessorKey: 'transaction_count',
              header: 'Transactions',
              enableSorting: true,
              enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
              cell: ({ row }) => row.original.transaction_count.toLocaleString(),
            },
            {
              accessorKey: 'unique_accounts',
              header: 'Unique Accounts',
              enableSorting: true,
              enableColumnFilter: true, filterFn: 'numberRange', meta: { filterType: 'number-range' },
              cell: ({ row }) => row.original.unique_accounts.toLocaleString(),
            },
            {
              accessorKey: 'credit_amount',
              header: 'Credit (CR)',
              enableSorting: true, sortDescFirst: true,
              cell: ({ row }) => <span className="font-mono text-xs text-accent-green">{formatNPR(row.original.credit_amount)}</span>,
            },
            {
              accessorKey: 'debit_amount',
              header: 'Debit (DR)',
              enableSorting: true, sortDescFirst: true,
              cell: ({ row }) => <span className="font-mono text-xs text-accent-red">{formatNPR(row.original.debit_amount)}</span>,
            },
            {
              id: 'net_flow',
              header: 'Net Flow',
              enableSorting: true,
              sortingFn: (a, b) => (a.original.credit_amount - a.original.debit_amount) - (b.original.credit_amount - b.original.debit_amount),
              cell: ({ row }) => {
                const net = row.original.credit_amount - row.original.debit_amount;
                return <span className={`font-mono text-xs ${net >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>{formatNPR(net)}</span>;
              },
            },
            {
              id: 'cr_ratio',
              header: 'CR Ratio',
              enableSorting: true,
              sortingFn: (a, b) => (a.original.total_amount > 0 ? a.original.credit_amount / a.original.total_amount : 0) - (b.original.total_amount > 0 ? b.original.credit_amount / b.original.total_amount : 0),
              cell: ({ row }) => {
                const r = row.original.total_amount > 0 ? (row.original.credit_amount / row.original.total_amount) * 100 : 0;
                return <span className={r > 50 ? 'text-accent-green' : 'text-accent-red'}>{r.toFixed(1)}%</span>;
              },
            },
            {
              id: 'avg_txn',
              header: 'Avg / Txn',
              enableSorting: true,
              sortingFn: (a, b) => (a.original.transaction_count > 0 ? a.original.total_amount / a.original.transaction_count : 0) - (b.original.transaction_count > 0 ? b.original.total_amount / b.original.transaction_count : 0),
              cell: ({ row }) => formatNPR(row.original.transaction_count > 0 ? row.original.total_amount / row.original.transaction_count : 0),
            },
            {
              id: 'network_share',
              header: 'Network Share',
              cell: ({ row }) => chanTotal > 0 ? `${((row.original.total_amount / chanTotal) * 100).toFixed(1)}%` : '—',
            },
          ];
          return (
            <AdvancedDataTable
              title="Channel Detail Table"
              subtitle="All tran_source fields from tran_summary — use Columns to show/hide"
              data={allChannels as ChanRow[]}
              columns={channelColumns}
              pageSize={10}
              enablePagination={false}
              initialHidden={{ cr_ratio: true, avg_txn: true, network_share: true }}
            />
          );
        })()}
      </div>
    </>
  );
}
