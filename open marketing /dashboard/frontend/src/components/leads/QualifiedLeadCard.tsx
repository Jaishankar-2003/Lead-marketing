import React, { useState } from 'react';
import {
  Phone,
  Mail,
  ExternalLink,
  MapPin,
  Check,
  Copy,
  Flame,
  Globe,
  Wrench,
  Network,
} from 'lucide-react';
import { BusinessLead } from '../../types';
import { WebsiteStatusBadge, LocationStatusBadge } from '../common/Badge';

interface QualifiedLeadCardProps {
  lead: BusinessLead;
  onSelect: (lead: BusinessLead) => void;
}

export const QualifiedLeadCard: React.FC<QualifiedLeadCardProps> = ({ lead, onSelect }) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const scores = lead.leadScores;
  const webScore = scores.websiteDevScore;
  const pcScore = scores.pcRepairScore;
  const amcScore = scores.networkingAmcScore;

  // Determine top opportunity
  let topOpp = 'Web Design & Dev';
  let topScore = webScore;
  let OppIcon = Globe;
  let oppColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';

  if (pcScore > topScore) {
    topOpp = 'PC Repair & Support';
    topScore = pcScore;
    OppIcon = Wrench;
    oppColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  }
  if (amcScore > topScore) {
    topOpp = 'Network & AMC';
    topScore = amcScore;
    OppIcon = Network;
    oppColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
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

  return (
    <div
      onClick={() => onSelect(lead)}
      className="bg-card border border-border hover:border-slate-600 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group space-y-4"
    >
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${oppColor}`}>
                <OppIcon className="w-3.5 h-3.5" />
                <span>{topOpp}</span>
              </span>
              <LocationStatusBadge status={lead.locationStatus} />
              {lead.sourceFile && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700/60">
                  {lead.sourceFile}
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-400 transition-colors pt-1">
              {lead.businessName}
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <span>{lead.category}</span>
              <span>•</span>
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>{lead.area}</span>
            </p>
          </div>

          {/* Top Score Box */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
              <Flame className="w-4 h-4" />
              <span className="font-mono font-bold text-sm">{topScore}</span>
              <span className="text-[10px] text-emerald-500 font-semibold">/100</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">High Intent</span>
          </div>
        </div>

        {/* Website Status & Findings */}
        <div className="flex items-center gap-2 pt-1">
          <WebsiteStatusBadge status={lead.websiteStatus} />
          {lead.websiteUrl ? (
            <a
              href={lead.websiteUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[200px]"
            >
              <span>{lead.rootDomain || lead.websiteUrl}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          ) : (
            <span className="text-xs text-purple-300 font-medium">Prime Opportunity (No Website)</span>
          )}
        </div>
      </div>

      {/* Contact Details & Quick Actions */}
      <div className="pt-3 border-t border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        {/* Contact info pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {lead.phone ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-emerald-400 font-mono">
              <a
                href={`tel:${lead.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline flex items-center gap-1"
              >
                <Phone className="w-3 h-3" />
                <span>{lead.phone}</span>
              </a>
              <button
                onClick={(e) => handleCopy(e, lead.phone!, 'phone')}
                className="text-slate-400 hover:text-slate-200 ml-1 p-0.5"
                title="Copy phone"
              >
                {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          ) : (
            <span className="text-slate-500">No phone</span>
          )}

          {lead.email ? (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-700 text-blue-400">
              <a
                href={`mailto:${lead.email}`}
                onClick={(e) => e.stopPropagation()}
                className="hover:underline flex items-center gap-1 truncate max-w-[150px]"
                title={lead.email}
              >
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{lead.email}</span>
              </a>
              <button
                onClick={(e) => handleCopy(e, lead.email!, 'email')}
                className="text-slate-400 hover:text-slate-200 ml-1 p-0.5 flex-shrink-0"
                title="Copy email"
              >
                {copiedEmail ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          ) : null}
        </div>

        {/* View Details Button */}
        <button
          onClick={() => onSelect(lead)}
          className="text-xs font-semibold text-slate-300 hover:text-blue-400 transition-colors flex items-center gap-1"
        >
          <span>View Audit</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};

