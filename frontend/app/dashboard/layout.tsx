'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarContext } from '@/contexts/SidebarContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const onToggleSidebar = () => setSidebarOpen((prev) => !prev);

  // Sync sidebar width CSS variable so main content margin is reactive to collapse
  useEffect(() => {
    const syncWidth = () => {
      const collapsed = localStorage.getItem('bankbi-sidebar-collapsed') === 'true';
      document.documentElement.style.setProperty('--sidebar-width', collapsed ? '56px' : '220px');
    };
    syncWidth();
    // Listen for storage changes (from Sidebar toggle)
    window.addEventListener('storage', syncWidth);
    // Also listen for custom event dispatched by Sidebar
    window.addEventListener('sidebar-toggle', syncWidth);
    return () => {
      window.removeEventListener('storage', syncWidth);
      window.removeEventListener('sidebar-toggle', syncWidth);
    };
  }, []);

  return (
    <SidebarContext.Provider value={{ onToggleSidebar }}>
      <div className="flex min-h-screen bg-bg-base">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="ml-0 lg:ml-[var(--sidebar-width,220px)] flex-1 flex flex-col min-w-0 transition-[margin] duration-200">
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
