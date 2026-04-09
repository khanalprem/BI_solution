'use client';

import { useState, useMemo, useEffect } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { useDigitalChannels, useFilterStatistics } from '@/lib/hooks/useDashboardData';
import { formatNPR, formatPercent, getDateRange, parseISODateToLocal } from '@/lib/formatters';
import type { DashboardFilters } from '@/types';
import { PremiumBarChart, PremiumDonutChart } from '@/components/ui/PremiumCharts';
import { StandardDashboardSkeleton } from '@/components/ui/DashboardSkeleton';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';

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
  const [period, setPeriod] = useState<DashboardPeriod>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({ ...getDateRange('ALL') });

  const { data, isLoading } = useDigitalChannels(filters);
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
    if (period === 'CUSTOM') { setFilters((prev) => ({ startDate: prev.startDate, endDate: prev.endDate })); return; }
    setFilters(getDateRange(period, referenceDate, minReferenceDate || undefined));
  };

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
        <TopBar title="Digital Channels" subtitle="Mobile, internet & channel performance" period={period} onPeriodChange={(p) => setPeriod(p as DashboardPeriod)} customRange={{ startDate: filters.startDate, endDate: filters.endDate }} onCustomRangeChange={(r) => { setPeriod('CUSTOM'); setFilters((prev) => ({ ...prev, ...r })); }} minDate={filterStats?.date_range?.min || undefined} maxDate={filterStats?.date_range?.max || undefined} />
        <StandardDashboardSkeleton />
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Digital Channels"
        subtitle="Mobile, internet & channel performance"
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <KPICard label="Total Volume" value={formatNPR(totalAmount)} iconBg="var(--accent-blue-dim)" />
          <KPICard label="Digital Volume" value={formatNPR(digitalAmount)} iconBg="var(--accent-green-dim)" />
          <KPICard label="Branch Volume" value={formatNPR(branchAmount)} iconBg="var(--accent-amber-dim)" />
          <KPICard label="Digital Ratio" value={formatPercent(digitalRatio)} iconBg="var(--accent-purple-dim)" />
          <KPICard label="Digital Accounts" value={totalDigitalAccounts.toLocaleString()} iconBg="var(--accent-teal-dim)" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                  <div className="text-[13px] font-semibold capitalize">{channel.channel}</div>
                </div>
                <div className="text-[22px] font-bold tracking-tight mb-1">{formatNPR(channel.total_amount)}</div>
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
      </div>
    </>
  );
}
