'use client';

import React, { useState } from 'react';
import {
  Globe,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Flame,
  Wrench,
  Network,
  Copy,
  Check,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { BusinessLead } from '@/types/open-marketing';
import { WebsiteStatusBadge, LocationStatusBadge } from './Badge';
import EmailComposerModal, { OutreachLeadSummary } from '@/components/outreach/EmailComposerModal';
import WhatsAppModal from '@/components/outreach/WhatsAppModal';
import { openMarketingApi } from '@/lib/open-marketing/api';

interface QualifiedLeadCardProps {
  lead: BusinessLead;
  onSelect: (lead: BusinessLead) => void;
  onEmail?: (lead: BusinessLead) => void;
  onWhatsApp?: (lead: BusinessLead) => void;
}

export const QualifiedLeadCard: React.FC<QualifiedLeadCardProps> = ({
  lead,
  onSelect,
  onEmail,
  onWhatsApp,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [emailModalLead, setEmailModalLead] = useState<OutreachLeadSummary | null>(null);
  const [whatsAppModalLead, setWhatsAppModalLead] = useState<OutreachLeadSummary | null>(null);
  const [syncing, setSyncing] = useState(false);

  const scores = lead.leadScores;
  const webScore = scores.websiteDevScore;
  const pcScore = scores.pcRepairScore;
  const amcScore = scores.networkingAmcScore;

  // Differentiate opportunity types with dedicated soft pastel styles
  let topOpp = 'Web Design & Dev';
  let topScore = webScore;
  let OppIcon = Globe;
  let oppColor = 'text-[#6D28D9] bg-[#EDE9FE] border-[#DDD6FE]';

  if (pcScore > topScore) {
    topOpp = 'PC Repair & Support';
    topScore = pcScore;
    OppIcon = Wrench;
    oppColor = 'text-[#B45309] bg-[#FEF3C7] border-[#FDE68A]';
  }
  if (amcScore > topScore) {
    topOpp = 'Network & AMC';
    topScore = amcScore;
    OppIcon = Network;
    oppColor = 'text-[#0E7490] bg-[#CFFAFE] border-[#A5F3FC]';
  }

  const handleCopy = (e: React.MouseEvent, text: string, type: 'phone' | 'email') => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleOpenEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEmail) {
      onEmail(lead);
      return;
    }
    setSyncing(true);
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
      setSyncing(false);
    }
  };

  const handleOpenWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWhatsApp) {
      onWhatsApp(lead);
      return;
    }
    setSyncing(true);
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
      setSyncing(false);
    }
  };

  return (
    <>
      <div
        onClick={() => onSelect(lead)}
        className="bg-white border border-[#E2E8F0] hover:border-[#C7D2FE] rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4"
      >
        {/* Top Header */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${oppColor}`}>
                  <OppIcon className="w-3.5 h-3.5" />
                  <span>{topOpp}</span>
                </span>
                <LocationStatusBadge status={lead.locationStatus} />
                {lead.sourceFile && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] font-mono border border-[#E2E8F0] truncate max-w-[120px]">
                    {lead.sourceFile}
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-[#172033] group-hover:text-[#4F46E5] transition-colors pt-1 truncate" title={lead.businessName}>
                {lead.businessName}
              </h3>
              <p className="text-xs text-[#64748B] flex items-center gap-1 truncate">
                <span>{lead.category}</span>
                <span>&bull;</span>
                <MapPin className="w-3 h-3 text-[#4F46E5] shrink-0" />
                <span>{lead.area}</span>
              </p>
            </div>

            {/* Top Score Box */}
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1 text-[#4F46E5] bg-[#EEF2FF] border border-[#C7D2FE] px-2.5 py-1 rounded-lg">
                <Flame className="w-4 h-4 text-[#D97706]" />
                <span className="font-mono font-bold text-sm text-[#172033]">{topScore}</span>
                <span className="text-[10px] text-[#64748B] font-semibold">/100</span>
              </div>
              <span className="text-[10px] text-[#64748B] mt-0.5 font-medium">High Intent</span>
            </div>
          </div>

          {/* Website Status & Findings */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <WebsiteStatusBadge status={lead.websiteStatus} />
            {lead.websiteUrl ? (
              <a
                href={lead.websiteUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-[#4F46E5] hover:underline flex items-center gap-1 truncate max-w-[200px]"
              >
                <span>{lead.rootDomain || lead.websiteUrl}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span className="text-xs text-[#6D28D9] font-medium bg-[#EDE9FE] px-2 py-0.5 rounded border border-[#DDD6FE]">
                Prime Opportunity (No Website)
              </span>
            )}
          </div>
        </div>

        {/* Contact Details & Quick Actions (Zero Overlap Guaranteed) */}
        <div className="pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          {/* Contact info pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {lead.phone ? (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#172033] font-mono text-[11px]">
                <a
                  href={`tel:${lead.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-[#16A34A]" />
                  <span>{lead.phone}</span>
                </a>
                <button
                  onClick={(e) => handleCopy(e, lead.phone!, 'phone')}
                  className="text-[#94A3B8] hover:text-[#172033] ml-1 p-0.5"
                  title="Copy phone"
                >
                  {copiedPhone ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ) : (
              <span className="text-[#94A3B8] italic text-[11px]">No phone</span>
            )}

            {lead.email ? (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] text-[11px]">
                <a
                  href={`mailto:${lead.email}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:underline flex items-center gap-1 truncate max-w-[140px]"
                  title={lead.email}
                >
                  <Mail className="w-3 h-3 text-[#4F46E5] shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </a>
                <button
                  onClick={(e) => handleCopy(e, lead.email!, 'email')}
                  className="text-[#94A3B8] hover:text-[#172033] ml-1 p-0.5 shrink-0"
                  title="Copy email"
                >
                  {copiedEmail ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ) : null}
          </div>

          {/* Quick Actions: Email, WhatsApp & View Audit */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={handleOpenEmail}
              title={lead.email ? `Send Email to ${lead.email}` : 'Compose Email'}
              className="p-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#E0E7FF] text-[#4F46E5] border border-[#C7D2FE] transition-colors"
            >
              {syncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              title={lead.phone ? `Send WhatsApp to ${lead.phone}` : 'Send WhatsApp'}
              className="p-1.5 rounded-lg bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#15803D] border border-[#86EFAC] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onSelect(lead)}
              className="text-xs font-semibold text-[#4F46E5] group-hover:text-[#4338CA] transition-colors flex items-center gap-1 pl-1.5"
            >
              <span>View Audit</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Direct Outreach Modals */}
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
    </>
  );
};
