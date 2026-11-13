'use client';

import React from 'react';

interface ScoreBarProps {
  label: string;
  score: number;
  rating?: string;
  max?: number;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  label,
  score,
  rating,
  max = 100,
}) => {
  const percentage = Math.min(100, Math.max(0, (score / max) * 100));

  const getBarColor = (val: number) => {
    if (val >= 70) return 'bg-[#16A34A]';
    if (val >= 40) return 'bg-[#4F46E5]';
    if (val >= 20) return 'bg-[#D97706]';
    return 'bg-[#94A3B8]';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="text-[#475569] font-medium truncate">{label}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-semibold text-[#172033]">{score}</span>
          <span className="text-[#94A3B8]">/ {max}</span>
          {rating && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] font-semibold">
              {rating}
            </span>
          )}
        </div>
      </div>
      <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(score)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
