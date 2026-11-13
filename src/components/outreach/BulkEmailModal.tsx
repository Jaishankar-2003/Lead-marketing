'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  X,
  Mail,
  Users,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Play,
  Pause,
  Square,
  Send,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Settings,
} from 'lucide-react';
import { SUPPORTED_PLACEHOLDERS } from '@/lib/outreach-utils';

interface AuditEmailData {
  summary: {
    selectedCount: number;
    eligibleCount: number;
    finalRecipientCount: number;
    missingCount: number;
    duplicateCount: number;
    invalidCount: number;
    optedOutCount: number;
  };
  eligible: Array<{
    leadId: string;
    businessName: string;
    city: string | null;
    email: string;
    excluded: boolean;
  }>;
  missingEmail: Array<{ leadId: string; businessName: string; city: string | null }>;
  duplicateEmails: Array<{ leadId: string; businessName: string; email: string }>;
  invalidEmails: Array<{ leadId: string; businessName: string; rawValues: string[] }>;
  optedOut: Array<{ leadId: string; businessName: string; reason: string | null }>;
  samples: Array<{
    leadId: string;
    businessName: string;
    recipient: string;
    subject: string;
    body: string;
  }>;
}

interface EmailTemplateItem {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isDefault: boolean;
}

interface CampaignState {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  pendingCount: number;
  errorMessage?: string | null;
  recipients: Array<{
    id: string;
    leadId: string;
    recipient: string;
    status: string;
    errorDetails?: string | null;
    sentAt?: string | null;
    lead: {
      businessName: string;
      city: string | null;
    };
  }>;
}

