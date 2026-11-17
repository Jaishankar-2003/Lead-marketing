'use client';

import React, { useState } from 'react';
import {
  Phone,
  Mail,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  MapPin,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { BusinessLead } from '@/types/open-marketing';
import {
  WebsiteStatusBadge,
  QualificationBadge,
} from './Badge';
import EmailComposerModal, { OutreachLeadSummary } from '@/components/outreach/EmailComposerModal';
import WhatsAppModal from '@/components/outreach/WhatsAppModal';
import { openMarketingApi } from '@/lib/open-marketing/api';

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
  onEmail?: (lead: BusinessLead) => void;
  onWhatsApp?: (lead: BusinessLead) => void;
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
  onEmail,
  onWhatsApp,
}) => {
  const [emailModalLead, setEmailModalLead] = useState<OutreachLeadSummary | null>(null);
  const [whatsAppModalLead, setWhatsAppModalLead] = useState<OutreachLeadSummary | null>(null);
  const [syncingLeadId, setSyncingLeadId] = useState<string | null>(null);

  const handleOpenEmail = async (e: React.MouseEvent, lead: BusinessLead) => {
    e.stopPropagation();
    if (onEmail) {
      onEmail(lead);
      return;
    }
    setSyncingLeadId(lead.id);
    try {
      const syncRes = await openMarketingApi.syncLeadWithCrm(lead);
      if (syncRes.success && syncRes.lead) {
        setEmailModalLead(syncRes.lead);
      } else {
        setEmailModalLead({
          id: 'temp',
          businessName: lead.businessName,
          category: lead.category,
          city: lead.city,
          website: lead.websiteUrl,
          email: lead.email,
          phone: lead.phone,
          serviceProspect: null,
          doNotContact: false,
        });
      }
    } catch {
      setEmailModalLead({
        id: 'temp',
        businessName: lead.businessName,
        category: lead.category,
        city: lead.city,
        website: lead.websiteUrl,
        email: lead.email,
        phone: lead.phone,
        serviceProspect: null,
        doNotContact: false,
      });
    } finally {
      setSyncingLeadId(null);
    }
  };

  const handleOpenWhatsApp = async (e: React.MouseEvent, lead: BusinessLead) => {
    e.stopPropagation();
    if (onWhatsApp) {
      onWhatsApp(lead);
      return;
    }
    setSyncingLeadId(lead.id);
    try {
      const syncRes = await openMarketingApi.syncLeadWithCrm(lead);
      if (syncRes.success && syncRes.lead) {
        setWhatsAppModalLead(syncRes.lead);
      } else {
        setWhatsAppModalLead({
          id: 'temp',
          businessName: lead.businessName,
          category: lead.category,
          city: lead.city,
          website: lead.websiteUrl,
          email: lead.email,
          phone: lead.phone,
          serviceProspect: null,
          doNotContact: false,
        });
      }
    } catch {
      setWhatsAppModalLead({
        id: 'temp',
        businessName: lead.businessName,
        category: lead.category,
        city: lead.city,
        website: lead.websiteUrl,
        email: lead.email,
        phone: lead.phone,
        serviceProspect: null,
        doNotContact: false,
      });
    } finally {
      setSyncingLeadId(null);
    }
  };

  const renderSortIndicator = (col: string) => {
    if (sortBy === col) {
      return <span className="ml-1 text-[#4F46E5] font-bold">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
    }
    return <ArrowUpDown className="w-3 h-3 ml-1 text-[#94A3B8] group-hover:text-[#475569] inline shrink-0" />;
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-xs text-[#172033] divide-y divide-[#E2E8F0]">
          <thead className="bg-[#F8FAFC] text-[#475569] uppercase font-semibold tracking-wider text-[11px] border-b border-[#E2E8F0] select-none">
            <tr>
              <th
                onClick={() => onSortChange('businessName')}
                className="py-3 px-4 cursor-pointer hover:text-[#172033] group min-w-[210px]"
              >
                <div className="flex items-center gap-1">
                  <span>Business Name</span>
                  {renderSortIndicator('businessName')}
                </div>
              </th>
              <th className="py-3 px-4 min-w-[130px]">Category</th>
              <th className="py-3 px-4 min-w-[130px]">Location</th>
              <th className="py-3 px-4 min-w-[150px]">Contact</th>
              <th className="py-3 px-4 min-w-[140px]">Website</th>
              <th className="py-3 px-4 min-w-[125px]">Status</th>
              <th
                onClick={() => onSortChange('leadScores.websiteDevScore')}
                className="py-3 px-3 cursor-pointer hover:text-[#172033] group text-center min-w-[80px]"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Web Dev</span>
                  {renderSortIndicator('leadScores.websiteDevScore')}
                </div>
              </th>
              <th
                onClick={() => onSortChange('leadScores.pcRepairScore')}
                className="py-3 px-3 cursor-pointer hover:text-[#172033] group text-center min-w-[80px]"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>PC Rep</span>
                  {renderSortIndicator('leadScores.pcRepairScore')}
                </div>
              </th>
              <th
                onClick={() => onSortChange('leadScores.networkingAmcScore')}
                className="py-3 px-3 cursor-pointer hover:text-[#172033] group text-center min-w-[85px]"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Net AMC</span>
                  {renderSortIndicator('leadScores.networkingAmcScore')}
                </div>
              </th>
              <th className="py-3 px-4 min-w-[110px]">Sources</th>
              <th className="py-3 px-3 min-w-[90px] text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-[#94A3B8] text-sm">
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
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                  >
                    {/* Business Name */}
                    <td className="py-3.5 px-4 font-semibold text-[#172033] group-hover:text-[#4F46E5] transition-colors">
                      <div className="truncate max-w-[220px]" title={lead.businessName}>
                        {lead.businessName}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <QualificationBadge status={lead.leadScores.qualificationStatus} />
                        {lead.sourceFiles && lead.sourceFiles.length > 1 ? (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#EEF2FF] text-[#4F46E5] font-semibold border border-[#C7D2FE] cursor-help"
                            title={`Found across ${lead.sourceFiles.length} files: ${lead.sourceFiles.join(', ')}`}
                          >
                            {lead.sourceFiles.length} files
                          </span>
                        ) : lead.sourceFile ? (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] font-mono border border-[#E2E8F0] truncate max-w-[130px]"
                            title={lead.sourceFile}
                          >
                            {lead.sourceFile}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-[#64748B]">
                      <div className="truncate max-w-[130px]" title={lead.category}>
                        {lead.category}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-[#172033]">
                        <MapPin className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                        <span className="truncate max-w-[120px] font-medium">{lead.area}</span>
                      </div>
                      <span className="text-[11px] text-[#64748B] block mt-0.5">{lead.city}</span>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {lead.phone ? (
                          <div className="flex items-center gap-1.5 text-[#172033] font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-[#16A34A] shrink-0" />
                            <span className="truncate">{lead.phone}</span>
                          </div>
                        ) : null}
                        {lead.email ? (
                          <div className="flex items-center gap-1.5 text-[#475569] text-[11px]" title={lead.email}>
                            <Mail className="w-3 h-3 text-[#4F46E5] shrink-0" />
                            <span className="truncate max-w-[130px]">{lead.email}</span>
                          </div>
                        ) : null}
                        {!lead.phone && !lead.email && <span className="text-[#94A3B8] italic">None</span>}
                      </div>
                    </td>

                    {/* Website */}
                    <td className="py-3.5 px-4">
                      {lead.websiteUrl ? (
                        <a
                          href={lead.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#4F46E5] hover:underline flex items-center gap-1 truncate max-w-[130px]"
                          title={lead.websiteUrl}
                        >
                          <span className="truncate">{lead.rootDomain || lead.websiteUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-[#6D28D9] bg-[#EDE9FE] px-1.5 py-0.5 rounded text-[10px] font-semibold border border-[#DDD6FE]">
                          No Website
                        </span>
                      )}
                    </td>

                    {/* Website Status */}
                    <td className="py-3.5 px-4">
                      <WebsiteStatusBadge status={lead.websiteStatus} />
                    </td>

                    {/* Scores */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] inline-block ${
                          webScore >= 70
                            ? 'bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]'
                            : webScore >= 40
                            ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]'
                            : 'bg-[#F1F5F9] text-[#94A3B8]'
                        }`}
                      >
                        {webScore}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] inline-block ${
                          pcScore >= 70
                            ? 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                            : pcScore >= 40
                            ? 'bg-[#FFEDD5] text-[#C2410C] border border-[#FED7AA]'
                            : 'bg-[#F1F5F9] text-[#94A3B8]'
                        }`}
                      >
                        {pcScore}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] inline-block ${
                          amcScore >= 70
                            ? 'bg-[#CFFAFE] text-[#0E7490] border border-[#A5F3FC]'
                            : amcScore >= 40
                            ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]'
                            : 'bg-[#F1F5F9] text-[#94A3B8]'
                        }`}
                      >
                        {amcScore}
                      </span>
                    </td>

                    {/* Sources */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[120px]">
                        {lead.sources.map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.2 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] font-mono"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Quick Outreach Actions */}
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEmail(e, lead)}
                          title={lead.email ? `Send Email to ${lead.email}` : 'Compose Email'}
                          className="p-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] border border-[#C7D2FE] transition-colors"
                        >
                          {syncingLeadId === lead.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleOpenWhatsApp(e, lead)}
                          title={lead.phone ? `Send WhatsApp to ${lead.phone}` : 'Send WhatsApp'}
                          className="p-1.5 rounded-lg bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#15803D] border border-[#86EFAC] transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
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
      <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B]">
        <div className="flex items-center gap-2">
          <span>Show:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="px-2.5 py-1 bg-white border border-[#CBD5E1] rounded text-[#172033] text-xs focus:outline-none focus:border-[#4F46E5]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>per page &bull; Total: <strong className="text-[#172033] font-bold">{total}</strong> leads</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed text-[#172033] border border-[#CBD5E1] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page <strong className="text-[#172033] font-bold">{page}</strong> of <strong className="text-[#172033] font-bold">{totalPages}</strong>
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg bg-white hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed text-[#172033] border border-[#CBD5E1] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Outreach Modals */}
      {emailModalLead && (
        <EmailComposerModal
          lead={emailModalLead}
          isOpen={Boolean(emailModalLead)}
          onClose={() => setEmailModalLead(null)}
          onSent={() => setEmailModalLead(null)}
        />
      )}

      {whatsAppModalLead && (
        <WhatsAppModal
          lead={whatsAppModalLead}
          isOpen={Boolean(whatsAppModalLead)}
          onClose={() => setWhatsAppModalLead(null)}
          onUpdated={() => setWhatsAppModalLead(null)}
        />
      )}
    </div>
  );
};
