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

const CRM_LIGHT_CHART_COLORS: Record<string, string> = {
  'Verified No Website': '#7C3AED', // Violet (Prime Lead)
  'Website Found': '#16A34A',      // Success Green
  'Needs Verification': '#D97706', // Warning Amber
  'Website Unavailable': '#94A3B8',// Muted Slate
  'Website Broken': '#DC2626',     // Danger Red
};

export const WebsiteStatusChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[#172033] tracking-tight">Website Status Distribution</h3>
        <p className="text-xs text-[#64748B]">Technical availability and verification condition</p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
            <XAxis type="number" stroke="#64748B" fontSize={11} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#64748B"
              fontSize={11}
              width={140}
              tickLine={false}
            />
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
              formatter={(value: any) => [`${value} businesses`, 'Count']}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => {
                const color = CRM_LIGHT_CHART_COLORS[entry.name] || '#4F46E5';
                return <Cell key={`bar-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
