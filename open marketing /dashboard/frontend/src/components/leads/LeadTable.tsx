import React from 'react';
import {
  Phone,
  Mail,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MapPin,
} from 'lucide-react';
import { BusinessLead } from '../../types';
import {
  WebsiteStatusBadge,
  LocationStatusBadge,
  QualificationBadge,
} from '../common/Badge';

interface LeadTableProps {
  leads: BusinessLead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onLimitChange: (limit: number) => void;
  onRowClick: (lead: BusinessLead) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange: (column: string) => void;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  total,
  page,
  limit,
  totalPages,
  onPageChange,
  onLimitChange,
  onRowClick,
  sortBy,
  sortOrder,
  onSortChange,
}) => {
  const renderSortIndicator = (col: string) => {
    if (sortBy === col) {
      return <span className="ml-1 text-blue-400 font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
    }
    return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-600 group-hover:text-slate-400 inline" />;
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/80 text-slate-400 border-b border-border uppercase font-medium tracking-wider text-[11px]">
            <tr>
              <th
                onClick={() => onSortChange('businessName')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 group"
              >
                Business Name {renderSortIndicator('businessName')}
              </th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Website</th>
              <th className="py-3 px-4">Status</th>
              <th
                onClick={() => onSortChange('leadScores.websiteDevScore')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 group text-center"
              >
                Web Dev {renderSortIndicator('leadScores.websiteDevScore')}
              </th>
              <th
                onClick={() => onSortChange('leadScores.pcRepairScore')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 group text-center"
              >
                PC Rep {renderSortIndicator('leadScores.pcRepairScore')}
              </th>
              <th
                onClick={() => onSortChange('leadScores.networkingAmcScore')}
                className="py-3 px-4 cursor-pointer hover:text-slate-200 group text-center"
              >
                Net AMC {renderSortIndicator('leadScores.networkingAmcScore')}
              </th>
              <th className="py-3 px-4">Sources</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500 text-sm">
                  No matching business leads found for current filters.
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const webScore = lead.leadScores?.websiteDevScore ?? 0;
                const pcScore = lead.leadScores?.pcRepairScore ?? 0;
                const amcScore = lead.leadScores?.networkingAmcScore ?? 0;

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onRowClick(lead)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Business Name */}
                    <td className="py-3.5 px-4 font-semibold text-slate-100 group-hover:text-blue-400 transition-colors max-w-xs">
                      <div className="truncate" title={lead.businessName}>
                        {lead.businessName}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <QualificationBadge status={lead.leadScores.qualificationStatus} />
                        {lead.sourceFile && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700/60">
                            {lead.sourceFile}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-slate-300 max-w-[150px]">
                      <span className="truncate block" title={lead.category}>
                        {lead.category}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center gap-1 text-slate-200">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[120px]">{lead.area}</span>
                      </div>
                      <div className="mt-0.5">
                        <LocationStatusBadge status={lead.locationStatus} />
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        {lead.phone ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                            <Phone className="w-3 h-3" />
                            {lead.phone}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">No phone</span>
                        )}
                        {lead.email && (
                          <span className="flex items-center gap-1 text-sky-400 text-[11px] truncate max-w-[130px]">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Website */}
                    <td className="py-3.5 px-4 max-w-[160px]">
                      {lead.websiteUrl ? (
                        <a
                          href={lead.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 underline underline-offset-2 truncate"
                        >
                          <span className="truncate">{lead.rootDomain || lead.websiteUrl}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-purple-400 text-[11px] font-medium">No Website</span>
                      )}
                    </td>

                    {/* Website Status */}
                    <td className="py-3.5 px-4">
                      <WebsiteStatusBadge status={lead.websiteStatus} />
                    </td>

                    {/* Scores */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          webScore >= 70
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : webScore >= 40
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {webScore}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          pcScore >= 70
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : pcScore >= 40
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {pcScore}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          amcScore >= 70
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : amcScore >= 40
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {amcScore}
                      </span>
                    </td>

                    {/* Sources */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[130px]">
                        {lead.sources.map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-border bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Show:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>per page • Total: <strong className="text-slate-200">{total}</strong> leads</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page <strong className="text-slate-200">{page}</strong> of <strong className="text-slate-200">{totalPages}</strong>
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
