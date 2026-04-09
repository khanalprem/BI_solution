// Role definitions matching backend User::PERMISSIONS
export const ROLES = ['superadmin', 'admin', 'manager', 'analyst', 'branch_staff', 'auditor'] as const;
export type Role = typeof ROLES[number];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin:   'Super Admin',
  admin:        'Admin',
  manager:      'Manager',
  analyst:      'Analyst',
  branch_staff: 'Branch Staff',
  auditor:      'Auditor',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  superadmin:   'Full system access including user management and configuration',
  admin:        'All dashboards, analytics, customer data, and user management',
  manager:      'All dashboards and analytics including customer PII',
  analyst:      'Dashboards, analytics, KPI and pivot analysis — no customer PII',
  branch_staff: 'Own branch data only — scoped via user_branch_cluster',
  auditor:      'Read-only access to all financial and risk data — no PII',
};

export const ROLE_COLORS: Record<Role, string> = {
  superadmin:   'var(--accent-purple)',
  admin:        'var(--accent-blue)',
  manager:      'var(--accent-teal)',
  analyst:      'var(--accent-green)',
  branch_staff: 'var(--accent-amber)',
  auditor:      'var(--accent-red)',
};

export interface BranchAccess {
  branch_name:  string;
  sol_id:       number;
  province:     string;
  cluster_name: string;
  access_level: string;
}

export interface AuthUser {
  id:               number;
  email:            string;
  first_name:       string | null;
  last_name:        string | null;
  role:             Role;
  display_role:     string;
  permissions:      string[];
  can_see_pii:      boolean;
  branch_scoped:    boolean;
  branch_access:    BranchAccess[];
  allowed_branches: string[] | null;
  is_active:        boolean;
}

export function can(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === 'superadmin') return true;
  return user.permissions.includes(permission);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('bankbi-user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: AuthUser, token: string) {
  localStorage.setItem('bankbi-user', JSON.stringify(user));
  localStorage.setItem('token', token);
  localStorage.setItem('bankbi-user-name', `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email);
  localStorage.setItem('bankbi-user-email', user.email);
}

export function clearAuth() {
  localStorage.removeItem('bankbi-user');
  localStorage.removeItem('token');
  localStorage.removeItem('bankbi-user-name');
  localStorage.removeItem('bankbi-user-email');
}
