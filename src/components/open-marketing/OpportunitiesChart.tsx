'use client';

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
import { DistributionItem } from '@/types/open-marketing';

interface Props {
  data: DistributionItem[];
}

// Dedicated opportunity colors: Web Dev (Violet), PC Repair (Orange), Network AMC (Cyan)
const OPP_LIGHT_COLORS = [
  '#7C3AED', // Violet (Web Dev)
  '#D97706', // Orange (PC Repair)
  '#0891B2', // Cyan (Network AMC)
];

export const OpportunitiesChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[#172033] tracking-tight">Commercial Opportunity Breakdown</h3>
        <p className="text-xs text-[#64748B]">Prospects meeting viability threshold (Score ≥ 40)</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#172033',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              itemStyle={{ color: '#172033', fontWeight: 600 }}
              formatter={(value: any) => [`${value} opportunities`, 'Prospects']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`opp-${index}`} fill={OPP_LIGHT_COLORS[index % OPP_LIGHT_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
