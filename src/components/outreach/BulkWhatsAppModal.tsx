'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  SkipForward,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { buildWhatsAppWebUrl, SUPPORTED_PLACEHOLDERS } from '@/lib/outreach-utils';

interface WhatsAppAuditData {
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
    phone: string;
    normalizedPhone: string;
    whatsappUrl: string;
    renderedMessage: string;
    excluded: boolean;
  }>;
  missingPhone: Array<{ leadId: string; businessName: string }>;
  invalidPhones: Array<{ leadId: string; businessName: string; rawValues: string[] }>;
  optedOut: Array<{ leadId: string; businessName: string }>;
}

interface QueueRecipient {
  id: string;
  leadId: string;
  recipient: string;
  renderedBody: string;
  status: string;
  lead: {
    businessName: string;
    city: string | null;
  };
}

interface QueueCampaign {
  id: string;
  name: string;
  status: string;
  recipients: QueueRecipient[];
}

interface Props {
  leadIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function BulkWhatsAppModal({ leadIds, isOpen, onClose, onUpdated }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [audit, setAudit] = useState<WhatsAppAuditData | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [messageTemplate, setMessageTemplate] = useState(
    'Hello {{businessName}}, I noticed your business in {{city}} and wanted to connect briefly regarding {{serviceName}}. Do you have 2 minutes to chat?'
  );
  const [queue, setQueue] = useState<QueueCampaign | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [working, setWorking] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runPreviewAudit = async (msg?: string, customExcluded?: Set<string>) => {
    setLoadingAudit(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/outreach/campaigns/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds,
          channel: 'WHATSAPP',
          body: msg ?? messageTemplate,
          excludedLeadIds: Array.from(customExcluded ?? excludedIds),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Could not audit phone numbers.');
        return;
      }
      setAudit(data);
    } catch {
      setErrorMsg('Network error loading WhatsApp audit.');
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (!isOpen || leadIds.length === 0) return;
    setStep(1);
    setQueue(null);
    setActiveIndex(0);
    setExcludedIds(new Set());
    setSessionNotice(null);
    setFallbackLink(null);
    void runPreviewAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, leadIds]);

  if (!isOpen) return null;

  const finalRecipientCount = audit
    ? audit.eligible.filter((r) => !excludedIds.has(r.leadId)).length
    : 0;

  const toggleExclude = (leadId: string) => {
    const next = new Set(excludedIds);
    if (next.has(leadId)) next.delete(leadId);
    else next.add(leadId);
    setExcludedIds(next);
  };

