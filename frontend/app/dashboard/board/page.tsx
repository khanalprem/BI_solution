'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { DataTable, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/DataTable';
import { Pill } from '@/components/ui/Pill';

export default function BoardDashboard() {
  const reports = [
    { id: 1, name: 'Monthly Board Pack', frequency: 'Monthly', lastRun: '2024-04-01', status: 'completed' },
    { id: 2, name: 'Quarterly Governance Report', frequency: 'Quarterly', lastRun: '2024-03-31', status: 'completed' },
    { id: 3, name: 'Risk Committee Report', frequency: 'Monthly', lastRun: '2024-03-28', status: 'completed' },
    { id: 4, name: 'Audit Committee Pack', frequency: 'Quarterly', lastRun: '2024-03-15', status: 'completed' },
  ];
  
  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar />
      <main className="ml-[220px] flex-1 flex flex-col min-w-0">
        <TopBar title="Board & Governance Packs" subtitle="Executive reporting" />
        <div className="flex flex-col gap-4 p-6">
          <DataTable title="Governance Reports" subtitle={`${reports.length} reports`}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Report Name</TableHeader>
                  <TableHeader>Frequency</TableHeader>
                  <TableHeader>Last Run</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell><strong className="text-text-primary">{report.name}</strong></TableCell>
                    <TableCell><Pill variant="blue">{report.frequency}</Pill></TableCell>
                    <TableCell>{report.lastRun}</TableCell>
                    <TableCell><Pill variant="green">Completed</Pill></TableCell>
                    <TableCell>
                      <button className="text-accent-blue text-xs hover:underline">Download</button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataTable>
        </div>
      </main>
    </div>
  );
}
