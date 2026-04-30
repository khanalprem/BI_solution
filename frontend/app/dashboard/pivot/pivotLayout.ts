// Pure layout helpers for the pivot table — no React / Next deps.
// Kept separate from PivotClient.tsx so they can be unit-tested in isolation.

export const DATE_FIELD_ORDER = ['year', 'year_quarter', 'year_month', 'tran_date'] as const;
const DATE_SET = new Set<string>(DATE_FIELD_ORDER);

// Count leading date pivot dims. The pivot UI orders date dims first, so this
// also equals the total date-dim count under that invariant.
export function dateDimCount(pivotDimKeys: string[]): number {
  let i = 0;
  while (i < pivotDimKeys.length && DATE_SET.has(pivotDimKeys[i])) i++;
  return i;
}

// Display-as-measure dims (tran_date_bal) are keyed only by date. Trailing
// non-date pivot dims (e.g. part_tran_type) must NOT multiply their column
// count — the same balance value would just repeat across CR/DR splits.
//
// Collapse fires when:
//   • the pivot is multi-level (composite pivot key), AND
//   • at least one leading date pivot dim exists (anchor for the balance), AND
//   • at least one trailing non-date pivot dim exists (the axis to collapse).
//
// Pure-date multi-level pivots (e.g. year × year_month, year_month × tran_date)
// do NOT collapse — balance genuinely varies per composite there.
export function shouldCollapseDisplayDims(
  pivotDimKeys: string[],
  isMultiLevel: boolean,
): boolean {
  if (!isMultiLevel || pivotDimKeys.length < 2) return false;
  const dateCount = dateDimCount(pivotDimKeys);
  const nonDateCount = pivotDimKeys.length - dateCount;
  return dateCount >= 1 && nonDateCount >= 1;
}
