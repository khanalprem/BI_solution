'use client';

import { TopBar } from '@/components/layout/TopBar';
import { KPICard } from '@/components/ui/KPICard';

export default function DigitalDashboard() {
  return (
    <>
      <TopBar title="Digital Channels" subtitle="Mobile, internet & ATM performance" />
      <div className="flex flex-col gap-4 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <KPICard label="Mobile Banking" value="28,450" change={12.4} changeType="up" iconBg="var(--accent-blue-dim)" />
          <KPICard label="Internet Banking" value="15,230" change={8.7} changeType="up" iconBg="var(--accent-green-dim)" />
          <KPICard label="ATM Transactions" value="45,890" change={-2.3} changeType="down" iconBg="var(--accent-amber-dim)" />
          <KPICard label="Digital Adoption" value="68.5%" change={5.2} changeType="up" iconBg="var(--accent-purple-dim)" />
          <KPICard label="Active Users" value="32,450" change={9.8} changeType="up" iconBg="var(--accent-teal-dim)" />
        </div>
      </div>
    </>
  );
}
