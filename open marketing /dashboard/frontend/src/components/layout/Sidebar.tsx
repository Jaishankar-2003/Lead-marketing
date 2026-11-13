import React from 'react';
import {
  LayoutDashboard,
  Users,
  Target,
  Settings,
  Flame,
  Globe2,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'all-leads' | 'qualified-leads' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  qualifiedCount?: number;
  totalCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  qualifiedCount = 0,
  totalCount = 0,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'all-leads' as NavTab,
      label: 'All Leads',
      icon: Users,
      badge: totalCount > 0 ? String(totalCount) : undefined,
    },
    {
      id: 'qualified-leads' as NavTab,
      label: 'Qualified Leads',
      icon: Target,
      badge: qualifiedCount > 0 ? String(qualifiedCount) : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings & Sync',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col justify-between flex-shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-border">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 tracking-tight text-sm">Lead Intelligence</h1>
            <p className="text-[11px] text-slate-400">Local B2B Discovery</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      item.badgeColor || 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border">
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
            <Flame className="w-4 h-4 text-emerald-400" />
            <span>High-Value Outreach</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Prioritizes verified no-website businesses & commercial hardware prospects.
          </p>
        </div>
      </div>
    </aside>
  );
};

