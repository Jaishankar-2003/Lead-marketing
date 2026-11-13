'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('leadpilot-theme');
    if (stored === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('leadpilot-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('leadpilot-theme', 'light');
    }
  };

  if (!mounted) {
    return <div className="w-8 h-8" />;
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="p-2 rounded-xl bg-crm-lightGrey/40 hover:bg-crm-sky/40 dark:bg-crm-navySurface dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky transition-colors border border-crm-lightGrey dark:border-crm-sky/25 shadow-sm focus:outline-none focus:ring-2 focus:ring-crm-periwinkle"
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-4 h-4 text-crm-coral" /> : <Moon className="w-4 h-4 text-crm-blue" />}
    </button>
  );
}
