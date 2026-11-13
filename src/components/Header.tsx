'use client';

import { MapPin, Briefcase } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="h-16 border-b border-crm-lightGrey dark:border-crm-sky/20 bg-white/90 dark:bg-crm-navy/90 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-20 transition-colors">
      <div>
        <h1 className="text-lg font-bold text-crm-navy dark:text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-crm-indigo dark:text-crm-sky/80 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Quick status indicators */}
        <div className="hidden md:flex items-center gap-3 text-xs text-crm-indigo dark:text-crm-sky">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-crm-lightGrey/35 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20">
            <MapPin className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" />
            <span className="text-crm-navy dark:text-crm-sky font-medium">Madurai, TN</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-crm-sky/25 dark:bg-crm-navySurface border border-crm-sky/50 dark:border-crm-sky/20">
            <Briefcase className="w-3.5 h-3.5 text-crm-indigo dark:text-crm-periwinkle" />
            <span className="text-crm-navy dark:text-crm-sky font-medium">IT &amp; Web Services</span>
          </div>
        </div>

        {/* Theme Toggle (Light / Dark) */}
        <ThemeToggle />

        {action && <div>{action}</div>}
      </div>
    </header>
  );
}
