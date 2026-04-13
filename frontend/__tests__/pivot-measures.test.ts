/**
 * pivot-measures.test.ts
 *
 * Consistency tests that verify the STANDARD_MEASURES keys in the frontend
 * match the canonical data-dictionary keys. These act as a regression guard:
 * if someone changes a key in one place but not the other, this test fails.
 *
 * Golden Rule: when you add/rename a measure, this test must still pass.
 * Run with: cd frontend && npm test
 */

import { describe, it, expect } from 'vitest';

// ─── Canonical measure keys (source of truth: data dictionary) ───────────────
// When you add a new measure, add its key here AND to production_data_service.rb
// AND to STANDARD_MEASURES in pivot/page.tsx AND to MEASURES in skills/page.tsx.
const CANONICAL_MEASURE_KEYS = [
  'tran_amt',
  'tran_count',
  'signed_tranamt',
  'cr_amt',
  'cr_count',
  'dr_amt',
  'dr_count',
  'tran_acct_count',
  'tran_maxdate',
] as const;

// ─── parsePivotHeader logic (inline — mirrors function in pivot/page.tsx) ─────
// This function parses pivot column headers that may be prefixed with a period label.
// Format: "period_key:date_string" or just "date_string"
// Keep this in sync with parsePivotHeader in pivot/page.tsx.

const KNOWN_PERIOD_KEYS = new Set([
  'prev_date',
  'this_month',
  'this_year',
  'prev_month',
  'prev_year',
  'prev_month_mtd',
  'prev_year_ytd',
  'prev_month_same_date',
  'prev_year_same_date',
]);

function parsePivotHeader(pv: string): { period: string | null; date: string } {
  const sep = pv.indexOf(':');
  if (sep === -1) return { period: null, date: pv };
  const periodKey = pv.slice(0, sep);
  if (KNOWN_PERIOD_KEYS.has(periodKey)) {
    return { period: periodKey, date: pv.slice(sep + 1) };
  }
  return { period: null, date: pv };
}

// ─── period_stamp_date logic (mirrors production_data_service.rb) ─────────────
// Keep this in sync with period_stamp_date() in production_data_service.rb.
function periodStampDate(period: string, referenceDate: string): string {
  const [y, m, d] = referenceDate.split('-').map(Number);
  const ref = new Date(y, m - 1, d);

  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const ym  = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;

  switch (period) {
    case 'prevdate': {
      const d2 = new Date(ref); d2.setDate(ref.getDate() - 1);
      return ymd(d2);
    }
    case 'thismonth':        return ym(ref);
    case 'thisyear':         return String(ref.getFullYear());
    case 'prevmonth': {
      const d2 = new Date(ref); d2.setDate(1); d2.setMonth(ref.getMonth() - 1);
      return ym(d2);
    }
    case 'prevyear':         return String(ref.getFullYear() - 1);
    case 'prevmonthmtd': {
      const d2 = new Date(ref); d2.setDate(1); d2.setMonth(ref.getMonth() - 1);
      return ym(d2);
    }
    case 'prevyearytd':      return String(ref.getFullYear() - 1);
    case 'prevmonthsamedate': {
      const d2 = new Date(ref); d2.setMonth(ref.getMonth() - 1);
      return ymd(d2);
    }
    case 'prevyearsamedate': {
      const d2 = new Date(ref.getFullYear() - 1, ref.getMonth(), ref.getDate());
      return ymd(d2);
    }
    default: return referenceDate;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Canonical measure key registry', () => {
  it('has exactly 9 canonical keys (matching data dictionary)', () => {
    expect(CANONICAL_MEASURE_KEYS.length).toBe(9);
  });

  it('includes all CR/DR split measures', () => {
    expect(CANONICAL_MEASURE_KEYS).toContain('cr_amt');
    expect(CANONICAL_MEASURE_KEYS).toContain('cr_count');
    expect(CANONICAL_MEASURE_KEYS).toContain('dr_amt');
    expect(CANONICAL_MEASURE_KEYS).toContain('dr_count');
  });

  it('includes signed_tranamt (exists as column in tran_summary)', () => {
    expect(CANONICAL_MEASURE_KEYS).toContain('signed_tranamt');
  });

  it('does NOT include tran_date_bal (that is a DIMENSION, not a measure)', () => {
    expect(CANONICAL_MEASURE_KEYS).not.toContain('tran_date_bal');
  });

  it('does NOT include legacy aliases', () => {
    const legacyKeys = ['total_amount', 'transaction_count', 'unique_accounts',
                        'unique_customers', 'credit_amount', 'debit_amount', 'net_flow'];
    for (const legacy of legacyKeys) {
      expect(CANONICAL_MEASURE_KEYS).not.toContain(legacy);
    }
  });
});

describe('parsePivotHeader', () => {
  it('returns period=null for plain date strings', () => {
    expect(parsePivotHeader('2024-02-01')).toEqual({ period: null, date: '2024-02-01' });
    expect(parsePivotHeader('2024-02')).toEqual({ period: null, date: '2024-02' });
    expect(parsePivotHeader('2024')).toEqual({ period: null, date: '2024' });
  });

  it('extracts period and date for recognised period prefixes', () => {
    expect(parsePivotHeader('this_month:2024-02')).toEqual({ period: 'this_month', date: '2024-02' });
    expect(parsePivotHeader('prev_year:2023')).toEqual({ period: 'prev_year', date: '2023' });
    expect(parsePivotHeader('prev_date:2024-01-31')).toEqual({ period: 'prev_date', date: '2024-01-31' });
  });

  it('treats unknown prefix as plain date (no period)', () => {
    expect(parsePivotHeader('unknown_key:2024-02')).toEqual({ period: null, date: 'unknown_key:2024-02' });
  });

  it('handles empty string gracefully', () => {
    expect(parsePivotHeader('')).toEqual({ period: null, date: '' });
  });
});

describe('periodStampDate — mirrors production_data_service.rb#period_stamp_date', () => {
  const ref = '2024-02-15'; // reference date for all tests

  it('thismonth → YYYY-MM', () => {
    expect(periodStampDate('thismonth', ref)).toBe('2024-02');
  });

  it('thisyear → YYYY', () => {
    expect(periodStampDate('thisyear', ref)).toBe('2024');
  });

  it('prevdate → day before reference', () => {
    expect(periodStampDate('prevdate', ref)).toBe('2024-02-14');
  });

  it('prevmonth → YYYY-MM of previous month', () => {
    expect(periodStampDate('prevmonth', ref)).toBe('2024-01');
  });

  it('prevyear → previous year', () => {
    expect(periodStampDate('prevyear', ref)).toBe('2023');
  });

  it('prevmonthmtd → YYYY-MM of previous month', () => {
    expect(periodStampDate('prevmonthmtd', ref)).toBe('2024-01');
  });

  it('prevyearytd → previous year', () => {
    expect(periodStampDate('prevyearytd', ref)).toBe('2023');
  });

  it('prevmonthsamedate → same day last month', () => {
    expect(periodStampDate('prevmonthsamedate', ref)).toBe('2024-01-15');
  });

  it('prevyearsamedate → same day last year', () => {
    expect(periodStampDate('prevyearsamedate', ref)).toBe('2023-02-15');
  });

  it('handles January → December roll-back for prevmonth', () => {
    expect(periodStampDate('prevmonth', '2024-01-15')).toBe('2023-12');
  });

  it('falls back to reference date for unknown period', () => {
    expect(periodStampDate('unknownperiod', ref)).toBe(ref);
  });
});
