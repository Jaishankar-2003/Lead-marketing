'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  X,
  Mail,
  Send,
  Eye,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Settings,
  Sparkles,
  Monitor,
  Smartphone,
  FileText,
} from 'lucide-react';
import {
  extractLeadEmails,
  isValidEmail,
  renderTemplate,
  renderProfessionalHtmlEmail,
  getRecommendedTemplate,
  SUPPORTED_PLACEHOLDERS,
} from '@/lib/outreach-utils';

export interface OutreachLeadSummary {
  id: string;
  businessName: string;
  contactName?: string | null;
  city?: string | null;
  category?: string | null;
  website?: string | null;
  email?: string | null;
  enrichedEmail?: string | null;
  phone?: string | null;
  enrichedPhone?: string | null;
  serviceProspect?: string | null;
  linkedinUrl?: string | null;
  contactUrl?: string | null;
  doNotContact?: boolean;
}

interface EmailTemplateItem {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isDefault: boolean;
}

interface SmtpStatus {
  configured: boolean;
  provider: string;
  host: string;
  port: number;
  from: string;
  missingVars: string[];
}

interface Props {
  lead: OutreachLeadSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
}

export default function EmailComposerModal({ lead, isOpen, onClose, onSent }: Props) {
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatus | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [mode, setMode] = useState<'compose' | 'preview'>('compose');
  const [previewFormat, setPreviewFormat] = useState<'desktop' | 'mobile' | 'text'>('desktop');
  const [sending, setSending] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const detectedEmails = useMemo(() => {
    if (!lead) return { valid: [], invalid: [] };
    return extractLeadEmails(lead);
  }, [lead]);

  const recommendation = useMemo(() => {
    if (!lead) return null;
    return getRecommendedTemplate(lead);
  }, [lead]);

  const matchedRecTpl = useMemo(() => {
    if (!recommendation) return null;
    return (
      templates.find(
        (t) =>
          t.name.toLowerCase() === recommendation.templateName.toLowerCase() ||
          t.category.toLowerCase() === recommendation.category.toLowerCase()
      ) || null
    );
  }, [templates, recommendation]);

  useEffect(() => {
    if (!isOpen || !lead) return;
    setMode('compose');
    setPreviewFormat('desktop');
    setFeedback(null);
    setRecipientEmail(detectedEmails.valid[0] || lead.email || lead.enrichedEmail || '');

    let cancelled = false;
    setLoadingMeta(true);

    Promise.all([
      fetch('/api/outreach/templates').then((r) => r.json()),
      fetch('/api/outreach/smtp').then((r) => r.json()),
    ])
      .then(([tplJson, smtpJson]) => {
        if (cancelled) return;
        const list: EmailTemplateItem[] = tplJson?.templates || [];
        setTemplates(list);
        if (smtpJson?.smtp) setSmtpStatus(smtpJson.smtp);

        const rec = getRecommendedTemplate(lead);
        const recMatch = list.find(
          (t) =>
            t.name.toLowerCase() === rec.templateName.toLowerCase() ||
            t.category.toLowerCase() === rec.category.toLowerCase()
        );
        const initialTpl = recMatch || list.find((t) => t.isDefault) || list[0];

        if (initialTpl) {
          setSelectedTemplateId(initialTpl.id);
          setSubject(renderTemplate(initialTpl.subject, lead));
          setBody(renderTemplate(initialTpl.body, lead));
        } else {
          setSubject(`A quick idea for ${lead.businessName}`);
          setBody(
            `Hello ${lead.contactName || lead.businessName},\n\nI came across ${lead.businessName} in ${lead.city || 'your area'} and wanted to introduce myself.\n\nBest regards,\nJai Shankar\nContact: 9842139997\nWebsite: https://jspcs.online`
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeedback({ type: 'error', message: 'Could not load email templates or SMTP status.' });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMeta(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, lead, detectedEmails.valid]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  const renderedPreviewSubject = useMemo(() => {
    if (!lead) return '';
    return renderTemplate(subject, lead, { email: recipientEmail });
  }, [subject, lead, recipientEmail]);

  const renderedPreviewBody = useMemo(() => {
    if (!lead) return '';
    return renderTemplate(body, lead, { email: recipientEmail });
  }, [body, lead, recipientEmail]);

  const emailValid = useMemo(() => {
    return isValidEmail(recipientEmail);
  }, [recipientEmail]);

  const compiledPreview = useMemo(() => {
    if (!lead) {
      return {
        html: '',
        text: '',
        brand: 'GENERAL' as const,
        brandTitle: 'Jai Shankar',
        brandSubtitle: 'Technology Partner',
        ctaText: "Let's Connect",
        ctaUrl: 'https://jspcs.online',
        websiteUrl: 'https://jspcs.online',
        senderPhone: '9842139997',
      };
    }
    return renderProfessionalHtmlEmail({
      subject: renderedPreviewSubject,
      bodyText: renderedPreviewBody,
      lead,
      recipientEmail,
      templateName: selectedTemplate?.name,
      category: selectedTemplate?.category,
      unsubscribeUrl: 'https://jspcs.online/unsubscribe?sample=true',
    });
  }, [renderedPreviewSubject, renderedPreviewBody, lead, recipientEmail, selectedTemplate]);

  if (!isOpen || !lead) return null;

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;
    setSubject(renderTemplate(tpl.subject, lead, { email: recipientEmail }));
    setBody(renderTemplate(tpl.body, lead, { email: recipientEmail }));
  };

  const handleSendEmail = async () => {
    if (!emailValid) {
      setFeedback({ type: 'error', message: 'Please enter a valid recipient email address.' });
      return;
    }
    if (!renderedPreviewSubject.trim() || !renderedPreviewBody.trim()) {
      setFeedback({ type: 'error', message: 'Subject and email body cannot be empty.' });
      return;
    }

    setSending(true);
    setFeedback(null);
    const idempotencyKey = `single:${lead.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await fetch('/api/outreach/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          to: recipientEmail.trim(),
          subject: renderedPreviewSubject,
          body: renderedPreviewBody,
          templateId: selectedTemplateId || null,
          isHtml: true,
          confirmed: true,
          idempotencyKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to send email.',
        });
        return;
      }

      setFeedback({
        type: 'success',
        message: `Email sent successfully to ${recipientEmail}! Activity logged & CRM updated.`,
      });
      onSent?.();
    } catch {
      setFeedback({ type: 'error', message: 'Network error while sending email.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-crm-navyDeep/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-between bg-crm-lightGrey/30 dark:bg-crm-navyDeep/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-crm-sky/40 dark:bg-crm-blue/30 text-crm-blue dark:text-crm-sky flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-crm-navy dark:text-white truncate">
                Email Outreach — {lead.businessName}
              </h3>
              <p className="text-[11px] text-crm-indigo dark:text-crm-sky/80 truncate">
                {[lead.category, lead.city, lead.phone || lead.enrichedPhone].filter(Boolean).join(' • ') || 'Lead Contact'}
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
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {lead.doNotContact && (
            <div className="p-3 rounded-xl bg-crm-orangeRed/10 dark:bg-crm-orangeRed/20 border border-crm-orangeRed/30 text-crm-orangeRed dark:text-crm-coral flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Do Not Contact / Unsubscribed</p>
                <p className="text-[11px] opacity-90">
                  Sending is blocked while this lead is marked Do Not Contact. Clear the opt-out flag on the lead profile if the lead opted back in.
                </p>
              </div>
            </div>
          )}

          {smtpStatus && !smtpStatus.configured && (
            <div className="p-3 rounded-xl bg-crm-coral/15 dark:bg-crm-coral/15 border border-crm-coral/40 text-crm-navy dark:text-crm-coral flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-crm-orangeRed dark:text-crm-coral" />
                <div>
                  <p className="font-semibold">Gmail SMTP Not Configured Yet</p>
                  <p className="text-[11px] opacity-90">
                    You can draft and preview emails now, or add {smtpStatus.missingVars.join(', ')} in <code>.env</code> for live delivery.
                  </p>
                </div>
              </div>
              <Link
                href="/outreach?tab=settings"
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-crm-orangeRed text-white font-semibold hover:bg-crm-orangeRedDark transition text-[11px]"
              >
                <Settings className="w-3 h-3" /> Setup
              </Link>
            </div>
          )}

          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
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

          {mode === 'compose' ? (
            <>
              {/* Intelligent Recommendation Banner */}
              {recommendation && (
                <div className="p-3 rounded-xl bg-crm-sky/25 dark:bg-crm-blue/15 border border-crm-blue/30 dark:border-crm-periwinkle/30 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-start sm:items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle shrink-0 mt-0.5 sm:mt-0" />
                    <div className="min-w-0">
                      <span className="font-bold text-crm-navy dark:text-crm-sky">
                        Suggested: {recommendation.templateName}
                      </span>
                      <span className="text-[11px] text-crm-indigo dark:text-crm-sky/80 ml-1.5 hidden sm:inline">
                        &bull; {recommendation.reason}
                      </span>
                    </div>
                  </div>
                  {selectedTemplateId !== matchedRecTpl?.id && matchedRecTpl && (
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate(matchedRecTpl.id)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-crm-blue hover:bg-crm-navy text-white transition shrink-0 shadow-sm"
                    >
                      Use Recommended
                    </button>
                  )}
                </div>
              )}

              {/* Recipient Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                  />
                  {detectedEmails.valid.length > 1 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {detectedEmails.valid.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setRecipientEmail(em)}
                          className={`px-2 py-0.5 rounded-full text-[10px] border transition ${
                            recipientEmail === em
                              ? 'bg-crm-blue text-white border-crm-blue'
                              : 'bg-crm-lightGrey/40 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky border-crm-lightGrey dark:border-crm-sky/25'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1">
                    Email Template
                  </label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleSelectTemplate(e.target.value)}
                    disabled={loadingMeta}
                    className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                  >
                    <option value="">Custom Email</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category}){t.isDefault ? ' ★ Default' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject line..."
                  className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                />
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-crm-indigo dark:text-crm-sky">
                    Email Body
                  </label>
                  <span className="text-[10px] text-crm-indigo/80 dark:text-crm-sky/75 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Placeholders auto-resolved on send
                  </span>
                </div>
                <textarea
                  rows={9}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle leading-relaxed font-sans"
                />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {SUPPORTED_PLACEHOLDERS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setBody((prev) => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}${p.key}`)}
                      title={p.description}
                      className="px-2 py-0.5 rounded bg-crm-lightGrey/40 dark:bg-crm-navySurface hover:bg-crm-sky/40 dark:hover:bg-crm-blue/30 text-crm-navy dark:text-crm-sky text-[10px] font-mono border border-crm-lightGrey dark:border-crm-sky/25 transition"
                    >
                      {p.key}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Preview Mode */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-crm-indigo dark:text-crm-sky/80 uppercase font-semibold">Recipient</span>
                  <span className="font-semibold text-crm-navy dark:text-white">{recipientEmail || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-crm-indigo dark:text-crm-sky/80 uppercase font-semibold">Business</span>
                  <span className="text-crm-navy dark:text-crm-sky">{lead.businessName}</span>
                </div>
                <div className="pt-2 border-t border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-[11px] text-crm-indigo dark:text-crm-sky/80 uppercase font-semibold block mb-0.5">Subject</span>
                    <p className="text-sm font-bold text-crm-navy dark:text-white">{renderedPreviewSubject}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-crm-indigo dark:text-crm-sky/80 block">Sender Identity</span>
                    <span className="text-xs font-bold text-crm-navy dark:text-white">Jai Shankar &bull; 9842139997</span>
                  </div>
                </div>
              </div>

              {/* View Toggle Bar */}
              <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/20 pb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPreviewFormat('desktop')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      previewFormat === 'desktop'
                        ? 'bg-crm-blue text-white shadow-sm'
                        : 'bg-crm-lightGrey/30 dark:bg-crm-navyDeep text-crm-navy dark:text-crm-lightGrey hover:bg-crm-sky/20'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" /> Desktop (600px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFormat('mobile')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      previewFormat === 'mobile'
                        ? 'bg-crm-blue text-white shadow-sm'
                        : 'bg-crm-lightGrey/30 dark:bg-crm-navyDeep text-crm-navy dark:text-crm-lightGrey hover:bg-crm-sky/20'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile (360px)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFormat('text')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      previewFormat === 'text'
                        ? 'bg-crm-blue text-white shadow-sm'
                        : 'bg-crm-lightGrey/30 dark:bg-crm-navyDeep text-crm-navy dark:text-crm-lightGrey hover:bg-crm-sky/20'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" /> Plain-Text Fallback
                  </button>
                </div>
                <span className="text-[11px] text-crm-indigo dark:text-crm-sky/75 hidden sm:inline">
                  Simulating Gmail / Outlook rendering
                </span>
              </div>

              {previewFormat === 'text' ? (
                <div className="p-4 rounded-xl bg-white dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20 space-y-2">
                  <span className="text-[11px] text-crm-indigo dark:text-crm-sky/80 uppercase font-semibold block">
                    Plain-Text Alternative (Multipart Email Fallback)
                  </span>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-crm-navy dark:text-crm-lightGrey leading-relaxed bg-crm-lightGrey/15 dark:bg-crm-navyDeep/60 p-3 rounded-lg border border-crm-lightGrey/50 dark:border-crm-sky/15">
                    {compiledPreview.text}
                  </pre>
                </div>
              ) : (
                <div className="py-2 flex justify-center bg-crm-lightGrey/20 dark:bg-crm-navyDeep/50 rounded-xl p-2 border border-crm-lightGrey dark:border-crm-sky/20">
                  <div
                    className={`w-full transition-all duration-200 ${
                      previewFormat === 'mobile' ? 'max-w-[360px]' : 'max-w-[620px]'
                    }`}
                  >
                    <iframe
                      title="HTML Email Simulation Preview"
                      srcDoc={compiledPreview.html}
                      className="w-full h-[470px] rounded-xl border border-crm-lightGrey dark:border-crm-sky/30 bg-white shadow-sm"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-crm-lightGrey dark:border-crm-sky/20 bg-crm-lightGrey/30 dark:bg-crm-navyDeep/60 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-crm-navy dark:text-crm-sky hover:bg-crm-lightGrey/60 dark:hover:bg-crm-navySurface transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {mode === 'compose' ? (
              <button
                type="button"
                onClick={() => {
                  setFeedback(null);
                  setMode('preview');
                }}
                disabled={!emailValid || !subject.trim() || !body.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview Email
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMode('compose')}
                  disabled={sending}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-crm-sky/40 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-crm-sky text-xs font-semibold hover:bg-crm-sky/70 dark:hover:bg-crm-navyElevated transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={sending || Boolean(lead.doNotContact) || !emailValid}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-50 text-white text-xs font-bold shadow-md transition"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Confirm & Send Email
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

