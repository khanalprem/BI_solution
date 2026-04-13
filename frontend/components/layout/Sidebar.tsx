'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogOut, UserCircle, ChevronLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { clearAuth } from '@/lib/auth';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen: isOpenProp, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isOpenInternal, setIsOpenInternal] = useState(false);

  // Use props when provided, internal state when not
  const isOpen = isOpenProp !== undefined ? isOpenProp : isOpenInternal;
  const handleClose = onClose ?? (() => setIsOpenInternal(false));

  const [userName, setUserName] = useState('Prakash Sharma');
  const [userRole, setUserRole] = useState('Admin');

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('bankbi-sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('bankbi-sidebar-collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    // Try the full user object first (set by auth flow)
    try {
      const storedUser = localStorage.getItem('bankbi-user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email;
        setUserName(name);
        setUserRole(u.display_role || u.role || u.email);
        return;
      }
    } catch {}

    // Fallback to legacy keys
    const storedName = localStorage.getItem('bankbi-user-name');
    const storedEmail = localStorage.getItem('bankbi-user-email');
    if (storedName) setUserName(storedName);
    else if (storedEmail) setUserName(storedEmail);
    if (storedEmail) setUserRole(storedEmail);
  }, []);

  const handleSignOut = () => {
    clearAuth();
    document.cookie = 'bankbi-auth=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    window.location.assign('/signout');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[95] lg:hidden"
          onClick={handleClose}
        />
      )}

      <aside className={`
        flex flex-col
        fixed top-0 left-0 bottom-0 z-[100] overflow-y-auto
        transition-all duration-200 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${collapsed ? 'w-[56px]' : 'w-[220px]'}
        bg-bg-surface border-r border-border
      `}>

        {/* ── Brand mark ── */}
        <div className={`border-b border-border flex items-center flex-shrink-0 ${collapsed ? 'px-3 py-4 justify-center' : 'px-3 py-4 gap-3'}`}>
          {/* Logo: geometric bar-chart mark */}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #14B8A6 100%)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1" y="7" width="3" height="6" rx="0.8" fill="white" opacity="0.9" />
              <rect x="5.5" y="4" width="3" height="9" rx="0.8" fill="white" />
              <rect x="10" y="1.5" width="3" height="11.5" rx="0.8" fill="white" opacity="0.7" />
            </svg>
          </div>
          {!collapsed && (
            <div>
              <div className="font-display text-sm font-bold tracking-tight leading-none">BankBI</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-live-pulse flex-shrink-0" />
                <span className="text-2xs text-text-muted tracking-wide uppercase">Live · Nepal · NPR</span>
              </div>
            </div>
          )}
        </div>

        <TooltipProvider delayDuration={200}>
          <nav className="flex-1 py-1">
            <SidebarSection label="Platform" collapsed={collapsed}>
              <NavItem
                href="/dashboard/executive"
                label="Executive Overview"
                active={pathname === '/dashboard/executive'}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/>
                    <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
                    <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/>
                    <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3"/>
                  </svg>
                }
              />
              <NavItem
                href="/dashboard/skills"
                label="Platform Guide"
                active={pathname === '/dashboard/skills'}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M8 7v4M8 5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                }
              />
            </SidebarSection>

            <SidebarSection label="Financial" collapsed={collapsed}>
              <NavItem
                href="/dashboard/financial"
                label="Financial Results"
                active={pathname === '/dashboard/financial'}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 12l3.5-4 3 2.5L12 5l2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
              />
            </SidebarSection>

            <SidebarSection label="Banking" collapsed={collapsed}>
              <NavItem
                href="/dashboard/branch"
                label="Branch & Regional"
                active={pathname?.startsWith('/dashboard/branch') ?? false}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M2 14V7l6-5 6 5v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="6" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                }
              />
              <NavItem
                href="/dashboard/customer"
                label="Customer & Portfolio"
                active={pathname?.startsWith('/dashboard/customer') ?? false}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M14 12.5c0-1.66-1.34-3-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                }
              />
              <NavItem
                href="/dashboard/employer"
                label="Employer & Payroll"
                active={pathname === '/dashboard/employer'}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="2.5" y="4" width="11" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <path d="M6 2.5v2M10 2.5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                }
              />
              <NavItem
                href="/dashboard/risk"
                label="Loan & Risk Quality"
                active={pathname === '/dashboard/risk'}
                badge="3"
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2l1.5 3 3.5.5-2.5 2.5.6 3.5L8 10l-3.1 1.5.6-3.5L3 5.5l3.5-.5L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                }
              />
              <NavItem
                href="/dashboard/digital"
                label="Digital Channels"
                active={pathname === '/dashboard/digital'}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M5 14h6M8 12v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                }
              />
            </SidebarSection>

            <SidebarSection label="Analysis" collapsed={collapsed}>
              <NavItem
                href="/dashboard/kpi"
                label="KPI Tree"
                active={pathname === '/dashboard/kpi'}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M4 2h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M10 2v4h4M6 9h4M6 12h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                }
              />
              <NavItem
                href="/dashboard/pivot"
                label="Pivot Analysis"
                active={pathname === '/dashboard/pivot'}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                    <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
                  </svg>
                }
              />
            </SidebarSection>

            <SidebarSection label="Regulatory" collapsed={collapsed}>
              <NavItem
                href="/dashboard/board"
                label="Board & Governance"
                active={pathname === '/dashboard/board'}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                }
              />
              <NavItem
                href="/dashboard/scheduled"
                label="Scheduled Reports"
                active={pathname === '/dashboard/scheduled'}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                }
              />
            </SidebarSection>

            <SidebarSection label="Settings" collapsed={collapsed}>
              <NavItem
                href="/dashboard/config"
                label="Configuration"
                active={pathname === '/dashboard/config'}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.41 1.41M11.37 11.37l1.41 1.41M11.37 4.63l1.41-1.41M3.22 12.78l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                }
              />
              <NavItem
                href="/dashboard/users"
                label="User Management"
                active={pathname === '/dashboard/users'}
                onClick={handleClose}
                collapsed={collapsed}
                icon={
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle cx="5" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M1 13c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M11 7v4M13 9h-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                }
              />
            </SidebarSection>
          </nav>
        </TooltipProvider>

        {/* Collapse toggle */}
        <div className="px-2 pb-1 flex-shrink-0">
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-full flex items-center justify-center h-8 rounded-lg border border-border bg-bg-input text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-all duration-150"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* ── User footer ── */}
        <div className="mt-auto border-t border-border p-2.5 flex-shrink-0">
          {collapsed ? (
            <div className="flex justify-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}
                title={userName}
              >
                {userName.slice(0, 2).toUpperCase() || 'U'}
              </div>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-bg-input transition-all text-left outline-none focus-visible:ring-1 focus-visible:ring-accent-blue/50"
                >
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
                  >
                    {userName.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate leading-tight text-text-primary">{userName}</div>
                    <div className="text-[9px] text-text-muted truncate leading-tight mt-0.5">{userRole}</div>
                  </div>
                  <ChevronDown className="w-3 h-3 text-text-muted flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="start"
                side="top"
                sideOffset={8}
                className="w-[200px] z-[200]"
                style={{ zIndex: 200 }}
              >
                <div className="px-2 py-1.5 border-b border-border mb-1">
                  <div className="text-[11px] font-semibold text-text-primary truncate">{userName}</div>
                  <div className="text-[10px] text-text-muted truncate">{userRole}</div>
                </div>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer">
                    <UserCircle className="w-3.5 h-3.5" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => { e.preventDefault(); handleSignOut(); }}
                  className="flex items-center gap-2 text-accent-red focus:text-accent-red cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>
    </>
  );
}

