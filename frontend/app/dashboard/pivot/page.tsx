'use client';

import { TopBar } from '@/components/layout/TopBar';

export default function PivotDashboard() {
  return (
    <>
      <TopBar title="Pivot Analysis" subtitle="Custom data exploration" />
      <div className="flex flex-col gap-4 p-6">
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center">
          <div className="text-text-secondary mb-2">Interactive pivot table coming soon</div>
          <div className="text-text-muted text-xs">Drag-and-drop dimensions and measures for ad-hoc analysis</div>
        </div>
      </div>
    </>
  );
}
