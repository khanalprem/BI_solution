'use client';

import { useMemo } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { AdvancedFilters } from '@/components/ui/AdvancedFilters';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { AdvancedDataTable, ColumnDef } from '@/components/ui/AdvancedDataTable';
import { PremiumLineChart } from '@/components/ui/PremiumCharts';
import { PlaceholderBanner, PlaceholderPanel } from '@/components/ui/PlaceholderPanel';
import { Badge, badgeColor, type BadgeColor } from '@/components/ui/badge';
import { formatPercent } from '@/lib/formatters';
import { useDashboardPage } from '@/lib/hooks/useDashboardPage';

/**
 * NRB Regulatory Compliance dashboard.
 *
 * Tracks core Basel III / NRB Unified Directives ratios: CAR, CCAR, NPL, LDR,
 * CD Ratio. Sample values aligned to Mid-July 2025 sector averages:
 *   - CAR 12.78% (min 11%)
 *   - CCAR 10.03% (min 8.5%)
 *   - NPL 4.44% (alert >5%)
 *   - LDR ~85% (NRB cap 90%)
 * Live feed from NRB returns / GL aggregates will replace the sample once wired.
 */

type RatioStatus = 'ok' | 'warning' | 'breach';

interface RegulatoryRatio {
  key: string;
  label: string;
  shortName: string;
  value: number;
  threshold: number;
  thresholdLabel: string;
  direction: 'min' | 'max'; // 'min' = value must be ≥ threshold; 'max' = value must be ≤ threshold
  warnBuffer: number; // distance from threshold that triggers warning
  description: string;
}

const RATIOS: RegulatoryRatio[] = [
  { key: 'CAR',    label: 'Capital Adequacy Ratio',      shortName: 'CAR',    value: 12.78, threshold: 11.0, thresholdLabel: 'Min 11%',    direction: 'min', warnBuffer: 0.5, description: 'Total capital ÷ risk-weighted assets' },
  { key: 'CCAR',   label: 'Core Capital Adequacy Ratio', shortName: 'CCAR',   value: 10.03, threshold: 8.5,  thresholdLabel: 'Min 8.5%',   direction: 'min', warnBuffer: 0.5, description: 'Tier 1 capital ÷ risk-weighted assets' },
  { key: 'NPL',    label: 'Non-Performing Loan Ratio',   shortName: 'NPL',    value: 4.44,  threshold: 5.0,  thresholdLabel: 'Alert >5%',  direction: 'max', warnBuffer: 1.0, description: 'Gross NPL ÷ total loans' },
  { key: 'LDR',    label: 'Loan-to-Deposit Ratio',       shortName: 'LDR',    value: 85.2,  threshold: 90.0, thresholdLabel: 'Max 90%',    direction: 'max', warnBuffer: 2.0, description: 'Total loans ÷ total deposits' },
  { key: 'CD',     label: 'Credit-to-Deposit (Local)',   shortName: 'CD Ratio', value: 82.6, threshold: 85.0, thresholdLabel: 'Internal 85%', direction: 'max', warnBuffer: 2.0, description: 'Domestic credit book vs domestic deposits' },
];

function statusOf(r: RegulatoryRatio): RatioStatus {
  const distance = r.direction === 'min' ? r.value - r.threshold : r.threshold - r.value;
  if (distance < 0) return 'breach';
  if (distance <= r.warnBuffer) return 'warning';
  return 'ok';
}

const STATUS_TONE: Record<RatioStatus, BadgeColor> = {
  ok: 'green',
  warning: 'amber',
  breach: 'red',
};

const STATUS_TEXT: Record<RatioStatus, string> = {
  ok: 'Compliant',
  warning: 'Near threshold',
  breach: 'Non-compliant',
};

// Historical CAR for trending.
const SAMPLE_CAR_TREND = Array.from({ length: 12 }).map((_, i) => ({
  month: `M${String(i + 1).padStart(2, '0')}`,
  CAR: 12.4 + Math.sin(i / 3) * 0.5 + i * 0.03,
  CCAR: 9.8 + Math.cos(i / 4) * 0.3 + i * 0.02,
  NPL: 3.8 + Math.sin(i / 2) * 0.4 + i * 0.05,
}));

type Submission = {
  report: string;
  cycle: string;
  due_date: string;
  last_filed: string;
  status: 'Filed' | 'Due' | 'Overdue';
};

const SAMPLE_SUBMISSIONS: Submission[] = [
  { report: 'Unified Return (Quarterly)',        cycle: 'FY 81/82 Q3', due_date: '2025-04-30', last_filed: '2025-01-28', status: 'Due' },
  { report: 'ICAAP (Pillar 2)',                  cycle: 'FY 81/82',    due_date: '2025-10-15', last_filed: '2024-10-12', status: 'Filed' },
  { report: 'Stress Test Report',                cycle: 'FY 81/82 H1', due_date: '2025-02-28', last_filed: '2025-02-24', status: 'Filed' },
  { report: 'Large Exposure Report',             cycle: 'Monthly',     due_date: '2025-05-07', last_filed: '2025-04-06', status: 'Filed' },
  { report: 'NPL Classification Schedule',       cycle: 'Quarterly',   due_date: '2025-04-21', last_filed: '2025-01-21', status: 'Due' },
  { report: 'AML / KYC Compliance Return',       cycle: 'Half-Yearly', due_date: '2025-01-15', last_filed: '2024-07-15', status: 'Overdue' },
];

