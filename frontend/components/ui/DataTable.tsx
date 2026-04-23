import React from 'react';

interface DataTableProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function DataTable({ title, subtitle, actions, children }: DataTableProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-[18px] py-3.5 border-b border-border flex items-center justify-between">
        <div>
          <div className="text-[13px] font-semibold text-text-primary">{title}</div>
          {subtitle && <div className="text-[11px] text-text-muted mt-0.5">{subtitle}</div>}
        </div>
        {actions && <div className="flex gap-2 items-center">{actions}</div>}
      </div>
      
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <table className="w-full border-collapse">
      {children}
    </table>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="sticky top-0 z-[1] bg-bg-base">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({ 
  children, 
  onClick 
}: { 
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={`
        border-b border-border last:border-b-0 even:bg-bg-input/25
        ${onClick ? 'cursor-pointer hover:bg-bg-card-hover transition-colors' : ''}
      `}
    >
      {children}
    </tr>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  );
}

export function TableCell({ 
  children, 
  align = 'left' 
}: { 
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  const alignClass = {
    left: 'text-left',
    right: 'text-right',
    center: 'text-center',
  }[align];
  
  return (
    <td className={`px-4 py-2.5 text-xs text-text-secondary whitespace-nowrap ${alignClass}`}>
      {children}
    </td>
  );
}
