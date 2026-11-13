'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BusinessLead, LeadFilterParams } from '@/types/open-marketing';
import { openMarketingApi } from '@/lib/open-marketing/api';
import { LeadFilters } from '@/components/open-marketing/LeadFilters';
import { LeadTable } from '@/components/open-marketing/LeadTable';
import { LeadDetailDrawer } from '@/components/open-marketing/LeadDetailDrawer';
import { AlertCircle } from 'lucide-react';

export default function OpenMarketingAllLeadsPage() {
  const [params, setParams] = useState<LeadFilterParams>({
    page: 1,
    limit: 25,
    sortBy: 'leadScores.websiteDevScore',
    sortOrder: 'desc',
  });

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

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await openMarketingApi.getLeads(params);
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
      console.error('Failed to load Open Marketing leads:', err);
      setError(err.message || 'Error fetching leads from backend service.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleFilterChange = (updated: Partial<LeadFilterParams>) => {
    setParams((prev) => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setParams({
      page: 1,
      limit: 25,
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
    const url = openMarketingApi.getExportUrl(params, false);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Filters Bar */}
      <LeadFilters
        params={params}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        onExport={handleExport}
        options={filterOptions}
        showQualificationFilter={true}
        showOpportunityFilter={false}
        totalFiltered={total}
      />

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button
            onClick={() => fetchLeads()}
            className="px-3 py-1 bg-white hover:bg-[#F8FAFC] text-[#172033] rounded-lg border border-[#CBD5E1] font-semibold shrink-0 shadow-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {loading ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-16 text-center shadow-sm">
          <div className="w-8 h-8 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#64748B]">Querying and filtering local business directory...</p>
        </div>
      ) : (
        /* Leads Table */
        <LeadTable
          leads={leads}
          total={total}
          page={params.page || 1}
          limit={params.limit || 25}
          totalPages={totalPages}
          onPageChange={(p) => setParams((prev) => ({ ...prev, page: p }))}
          onLimitChange={(l) => setParams((prev) => ({ ...prev, limit: l, page: 1 }))}
          onRowClick={(lead) => setSelectedLead(lead)}
          sortBy={params.sortBy}
          sortOrder={params.sortOrder}
          onSortChange={handleSortChange}
        />
      )}

      {/* Lead Detail Drawer (8 Sections) */}
      <LeadDetailDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
}
