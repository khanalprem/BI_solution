import React from 'react';
import { cn } from '@/lib/utils';

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

// ─────────────────────────────────────────────────────────────────────────────
// CSS-variable-value → static Tailwind class bundles.
// Each entry carries: icon-bg, left-border accent, and spark-bar color.
// ─────────────────────────────────────────────────────────────────────────────
type AccentBundle = {
  iconBg:  string;
  border:  string;
  spark:   string;
  ring:    string;
};

const ACCENT_MAP: Record<string, AccentBundle> = {
  'var(--accent-blue-dim)': {
    iconBg: 'bg-accent-blue-dim  text-accent-blue',
    border: 'border-l-accent-blue',
    spark:  'bg-accent-blue',
    ring:   'shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]',
  },
  'var(--accent-green-dim)': {
    iconBg: 'bg-accent-green-dim text-accent-green',
    border: 'border-l-accent-green',
    spark:  'bg-accent-green',
    ring:   'shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]',
  },
  'var(--accent-red-dim)': {
    iconBg: 'bg-accent-red-dim   text-accent-red',
    border: 'border-l-accent-red',
    spark:  'bg-accent-red',
    ring:   '',
  },
  'var(--accent-amber-dim)': {
    iconBg: 'bg-accent-amber-dim text-accent-amber',
    border: 'border-l-accent-amber',
    spark:  'bg-accent-amber',
    ring:   '',
  },
  'var(--accent-purple-dim)': {
    iconBg: 'bg-accent-purple-dim text-accent-purple',
    border: 'border-l-accent-purple',
    spark:  'bg-accent-purple',
    ring:   '',
  },
  'var(--accent-teal-dim)': {
    iconBg: 'bg-accent-teal-dim  text-accent-teal',
    border: 'border-l-accent-teal',
    spark:  'bg-accent-teal',
    ring:   '',
  },
};

const FALLBACK_ACCENT: AccentBundle = {
  iconBg: 'bg-bg-input text-text-muted',
  border: 'border-l-border-strong',
  spark:  'bg-text-muted',
  ring:   '',
};

// Change-indicator classes
const CHANGE_COLOR: Record<NonNullable<KPICardProps['changeType']>, string> = {
  up:      'text-accent-green',
  down:    'text-accent-red',
  warning: 'text-accent-amber',
};

const CHANGE_BG: Record<NonNullable<KPICardProps['changeType']>, string> = {
  up:      'bg-accent-green-dim',
  down:    'bg-accent-red-dim',
  warning: 'bg-accent-amber-dim',
};

const SPARK_BG: Record<NonNullable<KPICardProps['changeType']>, string> = {
  up:      'bg-accent-green',
  down:    'bg-accent-red',
  warning: 'bg-accent-amber',
};

export function KPICard({
  label,
  value,
  change,
  changeType = 'up',
  subtitle,
  icon,
  iconBg,
  highlighted,
  onClick,
}: KPICardProps) {
  const accent: AccentBundle = (iconBg ? ACCENT_MAP[iconBg] : undefined) ?? FALLBACK_ACCENT;
  const changeText = CHANGE_COLOR[changeType];
  const changeBg   = CHANGE_BG[changeType];
  const sparkColor = SPARK_BG[changeType];
  const changeSymbol = changeType === 'down' ? '▼' : '▲';

  // Spark bar width: clamp change% to [4, 92] range so it's always visible
  // but never overflows. Expressed as a fixed Tailwind arbitrary value isn't
  // feasible for a truly dynamic width — we use a CSS custom property set via
  // a sibling data attribute approach: the fill animation starts from 0 so
  // even a fixed generous width reads as "trend indicator", not exact data.
  const sparkWidthClass = change !== undefined
    ? Math.abs(change) >= 60 ? 'w-[88%]'
    : Math.abs(change) >= 40 ? 'w-[72%]'
    : Math.abs(change) >= 20 ? 'w-[55%]'
    : Math.abs(change) >= 10 ? 'w-[40%]'
    : Math.abs(change) >= 5  ? 'w-[28%]'
    : 'w-[18%]'
    : 'w-[30%]';

  return (
    <div
      onClick={onClick}
      className={cn(
        // Layout
        'relative flex flex-col gap-1.5 p-3 rounded-xl',
        // Left accent border (3 px)
        'border-l-[3px] border border-border',
        accent.border,
        // Surface — glassmorphism-lite
        'bg-bg-card/95 backdrop-blur-sm',
        'shadow-[0_4px_16px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.04)]',
        accent.ring,
        // Interaction
        'cursor-pointer select-none',
        'transition-all duration-200',
        'hover:bg-bg-card-hover hover:border-border-strong hover:shadow-[0_6px_24px_rgba(0,0,0,0.24)]',
        'animate-fade-in',
        highlighted && 'border-accent-blue/40 shadow-[0_4px_20px_rgba(59,130,246,0.10),inset_0_1px_0_rgba(255,255,255,0.05)]'
      )}
    >
      {/* ── Top row: label + icon ── */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-[0.35px] truncate">
          {label}
        </span>
        {icon && (
          <div
            className={cn(
              'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0',
              accent.iconBg
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {/* ── Value — key remount triggers CSS pop-in animation on change ── */}
      <div
        key={String(value)}
        className="text-[20px] font-semibold leading-none tracking-tight text-text-primary animate-kpi-value"
      >
        {value}
      </div>

      {/* ── Bottom row: change badge + subtitle ── */}
      <div className="flex items-center justify-between gap-1 mt-0.5">
        {change !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-full',
              'text-[9px] font-bold leading-none tracking-[0.2px]',
              changeBg,
              changeText
            )}
          >
            <span className="text-[8px]">{changeSymbol}</span>
            {change > 0 ? '+' : ''}
            {change.toFixed(1)}%
          </span>
        )}
        {subtitle && (
          <span className="text-[9px] text-text-muted leading-none ml-auto truncate">
            {subtitle}
          </span>
        )}
      </div>

      {/* ── Spark indicator bar ── */}
      {/* A thin animated fill bar that visually echoes the change direction.
          It is decorative (not a precise data glyph) and requires no chart lib. */}
      <div className="h-[2px] w-full rounded-full overflow-hidden bg-bg-input mt-0.5">
        <div
          className={cn(
            'h-full rounded-full opacity-60 animate-spark-fill',
            sparkColor,
            sparkWidthClass
          )}
        />
      </div>
    </div>
  );
}
