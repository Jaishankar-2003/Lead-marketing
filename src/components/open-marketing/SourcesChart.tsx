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

const CRM_LIGHT_SOURCE_COLORS = [
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#0891B2', // Cyan
  '#16A34A', // Green
  '#D97706', // Amber
  '#64748B', // Slate
];

export const SourcesChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[#172033] tracking-tight">Discovery Sources Yield</h3>
        <p className="text-xs text-[#64748B]">Total businesses surfaced by engine</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 35 }}>
            <XAxis
              dataKey="name"
              stroke="#64748B"
              fontSize={11}
              angle={-20}
              textAnchor="end"
              interval={0}
              tickLine={false}
              height={40}
            />
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
              itemStyle={{ color: '#4F46E5', fontWeight: 600 }}
              formatter={(value: any) => [`${value} leads`, 'Yield']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CRM_LIGHT_SOURCE_COLORS[index % CRM_LIGHT_SOURCE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
