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
    <div className="bg-bg-card border border-border rounded-xl p-[18px] flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[13px] font-semibold">{title}</div>
          {subtitle && <div className="text-[11px] text-text-muted mt-0.5">{subtitle}</div>}
        </div>
        {controls && <div className="flex gap-1.5">{controls}</div>}
      </div>
      
      {legend && <div className="flex gap-3 flex-wrap mb-3">{legend}</div>}
      
      <div className="flex-1 min-h-0 relative">{children}</div>
    </div>
  );
}

export function ChartLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
      <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
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
          ? 'bg-accent-blue-dim text-accent-blue border-[rgba(59,130,246,0.3)]'
          : 'bg-transparent text-text-muted border-border hover:text-text-primary'
        }
      `}
    >
      {children}
    </button>
  );
}
