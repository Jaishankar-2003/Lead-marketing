'use client';

import React from 'react';
import { Search, RotateCcw, Download, Layers } from 'lucide-react';
import { LeadFilterParams } from '@/types/open-marketing';

interface LeadFiltersProps {
  params: LeadFilterParams;
  onChange: (updated: Partial<LeadFilterParams>) => void;
  onReset: () => void;
  onExport: () => void;
  options: {
    areas: string[];
    categories: string[];
    websiteStatuses: string[];
    qualificationStatuses: string[];
    sources: string[];
    datasetFiles?: string[];
  };
  showQualificationFilter?: boolean;
  showOpportunityFilter?: boolean;
  totalFiltered: number;
}

export const LeadFilters: React.FC<LeadFiltersProps> = ({
  params,
  onChange,
  onReset,
  onExport,
  options,
  showQualificationFilter = true,
  showOpportunityFilter = false,
  totalFiltered,
}) => {
  const hasMultipleDatasets = options.datasetFiles && options.datasetFiles.length > 1;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-4 mb-6">
      {/* Top Row: Search & Actions with Guaranteed Responsive Wrapping */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
          <input
            type="text"
            placeholder="Search business, phone, email, category..."
            value={params.search || ''}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#172033] placeholder-[#94A3B8] focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-colors"
          />
        </div>

        {/* Right actions: Record Count, Reset, Export */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-between md:justify-end">
          <span className="text-xs text-[#64748B] mr-1 whitespace-nowrap">
            Showing <strong className="text-[#172033] font-bold">{totalFiltered}</strong> records
          </span>

          <button
            onClick={onReset}
            title="Reset Filters"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#475569] hover:text-[#172033] text-xs font-medium border border-[#CBD5E1] transition-colors shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
            <span className="inline">Reset</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
        {/* Dataset File (if multiple files detected in output) */}
        {hasMultipleDatasets && (
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#4F46E5]" />
              <span>Source File</span>
            </label>
            <select
              value={params.datasetFile || 'ALL'}
              onChange={(e) => onChange({ datasetFile: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] rounded-lg text-xs focus:outline-none focus:border-[#4F46E5] focus:bg-white font-mono truncate"
            >
              <option value="ALL">All Files ({options.datasetFiles?.length})</option>
              {options.datasetFiles?.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Area */}
        <div>
          <label className="block text-[11px] font-semibold text-[#475569] mb-1">Area</label>
          <select
            value={params.area || 'ALL'}
            onChange={(e) => onChange({ area: e.target.value, page: 1 })}
            className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#172033] focus:outline-none focus:border-[#4F46E5] focus:bg-white"
          >
            <option value="ALL">All Areas</option>
            {options.areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-[11px] font-semibold text-[#475569] mb-1">Category</label>
          <select
            value={params.category || 'ALL'}
            onChange={(e) => onChange({ category: e.target.value, page: 1 })}
            className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#172033] focus:outline-none focus:border-[#4F46E5] focus:bg-white"
          >
            <option value="ALL">All Categories</option>
            {options.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Website Status */}
        <div>
          <label className="block text-[11px] font-semibold text-[#475569] mb-1">Website Status</label>
          <select
            value={params.websiteStatus || 'ALL'}
            onChange={(e) => onChange({ websiteStatus: e.target.value, page: 1 })}
            className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#172033] focus:outline-none focus:border-[#4F46E5] focus:bg-white"
          >
            <option value="ALL">All Statuses</option>
            {options.websiteStatuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Qualification Status (if on All Leads) */}
        {showQualificationFilter && (
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Qualification</label>
            <select
              value={params.qualificationStatus || 'ALL'}
              onChange={(e) => onChange({ qualificationStatus: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#172033] focus:outline-none focus:border-[#4F46E5] focus:bg-white"
            >
              <option value="ALL">All Qualifications</option>
              {options.qualificationStatuses.map((q) => (
                <option key={q} value={q}>
                  {q.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Opportunity Type (if on Qualified Leads) */}
        {showOpportunityFilter && (
          <div>
            <label className="block text-[11px] font-semibold text-[#475569] mb-1">Opportunity Type</label>
            <select
              value={params.opportunityType || 'ALL'}
              onChange={(e) => onChange({ opportunityType: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#172033] focus:outline-none focus:border-[#4F46E5] focus:bg-white"
            >
              <option value="ALL">All Opportunities</option>
              <option value="WEB_DEV">Web Design (Score ≥ 40)</option>
              <option value="PC_REPAIR">PC Repair (Score ≥ 40)</option>
              <option value="NETWORKING_AMC">Network &amp; AMC (Score ≥ 40)</option>
            </select>
          </div>
        )}

        {/* Discovery Source */}
        <div>
          <label className="block text-[11px] font-semibold text-[#475569] mb-1">Source</label>
          <select
            value={params.source || 'ALL'}
            onChange={(e) => onChange({ source: e.target.value, page: 1 })}
            className="w-full px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#172033] focus:outline-none focus:border-[#4F46E5] focus:bg-white"
          >
            <option value="ALL">All Sources</option>
            {options.sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Aligned Subrow for Checkbox Filters (Zero Overlap) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E2E8F0] text-xs text-[#475569]">
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
            Quick Contact Filters:
          </span>
          <label className="flex items-center gap-2 cursor-pointer hover:text-[#172033] transition-colors">
            <input
              type="checkbox"
              checked={params.hasPhone === true}
              onChange={(e) => onChange({ hasPhone: e.target.checked ? true : undefined, page: 1 })}
              className="w-3.5 h-3.5 rounded bg-white border-[#CBD5E1] text-[#4F46E5] focus:ring-0 focus:ring-offset-0"
            />
            <span>Has Phone</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-[#172033] transition-colors">
            <input
              type="checkbox"
              checked={params.hasEmail === true}
              onChange={(e) => onChange({ hasEmail: e.target.checked ? true : undefined, page: 1 })}
              className="w-3.5 h-3.5 rounded bg-white border-[#CBD5E1] text-[#4F46E5] focus:ring-0 focus:ring-offset-0"
            />
            <span>Has Email</span>
          </label>
        </div>

        <div className="text-[11px] text-[#64748B] font-mono">
          Page {params.page || 1} &bull; Showing max {params.limit || 25} leads
        </div>
      </div>
    </div>
  );
};
