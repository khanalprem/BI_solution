'use client';

import { TopBar } from '@/components/layout/TopBar';
import { DataTable, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/DataTable';
import { Pill } from '@/components/ui/Pill';

export default function ScheduledDashboard() {
  const schedules = [
    { id: 1, name: 'NRB Report 1', type: 'Regulatory', schedule: 'Daily 6:00 AM', nextRun: 'Tomorrow 6:00 AM', status: 'active' },
    { id: 2, name: 'NRB Report 2', type: 'Regulatory', schedule: 'Weekly Mon', nextRun: 'Mon 6:00 AM', status: 'active' },
    { id: 3, name: 'Internal Audit Report', type: 'Internal', schedule: 'Monthly 1st', nextRun: 'May 1, 6:00 AM', status: 'active' },
    { id: 4, name: 'Risk Report', type: 'Risk', schedule: 'Daily 5:00 AM', nextRun: 'Tomorrow 5:00 AM', status: 'active' },
  ];
  
  return (
    <>
      <TopBar title="Scheduled & Regulatory Runs" subtitle="Automated reporting" />
      <div className="flex flex-col gap-4 p-6">
        <DataTable
          title="Scheduled Reports"
          subtitle={`${schedules.length} active schedules`}
          actions={
            <button className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-medium hover:opacity-90">
              + New Schedule
            </button>
          }
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Report Name</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Schedule</TableHeader>
                <TableHeader>Next Run</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell><strong className="text-text-primary">{schedule.name}</strong></TableCell>
                  <TableCell>
                    <Pill variant={schedule.type === 'Regulatory' ? 'red' : schedule.type === 'Risk' ? 'amber' : 'blue'}>
                      {schedule.type}
                    </Pill>
                  </TableCell>
                  <TableCell>{schedule.schedule}</TableCell>
                  <TableCell>{schedule.nextRun}</TableCell>
                  <TableCell><Pill variant="green">Active</Pill></TableCell>
                  <TableCell>
                    <button className="text-accent-blue text-xs hover:underline mr-2">Edit</button>
                    <button className="text-accent-blue text-xs hover:underline">Run Now</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTable>
      </div>
    </>
  );
}
