import React from 'react';

/**
 * Consistent placeholder UI for features whose data source is not yet connected.
 * Matches the "Risk Exposure Monitor" pattern used on the Executive Overview:
 * a bordered card with a "Not connected" (or custom status) pill, a centered
 * empty-state message, and an optional sub-line explaining how to wire it up.
 *
 * Use anywhere a real panel would go to preserve layout integrity while the
 * corresponding API / data feed is being built.
 */
export interface PlaceholderPanelProps {
  title: string;
  subtitle?: string;
  /** Pill text shown top-right. Default: "Not connected" */
  status?: string;
  /** Optional custom pill color. Default: muted */
  statusTone?: 'muted' | 'amber' | 'blue';
  /** Main centered line. Default generic. */
  message?: string;
  /** Optional second line hinting at integration work. */
  hint?: string;
  /** Optional icon glyph (emoji or single char). */
  icon?: React.ReactNode;
  /** Minimum body height so short placeholders still feel like real cards. */
  minHeight?: number;
  className?: string;
}

const TONE_CLS: Record<NonNullable<PlaceholderPanelProps['statusTone']>, string> = {
  muted: 'bg-bg-input text-text-muted border-border',
  amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
  blue:  'bg-accent-blue/10  text-accent-blue  border-accent-blue/30',
};

export function PlaceholderPanel({
  title,
  subtitle,
  status = 'Not connected',
  statusTone = 'muted',
  message = 'No data source connected.',
  hint,
  icon,
  minHeight = 180,
  className,
}: PlaceholderPanelProps) {
  return (
    <div
      className={`bg-bg-card border border-border rounded-xl p-4 flex flex-col ${className || ''}`}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-3.5">
        <div className="min-w-0">
          <h3 className="font-display text-[13.5px] font-bold tracking-tight text-text-primary leading-none truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10.5px] text-text-muted mt-1 leading-none truncate">
              {subtitle}
            </p>
          )}
        </div>
        <span
          className={`flex-shrink-0 text-[9px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${TONE_CLS[statusTone]}`}
        >
          {status}
        </span>
      </div>

      <div
        className="flex-1 flex flex-col items-center justify-center gap-2 py-6 text-center"
        style={{ minHeight }}
      >
        {icon && <div className="text-[22px] opacity-70 mb-1">{icon}</div>}
        <span className="text-[11px] text-text-muted font-medium">{message}</span>
        {hint && (
          <span className="text-[10px] text-text-muted opacity-60 max-w-[280px]">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Banner rendered at the top of a page whose primary data feed is placeholder.
 * Use on pages like Loan Portfolio, Deposit Portfolio, Regulatory Compliance
 * where we want users to understand the numbers are illustrative.
 */
export function PlaceholderBanner({
  message = 'This dashboard uses illustrative sample data.',
  hint = 'Connect the backing data feed to replace the placeholders with live numbers.',
}: { message?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-accent-amber/30 bg-accent-amber/8 px-4 py-2.5 flex items-start gap-3">
      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-accent-amber/20 flex items-center justify-center mt-0.5">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="5" cy="5" r="4" stroke="#F59E0B" strokeWidth="1.5" />
          <path d="M5 3v3M5 7h.01" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] font-semibold text-accent-amber leading-tight">
          Sample data — awaiting integration
        </p>
        <p className="text-[10.5px] text-text-secondary mt-1 leading-snug">
          <span className="text-text-primary">{message}</span>{' '}
          {hint}
        </p>
      </div>
    </div>
  );
}
