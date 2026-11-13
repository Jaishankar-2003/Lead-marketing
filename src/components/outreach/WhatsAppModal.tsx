'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import {
  buildWhatsAppUrl,
  buildWhatsAppWebUrl,
  extractLeadPhones,
  normalizeWhatsAppPhone,
  renderTemplate,
} from '@/lib/outreach-utils';
import type { OutreachLeadSummary } from './EmailComposerModal';

interface Props {
  lead: OutreachLeadSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

const WHATSAPP_PRESETS = [
  {
    label: 'Introduction',
    text: 'Hello {{businessName}}, I came across your business in {{city}} and wanted to connect briefly regarding {{serviceName}}. Do you have 2 minutes to chat?',
  },
  {
    label: 'Website Idea',
    text: 'Hi {{contactName}}, I reviewed your online presence for {{businessName}} in {{city}} and put together a quick concept to bring more local customer calls. May I share it here?',
  },
  {
    label: 'SEO / Google Maps',
    text: 'Hello {{businessName}}, we spotted a few quick SEO & Google Maps improvements that can help increase enquiries in {{city}}. Happy to share a 3-point summary if helpful.',
  },
  {
    label: 'Follow-Up',
    text: 'Hi {{businessName}}, just following up gently on my previous note regarding {{serviceName}}. Let me know if this week works for a quick chat.',
  },
];

export default function WhatsAppModal({ lead, isOpen, onClose, onUpdated }: Props) {
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [chatOpened, setChatOpened] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const phoneAudit = useMemo(() => {
    if (!lead) return { rawPhones: [], whatsappPhones: [], invalidPhones: [] };
    return extractLeadPhones(lead);
  }, [lead]);

  useEffect(() => {
    if (!isOpen || !lead) return;
    setChatOpened(false);
    setOpeningChat(false);
    setFeedback(null);
    setFallbackLink(null);
    setCopiedMsg(false);

    const first = phoneAudit.whatsappPhones[0]?.raw || lead.phone || lead.enrichedPhone || '';
    setSelectedPhone(first);
    setMessage(renderTemplate(WHATSAPP_PRESETS[0].text, lead, { phone: first }));
  }, [isOpen, lead, phoneAudit]);

  if (!isOpen || !lead) return null;

  const normalizedDigits = normalizeWhatsAppPhone(selectedPhone);
  const waUrl = normalizedDigits ? buildWhatsAppUrl(normalizedDigits, message) : null;
  const webWaUrl = normalizedDigits ? buildWhatsAppWebUrl(normalizedDigits, message) : null;

  const handleOpenWhatsApp = async () => {
    if (!waUrl || !webWaUrl || !normalizedDigits) {
      setFeedback({ type: 'error', message: 'Please enter a valid 10-digit Indian or international phone number.' });
      return;
    }

    setOpeningChat(true);
    setFeedback(null);
    setFallbackLink(null);

    try {
      const res = await fetch('/api/outreach/whatsapp/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          phone: normalizedDigits,
          message,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to open WhatsApp Web session.',
        });
        return;
      }

      if (data.mode === 'external_fallback') {
        const target = data.targetUrl || webWaUrl;
        const win = window.open(target, 'leadpilot_whatsapp_web');
        if (!win) {
          setFallbackLink(target);
        }
      }

      setChatOpened(true);
      setFeedback({
        type: 'success',
        message:
          data.statusMessage ||
          'WhatsApp Web chat opened. Review and send the message manually inside WhatsApp.',
      });
      onUpdated?.();
    } catch {
      setFeedback({
        type: 'error',
        message: 'Could not reach the WhatsApp session service. You can still retry opening the chat.',
      });
    } finally {
      setOpeningChat(false);
    }
  };

  const handleConfirmSent = async () => {
    if (!normalizedDigits) return;
    setSavingAction(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/outreach/whatsapp/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          action: 'WHATSAPP_CONFIRMED_SENT',
          recipient: `+${normalizedDigits}`,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({ type: 'error', message: data.error || 'Could not record WhatsApp send confirmation.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: `WhatsApp outreach confirmed for +${normalizedDigits}. CRM updated.`,
      });
      onUpdated?.();
    } catch {
      setFeedback({ type: 'error', message: 'Network error recording confirmation.' });
    } finally {
      setSavingAction(false);
    }
  };

  const handleCopyMessage = async () => {
    await navigator.clipboard.writeText(message);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-crm-navyDeep/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-between bg-crm-lightGrey/30 dark:bg-crm-navyDeep/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-crm-sky/40 dark:bg-crm-blue/30 text-crm-blue dark:text-crm-sky flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-crm-navy dark:text-white truncate">
                WhatsApp Outreach — {lead.businessName}
              </h3>
              <p className="text-[11px] text-crm-indigo dark:text-crm-sky/80 truncate">
                Click-to-Chat (wa.me) • Manual send confirmation protects CRM accuracy
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
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {lead.doNotContact && (
            <div className="p-3 rounded-xl bg-crm-orangeRed/10 dark:bg-crm-orangeRed/20 border border-crm-orangeRed/30 text-crm-orangeRed dark:text-crm-coral flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Lead is marked Do Not Contact. Clear opt-out status before initiating outreach.</span>
            </div>
          )}

          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 ${
                feedback.type === 'success'
                  ? 'bg-crm-sky/30 dark:bg-crm-blue/20 border-crm-blue/30 dark:border-crm-periwinkle/30 text-crm-navy dark:text-crm-sky'
                  : 'bg-crm-orangeRed/10 dark:bg-crm-orangeRed/20 border-crm-orangeRed/30 text-crm-orangeRed dark:text-crm-coral'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-crm-blue dark:text-crm-periwinkle" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {fallbackLink && (
            <div className="p-3 rounded-xl bg-crm-coral/15 dark:bg-crm-coral/15 border border-crm-coral/40 text-crm-navy dark:text-crm-coral flex items-center justify-between gap-2">
              <span>Browser popup was blocked for WhatsApp Web tab.</span>
              <a
                href={fallbackLink}
                target="leadpilot_whatsapp_web"
                className="shrink-0 px-3 py-1 rounded-lg bg-crm-blue text-white font-bold hover:bg-crm-navy"
              >
                Open WhatsApp Tab
              </a>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1">
              Recipient Phone (Indian 10-digit numbers auto-normalized to +91)
            </label>
            <input
              type="text"
              value={selectedPhone}
              onChange={(e) => setSelectedPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
            />
            {phoneAudit.whatsappPhones.length > 1 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {phoneAudit.whatsappPhones.map((p) => (
                  <button
                    key={p.normalized}
                    type="button"
                    onClick={() => setSelectedPhone(p.raw)}
                    className={`px-2 py-0.5 rounded-full text-[10px] border transition ${
                      normalizedDigits === p.normalized
                        ? 'bg-crm-blue text-white border-crm-blue'
                        : 'bg-crm-lightGrey/40 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky border-crm-lightGrey dark:border-crm-sky/25'
                    }`}
                  >
                    {p.raw} (+{p.normalized})
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1 text-[11px] text-crm-indigo dark:text-crm-sky/80">
              {normalizedDigits ? (
                <span className="text-crm-blue dark:text-crm-periwinkle font-medium">
                  Normalized WhatsApp ID: +{normalizedDigits}
                </span>
              ) : (
                <span className="text-crm-orangeRed dark:text-crm-coral">Invalid or missing phone number for WhatsApp.</span>
              )}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1.5">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {WHATSAPP_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setMessage(renderTemplate(preset.text, lead, { phone: selectedPhone }))}
                  className="px-2.5 py-1 rounded-lg bg-crm-lightGrey/40 dark:bg-crm-navySurface hover:bg-crm-sky/40 dark:hover:bg-crm-blue/30 text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25 text-[11px] font-medium transition"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky">
                WhatsApp Message Preview
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 text-[11px] text-crm-blue dark:text-crm-periwinkle hover:underline font-medium"
              >
                {copiedMsg ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedMsg ? 'Copied!' : 'Copy Message'}
              </button>
            </div>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle leading-relaxed"
            />
          </div>

          {chatOpened && (
            <div className="p-3.5 rounded-xl bg-crm-sky/30 dark:bg-crm-blue/20 border border-crm-blue/30 dark:border-crm-periwinkle/30 space-y-2">
              <p className="font-semibold text-crm-navy dark:text-white">
                Did you press Send inside WhatsApp?
              </p>
              <p className="text-[11px] text-crm-indigo dark:text-crm-sky">
                Opening WhatsApp logs an &quot;Opened&quot; event only. Click Confirm Sent only after sending the message in WhatsApp.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmSent}
                  disabled={savingAction || Boolean(lead.doNotContact)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy text-white font-bold shadow-sm transition"
                >
                  {savingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Confirm Message Sent
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-crm-sky/40 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-crm-sky font-medium hover:bg-crm-sky/70 dark:hover:bg-crm-navyElevated transition"
                >
                  Not Sent / Close
                </button>
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
            Close
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={openingChat || !waUrl || Boolean(lead.doNotContact)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-50 text-white text-xs font-bold shadow-md transition"
          >
            {openingChat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
            {openingChat ? 'Opening WhatsApp...' : 'Open WhatsApp Chat'}
          </button>
        </div>
      </div>
    </div>
  );
}

