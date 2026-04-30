import { describe, it, expect } from 'vitest';
import { dateDimCount, shouldCollapseDisplayDims } from '@/app/dashboard/pivot/pivotLayout';

describe('dateDimCount', () => {
  it('returns 0 when no date dims are pivoted', () => {
    expect(dateDimCount(['part_tran_type', 'gam_branch'])).toBe(0);
  });

  it('counts leading date dims in a mixed pivot', () => {
    expect(dateDimCount(['year', 'year_month', 'part_tran_type'])).toBe(2);
  });

  it('counts every dim when all are date fields', () => {
    expect(dateDimCount(['year_month', 'tran_date'])).toBe(2);
  });

  it('only counts contiguous LEADING date dims', () => {
    expect(dateDimCount(['year', 'part_tran_type', 'year_month'])).toBe(1);
  });
});

describe('shouldCollapseDisplayDims', () => {
  it('returns false for single-level pivots', () => {
    expect(shouldCollapseDisplayDims(['year_month'], false)).toBe(false);
  });

  it('returns false when fewer than 2 pivot dims', () => {
    expect(shouldCollapseDisplayDims(['year_month'], true)).toBe(false);
  });

  it('returns true for the existing date × non-date case', () => {
    expect(shouldCollapseDisplayDims(['year_month', 'part_tran_type'], true)).toBe(true);
  });

  it('returns true for date × date × non-date (the 3-dim case that was broken)', () => {
    expect(shouldCollapseDisplayDims(['year', 'year_month', 'part_tran_type'], true)).toBe(true);
  });

  it('returns false for pure-date multi-level pivots (balance varies per composite)', () => {
    expect(shouldCollapseDisplayDims(['year_month', 'tran_date'], true)).toBe(false);
  });

  it('returns false when pivot has only non-date dims', () => {
    expect(shouldCollapseDisplayDims(['part_tran_type', 'gam_branch'], true)).toBe(false);
  });
});
