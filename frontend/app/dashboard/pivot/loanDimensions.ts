// frontend/app/dashboard/pivot/loanDimensions.ts
//
// Pure data module — no React / Next deps — so it can be unit-tested in
// isolation (mirrors pivotLayout.ts).
//
// LAM (Loan Account Master) dimensions surfaced in the pivot sidebar's
// "Loan Dimension" section. Backend keys match `lam_required: true` entries
// in ProductionDataService::DIMENSIONS; selecting any of them routes through
// inner_join with `LEFT JOIN lam l ON l.acid = ts.acid`.

export interface LoanDimensionField {
  key: string;
  label: string;
  type: 'text';
  description: string;
}

export const LOAN_DIMENSION_FIELDS: LoanDimensionField[] = [
  { key: 'lam_loan_type',         label: 'Loan Type',                      type: 'text', description: 'Loan type from LAM (e.g. term loan, cash credit)' },
  { key: 'lam_acct_state',        label: 'Account State',                  type: 'text', description: 'Account state from LAM' },
  { key: 'lam_op_acid',           label: 'Operative ACID',                 type: 'text', description: 'Operative account ACID — the operating account that backs this loan' },
  { key: 'lam_dis_shdl_date',     label: 'Disbursement Schedule Date',     type: 'text', description: 'Scheduled disbursement date from LAM' },
  { key: 'lam_rep_shdl_date',     label: 'Repayment Schedule Date',        type: 'text', description: 'Scheduled repayment date from LAM' },
  { key: 'lam_last_adj_date',     label: 'Last Adjustment Date',           type: 'text', description: 'Last adjustment date on the loan account' },
  { key: 'lam_dis_amt',           label: 'Disbursement Amount',            type: 'text', description: 'Disbursed amount on the loan' },
  { key: 'lam_oflow_amt',         label: 'Overflow Amount',                type: 'text', description: 'Overflow amount on the loan' },
  { key: 'lam_cum_norm_int_amt',  label: 'Cumulative Normal Interest',     type: 'text', description: 'Cumulative normal interest accrued on the loan' },
  { key: 'lam_cum_pen_int_amt',   label: 'Cumulative Penal Interest',      type: 'text', description: 'Cumulative penal interest accrued on the loan' },
  { key: 'lam_cum_addnl_int_amt', label: 'Cumulative Additional Interest', type: 'text', description: 'Cumulative additional interest accrued on the loan' },
  { key: 'lam_prin_dmd_os',       label: 'Principal Demand Outstanding',   type: 'text', description: 'Outstanding principal demand on the loan' },
  { key: 'lam_int_dmd_os',        label: 'Interest Demand Outstanding',    type: 'text', description: 'Outstanding interest demand on the loan' },
];

export const LOAN_DIM_KEY_SET: ReadonlySet<string> = new Set(
  LOAN_DIMENSION_FIELDS.map((f) => f.key),
);
