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

export const SourcesChart: React.FC<Props> = ({ data }) => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-100">Discovery Sources Yield</h3>
        <p className="text-xs text-slate-400">Total businesses surfaced by engine</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={10}
              angle={-20}
              textAnchor="end"
              interval={0}
            />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#f8fafc',
              }}
              formatter={(value: any) => [`${value} leads`, 'Yield']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

