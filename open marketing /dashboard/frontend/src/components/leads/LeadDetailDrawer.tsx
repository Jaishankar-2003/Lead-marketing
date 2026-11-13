import React, { useState } from 'react';
import {
  X,
  Phone,
  Mail,
  ExternalLink,
  MapPin,
  Check,
  Copy,
  ShieldCheck,
  Smartphone,
  Gauge,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';
import { BusinessLead } from '../../types';
import {
  WebsiteStatusBadge,
  LocationStatusBadge,
  QualificationBadge,
} from '../common/Badge';
import { ScoreBar } from '../common/ScoreBar';

interface LeadDetailDrawerProps {
  lead: BusinessLead | null;
  onClose: () => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({ lead, onClose }) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  if (!lead) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const wa = lead.websiteAnalysis;
  const scores = lead.leadScores;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-card border-l border-border h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-border bg-slate-900/60 flex items-start justify-between">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <QualificationBadge status={scores.qualificationStatus} />
              <WebsiteStatusBadge status={lead.websiteStatus} />
              <LocationStatusBadge status={lead.locationStatus} />
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-1.5">
              {lead.businessName}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{lead.category}</span>
              <span>•</span>
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>{lead.area}, {lead.city}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Contact Information Card */}
          <div className="bg-slate-900/70 border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              1. Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Phone */}
              <div className="p-3 rounded-lg bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Phone Number</span>
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-xs font-semibold text-emerald-400 hover:underline font-mono"
                      >
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">N/A</span>
                    )}
                  </div>
                </div>
                {lead.phone && (
                  <button
                    onClick={() => copyToClipboard(lead.phone!, 'phone')}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
                    title="Copy Phone"
                  >
                    {copiedItem === 'phone' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="p-3 rounded-lg bg-card border border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 block">Email Address</span>
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-xs font-semibold text-blue-400 hover:underline truncate block"
                        title={lead.email}
                      >
                        {lead.email}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">N/A</span>
                    )}
                  </div>
                </div>
                {lead.email && (
                  <button
                    onClick={() => copyToClipboard(lead.email!, 'email')}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 flex-shrink-0"
                    title="Copy Email"
                  >
                    {copiedItem === 'email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Lead Scoring Tracks */}
          <div className="bg-slate-900/70 border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                2. Triple-Track Lead Scoring (0–100)
              </h3>
              <span className="text-xs text-slate-400">
                Status: <strong className="text-slate-200">{scores.qualificationStatus}</strong>
              </span>
            </div>

            <div className="space-y-3">
              <ScoreBar
                label="Website Design & Development Opportunity"
                score={scores.websiteDevScore}
                rating={scores.websiteDevRating}
              />
              <ScoreBar
                label="PC Repair & Workstation Support Opportunity"
                score={scores.pcRepairScore}
                rating={scores.pcRepairRating}
              />
              <ScoreBar
                label="Computer Networking & AMC Opportunity"
                score={scores.networkingAmcScore}
                rating={scores.networkingAmcRating}
              />
            </div>

            {scores.qualificationReason && (
              <div className="p-3 rounded-lg bg-card border border-border text-xs text-slate-300">
                <span className="font-semibold text-slate-400 block mb-1">Qualification Insights:</span>
                <p className="leading-relaxed text-slate-300">{scores.qualificationReason}</p>
              </div>
            )}
          </div>

          {/* 3. Website Audit & Technical Findings */}
          <div className="bg-slate-900/70 border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                3. Technical Website Audit
              </h3>
              {lead.websiteUrl && (
                <a
                  href={lead.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-mono"
                >
                  <span>{lead.rootDomain || 'Visit Site'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {lead.websiteUrl ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <span className="text-slate-500 block text-[11px]">HTTP Status</span>
                  <span className="font-semibold text-slate-200">
                    {wa?.statusCode ? `${wa.statusCode}` : 'N/A'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <span className="text-slate-500 block text-[11px] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> SSL / HTTPS
                  </span>
                  <span className={`font-semibold ${wa?.hasHttps ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {wa ? (wa.hasHttps ? 'Secure' : 'Insecure') : 'N/A'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <span className="text-slate-500 block text-[11px] flex items-center gap-1">
                    <Smartphone className="w-3 h-3" /> Mobile Viewport
                  </span>
                  <span className={`font-semibold ${wa?.isMobileFriendly ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {wa ? (wa.isMobileFriendly ? 'Responsive' : 'Non-Responsive') : 'N/A'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-card border border-border">
                  <span className="text-slate-500 block text-[11px] flex items-center gap-1">
                    <Gauge className="w-3 h-3" /> Response Time
                  </span>
                  <span className="font-semibold text-slate-200">
                    {wa?.responseTimeMs ? `${wa.responseTimeMs} ms` : 'N/A'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                🏢 Business has no verified website recorded on Google Maps or Justdial.
                <br />
                <span className="font-semibold">Action: Prime prospect for a new custom business website.</span>
              </div>
            )}

            {/* Improvement Opportunities */}
            {wa?.improvementOpportunities && wa.improvementOpportunities.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1.5 text-xs text-rose-300">
                <span className="font-semibold block flex items-center gap-1.5 text-rose-400">
                  <AlertCircle className="w-4 h-4" /> Detected Optimization Deficiencies:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {wa.improvementOpportunities.map((opp, idx) => (
                    <li key={idx}>{opp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 4. Location & Map Details */}
          <div className="bg-slate-900/70 border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              4. Geographical Verification
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Full Discovered Address:</span>
                  <span className="text-slate-200 font-medium">{lead.address || 'N/A'}</span>
                </div>
                <LocationStatusBadge status={lead.locationStatus} />
              </div>

              {lead.googleMapsUrl && (
                <div className="pt-2">
                  <a
                    href={lead.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs border border-slate-700 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>View on Google Maps</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* 5. Social Presence & Sources */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Social Links */}
            <div className="bg-slate-900/70 border border-border rounded-xl p-4 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                5. Social Profiles
              </h3>
              <div className="space-y-1.5 text-xs">
                {lead.socialLinks?.facebook && (
                  <a href={lead.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 truncate">
                    Facebook <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {lead.socialLinks?.instagram && (
                  <a href={lead.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-pink-400 hover:underline flex items-center gap-1 truncate">
                    Instagram <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {lead.socialLinks?.linkedin && (
                  <a href={lead.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline flex items-center gap-1 truncate">
                    LinkedIn <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {!lead.socialLinks?.facebook && !lead.socialLinks?.instagram && !lead.socialLinks?.linkedin && (
                  <span className="text-slate-500 italic">No social links detected</span>
                )}
              </div>
            </div>

            {/* Discovery Sources */}
            <div className="bg-slate-900/70 border border-border rounded-xl p-4 space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                6. Contributing Discovery Engines
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {lead.sources.map((s, idx) => (
                  <span key={idx} className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700">
                    {s}
                  </span>
                ))}
              </div>
              {lead.sourceFile && (
                <div className="pt-1 text-xs text-slate-400">
                  <span className="text-[11px] text-slate-500 block">Dataset Source File:</span>
                  <span className="font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 inline-block mt-0.5">
                    {lead.sourceFile}
                  </span>
                </div>
              )}
              <p className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
                <Calendar className="w-3 h-3" />
                <span>Harvested: {new Date(lead.collectedAt).toLocaleDateString()}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

