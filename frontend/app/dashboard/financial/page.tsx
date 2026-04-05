'use client';

import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { ChartCard, ChartLegendItem } from '@/components/ui/ChartCard';
import { FilterBar, FilterChips, FilterDivider, FilterLabel } from '@/components/ui/FilterBar';
import { KPICard } from '@/components/ui/KPICard';
import { Select } from '@/components/ui/Select';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DashboardPeriod = 'ALL' | '1D' | 'WTD' | 'MTD' | 'QTD' | 'YTD' | 'FY' | 'CUSTOM';
type CompareMode = 'Actual' | 'Budget' | 'Forecast' | 'Variance';

const DISTRICTS_BY_PROVINCE: Record<string, string[]> = {
  Bagmati: ['Kathmandu', 'Lalitpur', 'Bhaktapur'],
  Gandaki: ['Kaski', 'Syangja'],
  Lumbini: ['Rupandehi', 'Dang'],
  Madhesh: ['Parsa', 'Bara'],
  Karnali: ['Surkhet', 'Dailekh'],
  Sudurpashchim: ['Kailali', 'Kanchanpur'],
  Koshi: ['Morang', 'Sunsari'],
};

const MUNICIPALITIES_BY_DISTRICT: Record<string, string[]> = {
  Kathmandu: ['Kathmandu Metro', 'Kirtipur', 'Tokha'],
  Lalitpur: ['Lalitpur Metro', 'Godawari'],
  Bhaktapur: ['Bhaktapur', 'Madhyapur Thimi'],
  Kaski: ['Pokhara Metro'],
  Syangja: ['Waling'],
  Rupandehi: ['Butwal', 'Siddharthanagar'],
  Dang: ['Ghorahi', 'Tulsipur'],
  Parsa: ['Birgunj'],
  Bara: ['Kalaiya'],
  Surkhet: ['Birendranagar'],
  Dailekh: ['Dullu'],
  Kailali: ['Dhangadhi'],
  Kanchanpur: ['Bhimdatta'],
  Morang: ['Biratnagar'],
  Sunsari: ['Itahari', 'Dharan'],
};

const WATERFALL_DATA = [
  { label: 'Revenue', delta: 284.7 },
  { label: 'NII', delta: 122.2 },
  { label: 'Fees', delta: 48.7 },
  { label: 'Opex', delta: -148.9 },
  { label: 'LLP', delta: -12.4 },
  { label: 'Tax', delta: -13.4 },
  { label: 'PAT', delta: 74.1 },
];

const NIM_DATA = [
  { month: 'Jan', assetYield: 6.3, costOfFunds: 2.7, nim: 3.6 },
  { month: 'Feb', assetYield: 6.2, costOfFunds: 2.7, nim: 3.5 },
  { month: 'Mar', assetYield: 6.1, costOfFunds: 2.6, nim: 3.5 },
  { month: 'Apr', assetYield: 6.0, costOfFunds: 2.6, nim: 3.4 },
  { month: 'May', assetYield: 5.9, costOfFunds: 2.5, nim: 3.4 },
  { month: 'Jun', assetYield: 5.8, costOfFunds: 2.4, nim: 3.4 },
  { month: 'Jul', assetYield: 5.8, costOfFunds: 2.4, nim: 3.4 },
  { month: 'Aug', assetYield: 5.8, costOfFunds: 2.4, nim: 3.4 },
  { month: 'Sep', assetYield: 5.8, costOfFunds: 2.4, nim: 3.4 },
];

const REVENUE_MIX_DATA = [
  { name: 'NII', value: 43, amount: 'Rs. 122.2M', color: '#3b82f6' },
  { name: 'Fees', value: 17, amount: 'Rs. 48.7M', color: '#10b981' },
  { name: 'FX & Trading', value: 12, amount: 'Rs. 34.2M', color: '#8b5cf6' },
  { name: 'Other', value: 28, amount: 'Rs. 79.6M', color: '#f59e0b' },
];

