'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState('Prakash Sharma');
  const [userRole, setUserRole] = useState('Admin');

  useEffect(() => {
    const storedName = localStorage.getItem('bankbi-user-name');
    const storedEmail = localStorage.getItem('bankbi-user-email');
    if (storedName) {
      setUserName(storedName);
    } else if (storedEmail) {
      setUserName(storedEmail);
    }
    if (storedEmail) {
      setUserRole(storedEmail);
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('bankbi-user-email');
    localStorage.removeItem('bankbi-user-name');
    document.cookie = 'bankbi-auth=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    window.location.assign('/signout');
  };
  
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/45 z-[95] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <aside className={`
        w-[220px] bg-bg-surface border-r border-border flex flex-col
        fixed top-0 left-0 bottom-0 z-[100] overflow-y-auto
        transition-transform lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="px-4 py-4 border-b border-border flex items-center gap-3 flex-shrink-0">
          <div className="w-7 h-7 bg-accent-blue rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            B
          </div>
          <div>
            <div className="text-[13px] font-semibold">BankBI</div>
            <div className="text-[9px] text-text-muted tracking-wide uppercase">Nepal · NPR · Production</div>
          </div>
        </div>
        
        <nav className="flex-1">
          <SidebarSection label="Platform">
            <NavItem href="/dashboard/executive" label="Executive Overview" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".3"/></svg>} active={pathname === '/dashboard/executive'} />
          </SidebarSection>

          <SidebarSection label="Financial performance">
            <NavItem href="/dashboard/financial" label="Financial results" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 12l3.5-4 3 2.5L12 5l2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>} active={pathname === '/dashboard/financial'} />
          </SidebarSection>

          <SidebarSection label="Banking performance">
            <NavItem href="/dashboard/branch" label="Branch & regional" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 14V7l6-5 6 5v7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><rect x="6" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>} active={pathname?.startsWith('/dashboard/branch') ?? false} />
            <NavItem href="/dashboard/customer" label="Customer & portfolio" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M14 12.5c0-1.66-1.34-3-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>} active={pathname?.startsWith('/dashboard/customer') ?? false} />
            <NavItem href="/dashboard/employer" label="Employer & payroll" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="4" width="11" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M6 2.5v2M10 2.5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>} active={pathname === '/dashboard/employer'} />
            <NavItem href="/dashboard/risk" label="Loan & risk quality" badge="3" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3 3.5.5-2.5 2.5.6 3.5L8 10l-3.1 1.5.6-3.5L3 5.5l3.5-.5L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>} active={pathname === '/dashboard/risk'} />
            <NavItem href="/dashboard/digital" label="Digital channels" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 14h6M8 12v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>} active={pathname === '/dashboard/digital'} />
          </SidebarSection>

          <SidebarSection label="Analysis">
            <NavItem href="/dashboard/kpi" label="KPI Tree Analysis" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 2h6l4 4v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4"/><path d="M10 2v4h4M6 9h4M6 12h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>} active={pathname === '/dashboard/kpi'} />
            <NavItem href="/dashboard/pivot" label="Pivot Analysis" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>} active={pathname === '/dashboard/pivot'} />
          </SidebarSection>

          <SidebarSection label="Regulatory & reporting">
            <NavItem href="/dashboard/board" label="Board & governance" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>} active={pathname === '/dashboard/board'} />
            <NavItem href="/dashboard/scheduled" label="Scheduled reports" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>} active={pathname === '/dashboard/scheduled'} />
          </SidebarSection>

          <SidebarSection label="Settings">
            <NavItem href="/dashboard/config" label="Configuration" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.41 1.41M11.37 11.37l1.41 1.41M11.37 4.63l1.41-1.41M3.22 12.78l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>} active={pathname === '/dashboard/config'} />
            <NavItem href="/dashboard/profile" label="User Profile" icon={<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>} active={pathname === '/dashboard/profile'} />
          </SidebarSection>
        </nav>
        
        <div className="mt-auto border-t border-border p-2.5 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent-blue-dim transition-all text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0">
                  {userName.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate">{userName}</div>
                  <div className="text-[9px] text-text-muted truncate">{userRole}</div>
                </div>
                <ChevronDown className="w-3 h-3 text-text-muted" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" side="top" className="w-[180px]">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="flex items-center gap-2">
                  <UserCircle className="w-3.5 h-3.5" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  handleSignOut();
                }}
                className="flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] font-semibold tracking-widest text-text-muted uppercase px-4 pt-3.5 pb-1">
        {label}
      </div>
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
}: { 
  href: string; 
  label: string; 
  icon?: React.ReactNode;
  badge?: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-4 py-1.5 transition-all text-[12px] relative ${
        active
          ? 'bg-accent-blue-dim text-text-primary font-medium border-r-2 border-accent-blue'
          : 'text-text-secondary hover:bg-accent-blue-dim hover:text-text-primary'
      }`}
    >
      {icon && <span className="flex-shrink-0 opacity-75">{icon}</span>}
      {label}
      {badge && (
        <span className="ml-auto text-[9px] font-semibold bg-accent-red-dim text-accent-red px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}
