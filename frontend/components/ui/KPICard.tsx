import React from 'react';

// Map iconBg CSS variable values to Tailwind-compatible classes via data attribute
// We use a CSS variable on the element itself so no inline styles are needed
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
  
  // Resolve iconBg color class from the var name
  const iconBgClass = iconBg === 'var(--accent-blue-dim)' ? 'bg-accent-blue-dim'
    : iconBg === 'var(--accent-green-dim)' ? 'bg-accent-green-dim'
    : iconBg === 'var(--accent-red-dim)' ? 'bg-accent-red-dim'
    : iconBg === 'var(--accent-amber-dim)' ? 'bg-accent-amber-dim'
    : iconBg === 'var(--accent-purple-dim)' ? 'bg-accent-purple-dim'
    : iconBg === 'var(--accent-teal-dim)' ? 'bg-accent-teal-dim'
    : 'bg-bg-input';

  return (
    <div
      onClick={onClick}
      className={`
        bg-bg-card border rounded-xl p-3 flex flex-col gap-1.5
        cursor-pointer transition-all hover:border-border-strong
        animate-fade-in
        ${highlighted ? 'border-[rgba(59,130,246,0.3)]' : 'border-border'}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-medium text-text-muted uppercase tracking-[0.3px]">
          {label}
        </div>
        {icon && (
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${iconBgClass}`}>
            {icon}
          </div>
        )}
      </div>
      
      <div className="text-[20px] font-semibold leading-none tracking-tight">
        {value}
      </div>
      
      <div className="flex items-center justify-between">
        {change !== undefined && (
          <div className={`text-[10px] font-semibold ${changeColorClass}`}>
            {changeSymbol} {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </div>
        )}
        {subtitle && (
          <div className="text-[9px] text-text-muted ml-auto">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
