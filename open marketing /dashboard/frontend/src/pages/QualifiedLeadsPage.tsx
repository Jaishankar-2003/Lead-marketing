import React, { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { BusinessLead, LeadFilterParams } from '../types';
import { api } from '../services/api';
import { LeadFilters } from '../components/leads/LeadFilters';
import { QualifiedLeadCard } from '../components/leads/QualifiedLeadCard';
import { LeadTable } from '../components/leads/LeadTable';
import { LeadDetailDrawer } from '../components/leads/LeadDetailDrawer';

export const QualifiedLeadsPage: React.FC = () => {
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
  const [selectedLead, setSelectedLead] = useState<BusinessLead | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getQualifiedLeads(params);
      setLeads(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setFilterOptions({
        areas: res.filterOptions.areas,
        categories: res.filterOptions.categories,
        websiteStatuses: res.filterOptions.websiteStatuses,
        qualificationStatuses: res.filterOptions.qualificationStatuses,
        sources: res.filterOptions.sources,
        datasetFiles: res.filterOptions.datasetFiles || [],
      });
    } catch (err) {
      console.error('Failed to load qualified leads:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleExport = () => {
    const url = api.getExportUrl(params, true);
    window.open(url, '_blank');
  };

  const handleSortChange = (column: string) => {
    setParams((prev) => {
      const isSameCol = prev.sortBy === column;
      const newOrder = isSameCol && prev.sortOrder === 'desc' ? 'asc' : 'desc';
      return { ...prev, sortBy: column, sortOrder: newOrder, page: 1 };
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-card border border-emerald-500/20 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Target Outreach List
          </span>
          <h2 className="text-lg font-bold text-slate-100 mt-0.5">
            Verified High-Value Client Prospects
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Displaying leads meeting score criteria with verified contact details ready for sales outreach.
          </p>
        </div>

        {/* View Switcher: Grid vs Table */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Cards</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Filters */}
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

      {/* Content Rendering */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center text-slate-400">
          <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs">Loading qualified leads...</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leads.length === 0 ? (
              <div className="col-span-full bg-card border border-border rounded-xl p-12 text-center text-slate-500 text-sm">
                No qualified leads matched the current filter criteria.
              </div>
            ) : (
              leads.map((lead) => (
                <QualifiedLeadCard
                  key={lead.id}
                  lead={lead}
                  onSelect={(l) => setSelectedLead(l)}
                />
              ))
            )}
          </div>

          {/* Grid Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-xl text-xs text-slate-400">
              <span>Showing {leads.length} of {total} qualified prospects</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleFilterChange({ page: Math.max(1, (params.page || 1) - 1) })}
                  disabled={(params.page || 1) <= 1}
                  className="px-3 py-1.5 rounded bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-700"
                >
                  Previous
                </button>
                <span>Page {params.page || 1} of {totalPages}</span>
                <button
                  onClick={() => handleFilterChange({ page: Math.min(totalPages, (params.page || 1) + 1) })}
                  disabled={(params.page || 1) >= totalPages}
                  className="px-3 py-1.5 rounded bg-slate-800 disabled:opacity-40 text-slate-200 border border-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <LeadTable
          leads={leads}
          total={total}
          page={params.page || 1}
          limit={params.limit || 25}
          totalPages={totalPages}
          onPageChange={(p) => handleFilterChange({ page: p })}
          onLimitChange={(l) => handleFilterChange({ limit: l, page: 1 })}
          onRowClick={(lead) => setSelectedLead(lead)}
          sortBy={params.sortBy}
          sortOrder={params.sortOrder}
          onSortChange={handleSortChange}
        />
      )}

      {/* Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
};

