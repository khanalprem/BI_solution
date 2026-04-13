/**
 * formatters.test.ts
 *
 * Tests for all pure utility functions in lib/formatters.ts.
 * Run with: cd frontend && npm test
 *
 * Golden Rule: run these before any fix, add a new test when you add a new formatter.
 */

import { describe, it, expect } from 'vitest';
import {
  formatNPR,
  formatNumber,
  formatPercent,
  formatProvinceLabel,
  formatChannelLabel,
  parseISODateToLocal,
  toLocalDate,
  toIsoDate,
} from '../lib/formatters';

// ─── formatNPR ───────────────────────────────────────────────────────────────

describe('formatNPR', () => {
  it('returns Rs. 0 for zero', () => {
    expect(formatNPR(0)).toBe('Rs. 0');
  });

  it('formats values under 1 lakh with commas (Indian system)', () => {
    expect(formatNPR(1000)).toBe('Rs. 1,000');
    expect(formatNPR(99999)).toBe('Rs. 99,999');
  });

  it('formats 1 lakh and above as L (lakhs)', () => {
    expect(formatNPR(100000)).toBe('Rs. 1.00L');
    expect(formatNPR(500000)).toBe('Rs. 5.00L');
    expect(formatNPR(1234567)).toBe('Rs. 12.35L');
  });

  it('formats 1 crore and above as Cr', () => {
    expect(formatNPR(10000000)).toBe('Rs. 1.00Cr');
    expect(formatNPR(123456789)).toBe('Rs. 12.35Cr');
  });

  it('handles negative values', () => {
    expect(formatNPR(-100000)).toBe('-Rs. 1.00L');
    expect(formatNPR(-10000000)).toBe('-Rs. 1.00Cr');
    expect(formatNPR(-500)).toBe('-Rs. 500');
  });

  it('returns dash for NaN / null / undefined (distinguishes missing data from zero)', () => {
    expect(formatNPR(NaN)).toBe('—');
    expect(formatNPR(null as unknown as number)).toBe('—');
    expect(formatNPR(undefined as unknown as number)).toBe('—');
  });

  it('returns Rs. 0 for actual zero', () => {
    expect(formatNPR(0)).toBe('Rs. 0');
  });

  it('shows decimals when showDecimals=true and decimal is non-zero', () => {
    expect(formatNPR(1500.75, true)).toBe('Rs. 1,500.75');
  });

  it('omits decimals when showDecimals=false (default)', () => {
    expect(formatNPR(1500.75)).toBe('Rs. 1,500');
  });
});

// ─── formatNumber ─────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('returns dash for invalid input (distinguishes missing data from zero)', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(null as unknown as number)).toBe('—');
  });

  it('formats thousands as K', () => {
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(1000)).toBe('1.0K');
  });

  it('formats millions as M', () => {
    expect(formatNumber(2500000)).toBe('2.5M');
  });

  it('formats billions as B', () => {
    expect(formatNumber(1000000000)).toBe('1.0B');
  });

  it('handles negative values', () => {
    expect(formatNumber(-1500)).toBe('-1.5K');
  });

  it('formats small numbers without suffix', () => {
    expect(formatNumber(999)).toBe('999');
  });
});

// ─── formatPercent ───────────────────────────────────────────────────────────

describe('formatPercent', () => {
  it('formats with 1 decimal by default', () => {
    expect(formatPercent(45.678)).toBe('45.7%');
  });

  it('respects custom decimal places', () => {
    expect(formatPercent(45.678, 2)).toBe('45.68%');
    expect(formatPercent(45.678, 0)).toBe('46%');
  });

  it('returns 0.0% for NaN / null / undefined', () => {
    expect(formatPercent(NaN)).toBe('0.0%');
    expect(formatPercent(null as unknown as number)).toBe('0.0%');
  });
});

// ─── formatProvinceLabel ──────────────────────────────────────────────────────

describe('formatProvinceLabel', () => {
  it('maps province 1 → Koshi', () => {
    expect(formatProvinceLabel('province 1')).toBe('Koshi');
    expect(formatProvinceLabel('Province 1')).toBe('Koshi'); // case-insensitive
  });

  it('maps all 7 provinces', () => {
    expect(formatProvinceLabel('province 2')).toBe('Madhesh');
    expect(formatProvinceLabel('province 3')).toBe('Bagmati');
    expect(formatProvinceLabel('province 4')).toBe('Gandaki');
    expect(formatProvinceLabel('province 5')).toBe('Lumbini');
    expect(formatProvinceLabel('province 6')).toBe('Karnali');
    expect(formatProvinceLabel('province 7')).toBe('Sudurpashchim');
  });

  it('returns original value for unknown province', () => {
    expect(formatProvinceLabel('Bagmati')).toBe('Bagmati');
  });

  it('returns Unknown for null / undefined / empty', () => {
    expect(formatProvinceLabel(null)).toBe('Unknown');
    expect(formatProvinceLabel(undefined)).toBe('Unknown');
    expect(formatProvinceLabel('')).toBe('Unknown');
  });
});

// ─── formatChannelLabel ───────────────────────────────────────────────────────

describe('formatChannelLabel', () => {
  it('returns Branch / Counter for null / empty', () => {
    expect(formatChannelLabel(null)).toBe('Branch / Counter');
    expect(formatChannelLabel('')).toBe('Branch / Counter');
    expect(formatChannelLabel(undefined)).toBe('Branch / Counter');
  });

  it('maps mobile → Mobile Banking', () => {
    expect(formatChannelLabel('mobile')).toBe('Mobile Banking');
    expect(formatChannelLabel('Mobile')).toBe('Mobile Banking');
  });

  it('maps internet → Internet Banking', () => {
    expect(formatChannelLabel('internet')).toBe('Internet Banking');
  });

  it('maps branch → Branch / Counter', () => {
    expect(formatChannelLabel('branch')).toBe('Branch / Counter');
  });

  it('returns original value for unknown channel', () => {
    expect(formatChannelLabel('ATM')).toBe('ATM');
  });
});

// ─── parseISODateToLocal ──────────────────────────────────────────────────────

describe('parseISODateToLocal', () => {
  it('parses a valid YYYY-MM-DD string without timezone shift', () => {
    const result = parseISODateToLocal('2024-02-15');
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2024);
    expect(result!.getMonth()).toBe(1); // 0-indexed → Feb
    expect(result!.getDate()).toBe(15);
  });

  it('returns null for null / undefined / empty', () => {
    expect(parseISODateToLocal(null)).toBeNull();
    expect(parseISODateToLocal(undefined)).toBeNull();
    expect(parseISODateToLocal('')).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(parseISODateToLocal('not-a-date')).toBeNull();
  });
});

// ─── toLocalDate / toIsoDate ──────────────────────────────────────────────────

describe('toLocalDate + toIsoDate round-trip', () => {
  it('round-trips a date string without timezone shift', () => {
    const date = toLocalDate('2024-02-29');
    expect(date).toBeDefined();
    expect(toIsoDate(date)).toBe('2024-02-29');
  });

  it('toLocalDate returns undefined for empty / null', () => {
    expect(toLocalDate(null)).toBeUndefined();
    expect(toLocalDate('')).toBeUndefined();
  });

  it('toIsoDate returns empty string for null / undefined', () => {
    expect(toIsoDate(null)).toBe('');
    expect(toIsoDate(undefined)).toBe('');
  });
});
