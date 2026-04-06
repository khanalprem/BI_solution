'use client';

import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
