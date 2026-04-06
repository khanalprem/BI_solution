'use client';

import { TopBar } from '@/components/layout/TopBar';
import { KPICard } from '@/components/ui/KPICard';
import { ChartCard } from '@/components/ui/ChartCard';
import { DataTable, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/DataTable';
import { Pill } from '@/components/ui/Pill';
import { formatNPR } from '@/lib/formatters';

export default function RiskDashboard() {
  const riskMetrics = [
    { category: 'Consumer Loans', npl_ratio: 2.4, amount: 45000000000, npl_amount: 1080000000, provisions: 850000000 },
    { category: 'SME Loans', npl_ratio: 5.8, amount: 32000000000, npl_amount: 1856000000, provisions: 1520000000 },
    { category: 'Corporate Loans', npl_ratio: 3.1, amount: 68000000000, npl_amount: 2108000000, provisions: 1780000000 },
    { category: 'Agriculture', npl_ratio: 7.2, amount: 12000000000, npl_amount: 864000000, provisions: 720000000 },
  ];
  
  return (
    <>
      <TopBar title="Loan & Risk Quality" subtitle="NPL tracking & risk management" />
      
      <div className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <KPICard
            label="Total Loan Portfolio"
            value={formatNPR(157000000000)}
            change={4.2}
            changeType="up"
            iconBg="var(--accent-blue-dim)"
          />
          <KPICard
            label="NPL Ratio"
            value="4.1%"
            change={-0.3}
            changeType="down"
            subtitle="Target: < 3%"
            iconBg="var(--accent-red-dim)"
          />
          <KPICard
            label="Total NPL"
            value={formatNPR(5908000000)}
            change={-2.1}
            changeType="down"
            iconBg="var(--accent-amber-dim)"
          />
          <KPICard
            label="Provision Coverage"
            value="79.8%"
            change={1.5}
            changeType="up"
            iconBg="var(--accent-green-dim)"
          />
          <KPICard
            label="High Risk Accounts"
            value="142"
            subtitle="Action required"
            iconBg="var(--accent-red-dim)"
          />
        </div>
        
        <DataTable title="NPL Breakdown by Category" subtitle="Non-performing loan analysis">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Loan Category</TableHeader>
                <TableHeader>Total Amount</TableHeader>
                <TableHeader>NPL Amount</TableHeader>
                <TableHeader>NPL Ratio</TableHeader>
                <TableHeader>Provisions</TableHeader>
                <TableHeader>Coverage</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {riskMetrics.map((risk) => {
                const coverage = ((risk.provisions / risk.npl_amount) * 100).toFixed(1);
                return (
                  <TableRow key={risk.category}>
                    <TableCell><strong className="text-text-primary">{risk.category}</strong></TableCell>
                    <TableCell align="right">{formatNPR(risk.amount)}</TableCell>
                    <TableCell align="right"><strong className="text-accent-red">{formatNPR(risk.npl_amount)}</strong></TableCell>
                    <TableCell align="right">
                      <Pill variant={risk.npl_ratio > 5 ? 'red' : risk.npl_ratio > 3 ? 'amber' : 'green'}>
                        {risk.npl_ratio.toFixed(1)}%
                      </Pill>
                    </TableCell>
                    <TableCell align="right">{formatNPR(risk.provisions)}</TableCell>
                    <TableCell align="right">{coverage}%</TableCell>
                    <TableCell>
                      {risk.npl_ratio > 5 ? <Pill variant="red">High Risk</Pill> : <Pill variant="green">Acceptable</Pill>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTable>
      </div>
    </>
  );
}
