import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple' | 'cyan' | 'slate';
  badgeText?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'blue',
  badgeText,
  onClick,
}) => {
  const iconColor = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    red: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    slate: 'text-slate-400 bg-slate-800 border-slate-700',
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-slate-600 hover:bg-slate-900/60' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg border ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-100">{value}</span>
        {badgeText && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {badgeText}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-slate-400 mt-1.5 line-clamp-1">{subtext}</p>}
    </div>
  );
};

