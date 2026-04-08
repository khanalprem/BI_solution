import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  controls?: React.ReactNode;
  legend?: React.ReactNode;
  children: React.ReactNode;
}

export function ChartCard({ title, subtitle, controls, legend, children }: ChartCardProps) {
  return (
    <section className="group relative overflow-hidden rounded-xl border border-border bg-bg-card p-4 flex flex-col shadow-[0_10px_26px_rgba(0,0,0,0.22)] transition-all duration-200 hover:-translate-y-[1px] hover:border-border-strong hover:shadow-[0_16px_34px_rgba(0,0,0,0.28)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(59,130,246,0.09),transparent)]" />
      <div className="flex items-start justify-between mb-3.5">
        <div>
          <h3 className="text-[13px] font-semibold text-text-primary leading-tight tracking-[0.1px]">{title}</h3>
          {subtitle && <p className="text-[11px] text-text-muted mt-1">{subtitle}</p>}
        </div>
        {controls && <div className="flex gap-1.5">{controls}</div>}
      </div>
      
      {legend && <div className="flex gap-3.5 flex-wrap mb-2.5">{legend}</div>}
      
      <div className="chart-surface flex-1 min-h-0 relative rounded-lg">{children}</div>
    </section>
  );
}

// Legend color map — avoids inline style on dots
const LEGEND_COLOR_VARS: Record<string, string> = {
  '#10b981': 'bg-accent-green',
  '#ef4444': 'bg-accent-red',
  '#3b82f6': 'bg-accent-blue',
  '#f59e0b': 'bg-accent-amber',
  '#8b5cf6': 'bg-accent-purple',
  '#06b6d4': 'bg-accent-teal',
};

export function ChartLegendItem({ color, label }: { color: string; label: string }) {
  const bgClass = LEGEND_COLOR_VARS[color] ?? 'bg-text-muted';
  return (
    <div className="flex items-center gap-2 text-[11px] text-text-secondary">
      <div className={`w-2 h-2 rounded-sm ${bgClass} shadow-[0_0_0_2px_rgba(255,255,255,0.04)]`} />
      {label}
    </div>
  );
}

export function ChartControlChip({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode 
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all
        ${active
          ? 'bg-accent-blue-dim text-accent-blue border-[rgba(59,130,246,0.3)] shadow-[0_0_0_1px_rgba(59,130,246,0.12)]'
          : 'bg-transparent text-text-muted border-border hover:text-text-primary hover:border-border-strong'
        }
      `}
    >
      {children}
    </button>
  );
}

export function ChartEmptyState({
  title = 'No chart data',
  subtitle = 'Try changing the date range or filters.',
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border bg-bg-input/40 text-center">
      <div>
        <div className="text-[11px] font-semibold text-text-primary">{title}</div>
        <div className="mt-1 text-[10px] text-text-muted">{subtitle}</div>
      </div>
    </div>
  );
}
