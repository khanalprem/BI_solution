'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TopBar } from '@/components/layout/TopBar';
import { Badge, badgeColor } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
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
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-text-primary">Role Permissions Matrix</div>
              <div className="text-[10.5px] text-text-muted mt-0.5">What each role can access in the system</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="border-b border-border bg-bg-base">
                <tr>
                  <th className="px-4 py-2 text-left text-[10.5px] font-bold text-text-secondary uppercase tracking-[0.5px]">Permission</th>
                  {ROLES.map(r => (
                    <th key={r} className="px-3 py-2 text-center text-[9.5px] font-bold uppercase tracking-[0.5px]" style={{ color: roleColor(r) }}>
                      {ROLE_LABELS[r]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
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
                ].map(({ key, label }) => (
                  <tr key={key} className="hover:bg-bg-input/50">
                    <td className="px-4 py-2 text-text-secondary font-medium">{label}</td>
                    {ROLES.map(role => {
                      const perms = role === 'superadmin' ? 'all' : (
                        { admin: ['dashboard','analytics','customers','branches','financial','risk','digital','employer','kpi','pivot','config','users'],
                          manager: ['dashboard','analytics','customers','branches','financial','risk','digital','employer','kpi','pivot'],
                          analyst: ['dashboard','analytics','branches','financial','risk','digital','kpi','pivot'],
                          branch_staff: ['dashboard','branches'],
                          auditor: ['dashboard','analytics','branches','financial','risk'],
                        }[role] || []
                      );
                      const has = perms === 'all' || (perms as string[]).includes(key);
                      return (
                        <td key={role} className="px-3 py-2 text-center">
                          {has
                            ? <span className="text-accent-green text-[13px]">✓</span>
                            : <span className="text-text-muted text-[11px]">—</span>
                          }
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users list */}
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold text-text-primary">
                Users ({data?.users.length || 0})
              </div>
              <div className="text-[10.5px] text-text-muted mt-0.5">
                Branch staff access is controlled via production <code className="text-[10px]">user_branch_cluster</code> table
              </div>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-[11px] font-semibold hover:opacity-90 transition-opacity"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add User
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-[11px] text-text-muted">Loading users…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11.5px]">
                <thead className="border-b border-border bg-bg-base">
                  <tr>
                    {['Name', 'Email', 'Role', 'Status', 'Branch Access', 'Created', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10.5px] font-bold text-text-secondary uppercase tracking-[0.5px] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data?.users || []).map(user => (
                    <tr key={user.id} className="hover:bg-bg-input/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                            style={{ background: roleColor(user.role) }}>
                            {(user.first_name || user.email).slice(0, 1).toUpperCase()}
                          </div>
                          <span className="font-medium text-text-primary">
                            {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">{user.email}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold border"
                          style={{ color: roleColor(user.role), borderColor: roleColor(user.role), background: `${roleColor(user.role)}15` }}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge className={user.is_active ? badgeColor.green : badgeColor.red}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-text-muted text-[10.5px]">
                        {user.role === 'branch_staff'
                          ? <span className="text-accent-amber">Via user_branch_cluster</span>
                          : <span>All branches</span>
                        }
                      </td>
                      <td className="px-4 py-2.5 text-text-muted text-[10.5px]">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(user)} className="text-text-muted hover:text-accent-blue transition-colors" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {user.is_active && (
                            <button
                              onClick={() => { if (confirm(`Deactivate ${user.email}?`)) deactivateMutation.mutate(user.id); }}
                              className="text-text-muted hover:text-accent-red transition-colors"
                              title="Deactivate"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
