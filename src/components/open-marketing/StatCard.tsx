'use client';

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
  // Premium CRM Light Mode Accents
  const iconColor = {
    blue: 'text-[#4F46E5] bg-[#EEF2FF] border-[#C7D2FE]',
    emerald: 'text-[#16A34A] bg-[#DCFCE7] border-[#BBF7D0]',
    purple: 'text-[#7C3AED] bg-[#EDE9FE] border-[#DDD6FE]',
    amber: 'text-[#D97706] bg-[#FEF3C7] border-[#FDE68A]',
    cyan: 'text-[#0891B2] bg-[#CFFAFE] border-[#A5F3FC]',
    red: 'text-[#DC2626] bg-[#FEE2E2] border-[#FECACA]',
    slate: 'text-[#475569] bg-[#F1F5F9] border-[#E2E8F0]',
  }[variant];

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex flex-col justify-between transition-all min-h-[110px] ${
        onClick ? 'cursor-pointer hover:border-[#CBD5E1] hover:shadow-md hover:bg-[#FAFAFA]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider truncate">
          {title}
        </span>
        <div className={`p-1.5 rounded-lg border shrink-0 ${iconColor}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mt-auto">
        <span className="text-2xl font-black text-[#172033] tracking-tight">{value}</span>
        {badgeText && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] font-semibold shrink-0">
            {badgeText}
          </span>
        )}
      </div>

      {subtext && <p className="text-[11px] text-[#94A3B8] mt-1 line-clamp-1">{subtext}</p>}
    </div>
  );
};