  const handleStartSequentialQueue = async () => {
    setWorking(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/outreach/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `WhatsApp Queue (${finalRecipientCount} leads)`,
          channel: 'WHATSAPP',
          body: messageTemplate,
          leadIds,
          excludedLeadIds: Array.from(excludedIds),
          confirmed: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to create WhatsApp outreach queue.');
        return;
      }
      setQueue(data.campaign);
      setActiveIndex(0);
      setStep(3);
    } catch {
      setErrorMsg('Network error creating WhatsApp queue.');
    } finally {
      setWorking(false);
    }
  };

  const currentRecipient = queue?.recipients[activeIndex] || null;

  const advanceNext = (updatedStatus: string) => {
    if (!queue) return;
    setSessionNotice(null);
    setFallbackLink(null);
    const nextRecipients = queue.recipients.map((r, idx) =>
      idx === activeIndex ? { ...r, status: updatedStatus } : r
    );
    setQueue({ ...queue, recipients: nextRecipients });
    if (activeIndex + 1 < nextRecipients.length) {
      setActiveIndex(activeIndex + 1);
    } else {
      void fetch(`/api/outreach/campaigns/${queue.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_COMPLETED' }),
      });
    }
    onUpdated?.();
  };

  const handleOpenCurrentChat = async () => {
    if (!currentRecipient || !queue) return;
    setOpeningChat(true);
    setErrorMsg(null);
    setSessionNotice(null);
    setFallbackLink(null);

    try {
      const res = await fetch('/api/outreach/whatsapp/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentRecipient.leadId,
          phone: currentRecipient.recipient,
          message: currentRecipient.renderedBody,
          campaignRecipientId: currentRecipient.id,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to open WhatsApp Web session.');
        return;
      }

      if (data.mode === 'external_fallback') {
        const target =
          data.targetUrl || buildWhatsAppWebUrl(currentRecipient.recipient, currentRecipient.renderedBody);
        const win = window.open(target, 'leadpilot_whatsapp_web');
        if (!win) {
          setFallbackLink(target);
        }
      }

      if (data.statusMessage) {
        setSessionNotice(data.statusMessage);
      }

      const nextRecipients = queue.recipients.map((r, idx) =>
        idx === activeIndex ? { ...r, status: 'OPENED' } : r
      );
      setQueue({ ...queue, recipients: nextRecipients });
      onUpdated?.();
    } catch {
      setErrorMsg('Network error opening WhatsApp Web session.');
    } finally {
      setOpeningChat(false);
    }
  };

  const handleConfirmCurrentSent = async () => {
    if (!currentRecipient) return;
    setWorking(true);
    try {
      await fetch('/api/outreach/whatsapp/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: currentRecipient.leadId,
          action: 'WHATSAPP_CONFIRMED_SENT',
          recipient: `+${currentRecipient.recipient}`,
          message: currentRecipient.renderedBody,
          campaignRecipientId: currentRecipient.id,
        }),
      });
      advanceNext('CONFIRMED_SENT');
    } finally {
      setWorking(false);
    }
  };

  const handleSkipCurrent = async () => {
    if (!currentRecipient || !queue) return;
    setWorking(true);
    try {
      await fetch(`/api/outreach/campaigns/${queue.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SKIP_RECIPIENT', recipientId: currentRecipient.id }),
      });
      advanceNext('SKIPPED');
    } finally {
      setWorking(false);
    }
  };

  const confirmedCount = queue?.recipients.filter((r) => r.status === 'CONFIRMED_SENT').length || 0;
  const skippedCount = queue?.recipients.filter((r) => r.status === 'SKIPPED').length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-crm-navyDeep/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 py-4 border-b border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-between bg-crm-lightGrey/30 dark:bg-crm-navyDeep/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-crm-sky/40 dark:bg-crm-blue/30 text-crm-blue dark:text-crm-sky flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-crm-navy dark:text-white">
                Guided Sequential WhatsApp Outreach ({leadIds.length} Selected)
              </h3>
              <p className="text-[11px] text-crm-indigo dark:text-crm-sky/80">
                Safe sequential click-to-chat workflow • Confirms each send manually
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

        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-crm-orangeRed/10 dark:bg-crm-orangeRed/20 border border-crm-orangeRed/30 text-crm-orangeRed dark:text-crm-coral flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {loadingAudit || !audit ? (
                <div className="py-12 flex items-center justify-center gap-2 text-crm-indigo dark:text-crm-sky">
                  <Loader2 className="w-4 h-4 animate-spin" /> Auditing phone numbers...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-crm-sky/30 dark:bg-crm-blue/20 border border-crm-blue/30 dark:border-crm-periwinkle/30">
                      <span className="text-[10px] text-crm-navy dark:text-crm-sky uppercase">Valid WhatsApp</span>
                      <p className="text-lg font-bold text-crm-blue dark:text-crm-periwinkle">{finalRecipientCount}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-crm-coral/15 dark:bg-crm-coral/15 border border-crm-coral/40">
                      <span className="text-[10px] text-crm-navy dark:text-crm-coral uppercase">Missing Phone</span>
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

                  <div className="border border-crm-lightGrey dark:border-crm-sky/20 rounded-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-crm-lightGrey/60 dark:divide-crm-sky/15">
                    {audit.eligible.map((item) => (
                      <label
                        key={item.leadId}
                        className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-crm-sky/20 dark:hover:bg-crm-navySurface/60 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={!excludedIds.has(item.leadId)}
                            onChange={() => toggleExclude(item.leadId)}
                            className="rounded border-crm-lightGrey text-crm-blue accent-crm-blue"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-crm-navy dark:text-white truncate">{item.businessName}</p>
                            <p className="text-[11px] text-crm-indigo dark:text-crm-sky/75 truncate">{item.city || '—'}</p>
                          </div>
                        </div>
                        <span className="text-crm-blue dark:text-crm-periwinkle font-mono text-[11px] shrink-0">
                          +{item.normalizedPhone}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1">
                  Personalized WhatsApp Template
                </label>
                <textarea
                  rows={5}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {SUPPORTED_PLACEHOLDERS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setMessageTemplate((prev) => `${prev}${prev ? ' ' : ''}${p.key}`)}
                      className="px-2 py-0.5 rounded bg-crm-lightGrey/40 dark:bg-crm-navySurface hover:bg-crm-sky/40 dark:hover:bg-crm-blue/30 text-[10px] font-mono text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25"
                    >
                      {p.key}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => runPreviewAudit(messageTemplate)}
                className="text-crm-blue dark:text-crm-periwinkle font-semibold hover:underline"
              >
                Preview Sample Personalized Messages
              </button>
              {audit?.eligible.slice(0, 2).map((s) => (
                <div
                  key={s.leadId}
                  className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20"
                >
                  <p className="font-bold text-crm-navy dark:text-white">
                    {s.businessName} (+{s.normalizedPhone})
                  </p>
                  <p className="text-crm-indigo dark:text-crm-sky mt-1">{s.renderedMessage}</p>
                </div>
              ))}
            </div>
          )}

          {step === 3 && queue && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20">
                <span className="text-crm-navy dark:text-white">
                  Lead <strong>{Math.min(activeIndex + 1, queue.recipients.length)}</strong> of{' '}
                  <strong>{queue.recipients.length}</strong>
                </span>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-crm-blue dark:text-crm-periwinkle font-bold">Confirmed Sent: {confirmedCount}</span>
                  <span className="text-crm-indigo dark:text-crm-sky/80">Skipped: {skippedCount}</span>
                </div>
              </div>

              {currentRecipient && (
                <div className="p-5 rounded-2xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-crm-navy dark:text-white">
                        {currentRecipient.lead.businessName}
                      </h4>
                      <p className="text-xs text-crm-blue dark:text-crm-periwinkle font-mono">
                        +{currentRecipient.recipient}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-crm-sky/40 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky">
                      {currentRecipient.status}
                    </span>
                  </div>

                  <pre className="p-3 rounded-xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 whitespace-pre-wrap font-sans text-xs text-crm-navy dark:text-crm-lightGrey">
                    {currentRecipient.renderedBody}
                  </pre>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      disabled={openingChat}
                      onClick={handleOpenCurrentChat}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-50 text-white font-bold shadow-sm"
                    >
                      {openingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                      {openingChat ? 'Opening...' : '1. Open in WhatsApp'}
                    </button>
                    <button
                      type="button"
                      disabled={working}
                      onClick={handleConfirmCurrentSent}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crm-indigo hover:bg-crm-navy text-white font-bold shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> 2. Confirm Sent & Next
                    </button>
                    <button
                      type="button"
                      disabled={working}
                      onClick={handleSkipCurrent}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-crm-sky/40 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-crm-sky font-semibold"
                    >
                      <SkipForward className="w-3.5 h-3.5" /> Skip & Next
                    </button>
                  </div>
                  {sessionNotice && (
                    <p className="text-[11px] text-crm-blue dark:text-crm-sky">{sessionNotice}</p>
                  )}
                  {fallbackLink && (
                    <a
                      href={fallbackLink}
                      target="leadpilot_whatsapp_web"
                      className="inline-block text-[11px] font-bold text-crm-blue dark:text-crm-periwinkle underline"
                    >
                      Popup blocked? Click here to open WhatsApp Web tab
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-crm-lightGrey dark:border-crm-sky/20 bg-crm-lightGrey/30 dark:bg-crm-navyDeep/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-crm-navy dark:text-crm-sky hover:bg-crm-lightGrey/60 dark:hover:bg-crm-navySurface transition"
          >
            Close
          </button>

          {step < 3 && (
            <div className="flex items-center gap-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-crm-sky/40 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-crm-sky text-xs font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}
              {step === 1 && (
                <button
                  type="button"
                  disabled={finalRecipientCount === 0}
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-50 text-white text-xs font-bold"
                >
                  Customize Message ({finalRecipientCount}) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
              {step === 2 && (
                <button
                  type="button"
                  disabled={working || !messageTemplate.trim() || finalRecipientCount === 0}
                  onClick={handleStartSequentialQueue}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-50 text-white text-xs font-bold"
                >
                  {working ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Start Guided Queue ({finalRecipientCount})
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

