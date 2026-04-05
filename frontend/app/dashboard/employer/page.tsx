'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { KPICard } from '@/components/ui/KPICard';

export default function EmployerDashboard() {
  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex flex-col min-w-0">
        <TopBar title="Employer & Payroll" subtitle="Corporate banking and salary accounts" />
        <div className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <KPICard label="Active Employers" value="1,245" change={3.2} changeType="up" iconBg="var(--accent-blue-dim)" />
            <KPICard label="Payroll Accounts" value="42,890" change={5.1} changeType="up" iconBg="var(--accent-green-dim)" />
            <KPICard label="Total Payroll" value="NPR 185 Cr" change={4.8} changeType="up" iconBg="var(--accent-purple-dim)" />
            <KPICard label="Avg Salary" value="NPR 43,120" change={2.3} changeType="up" iconBg="var(--accent-teal-dim)" />
          </div>
        </div>
      </main>
    </div>
  );
}
