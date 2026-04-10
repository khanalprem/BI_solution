import React from 'react';
import { Select } from './Select';

interface FilterBarProps {
  children: React.ReactNode;
  onClear?: () => void;
}

export function FilterBar({ children, onClear }: FilterBarProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-3 flex items-center gap-3 flex-wrap shadow-sm">
      {children}
      {onClear && (
        <button
          onClick={onClear}
          className="ml-auto px-3 py-1.5 text-[11px] text-text-secondary hover:text-accent-red hover:bg-accent-red-dim rounded-md transition-colors font-medium"
        >
          Clear All ×
        </button>
      )}
    </div>
  );
}

export function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] text-text-secondary font-semibold whitespace-nowrap tracking-wide uppercase">
      {children}
    </div>
  );
}

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function FilterSelect({ value, onChange, options, placeholder }: FilterSelectProps) {
  return (
    <div className="min-w-[150px]">
      <Select
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
      />
    </div>
  );
}

interface FilterChipsProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function FilterChips({ options, selected, onChange }: FilterChipsProps) {
  const toggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };
  
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => toggle(option)}
          className={`
            px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all
            ${selected.includes(option)
              ? 'bg-accent-blue-dim text-accent-blue border-[rgba(59,130,246,0.3)]'
              : 'bg-transparent text-text-muted border-border hover:border-border-strong hover:text-text-primary'
            }
          `}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function FilterDivider() {
  return <div className="hidden sm:block w-px h-[18px] bg-border mx-0.5" />;
}
