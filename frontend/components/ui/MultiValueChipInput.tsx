'use client';

import { KeyboardEvent, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiValueChipInput({ value, onChange, placeholder, className }: Props) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-md border border-border bg-bg-input px-2 py-1 focus-within:border-accent-blue',
        className,
      )}
    >
      {value.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className="inline-flex items-center gap-1 rounded-full bg-accent-blue/10 px-2 py-0.5 text-[11px] text-accent-blue"
        >
          {v}
          <button
            type="button"
            aria-label={`remove ${v}`}
            onClick={() => removeAt(i)}
            className="text-accent-blue/70 hover:text-accent-red"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (draft) { commit(draft); setDraft(''); } }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="min-w-[80px] flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
      />
    </div>
  );
}
