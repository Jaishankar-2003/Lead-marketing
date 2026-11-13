'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, List, AlertCircle, Target } from 'lucide-react';
import { BusinessLead, LeadFilterParams } from '@/types/open-marketing';
import { openMarketingApi } from '@/lib/open-marketing/api';
import { LeadFilters } from '@/components/open-marketing/LeadFilters';
import { QualifiedLeadCard } from '@/components/open-marketing/QualifiedLeadCard';
import { LeadTable } from '@/components/open-marketing/LeadTable';
import { LeadDetailDrawer } from '@/components/open-marketing/LeadDetailDrawer';

export default function OpenMarketingQualifiedLeadsPage() {
  const [params, setParams] = useState<LeadFilterParams>({
    page: 1,
    limit: 24,
    sortBy: 'leadScores.websiteDevScore',
    sortOrder: 'desc',
  });

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterOptions, setFilterOptions] = useState<{
    areas: string[];
    categories: string[];
    websiteStatuses: string[];
    qualificationStatuses: string[];
    sources: string[];
    datasetFiles: string[];
  }>({
    areas: [],
    categories: [],
    websiteStatuses: [],
    qualificationStatuses: [],
    sources: [],
    datasetFiles: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<BusinessLead | null>(null);

  const fetchQualifiedLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await openMarketingApi.getQualifiedLeads(params);
      setLeads(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);

      if (res.filterOptions) {
        setFilterOptions({
          areas: res.filterOptions.areas || [],
          categories: res.filterOptions.categories || [],
          websiteStatuses: res.filterOptions.websiteStatuses || [],
          qualificationStatuses: res.filterOptions.qualificationStatuses || [],
          sources: res.filterOptions.sources || [],
          datasetFiles: res.filterOptions.datasetFiles || [],
        });
      }
    } catch (err: any) {
      console.error('Failed to load qualified leads:', err);
      setError(err.message || 'Error fetching qualified leads');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchQualifiedLeads();
  }, [fetchQualifiedLeads]);

  const handleFilterChange = (updated: Partial<LeadFilterParams>) => {
    setParams((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setParams({
      page: 1,
      limit: 24,
      sortBy: 'leadScores.websiteDevScore',
      sortOrder: 'desc',
    });
  };

  const handleSortChange = (column: string) => {
    setParams((prev) => {
      const isSameCol = prev.sortBy === column;
      const newOrder = isSameCol && prev.sortOrder === 'desc' ? 'asc' : 'desc';
      return {
        ...prev,
        sortBy: column,
        sortOrder: newOrder,
        page: 1,
      };
    });
  };

  const handleExport = () => {
    const url = openMarketingApi.getExportUrl(params, true);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Controls: Filter Bar & View Mode Toggle */}
      <div className="flex flex-col gap-3">
        <LeadFilters
          params={params}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          onExport={handleExport}
          options={filterOptions}
          showQualificationFilter={false}
          showOpportunityFilter={true}
          totalFiltered={total}
        />

        {/* View Switcher & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="w-4 h-4 text-[#4F46E5] shrink-0" />
            <h2 className="text-sm font-bold text-[#172033] tracking-tight truncate">
              Commercial High-Priority Outreach Targets
            </h2>
            <span className="text-[11px] text-[#64748B] hidden lg:inline shrink-0">
              (Ranked by Web Dev, PC Repair &amp; Network AMC Viability)
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg p-1 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-[#172033] shadow-sm font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span className="text-[11px]">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-[#172033] shadow-sm font-semibold'
                  : 'text-[#64748B] hover:text-[#172033]'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5 text-[#4F46E5]" />
              <span className="text-[11px]">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button
            onClick={() => fetchQualifiedLeads()}
            className="px-3 py-1 bg-white hover:bg-[#F8FAFC] text-[#172033] rounded-lg border border-[#CBD5E1] font-semibold shrink-0 shadow-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-16 text-center shadow-sm">
          <div className="w-8 h-8 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#64748B]">Evaluating sales opportunity thresholds...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center text-[#64748B] shadow-sm">
          <p className="text-sm font-medium text-[#172033] mb-1">No qualified commercial leads found</p>
          <p className="text-xs">Try selecting "All Opportunities" or clearing the search/area filter.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Card View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.map((lead) => (
              <QualifiedLeadCard
                key={lead.id}
                lead={lead}
                onSelect={(selected) => setSelectedLead(selected)}
              />
            ))}
          </div>

          {/* Grid Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white border border-[#E2E8F0] rounded-xl text-xs text-[#64748B] shadow-sm">
            <span>
              Showing <strong className="text-[#172033] font-semibold">{leads.length}</strong> of <strong className="text-[#172033] font-semibold">{total}</strong> qualified prospects
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) - 1 }))}
                disabled={(params.page || 1) <= 1}
                className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] disabled:opacity-40 disabled:cursor-not-allowed border border-[#CBD5E1] transition-colors font-medium shadow-sm"
              >
                Previous
              </button>
              <span>
                Page <strong className="text-[#172033] font-semibold">{params.page || 1}</strong> / <strong className="text-[#172033] font-semibold">{totalPages}</strong>
              </span>
              <button
                onClick={() => setParams((p) => ({ ...p, page: (p.page || 1) + 1 }))}
                disabled={(params.page || 1) >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] disabled:opacity-40 disabled:cursor-not-allowed border border-[#CBD5E1] transition-colors font-medium shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Table View */
        <LeadTable
          leads={leads}
          total={total}
          page={params.page || 1}
          limit={params.limit || 24}
          totalPages={totalPages}
          onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
          onLimitChange={(l) => setParams((prev) => ({ ...prev, limit: l, page: 1 }))}
          onRowClick={(lead) => setSelectedLead(lead)}
          sortBy={params.sortBy}
          sortOrder={params.sortOrder}
          onSortChange={handleSortChange}
        />
      )}

      {/* Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