export default function RegulatoryDashboard() {
  const { filters, setFilters, filtersOpen, setFiltersOpen, handleClearFilters, topBarProps } = useDashboardPage();

  const submissionColumns = useMemo<ColumnDef<Submission>[]>(() => [
    { accessorKey: 'report', header: 'Report', cell: ({ row }) => <span className="font-medium text-text-primary">{row.original.report}</span> },
    { accessorKey: 'cycle',  header: 'Cycle',  cell: ({ row }) => <span className="text-text-secondary">{row.original.cycle}</span> },
    { accessorKey: 'due_date', header: 'Due Date', cell: ({ row }) => <span className="font-mono text-xs">{row.original.due_date}</span> },
    { accessorKey: 'last_filed', header: 'Last Filed', cell: ({ row }) => <span className="font-mono text-xs text-text-secondary">{row.original.last_filed}</span> },
    {
      accessorKey: 'status',
      header: 'Status',
      enableColumnFilter: true,
      filterFn: 'arrayFilter',
      meta: { filterType: 'select' },
      cell: ({ row }) => {
        const s = row.original.status;
        const color: BadgeColor = s === 'Filed' ? 'green' : s === 'Due' ? 'amber' : 'red';
        return <Badge className={badgeColor[color]}>{s}</Badge>;
      },
    },
  ], []);

  return (
    <>
      <TopBar title="Regulatory Compliance" subtitle="NRB Basel III ratios · submissions · capital health" {...topBarProps} />
      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          onClear={handleClearFilters}
          advancedOpen={filtersOpen}
          onAdvancedOpenChange={setFiltersOpen}
        />

        <PlaceholderBanner
          message="NRB regulatory returns feed and capital ledger integration pending."
          hint="Ratios below use Mid-July 2025 sector-average values (NRB Financial Stability Report) for layout preview."
        />

        {/* Ratio cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {RATIOS.map((r) => {
            const status = statusOf(r);
            const tone = STATUS_TONE[status];
            const iconBg = tone === 'green' ? 'var(--accent-green-dim)' : tone === 'amber' ? 'var(--accent-amber-dim)' : 'var(--accent-red-dim)';
            return (
              <div key={r.key} className="bg-bg-card border border-border rounded-xl p-4 flex flex-col gap-1.5" style={{ boxShadow: 'var(--shadow-card)' }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.4px] text-text-muted">{r.shortName}</span>
                  <Badge className={badgeColor[tone]}>{STATUS_TEXT[status]}</Badge>
                </div>
                <div className="text-xl font-mono font-bold text-text-primary mt-1" style={{ color: `var(--accent-${tone === 'green' ? 'green' : tone === 'amber' ? 'amber' : 'red'})` }}>
                  {formatPercent(r.value)}
                </div>
                <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: iconBg }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (r.value / (r.direction === 'min' ? r.threshold * 1.6 : r.threshold * 1.2)) * 100)}%`,
                      background: `var(--accent-${tone === 'green' ? 'green' : tone === 'amber' ? 'amber' : 'red'})`,
                    }}
                  />
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  {r.thresholdLabel} · {r.description}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trend chart */}
        <ChartCard title="12-Month Capital & Asset Quality Trend" subtitle="CAR / CCAR / NPL — illustrative">
          <PremiumLineChart
            data={SAMPLE_CAR_TREND}
            xAxisKey="month"
            series={[
              { dataKey: 'CAR',  name: 'CAR %',  color: '#10B981' },
              { dataKey: 'CCAR', name: 'CCAR %', color: '#6366F1' },
              { dataKey: 'NPL',  name: 'NPL %',  color: '#F43F5E' },
            ]}
            formatValue={(v) => `${v.toFixed(2)}%`}
            height={280}
          />
        </ChartCard>

        {/* Submissions calendar */}
        <AdvancedDataTable
          title="NRB Submission Calendar"
          subtitle="Upcoming and recent regulatory filings · sample data"
          data={SAMPLE_SUBMISSIONS}
          columns={submissionColumns}
          pageSize={10}
          enableFiltering={true}
          enableSorting={true}
          enablePagination={false}
        />

        {/* Awaiting-integration panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PlaceholderPanel
            title="Capital Composition"
            subtitle="Tier 1 / Tier 2 / deductions breakdown"
            status="Awaiting integration"
            statusTone="amber"
            message="No capital ledger connected."
            hint="Expected inputs: paid-up capital, reserves, general loan loss provision, supplementary capital instruments."
            icon="🏛️"
          />
          <PlaceholderPanel
            title="Risk-Weighted Assets"
            subtitle="Credit / market / operational RWA breakdown"
            status="Awaiting integration"
            statusTone="amber"
            message="No RWA computation service connected."
            hint="Expected inputs: exposure classes with NRB weights, trading-book VaR, operational risk basic indicator."
            icon="⚖️"
          />
        </div>
      </div>
    </>
  );
}