const EXPENSE_DATA = [
  { category: 'Staff', amount: 62.4 },
  { category: 'IT', amount: 28.1 },
  { category: 'Premises', amount: 18.4 },
  { category: 'Marketing', amount: 14.2 },
  { category: 'Compliance', amount: 12.8 },
  { category: 'Other', amount: 13.0 },
];

const BUDGET_VS_ACTUAL = [
  { label: 'Net Interest Income', value: 'Rs. 122.2M', variance: '▲ +Rs. 3.1M', tone: 'positive' as const },
  { label: 'Fee & Commission', value: 'Rs. 48.7M', variance: '▲ +Rs. 2.4M', tone: 'positive' as const },
  { label: 'Operating Expenses', value: 'Rs. 148.9M', variance: '▲ +Rs. 3.9M', tone: 'negative' as const },
  { label: 'Loan Loss Provision', value: 'Rs. 12.4M', variance: '▼ -Rs. 1.1M', tone: 'positive' as const },
  { label: 'Net Profit', value: 'Rs. 61.2M', variance: '▲ +Rs. 1.7M', tone: 'positive' as const },
  { label: 'Return on Equity', value: '14.8%', variance: '▲ +1.2%', tone: 'positive' as const },
];

function formatMn(value: number): string {
  return `Rs. ${Math.abs(value).toFixed(1)}M`;
}

