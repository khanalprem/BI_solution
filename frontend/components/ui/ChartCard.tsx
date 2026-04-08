import React from 'react';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  controls?: React.ReactNode;
  legend?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'premium' | 'minimal';
}

// Top-accent gradient per variant — maps to a thin colored rule at the very top
const ACCENT_LINE: Record<NonNullable<ChartCardProps['variant']>, string> = {
  premium: 'bg-gradient-to-r from-transparent via-accent-blue to-accent-teal/60 opacity-70',
  default: 'bg-gradient-to-r from-transparent via-accent-green/70 to-transparent opacity-50',
  minimal: 'opacity-0',
};

// Card surface styles per variant
const CARD_SURFACE: Record<NonNullable<ChartCardProps['variant']>, string> = {
  premium: [
    'bg-bg-card/[0.97] border-border/60 backdrop-blur-sm',
    'shadow-[0_8px_32px_rgba(0,0,0,0.30),inset_0_1px_0_rgba(255,255,255,0.04)]',
    'hover:border-accent-blue/20 hover:shadow-[0_14px_48px_rgba(59,130,246,0.10),inset_0_1px_0_rgba(255,255,255,0.06)]',
  ].join(' '),
  default: [
    'bg-bg-card border-border',
    'shadow-[0_6px_24px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.03)]',
    'hover:border-border-strong hover:shadow-[0_10px_32px_rgba(0,0,0,0.30)]',
  ].join(' '),
  minimal: 'bg-bg-card/70 border-border/40 shadow-sm hover:border-border',
};

export function ChartCard({
  title,
  subtitle,
  controls,
  legend,
  children,
  className,
  variant = 'premium',
}: ChartCardProps) {
  return (
    <section
      className={cn(
        'group relative overflow-hidden rounded-xl border flex flex-col transition-all duration-300 p-4',
        CARD_SURFACE[variant],
        className
      )}
    >
      {/* ── Top accent rule ── */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-[2px]',
          ACCENT_LINE[variant]
        )}
      />

      {/* ── Shimmer sweep on hover (pure CSS, no JS) ── */}
      <div
        className={cn(
          'pointer-events-none absolute top-0 bottom-0 w-1/3 -skew-x-[15deg]',
          'bg-gradient-to-r from-transparent via-white/[0.025] to-transparent',
          'group-hover:animate-[card-shimmer_0.75s_ease-out_forwards]'
        )}
      />

      {/* ── Ambient inner glow (premium only) ── */}
      {variant === 'premium' && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(59,130,246,0.05),transparent)]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(0deg,rgba(6,182,212,0.03),transparent)]" />
        </>
      )}

      {/* ── Header row ── */}
      <div className="relative z-10 flex items-start justify-between mb-3.5">
        <div>
          <h3 className="text-[13px] font-semibold text-text-primary leading-tight tracking-[0.12px]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
        {controls && <div className="flex gap-1.5 shrink-0 ml-3">{controls}</div>}
      </div>

      {/* ── Legend row ── */}
      {legend && (
        <div className="relative z-10 flex gap-1.5 flex-wrap mb-3">{legend}</div>
      )}

      {/* ── Chart surface ── */}
      <div
        className={cn(
          'chart-surface flex-1 min-h-0 relative rounded-lg',
          variant === 'premium' && 'premium-chart-surface'
        )}
      >
        {children}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Legend color map — static Tailwind classes, no inline styles
// ─────────────────────────────────────────────────────────────────────────────
const LEGEND_DOT_CLASS: Record<string, string> = {
  '#10b981': 'bg-accent-green  shadow-[0_0_5px_rgba(16,185,129,0.5)]',
  '#ef4444': 'bg-accent-red    shadow-[0_0_5px_rgba(239,68,68,0.5)]',
  '#3b82f6': 'bg-accent-blue   shadow-[0_0_5px_rgba(59,130,246,0.5)]',
  '#f59e0b': 'bg-accent-amber  shadow-[0_0_5px_rgba(245,158,11,0.5)]',
  '#8b5cf6': 'bg-accent-purple shadow-[0_0_5px_rgba(139,92,246,0.5)]',
  '#06b6d4': 'bg-accent-teal   shadow-[0_0_5px_rgba(6,182,212,0.5)]',
};

const LEGEND_PILL_CLASS: Record<string, string> = {
  '#10b981': 'border-accent-green/20  bg-accent-green-dim  text-accent-green',
  '#ef4444': 'border-accent-red/20    bg-accent-red-dim    text-accent-red',
  '#3b82f6': 'border-accent-blue/20   bg-accent-blue-dim   text-accent-blue',
  '#f59e0b': 'border-accent-amber/20  bg-accent-amber-dim  text-accent-amber',
  '#8b5cf6': 'border-accent-purple/20 bg-accent-purple-dim text-accent-purple',
  '#06b6d4': 'border-accent-teal/20   bg-accent-teal-dim   text-accent-teal',
};

/**
 * Pill-shaped legend item — replaces the old plain dot + label.
 * Each pill carries the accent color of its series as bg/border/text.
 */
export function ChartLegendItem({ color, label }: { color: string; label: string }) {
  const dotClass = LEGEND_DOT_CLASS[color] ?? 'bg-text-muted';
  const pillClass = LEGEND_PILL_CLASS[color] ?? 'border-border bg-bg-input text-text-secondary';

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-[3px] rounded-full',
        'text-[10px] font-semibold border tracking-[0.2px]',
        'transition-opacity duration-150 hover:opacity-80',
        pillClass
      )}
    >
      <div className={cn('w-[5px] h-[5px] rounded-full flex-shrink-0', dotClass)} />
      {label}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Control chip — toggle button for chart modes (e.g. "7D / 30D / 90D")
// ─────────────────────────────────────────────────────────────────────────────
export function ChartControlChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-[3px] rounded-full text-[10px] font-semibold border',
        'transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-blue',
        active
          ? [
              'bg-accent-blue text-white border-accent-blue/40',
              'shadow-[0_0_0_3px_rgba(59,130,246,0.15),0_1px_4px_rgba(59,130,246,0.25)]',
            ].join(' ')
          : [
              'bg-bg-input text-text-muted border-border',
              'hover:bg-bg-card-hover hover:text-text-secondary hover:border-border-strong',
            ].join(' ')
      )}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state — shown when a chart has no data to render
// ─────────────────────────────────────────────────────────────────────────────
export function ChartEmptyState({
  title = 'No chart data',
  subtitle = 'Try changing the date range or filters.',
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-[200px] items-center justify-center rounded-xl',
        'border border-dashed border-border/50 bg-bg-input/20',
        'transition-colors duration-200 hover:border-border'
      )}
    >
      <div className="text-center px-4 select-none">
        {/* Minimal bar-chart illustration */}
        <div className="mx-auto mb-3 flex items-end justify-center gap-[3px] h-7 opacity-20">
          <div className="w-[5px] h-[10px] rounded-[2px] bg-text-secondary" />
          <div className="w-[5px] h-[18px] rounded-[2px] bg-text-secondary" />
          <div className="w-[5px] h-[8px]  rounded-[2px] bg-text-secondary" />
          <div className="w-[5px] h-[14px] rounded-[2px] bg-text-secondary" />
          <div className="w-[5px] h-[6px]  rounded-[2px] bg-text-secondary" />
        </div>
        <p className="text-[11px] font-semibold text-text-secondary">{title}</p>
        <p className="mt-1 text-[10px] text-text-muted max-w-[150px] leading-relaxed">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
