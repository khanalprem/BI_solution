import React from 'react';

interface KPICardProps {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'up' | 'down' | 'warning';
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  highlighted?: boolean;
  onClick?: () => void;
}

export function KPICard({
  label,
  value,
  change,
  changeType = 'up',
  subtitle,
  icon,
  iconBg,
  highlighted,
  onClick
}: KPICardProps) {
  const changeColorClass = {
    up: 'text-accent-green',
    down: 'text-accent-red',
    warning: 'text-accent-amber',
  }[changeType];
  
  const changeSymbol = changeType === 'down' ? '▼' : '▲';
  
  return (
    <div
      onClick={onClick}
      className={`
        bg-bg-card border rounded-xl p-4 flex flex-col gap-2
        cursor-pointer transition-all hover:border-border-strong
        animate-fade-in
        ${highlighted ? 'border-[rgba(59,130,246,0.3)]' : 'border-border'}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium text-text-muted uppercase tracking-[0.3px]">
          {label}
        </div>
        {icon && (
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: iconBg }}
          >
            {icon}
          </div>
        )}
      </div>
      
      <div className="text-[22px] font-semibold leading-none tracking-tight">
        {value}
      </div>
      
      <div className="flex items-center justify-between">
        {change !== undefined && (
          <div className={`text-[11px] font-semibold ${changeColorClass}`}>
            {changeSymbol} {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </div>
        )}
        {subtitle && (
          <div className="text-[10px] text-text-muted ml-auto">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
