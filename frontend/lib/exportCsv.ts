/**
 * Export tabular data as a CSV file download.
 * Handles quoting, commas, and newlines in cell values.
 */
export function exportTableToCsv(
  filename: string,
  headers: string[],
  rows: Record<string, unknown>[],
) {
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // Quote if contains comma, newline, or double-quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [headers.map(escape).join(',')];
  for (const row of rows) {
    csvRows.push(headers.map((h) => escape(row[h])).join(','));
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
