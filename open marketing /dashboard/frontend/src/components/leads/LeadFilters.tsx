import React from 'react';
import { Search, RotateCcw, Download, Layers } from 'lucide-react';
import { LeadFilterParams } from '../../types';

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
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3 mb-6">
      {/* Top Row: Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search business, phone, email, category..."
            value={params.search || ''}
            onChange={(e) => onChange({ search: e.target.value, page: 1 })}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Right actions: Record Count, Reset, Export */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400 mr-2">
            Showing <strong className="text-slate-200">{totalFiltered}</strong> records
          </span>

          <button
            onClick={onReset}
            title="Reset Filters"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-1">
        {/* Dataset File (if multiple files detected in output) */}
        {hasMultipleDatasets && (
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-blue-400" />
              <span>Source File</span>
            </label>
            <select
              value={params.datasetFile || 'ALL'}
              onChange={(e) => onChange({ datasetFile: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-blue-500/40 text-blue-300 rounded-lg text-xs focus:outline-none focus:border-blue-500 font-mono truncate"
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
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Area</label>
          <select
            value={params.area || 'ALL'}
            onChange={(e) => onChange({ area: e.target.value, page: 1 })}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Category</label>
          <select
            value={params.category || 'ALL'}
            onChange={(e) => onChange({ category: e.target.value, page: 1 })}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Website Status</label>
          <select
            value={params.websiteStatus || 'ALL'}
            onChange={(e) => onChange({ websiteStatus: e.target.value, page: 1 })}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Qualification</label>
            <select
              value={params.qualificationStatus || 'ALL'}
              onChange={(e) => onChange({ qualificationStatus: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Opportunity Type</label>
            <select
              value={params.opportunityType || 'ALL'}
              onChange={(e) => onChange({ opportunityType: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Opportunities</option>
              <option value="WEB_DEV">Web Design (Score ≥ 40)</option>
              <option value="PC_REPAIR">PC Repair (Score ≥ 40)</option>
              <option value="NETWORKING_AMC">Network & AMC (Score ≥ 40)</option>
            </select>
          </div>
        )}

        {/* Discovery Source */}
        <div>
          <label className="block text-[11px] font-medium text-slate-400 mb-1">Source</label>
          <select
            value={params.source || 'ALL'}
            onChange={(e) => onChange({ source: e.target.value, page: 1 })}
            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Sources</option>
            {options.sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>

        {/* Contact Filters */}
        <div className="flex items-center gap-3 self-end pb-1.5">
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={params.hasPhone === true}
              onChange={(e) => onChange({ hasPhone: e.target.checked ? true : undefined, page: 1 })}
              className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
            />
            <span>Has Phone</span>
          </label>
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={params.hasEmail === true}
              onChange={(e) => onChange({ hasEmail: e.target.checked ? true : undefined, page: 1 })}
              className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
            />
            <span>Has Email</span>
          </label>
        </div>
      </div>
    </div>
  );
};
