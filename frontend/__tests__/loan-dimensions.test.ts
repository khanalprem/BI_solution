// frontend/__tests__/loan-dimensions.test.ts
import { describe, it, expect } from 'vitest';
import {
  LOAN_DIMENSION_FIELDS,
  LOAN_DIM_KEY_SET,
} from '@/app/dashboard/pivot/loanDimensions';

describe('LOAN_DIMENSION_FIELDS', () => {
  it('has exactly 13 entries', () => {
    expect(LOAN_DIMENSION_FIELDS).toHaveLength(13);
  });

  it('every key is prefixed lam_', () => {
    for (const f of LOAN_DIMENSION_FIELDS) {
      expect(f.key).toMatch(/^lam_/);
    }
  });

  it('every entry has a non-empty label and description', () => {
    for (const f of LOAN_DIMENSION_FIELDS) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });

  it('contains the canonical 13 LAM keys (matches loans page)', () => {
    const keys = LOAN_DIMENSION_FIELDS.map((f) => f.key).slice().sort();
    expect(keys).toEqual([
      'lam_acct_state',
      'lam_cum_addnl_int_amt',
      'lam_cum_norm_int_amt',
      'lam_cum_pen_int_amt',
      'lam_dis_amt',
      'lam_dis_shdl_date',
      'lam_int_dmd_os',
      'lam_last_adj_date',
      'lam_loan_type',
      'lam_oflow_amt',
      'lam_op_acid',
      'lam_prin_dmd_os',
      'lam_rep_shdl_date',
    ]);
  });

  it('keys are unique', () => {
    const keys = LOAN_DIMENSION_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('LOAN_DIM_KEY_SET', () => {
  it('matches the keys in LOAN_DIMENSION_FIELDS', () => {
    const keys = LOAN_DIMENSION_FIELDS.map((f) => f.key);
    expect(LOAN_DIM_KEY_SET.size).toBe(keys.length);
    for (const k of keys) {
      expect(LOAN_DIM_KEY_SET.has(k)).toBe(true);
    }
  });
});
