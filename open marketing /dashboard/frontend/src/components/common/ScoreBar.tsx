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
    if (val >= 70) return 'bg-emerald-500';
    if (val >= 40) return 'bg-blue-500';
    if (val >= 20) return 'bg-amber-500';
    return 'bg-slate-600';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 font-medium">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-100">{score}</span>
          <span className="text-slate-500">/ {max}</span>
          {rating && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
              {rating}
            </span>
          )}
        </div>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(score)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

