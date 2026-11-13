'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  Users,
  Target,
  Settings,
} from 'lucide-react';

interface SubnavProps {
  totalCount?: number;
  qualifiedCount?: number;
}

export const OpenMarketingSubnav: React.FC<SubnavProps> = ({
  totalCount = 0,
  qualifiedCount = 0,
}) => {
  const pathname = usePathname();

  const tabs = [
    {
      label: 'Overview',
      href: '/open-marketing',
      icon: LayoutDashboard,
      badge: null,
      exact: true,
    },
    {
      label: 'Business Discovery',
      href: '/open-marketing/discovery',
      icon: Compass,
      badge: 'Runner',
      badgeColor: 'bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]',
      exact: false,
    },
    {
      label: 'All Leads',
      href: '/open-marketing/leads',
      icon: Users,
      badge: totalCount > 0 ? String(totalCount) : null,
      badgeColor: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
      exact: false,
    },
    {
      label: 'Qualified Leads',
      href: '/open-marketing/qualified',
      icon: Target,
      badge: qualifiedCount > 0 ? String(qualifiedCount) : null,
      badgeColor: 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]',
      exact: false,
    },
    {
      label: 'Settings & Sync',
      href: '/open-marketing/settings',
      icon: Settings,
      badge: null,
      exact: false,
    },
  ];

  return (
    <div className="border-b border-[#E2E8F0] bg-white px-6 lg:px-8 py-2.5 flex items-center gap-2 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-[#4F46E5] text-white shadow-sm font-semibold'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9]'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold border ${
                  tab.badgeColor || 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
};
