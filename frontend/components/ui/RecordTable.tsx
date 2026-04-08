'use client';

import { DataTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './DataTable';

interface RecordTableProps {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: Array<Record<string, string | number | boolean | null>>;
  actions?: React.ReactNode;
}

function renderCellValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function RecordTable({ title, subtitle, columns, rows, actions }: RecordTableProps) {
  return (
    <DataTable title={title} subtitle={subtitle} actions={actions}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableHeader key={column}>{column.replaceAll('_', ' ')}</TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell>no rows</TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={`${rowIndex}-${column}`}>
                    {renderCellValue(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </DataTable>
  );
}