function SidebarSection({ label, children, collapsed = false }: { label: string; children: React.ReactNode; collapsed?: boolean }) {
  return (
    <div className="mb-0.5">
      {label && !collapsed && (
        <div className="text-2xs font-bold tracking-[0.8px] text-text-muted uppercase px-4 pt-3.5 pb-1 select-none">
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  badge,
  active = false,
  onClick,
  collapsed = false,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-2.5 py-[5px] mx-1 rounded-lg transition-all duration-150 relative select-none
        ${collapsed ? 'px-0 justify-center w-10 mx-auto' : 'px-3.5'}
        ${active
          ? 'bg-accent-blue/[0.13] text-text-primary font-semibold'
          : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
        }
      `}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-accent-blue" />
      )}
      {icon && (
        <span className={`flex-shrink-0 transition-opacity ${active ? 'text-accent-blue opacity-100' : 'opacity-50'}`}>
          {icon}
        </span>
      )}
      {!collapsed && <span className="truncate text-sm">{label}</span>}
      {!collapsed && badge && (
        <span className="ml-auto text-2xs font-bold bg-accent-red/15 text-accent-red px-1.5 py-[2px] rounded-full leading-none">
          {badge}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
          {badge && <span className="ml-1 text-accent-red">({badge})</span>}
        </TooltipContent>
      </Tooltip>
    );
  }
  return link;
}
