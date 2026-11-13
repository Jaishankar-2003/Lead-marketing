import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DistributionItem } from '../../types';

interface Props {
  data: DistributionItem[];
}

export const OpportunitiesChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-100">Commercial Opportunity Breakdown</h3>
        <p className="text-xs text-slate-400">Prospects meeting viability threshold (Score ≥ 40)</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#f8fafc',
              }}
              formatter={(value: any) => [`${value} opportunities`, 'Prospects']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`opp-${index}`} fill={entry.color || '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

