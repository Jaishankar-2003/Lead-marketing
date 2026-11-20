'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  KanbanSquare, 
  ShieldCheck,
  Compass,
  Send,
  Globe2,
  Sparkles,
  Target,
  Settings
} from 'lucide-react';

const coreNavItems = [
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

const openMarketingNavItems = [
  {
    name: 'Lead Intelligence',
    href: '/open-marketing',
    icon: Globe2,
    badge: 'Engine',
  },
  {
    name: 'Business Discovery',
    href: '/open-marketing/discovery',
    icon: Sparkles,
    badge: 'Scraper',
  },
  {
    name: 'Discovered Leads',
    href: '/open-marketing/leads',
    icon: Users,
    badge: null,
  },
  {
    name: 'Qualified Leads',
    href: '/open-marketing/qualified',
    icon: Target,
    badge: 'Sales',
  },
  {
    name: 'Settings & Sync',
    href: '/open-marketing/settings',
    icon: Settings,
    badge: null,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-crm-navy text-white border-r border-crm-sky/20 flex flex-col shrink-0 min-h-screen transition-colors">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-crm-sky/15 gap-3 shrink-0">
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
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {/* Core Marketing Workspaces */}
        <div className="space-y-1.5">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-crm-sky/70">
            Core Workspaces
          </div>
          {coreNavItems.map((item) => {
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
        </div>

        {/* Open Marketing Module */}
        <div className="space-y-1.5 pt-4 border-t border-crm-sky/15">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#A5B4FC] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#818CF8]" />
              <span>Open Marketing</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#4F46E5] text-white font-mono font-bold tracking-tight">
              LIVE HUB
            </span>
          </div>
          {openMarketingNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#4F46E5] text-white border border-[#818CF8]/50 shadow-md shadow-indigo-950/40'
                    : 'text-crm-sky/90 hover:text-white hover:bg-crm-navySurface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#818CF8]'}`} />
                  <span className={isActive ? 'font-semibold' : ''}>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    isActive
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-[#4F46E5]/20 text-[#A5B4FC] border-[#6366F1]/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Target Market Info */}
      <div className="p-4 m-3 rounded-xl bg-crm-navyDeep/70 border border-crm-sky/20 text-xs shrink-0">
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
      <div className="p-4 border-t border-crm-sky/15 text-[11px] text-crm-sky/80 flex items-center justify-between shrink-0">
        <span>PostgreSQL &bull; Express</span>
        <span className="inline-block w-2 h-2 rounded-full bg-crm-periwinkle animate-pulse" title="System Online" />
      </div>
    </aside>
  );
}
