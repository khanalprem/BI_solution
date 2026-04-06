'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, UserCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Sidebar() {
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
        <div className="px-[18px] py-5 border-b border-border flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            B
          </div>
          <div>
            <div className="text-[15px] font-semibold">BankBI</div>
            <div className="text-[10px] text-text-muted">NEPAL · NPR · DEMO</div>
          </div>
        </div>
        
        <nav className="flex-1">
          <SidebarSection label="Platform">
            <NavItem href="/dashboard/executive" label="Executive Overview" icon="📊" />
          </SidebarSection>
          
          <SidebarSection label="Financial performance">
            <NavItem href="/dashboard/financial" label="Financial results" icon="📈" />
          </SidebarSection>
          
          <SidebarSection label="Banking performance">
            <NavItem href="/dashboard/branch" label="Branch & regional" icon="🏢" />
            <NavItem href="/dashboard/customer" label="Customer & portfolio" icon="👥" />
            <NavItem href="/dashboard/employer" label="Employer & payroll" icon="💼" />
            <NavItem href="/dashboard/risk" label="Loan & risk quality" icon="⚠️" badge="3" />
            <NavItem href="/dashboard/digital" label="Digital channels" icon="💻" />
          </SidebarSection>
          
          <SidebarSection label="Analysis">
            <NavItem href="/dashboard/kpi" label="KPI Tree Analysis" icon="🌳" />
            <NavItem href="/dashboard/pivot" label="Pivot Analysis" icon="⊞" />
          </SidebarSection>
          
          <SidebarSection label="Regulatory & reporting">
            <NavItem href="/dashboard/board" label="Board & governance packs" icon="📋" />
            <NavItem href="/dashboard/scheduled" label="Scheduled & regulatory runs" icon="🕐" />
          </SidebarSection>
          
          <SidebarSection label="Settings">
            <NavItem href="/dashboard/config" label="Configuration" icon="⚙️" />
            <NavItem href="/dashboard/profile" label="User Profile" icon="👤" />
          </SidebarSection>
        </nav>
        
        <div className="mt-auto border-t border-border p-3 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent-blue-dim transition-all text-left outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
              >
                <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-white text-[11px] font-semibold flex-shrink-0">
                  {userName.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{userName}</div>
                  <div className="text-[10px] text-text-muted truncate">{userRole}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
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
      <div className="text-[10px] font-semibold tracking-wider text-text-muted uppercase px-[18px] pt-4 pb-1.5">
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
  badge 
}: { 
  href: string; 
  label: string; 
  icon?: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-[18px] py-2 text-text-secondary hover:bg-accent-blue-dim hover:text-text-primary transition-all text-[13px] relative"
    >
      {icon && <span className="text-base">{icon}</span>}
      {label}
      {badge && (
        <span className="ml-auto text-[10px] font-semibold bg-accent-red-dim text-accent-red px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}
