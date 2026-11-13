'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  KanbanSquare, 
  ShieldCheck,
  Compass,
  Send
} from 'lucide-react';

const navItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Lead Discovery',
    href: '/discovery',
    icon: Compass,
    badge: 'Playwright',
  },
  {
    name: 'All Leads',
    href: '/leads',
    icon: Users,
    badge: null,
  },
  {
    name: 'CRM Pipeline',
    href: '/pipeline',
    icon: KanbanSquare,
    badge: null,
  },
  {
    name: 'Outreach Hub',
    href: '/outreach',
    icon: Send,
    badge: null,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-crm-navy text-white border-r border-crm-sky/20 flex flex-col shrink-0 min-h-screen transition-colors">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-crm-sky/15 gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-crm-blue via-crm-periwinkle to-crm-indigo flex items-center justify-center shadow-lg shadow-crm-blue/30 text-white font-black text-lg">
          LP
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            LeadPilot
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-crm-blue/30 text-crm-sky border border-crm-periwinkle/30">
              CRM
            </span>
          </span>
          <p className="text-[11px] text-crm-sky/80">Freelance Growth Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-crm-sky/70">
          Core Workspaces
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-crm-blue text-white border border-crm-periwinkle/40 shadow-sm'
                  : 'text-crm-sky/85 hover:text-white hover:bg-crm-navySurface'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-crm-sky' : 'text-crm-periwinkle/80'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                  isActive
                    ? 'bg-crm-navy/60 text-crm-sky border-crm-sky/30'
                    : 'bg-crm-navySurface text-crm-sky border-crm-sky/20'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Target Market Info */}
      <div className="p-4 m-3 rounded-xl bg-crm-navyDeep/70 border border-crm-sky/20 text-xs">
        <div className="flex items-center gap-2 text-white font-semibold mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-crm-periwinkle" />
          <span>Local Engine</span>
        </div>
        <p className="text-crm-sky/80 text-[11px] leading-relaxed">
          Target: <strong className="text-white">Madurai, TN</strong>
          <br />
          Services: <span className="text-crm-periwinkle font-medium">PC Repair</span> &amp; <span className="text-crm-periwinkle font-medium">Web Dev</span>
        </p>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-crm-sky/15 text-[11px] text-crm-sky/80 flex items-center justify-between">
        <span>PostgreSQL &bull; Prisma</span>
        <span className="inline-block w-2 h-2 rounded-full bg-crm-periwinkle animate-pulse" title="System Online" />
      </div>
    </aside>
  );
}
