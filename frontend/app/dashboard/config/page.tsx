'use client';

import { TopBar } from '@/components/layout/TopBar';
import { DataTable, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/components/ui/DataTable';
import { Pill } from '@/components/ui/Pill';

export default function ConfigDashboard() {
  const users = [
    { id: 1, name: 'Prakash Sharma', role: 'CFO', email: 'prakash@bank.com.np', status: 'active', lastLogin: '2 hours ago' },
    { id: 2, name: 'Anita Thapa', role: 'Analyst', email: 'anita@bank.com.np', status: 'active', lastLogin: '1 day ago' },
    { id: 3, name: 'Rajesh Kumar', role: 'Manager', email: 'rajesh@bank.com.np', status: 'active', lastLogin: '3 hours ago' },
    { id: 4, name: 'Sunita Rai', role: 'Viewer', email: 'sunita@bank.com.np', status: 'inactive', lastLogin: '2 weeks ago' },
  ];
  
  return (
    <>
      <TopBar title="Configuration" subtitle="System settings & user management" />
      
      <div className="flex flex-col gap-4 p-6">
        <DataTable
            title="User Access Management"
            subtitle={`${users.length} users`}
            actions={
              <button className="px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-medium hover:opacity-90">
                + Add User
              </button>
            }
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Role</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Last Login</TableHeader>
                  <TableHeader>Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell><strong className="text-text-primary">{user.name}</strong></TableCell>
                    <TableCell>
                      <Pill variant={user.role === 'CFO' ? 'purple' : user.role === 'Manager' ? 'blue' : 'teal'}>
                        {user.role}
                      </Pill>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Pill variant={user.status === 'active' ? 'green' : 'amber'}>{user.status}</Pill>
                    </TableCell>
                    <TableCell>{user.lastLogin}</TableCell>
                    <TableCell>
                      <button className="text-accent-blue text-xs hover:underline">Edit</button>
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