interface Props {
  leadIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export default function BulkEmailModal({ leadIds, isOpen, onClose, onCompleted }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [audit, setAudit] = useState<AuditEmailData | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(true);
  const [campaignName, setCampaignName] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [batchSize, setBatchSize] = useState<number>(10);
  const [delayMs, setDelayMs] = useState<number>(2500);

  const [launching, setLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignState | null>(null);

  const runPreviewAudit = async (customSubject?: string, customBody?: string, customExcluded?: Set<string>) => {
    setLoadingAudit(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/outreach/campaigns/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds,
          channel: 'EMAIL',
          subject: customSubject ?? subject,
          body: customBody ?? body,
          excludedLeadIds: Array.from(customExcluded ?? excludedIds),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to audit selected recipients.');
        return;
      }
      setAudit(data);
    } catch {
      setErrorMsg('Network error auditing recipients.');
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (!isOpen || leadIds.length === 0) return;
    setStep(1);
    setExcludedIds(new Set());
    setCampaign(null);
    setErrorMsg(null);
    setCampaignName(`Bulk Email (${leadIds.length} leads)`);

    Promise.all([
      fetch('/api/outreach/templates').then((r) => r.json()),
      fetch('/api/outreach/smtp').then((r) => r.json()),
    ]).then(([tplJson, smtpJson]) => {
      const list: EmailTemplateItem[] = tplJson?.templates || [];
      setTemplates(list);
      setSmtpConfigured(Boolean(smtpJson?.smtp?.configured));
      const def = list.find((t) => t.isDefault) || list[0];
      if (def) {
        setSelectedTemplateId(def.id);
        setSubject(def.subject);
        setBody(def.body);
        void runPreviewAudit(def.subject, def.body, new Set());
      } else {
        void runPreviewAudit('', '', new Set());
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, leadIds]);

  // Poll live progress while campaign is active
  useEffect(() => {
    if (!isOpen || !campaign || !['RUNNING', 'PAUSED'].includes(campaign.status)) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/outreach/campaigns/${campaign.id}`);
        const data = await res.json();
        if (data.success && data.campaign) {
          setCampaign(data.campaign);
          if (['COMPLETED', 'STOPPED', 'FAILED'].includes(data.campaign.status)) {
            onCompleted?.();
          }
        }
      } catch {
        // Ignore transient poll errors
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [isOpen, campaign, onCompleted]);

  if (!isOpen) return null;

  const toggleExclude = (leadId: string) => {
    const next = new Set(excludedIds);
    if (next.has(leadId)) next.delete(leadId);
    else next.add(leadId);
    setExcludedIds(next);
  };

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
      void runPreviewAudit(tpl.subject, tpl.body);
    }
  };

  const finalRecipientCount = audit
    ? audit.eligible.filter((r) => !excludedIds.has(r.leadId)).length
    : 0;

  const handleStartCampaign = async () => {
    setLaunching(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/outreach/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName.trim() || `Bulk Email ${new Date().toLocaleDateString()}`,
          channel: 'EMAIL',
          templateId: selectedTemplateId || null,
          subject,
          body,
          batchSize,
          delayMs,
          leadIds,
          excludedLeadIds: Array.from(excludedIds),
          confirmed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Could not start bulk email campaign.');
        return;
      }
      setCampaign(data.campaign);
    } catch {
      setErrorMsg('Network error starting bulk email campaign.');
    } finally {
      setLaunching(false);
    }
  };

  const handleCampaignControl = async (action: 'PAUSE' | 'RESUME' | 'STOP') => {
    if (!campaign) return;
    try {
      const res = await fetch(`/api/outreach/campaigns/${campaign.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success && data.campaign) {
        setCampaign(data.campaign);
        if (['STOPPED', 'COMPLETED'].includes(data.campaign.status)) {
          onCompleted?.();
        }
      }
    } catch {
      setErrorMsg(`Failed to send ${action} command.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-crm-navyDeep/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-between bg-crm-lightGrey/30 dark:bg-crm-navyDeep/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-crm-sky/40 dark:bg-crm-blue/30 text-crm-blue dark:text-crm-sky flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-crm-navy dark:text-white">
                Bulk Individual Email Outreach ({leadIds.length} Selected)
              </h3>
              <p className="text-[11px] text-crm-indigo dark:text-crm-sky/80">
                Step {step} of 3 • Individual personalized emails (Zero CC/BCC exposure)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-crm-indigo dark:text-crm-sky/80 hover:text-crm-navy dark:hover:text-white hover:bg-crm-lightGrey/50 dark:hover:bg-crm-navySurface transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {!smtpConfigured && (
            <div className="p-3 rounded-xl bg-crm-coral/15 dark:bg-crm-coral/15 border border-crm-coral/40 text-crm-navy dark:text-crm-coral flex items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-crm-orangeRed dark:text-crm-coral" />
                <span>
                  Gmail SMTP is not configured yet. You can inspect recipient audit and previews now; configure SMTP in Settings before launching sends.
                </span>
              </div>
              <Link
                href="/outreach?tab=settings"
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-crm-orangeRed hover:bg-crm-orangeRedDark text-white font-semibold text-[11px]"
              >
                <Settings className="w-3 h-3" /> SMTP Setup
              </Link>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-crm-orangeRed/10 dark:bg-crm-orangeRed/20 border border-crm-orangeRed/30 text-crm-orangeRed dark:text-crm-coral flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: RECIPIENT AUDIT */}
          {step === 1 && (
            <div className="space-y-4">
              {loadingAudit || !audit ? (
                <div className="py-12 flex items-center justify-center gap-2 text-crm-indigo dark:text-crm-sky">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Auditing selected leads...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 rounded-xl bg-crm-lightGrey/30 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20">
                      <span className="text-[10px] text-crm-indigo dark:text-crm-sky/80 uppercase">Selected</span>
                      <p className="text-lg font-bold text-crm-navy dark:text-white">{audit.summary.selectedCount}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-crm-sky/30 dark:bg-crm-blue/20 border border-crm-blue/30 dark:border-crm-periwinkle/30">
                      <span className="text-[10px] text-crm-navy dark:text-crm-sky uppercase">Valid To Send</span>
                      <p className="text-lg font-bold text-crm-blue dark:text-crm-periwinkle">{finalRecipientCount}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-crm-coral/15 dark:bg-crm-coral/15 border border-crm-coral/40">
                      <span className="text-[10px] text-crm-navy dark:text-crm-coral uppercase">Missing Email</span>
                      <p className="text-lg font-bold text-crm-orangeRed dark:text-crm-coral">{audit.summary.missingCount}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-crm-indigo/10 dark:bg-crm-navySurface border border-crm-indigo/25 dark:border-crm-sky/20">
                      <span className="text-[10px] text-crm-indigo dark:text-crm-sky uppercase">Duplicates</span>
                      <p className="text-lg font-bold text-crm-indigo dark:text-crm-periwinkle">{audit.summary.duplicateCount}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-crm-orangeRed/10 dark:bg-crm-orangeRed/20 border border-crm-orangeRed/30">
                      <span className="text-[10px] text-crm-orangeRed dark:text-crm-coral uppercase">Invalid / Opt-Out</span>
                      <p className="text-lg font-bold text-crm-orangeRed dark:text-crm-coral">
                        {audit.summary.invalidCount + audit.summary.optedOutCount}
                      </p>
                    </div>
                  </div>

                  {/* Eligible list with exclude checkboxes */}
                  <div className="border border-crm-lightGrey dark:border-crm-sky/20 rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-crm-lightGrey/30 dark:bg-crm-navyDeep border-b border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-between">
                      <span className="font-semibold text-crm-navy dark:text-white flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" /> Eligible Recipients (uncheck to exclude)
                      </span>
                      <span className="text-[11px] text-crm-indigo dark:text-crm-sky">{finalRecipientCount} included</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-crm-lightGrey/60 dark:divide-crm-sky/15">
                      {audit.eligible.length === 0 ? (
                        <p className="p-4 text-crm-indigo dark:text-crm-sky/80 text-center">No leads have valid unique email addresses.</p>
                      ) : (
                        audit.eligible.map((item) => {
                          const included = !excludedIds.has(item.leadId);
                          return (
                            <label
                              key={item.leadId}
                              className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-crm-sky/20 dark:hover:bg-crm-navySurface/60 cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={included}
                                  onChange={() => toggleExclude(item.leadId)}
                                  className="rounded border-crm-lightGrey dark:border-crm-sky/30 text-crm-blue accent-crm-blue"
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-crm-navy dark:text-white truncate">{item.businessName}</p>
                                  <p className="text-[11px] text-crm-indigo dark:text-crm-sky/75 truncate">{item.city || '—'}</p>
                                </div>
                              </div>
                              <span className="text-crm-blue dark:text-crm-periwinkle font-mono text-[11px] shrink-0">
                                {item.email}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Excluded Breakdown Summary */}
                  {(audit.missingEmail.length > 0 ||
                    audit.duplicateEmails.length > 0 ||
                    audit.invalidEmails.length > 0 ||
                    audit.optedOut.length > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {audit.missingEmail.length > 0 && (
                        <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20">
                          <p className="font-semibold text-crm-orangeRed dark:text-crm-coral mb-1">
                            Skipped — No Email ({audit.missingEmail.length})
                          </p>
                          <p className="text-[11px] text-crm-indigo dark:text-crm-sky/80 line-clamp-2">
                            {audit.missingEmail.map((m) => m.businessName).join(', ')}
                          </p>
                        </div>
                      )}
                      {audit.duplicateEmails.length > 0 && (
                        <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20">
                          <p className="font-semibold text-crm-navy dark:text-crm-sky mb-1">
                            Skipped — Duplicate Email ({audit.duplicateEmails.length})
                          </p>
                          <p className="text-[11px] text-crm-indigo dark:text-crm-sky/80 line-clamp-2">
                            {audit.duplicateEmails.map((d) => `${d.businessName} (${d.email})`).join(', ')}
                          </p>
                        </div>
                      )}
                      {(audit.invalidEmails.length > 0 || audit.optedOut.length > 0) && (
                        <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20 sm:col-span-2">
                          <p className="font-semibold text-crm-orangeRed dark:text-crm-coral mb-1">
                            Skipped — Invalid ({audit.invalidEmails.length}) / Opted-Out ({audit.optedOut.length})
                          </p>
                          <p className="text-[11px] text-crm-indigo dark:text-crm-sky/80 line-clamp-2">
                            {[
                              ...audit.invalidEmails.map((i) => `${i.businessName} (${i.rawValues.join(', ')})`),
                              ...audit.optedOut.map((o) => `${o.businessName} [Opted Out]`),
                            ].join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* STEP 2: MESSAGE & BATCH SETTINGS */}
          {step === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1">
                    Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                  >
                    <option value="">Custom Message</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1">
                    Subject Template
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1">
                    Body Template
                  </label>
                  <textarea
                    rows={7}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                  />
                  <div className="mt-1 flex flex-wrap gap-1">
                    {SUPPORTED_PLACEHOLDERS.map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setBody((prev) => `${prev}${prev ? ' ' : ''}${p.key}`)}
                        className="px-1.5 py-0.5 rounded bg-crm-lightGrey/40 dark:bg-crm-navySurface hover:bg-crm-sky/40 dark:hover:bg-crm-blue/30 text-[10px] font-mono text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25"
                      >
                        {p.key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1">
                      Batch Size
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value) || 10)}
                      className="w-full px-3 py-1.5 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1">
                      Delay Between Emails (ms)
                    </label>
                    <input
                      type="number"
                      min={500}
                      max={60000}
                      step={500}
                      value={delayMs}
                      onChange={(e) => setDelayMs(Number(e.target.value) || 2500)}
                      className="w-full px-3 py-1.5 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Sample Previews */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-crm-navy dark:text-white">
                    Personalized Sample Previews
                  </span>
                  <button
                    type="button"
                    onClick={() => runPreviewAudit(subject, body)}
                    className="text-[11px] text-crm-blue dark:text-crm-periwinkle hover:underline font-medium"
                  >
                    Refresh Samples
                  </button>
                </div>
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {audit?.samples.map((s) => (
                    <div
                      key={s.leadId}
                      className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-crm-navy dark:text-white">{s.businessName}</span>
                        <span className="text-crm-blue dark:text-crm-periwinkle font-mono">{s.recipient}</span>
                      </div>
                      <p className="font-semibold text-crm-navy dark:text-crm-sky">Sub: {s.subject}</p>
                      <pre className="whitespace-pre-wrap font-sans text-[11px] text-crm-indigo dark:text-crm-sky/80 line-clamp-5">
                        {s.body}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM OR LIVE PROGRESS */}
          {step === 3 && !campaign && (
            <div className="p-5 rounded-2xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-crm-blue dark:text-crm-periwinkle shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-crm-navy dark:text-white">
                    Confirm Individual Bulk Email Dispatch
                  </h4>
                  <p className="text-xs text-crm-indigo dark:text-crm-sky/80 mt-1">
                    LeadPilot will send <strong>{finalRecipientCount}</strong> separate, individually personalized emails in the background (Batch Size: {batchSize}, Delay: {delayMs}ms). No recipient will ever see another email address in CC/BCC.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20">
                  <span className="text-crm-indigo dark:text-crm-sky/75 block text-[10px] uppercase">Campaign</span>
                  <span className="font-semibold text-crm-navy dark:text-white">{campaignName}</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20">
                  <span className="text-crm-indigo dark:text-crm-sky/75 block text-[10px] uppercase">Final Recipients</span>
                  <span className="font-bold text-crm-blue dark:text-crm-periwinkle">{finalRecipientCount} leads</span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20">
                  <span className="text-crm-indigo dark:text-crm-sky/75 block text-[10px] uppercase">Rate Protection</span>
                  <span className="font-semibold text-crm-navy dark:text-white">{delayMs}ms interval</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && campaign && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-crm-navy dark:text-white">{campaign.name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-crm-indigo/15 dark:bg-crm-periwinkle/20 text-crm-indigo dark:text-crm-periwinkle">
                      {campaign.status}
                    </span>
                  </div>
                  {campaign.errorMessage && (
                    <p className="text-xs text-crm-orangeRed dark:text-crm-coral mt-1">{campaign.errorMessage}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {campaign.status === 'RUNNING' && (
                    <button
                      type="button"
                      onClick={() => handleCampaignControl('PAUSE')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-crm-indigo hover:bg-crm-navy text-white font-semibold"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  )}
                  {campaign.status === 'PAUSED' && (
                    <button
                      type="button"
                      onClick={() => handleCampaignControl('RESUME')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy text-white font-semibold"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                  )}
                  {['RUNNING', 'PAUSED'].includes(campaign.status) && (
                    <button
                      type="button"
                      onClick={() => handleCampaignControl('STOP')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-crm-orangeRed hover:bg-crm-orangeRedDark text-white font-semibold"
                    >
                      <Square className="w-3.5 h-3.5" /> Stop
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-crm-sky/30 dark:bg-crm-blue/20 border border-crm-blue/30 dark:border-crm-periwinkle/30">
                  <span className="text-[10px] text-crm-navy dark:text-crm-sky uppercase">Sent</span>
                  <p className="text-xl font-bold text-crm-blue dark:text-crm-periwinkle">{campaign.sentCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-crm-orangeRed/10 dark:bg-crm-orangeRed/20 border border-crm-orangeRed/30">
                  <span className="text-[10px] text-crm-orangeRed dark:text-crm-coral uppercase">Failed</span>
                  <p className="text-xl font-bold text-crm-orangeRed dark:text-crm-coral">{campaign.failedCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-crm-lightGrey/40 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20">
                  <span className="text-[10px] text-crm-indigo dark:text-crm-sky uppercase">Skipped</span>
                  <p className="text-xl font-bold text-crm-navy dark:text-white">{campaign.skippedCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-crm-indigo/10 dark:bg-crm-periwinkle/15 border border-crm-indigo/25 dark:border-crm-periwinkle/30">
                  <span className="text-[10px] text-crm-indigo dark:text-crm-periwinkle uppercase">Pending</span>
                  <p className="text-xl font-bold text-crm-indigo dark:text-crm-periwinkle">{campaign.pendingCount}</p>
                </div>
              </div>

              <div className="border border-crm-lightGrey dark:border-crm-sky/20 rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-crm-lightGrey/60 dark:divide-crm-sky/15">
                {campaign.recipients.map((rec) => (
                  <div key={rec.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-crm-navy dark:text-white truncate">{rec.lead.businessName}</p>
                      <p className="text-[11px] text-crm-indigo dark:text-crm-sky/75 font-mono truncate">{rec.recipient}</p>
                      {rec.errorDetails && <p className="text-[10px] text-crm-orangeRed dark:text-crm-coral truncate">{rec.errorDetails}</p>}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        rec.status === 'SENT'
                          ? 'bg-crm-sky/40 dark:bg-crm-blue/30 text-crm-navy dark:text-crm-sky'
                          : rec.status === 'FAILED'
                          ? 'bg-crm-orangeRed/15 dark:bg-crm-orangeRed/25 text-crm-orangeRed dark:text-crm-coral'
                          : rec.status === 'SKIPPED'
                          ? 'bg-crm-lightGrey/50 dark:bg-crm-navySurface text-crm-indigo dark:text-crm-sky/80'
                          : 'bg-crm-periwinkle/20 dark:bg-crm-periwinkle/25 text-crm-indigo dark:text-crm-periwinkle'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-crm-lightGrey dark:border-crm-sky/20 bg-crm-lightGrey/30 dark:bg-crm-navyDeep/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-crm-navy dark:text-crm-sky hover:bg-crm-lightGrey/60 dark:hover:bg-crm-navySurface transition"
          >
            {campaign ? 'Run in Background & Close' : 'Cancel'}
          </button>

          {!campaign && (
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-crm-sky/40 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-crm-sky text-xs font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
              {step === 1 && (
                <button
                  type="button"
                  disabled={finalRecipientCount === 0}
                  onClick={() => {
                    setStep(2);
                    void runPreviewAudit(subject, body);
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-50 text-white text-xs font-bold"
                >
                  Continue ({finalRecipientCount}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              {step === 2 && (
                <button
                  type="button"
                  disabled={!subject.trim() || !body.trim() || finalRecipientCount === 0}
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-50 text-white text-xs font-bold"
                >
                  Review & Confirm <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              {step === 3 && (
                <button
                  type="button"
                  onClick={handleStartCampaign}
                  disabled={launching || finalRecipientCount === 0 || !smtpConfigured}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-50 text-white text-xs font-bold shadow-md"
                >
                  {launching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Confirm & Launch Individual Sends
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

