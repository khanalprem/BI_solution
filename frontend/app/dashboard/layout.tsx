'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarContext } from '@/contexts/SidebarContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const onToggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ onToggleSidebar }}>
      <div className="flex min-h-screen bg-bg-base">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="ml-0 lg:ml-[220px] flex-1 flex flex-col min-w-0">
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
