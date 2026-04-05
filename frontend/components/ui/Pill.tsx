import React from 'react';

type PillVariant = 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'teal';

export function Pill({ 
  variant, 
  children 
}: { 
  variant: PillVariant; 
  children: React.ReactNode 
}) {
  const classes = {
    green: 'bg-accent-green-dim text-accent-green',
    red: 'bg-accent-red-dim text-accent-red',
    amber: 'bg-accent-amber-dim text-accent-amber',
    blue: 'bg-accent-blue-dim text-accent-blue',
    purple: 'bg-accent-purple-dim text-accent-purple',
    teal: 'bg-accent-teal-dim text-accent-teal',
  }[variant];
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${classes}`}>
      {children}
    </span>
  );
}
