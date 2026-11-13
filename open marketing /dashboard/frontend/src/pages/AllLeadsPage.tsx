import React, { useState, useEffect, useCallback } from 'react';
import { BusinessLead, LeadFilterParams } from '../types';
import { api } from '../services/api';
import { LeadFilters } from '../components/leads/LeadFilters';
import { LeadTable } from '../components/leads/LeadTable';
import { LeadDetailDrawer } from '../components/leads/LeadDetailDrawer';

export const AllLeadsPage: React.FC = () => {
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
  const [selectedLead, setSelectedLead] = useState<BusinessLead | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLeads(params);
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
      console.error('Failed to load all leads:', err);
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
      limit: 25,
      sortBy: 'leadScores.websiteDevScore',
      sortOrder: 'desc',
    });
  };

  const handleExport = () => {
    const url = api.getExportUrl(params, false);
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
      {/* Filters Header */}
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

      {/* Table */}
      {loading ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center text-slate-400">
          <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs">Loading leads database...</p>
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

      {/* Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </div>
  );
};

