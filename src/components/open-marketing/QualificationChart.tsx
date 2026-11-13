'use client';

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { DistributionItem } from '@/types/open-marketing';

interface Props {
  data: DistributionItem[];
}

const QUAL_LIGHT_COLORS: Record<string, string> = {
  Qualified: '#16A34A',          // Green
  'Needs Verification': '#D97706', // Amber
  Unqualified: '#94A3B8',        // Neutral Slate
};

export const QualificationChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[#172033] tracking-tight">Lead Qualification Distribution</h3>
        <p className="text-xs text-[#64748B]">Pipeline breakdown by outreach readiness</p>
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
              {data.map((entry, index) => {
                const color = QUAL_LIGHT_COLORS[entry.name] || '#4F46E5';
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                );
              })}
            </Pie>
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
              formatter={(value: any, name: any) => [`${value} leads`, name]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-xs text-[#64748B] font-medium">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