export default function FinancialDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('MTD');
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [viewMode, setViewMode] = useState('pnl');
  const [granularity, setGranularity] = useState('monthly');
  const [segment, setSegment] = useState('');
  const [compareModes, setCompareModes] = useState<CompareMode[]>(['Actual']);

  const districtOptions = useMemo(
    () => (province ? DISTRICTS_BY_PROVINCE[province] || [] : Object.values(DISTRICTS_BY_PROVINCE).flat()),
    [province]
  );

  const municipalityOptions = useMemo(
    () => (district ? MUNICIPALITIES_BY_DISTRICT[district] || [] : []),
    [district]
  );

  const clearFilters = () => {
    setProvince('');
    setDistrict('');
    setMunicipality('');
    setViewMode('pnl');
    setGranularity('monthly');
    setSegment('');
    setCompareModes(['Actual']);
  };

  const handleProvinceChange = (nextProvince: string) => {
    setProvince(nextProvince);
    setDistrict('');
    setMunicipality('');
  };

  const handleDistrictChange = (nextDistrict: string) => {
    setDistrict(nextDistrict);
    setMunicipality('');
  };

  const spreadValue = 3.42;
  const cdRatio = 79.6;

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex flex-col min-w-0">
        <TopBar
          title="Financial Results"
          subtitle="P&L and financial performance"
          period={period}
          onPeriodChange={(nextPeriod) => setPeriod(nextPeriod as DashboardPeriod)}
          customRange={customRange}
          onCustomRangeChange={(range) => {
            setCustomRange(range);
            setPeriod('CUSTOM');
          }}
        />
        <div className="flex flex-col gap-4 p-6">
          <FilterBar onClear={clearFilters}>
            <FilterLabel>Province</FilterLabel>
            <div className="min-w-[160px]">
              <Select
                value={province}
                onChange={handleProvinceChange}
                options={[
                  { value: '', label: 'All Provinces' },
                  { value: 'Bagmati', label: 'Bagmati Province' },
                  { value: 'Gandaki', label: 'Gandaki Province' },
                  { value: 'Lumbini', label: 'Lumbini Province' },
                  { value: 'Madhesh', label: 'Madhesh Province' },
                  { value: 'Karnali', label: 'Karnali Province' },
                  { value: 'Sudurpashchim', label: 'Sudurpashchim Province' },
                  { value: 'Koshi', label: 'Koshi Province' },
                ]}
              />
            </div>

            <FilterDivider />

            <FilterLabel>District</FilterLabel>
            <div className="min-w-[160px]">
              <Select
                value={district}
                onChange={handleDistrictChange}
                options={[
                  { value: '', label: 'All Districts' },
                  ...districtOptions.map((item) => ({ value: item, label: item })),
                ]}
              />
            </div>

            <FilterDivider />

            <FilterLabel>Municipality</FilterLabel>
            <div className="min-w-[180px]">
              <Select
                value={municipality}
                onChange={setMunicipality}
                options={[
                  { value: '', label: 'All Municipalities' },
                  ...municipalityOptions.map((item) => ({ value: item, label: item })),
                ]}
                disabled={!district}
              />
            </div>

            <FilterDivider />

            <FilterLabel>View</FilterLabel>
            <div className="min-w-[150px]">
              <Select
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: 'pnl', label: 'P&L Statement' },
                  { value: 'balance-sheet', label: 'Balance Sheet' },
                  { value: 'cash-flow', label: 'Cash Flow' },
                ]}
              />
            </div>

            <FilterDivider />

            <FilterLabel>Granularity</FilterLabel>
            <div className="min-w-[130px]">
              <Select
                value={granularity}
                onChange={setGranularity}
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                  { value: 'annual', label: 'Annual' },
                ]}
              />
            </div>

            <FilterDivider />

            <FilterLabel>Segment</FilterLabel>
            <div className="min-w-[150px]">
              <Select
                value={segment}
                onChange={setSegment}
                options={[
                  { value: '', label: 'All Segments' },
                  { value: 'retail', label: 'Retail' },
                  { value: 'commercial', label: 'Commercial' },
                  { value: 'wealth', label: 'Wealth' },
                  { value: 'treasury', label: 'Treasury' },
                ]}
              />
            </div>

            <FilterDivider />

            <FilterLabel>Compare</FilterLabel>
            <FilterChips
              options={['Actual', 'Budget', 'Forecast', 'Variance']}
              selected={compareModes}
              onChange={(nextModes) => setCompareModes(nextModes as CompareMode[])}
            />
          </FilterBar>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <KPICard
              label="Operating Income"
              value="Rs. 284.7M"
              change={8.4}
              changeType="up"
              subtitle="Budget: Rs. 278M"
              highlighted
              iconBg="var(--accent-blue-dim)"
            />
            <KPICard
              label="Operating Expenses"
              value="Rs. 148.9M"
              change={3.4}
              changeType="warning"
              subtitle="Budget: Rs. 145M"
              iconBg="var(--accent-red-dim)"
            />
            <KPICard
              label="Pre-tax Profit"
              value="Rs. 74.1M"
              change={9.2}
              changeType="up"
              subtitle="Margin 26.0%"
              iconBg="var(--accent-green-dim)"
            />
            <KPICard
              label="Effective Tax Rate"
              value="17.4%"
              change={-0.8}
              changeType="down"
              subtitle="Statutory 21%"
              iconBg="var(--accent-amber-dim)"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <ChartCard
              title="Income Waterfall"
              subtitle="Revenue to PAT decomposition MTD (Rs. mn)"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={WATERFALL_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
                  <YAxis
                    stroke="var(--text-muted)"
                    style={{ fontSize: '11px' }}
                    tickFormatter={(value: number) => `${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatMn(value), 'Amount']}
                  />
                  <ReferenceLine y={0} stroke="var(--border-strong)" />
                  <Bar dataKey="delta" radius={[4, 4, 0, 0]}>
                    {WATERFALL_DATA.map((entry) => (
                      <Cell
                        key={entry.label}
                        fill={entry.delta < 0 ? '#ef4444' : entry.label === 'PAT' ? '#10b981' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="NIM Decomposition"
              subtitle="Yield on assets vs cost of funds"
              legend={
                <>
                  <ChartLegendItem color="#3b82f6" label="Asset Yield" />
                  <ChartLegendItem color="#ef4444" label="Cost of Funds" />
                  <ChartLegendItem color="#10b981" label="NIM" />
                </>
              }
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={NIM_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
                  <YAxis
                    stroke="var(--text-muted)"
                    style={{ fontSize: '11px' }}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)}%`, '']}
                  />
                  <Line type="monotone" dataKey="assetYield" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="costOfFunds" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="nim" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] font-semibold">Avg Lending Rate</div>
              <div className="text-[11px] text-text-muted mt-0.5">Weighted avg on loan book</div>
              <div className="text-[30px] font-semibold tracking-tight text-accent-blue mt-3">5.82%</div>
              <div className="text-[11px] text-text-secondary mt-2">▲ +18bps MoM · Industry: 5.68%</div>
            </div>

            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] font-semibold">Avg Deposit Rate</div>
              <div className="text-[11px] text-text-muted mt-0.5">Weighted avg cost of deposits</div>
              <div className="text-[30px] font-semibold tracking-tight text-accent-red mt-3">2.40%</div>
              <div className="text-[11px] text-text-secondary mt-2">▼ -6bps MoM · Industry: 2.52%</div>
            </div>

            <div className="bg-bg-card border border-[rgba(59,130,246,0.3)] rounded-xl p-4">
              <div className="text-[13px] font-semibold">Interest Rate Spread</div>
              <div className="text-[11px] text-text-muted mt-0.5">Lending Rate minus Deposit Rate</div>
              <div className="text-[30px] font-semibold tracking-tight text-accent-green mt-3">{spreadValue.toFixed(2)}%</div>
              <div className="text-[11px] text-text-secondary mt-2">▲ +24bps vs prior year · NRB ref: 3.18%</div>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-text-muted">
                <span className="rounded-full bg-accent-blue-dim text-accent-blue px-2 py-1 font-semibold">5.82%</span>
                <span>−</span>
                <span className="rounded-full bg-accent-red-dim text-accent-red px-2 py-1 font-semibold">2.40%</span>
                <span>=</span>
                <span className="rounded-full bg-accent-green-dim text-accent-green px-2 py-1 font-semibold">{spreadValue.toFixed(2)}%</span>
              </div>
            </div>

            <div className="bg-bg-card border border-border rounded-xl p-4">
              <div className="text-[13px] font-semibold">CD Ratio</div>
              <div className="text-[11px] text-text-muted mt-0.5">Credit-to-Deposit · NRB limit ≤ 90%</div>
              <div className="text-[30px] font-semibold tracking-tight text-accent-amber mt-3">{cdRatio.toFixed(1)}%</div>
              <div className="text-[11px] text-text-secondary mt-2">NRB ceiling 90% · Buffer 10.4%</div>
              <div className="mt-3 h-2 rounded-full bg-bg-input overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${cdRatio}%`,
                    background: 'linear-gradient(90deg, var(--accent-green) 60%, var(--accent-amber) 60%)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <ChartCard title="Revenue Mix" subtitle="By income type">
              <div className="relative h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={REVENUE_MIX_DATA}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={64}
                      strokeWidth={0}
                    >
                      {REVENUE_MIX_DATA.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Share']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[15px] font-semibold">Rs. 284.7M</div>
                  <div className="text-[10px] text-text-muted">Total</div>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {REVENUE_MIX_DATA.map((row) => (
                  <div key={row.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                      {row.name}
                    </div>
                    <div className="text-text-muted">{row.value}% · {row.amount}</div>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Expense Breakdown" subtitle="Operating cost categories (Rs. mn)">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={EXPENSE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="category" stroke="var(--text-muted)" style={{ fontSize: '10px' }} />
                  <YAxis stroke="var(--text-muted)" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatMn(value), 'Expense']}
                  />
                  <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Budget vs Actual" subtitle="YTD variance analysis">
              <div className="divide-y divide-border">
                {BUDGET_VS_ACTUAL.map((row) => (
                  <div key={row.label} className="grid grid-cols-[1.2fr_auto_auto] items-center gap-2 py-2.5 text-[11px]">
                    <div className="text-text-secondary">{row.label}</div>
                    <div className="font-semibold text-text-primary whitespace-nowrap">{row.value}</div>
                    <div className={row.tone === 'positive' ? 'text-accent-green whitespace-nowrap' : 'text-accent-red whitespace-nowrap'}>
                      {row.variance}
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
        </div>
      </main>
    </div>
  );
}
