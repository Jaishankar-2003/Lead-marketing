import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { DistributionItem } from '../../types';

interface Props {
  data: DistributionItem[];
}

export const QualificationChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-100">Lead Qualification Distribution</h3>
        <p className="text-xs text-slate-400">Pipeline breakdown by outreach readiness</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={85}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} stroke="#0f172a" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#f8fafc',
              }}
              formatter={(value: any, name: any) => [`${value} leads`, name]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

