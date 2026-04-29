'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TopBar } from '@/components/layout/TopBar';
import { Badge, badgeColor } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { AdvancedDataTable, type ColumnDef } from '@/components/ui/AdvancedDataTable';
import apiClient from '@/lib/api';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_COLORS, type Role, type AuthUser } from '@/lib/auth';
import { UserPlus, Pencil, UserX, Shield, ChevronDown, ChevronUp } from 'lucide-react';

interface UserRow {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: Role;
  display_role: string;
  is_active: boolean;
  assigned_branches: string[];
  assigned_provinces: string[];
  created_at: string;
}

interface UsersResponse {
  users: UserRow[];
  roles: string[];
}

const EMPTY_FORM = { email: '', password: '', first_name: '', last_name: '', role: 'analyst' as Role };

export default function UsersPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedRole, setExpandedRole] = useState<Role | null>(null);

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await apiClient.get<UsersResponse>('/users');
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form & { id?: number }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        await apiClient.patch(`/users/${id}`, rest);
      } else {
        await apiClient.post('/users', payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setModalOpen(false); },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const openCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setForm({ email: u.email, password: '', first_name: u.first_name || '', last_name: u.last_name || '', role: u.role });
    setModalOpen(true);
  };

  const roleColor = (role: Role) => ROLE_COLORS[role] || 'var(--text-muted)';

  // Group users by role
  const byRole = ROLES.reduce((acc, r) => {
    acc[r] = (data?.users || []).filter(u => u.role === r);
    return acc;
  }, {} as Record<Role, UserRow[]>);

  // ── Permissions matrix data ─────────────────────────────────────────────────
  type PermRow = { key: string; label: string } & Record<Role, boolean>;
  const PERMS: { key: string; label: string }[] = [
    { key: 'dashboard',  label: 'Executive Dashboard' },
    { key: 'analytics',  label: 'Analytics & Trends' },
    { key: 'customers',  label: 'Customer Data (PII)' },
    { key: 'branches',   label: 'Branch & Regional' },
    { key: 'financial',  label: 'Financial Results' },
    { key: 'risk',       label: 'Risk & Exposure' },
    { key: 'regulatory', label: 'Regulatory Compliance' },
    { key: 'loans',      label: 'Loan Portfolio' },
    { key: 'deposits',   label: 'Deposit Portfolio' },
    { key: 'digital',    label: 'Digital Channels' },
    { key: 'employer',   label: 'Staff & Operations' },
    { key: 'kpi',        label: 'KPI Tree Analysis' },
    { key: 'pivot',      label: 'Pivot Analysis' },
    { key: 'config',     label: 'Configuration / DB Explorer' },
    { key: 'users',      label: 'User Management' },
  ];
  const ROLE_PERMS: Record<Role, string[] | 'all'> = {
    superadmin:   'all',
    admin:        ['dashboard','analytics','customers','branches','financial','risk','digital','employer','kpi','pivot','config','users'],
    manager:      ['dashboard','analytics','customers','branches','financial','risk','digital','employer','kpi','pivot'],
    analyst:      ['dashboard','analytics','branches','financial','risk','digital','kpi','pivot'],
    branch_staff: ['dashboard','branches'],
    auditor:      ['dashboard','analytics','branches','financial','risk'],
  };
  const permRows: PermRow[] = useMemo(() => PERMS.map(({ key, label }) => {
    const row = { key, label } as PermRow;
    ROLES.forEach((role) => {
      const perms = ROLE_PERMS[role];
      row[role] = perms === 'all' || perms.includes(key);
    });
    return row;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const permColumns = useMemo<ColumnDef<PermRow>[]>(() => [
    {
      accessorKey: 'label',
      header: 'Permission',
      cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
    },
    ...ROLES.map((role) => ({
      id: role,
      header: () => (
        <div className="text-center" style={{ color: roleColor(role) }}>{ROLE_LABELS[role]}</div>
      ),
      cell: ({ row }: { row: { original: PermRow } }) => (
        <div className="text-center">
          {row.original[role]
            ? <span className="text-accent-green text-[13px]">✓</span>
            : <span className="text-text-muted text-[11px]">—</span>}
        </div>
      ),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  // ── Users-list columns ──────────────────────────────────────────────────────
  const userColumns = useMemo<ColumnDef<UserRow>[]>(() => [
    {
      accessorKey: 'first_name',
      header: 'Name',
      cell: ({ row }) => {
        const u = row.original;
        const initial = (u.first_name || u.email).slice(0, 1).toUpperCase();
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
        return (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
              style={{ background: roleColor(u.role) }}
            >
              {initial}
            </div>
            <span className="font-medium text-text-primary">{name}</span>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email,
      enableSorting: true,
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <span
            className="px-2 py-0.5 rounded-full text-[9.5px] font-bold border"
            style={{ color: roleColor(u.role), borderColor: roleColor(u.role), background: `${roleColor(u.role)}15` }}
          >
            {ROLE_LABELS[u.role]}
          </span>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={row.original.is_active ? badgeColor.green : badgeColor.red}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
      enableSorting: true,
    },
    {
      id: 'branch_access',
      header: 'Branch Access',
      cell: ({ row }) =>
        row.original.role === 'branch_staff'
          ? <span className="text-accent-amber">Via user_branch_cluster</span>
          : <span>All branches</span>,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) =>
        row.original.created_at
          ? new Date(row.original.created_at).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })
          : '—',
      enableSorting: true,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-2">
            <button onClick={() => openEdit(u)} className="text-text-muted hover:text-accent-blue transition-colors" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {u.is_active && (
              <button
                onClick={() => { if (confirm(`Deactivate ${u.email}?`)) deactivateMutation.mutate(u.id); }}
                className="text-text-muted hover:text-accent-red transition-colors"
                title="Deactivate"
              >
                <UserX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [deactivateMutation]);

  return (
    <>
      <TopBar title="User Management" subtitle="Roles, permissions & branch access" showFiltersButton={false} showExportButton={false} />

      <div className="px-5 py-4 flex flex-col gap-[14px]">

        {/* Role overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {ROLES.map(role => (
            <div key={role} className="bg-bg-card border border-border rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.4px]" style={{ color: roleColor(role) }}>
                  {ROLE_LABELS[role]}
                </div>
                <div className="text-[18px] font-bold text-text-primary">{byRole[role].length}</div>
              </div>
              <div className="text-[9.5px] text-text-muted leading-tight">{ROLE_DESCRIPTIONS[role]}</div>
            </div>
          ))}
        </div>

        {/* Permissions matrix */}
        <AdvancedDataTable
          title="Role Permissions Matrix"
          subtitle="What each role can access in the system"
          data={permRows}
          columns={permColumns}
          enableFiltering={false}
          enableSorting={false}
          enablePagination={false}
        />

        {/* Users list */}
        {isLoading ? (
          <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-[11px] text-text-muted">
            Loading users…
          </div>
        ) : (
          <AdvancedDataTable
            title={`Users (${data?.users.length || 0})`}
            subtitle="Branch staff access is controlled via production user_branch_cluster table"
            data={data?.users || []}
            columns={userColumns}
            pageSize={20}
            enableFiltering={true}
            enableSorting={true}
            enablePagination={true}
            actions={
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[11px] font-semibold hover:opacity-90 transition-opacity"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add User
              </button>
            }
          />
        )}
      </div>

      {/* Create / Edit modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>

          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.4px] text-text-muted block mb-1">First Name</label>
                <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  className="w-full px-3 py-1.5 text-[11px] rounded-lg border border-border bg-bg-input outline-none focus:border-accent-blue/60 text-text-primary" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.4px] text-text-muted block mb-1">Last Name</label>
                <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  className="w-full px-3 py-1.5 text-[11px] rounded-lg border border-border bg-bg-input outline-none focus:border-accent-blue/60 text-text-primary" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.4px] text-text-muted block mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-1.5 text-[11px] rounded-lg border border-border bg-bg-input outline-none focus:border-accent-blue/60 text-text-primary" />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.4px] text-text-muted block mb-1">
                {editUser ? 'New Password (leave blank to keep)' : 'Password *'}
              </label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-1.5 text-[11px] rounded-lg border border-border bg-bg-input outline-none focus:border-accent-blue/60 text-text-primary" />
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.4px] text-text-muted block mb-1">Role *</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
                className="w-full px-3 py-1.5 text-[11px] rounded-lg border border-border bg-bg-input outline-none focus:border-accent-blue/60 text-text-primary">
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <div className="mt-1 text-[10px] text-text-muted">{ROLE_DESCRIPTIONS[form.role]}</div>
            </div>

            {form.role === 'branch_staff' && (
              <div className="rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-3 py-2 text-[10.5px] text-accent-amber">
                Branch access for this user is controlled by the production <code>user_branch_cluster</code> table (matched by user ID).
              </div>
            )}
          </div>

          <DialogFooter>
            <button onClick={() => setModalOpen(false)} className="text-[11px] text-text-muted hover:text-text-primary transition-colors">
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate({ ...form, id: editUser?.id })}
              disabled={saveMutation.isPending || !form.email}
              className="px-4 py-1.5 rounded-lg bg-accent-blue text-white text-[11px] font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saveMutation.isPending ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
