'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import {
  Mail,
  MessageCircle,
  PhoneCall,
  CalendarClock,
  FileText,
  Send,
  Settings,
  BarChart3,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Star,
  CheckCircle2,
  AlertTriangle,
  Pause,
  Play,
  Square,
  Loader2,
  ExternalLink,
  RefreshCw,
  Store,
} from 'lucide-react';
import { SUPPORTED_PLACEHOLDERS, TEMPLATE_CATEGORIES } from '@/lib/outreach-utils';
import VendorManagementHub from '@/components/vendors/VendorManagementHub';

type TabKey = 'overview' | 'templates' | 'campaigns' | 'follow-ups' | 'settings' | 'vendors';

interface AnalyticsData {
  emailsSent: number;
  emailsFailed: number;
  whatsappOpened: number;
  whatsappConfirmedSent: number;
  callsCompleted: number;
  leadsContacted: number;
  contactedWonLeads: number;
  totalWonLeads: number;
  conversionRate: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  completedFollowUps: number;
  optedOutLeads: number;
  totalCampaigns: number;
}

interface RecentActivity {
  id: string;
  leadId: string;
  type: string;
  channel: string | null;
  recipient: string | null;
  subject: string | null;
  status: string | null;
  content: string;
  createdAt: string;
  lead: {
    id: string;
    businessName: string;
    city: string | null;
  };
}

interface EmailTemplateItem {
  id: string;
  name: string;
  category: string;
  subject: string;
  body: string;
  isDefault: boolean;
  updatedAt: string;
}

interface CampaignItem {
  id: string;
  name: string;
  channel: string;
  status: string;
  batchSize: number;
  delayMs: number;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  pendingCount: number;
  errorMessage?: string | null;
  createdAt: string;
}

interface FollowUpItem {
  id: string;
  leadId: string;
  dueAt: string;
  status: string;
  notes: string | null;
  isOverdue: boolean;
  lead: {
    id: string;
    businessName: string;
    city: string | null;
    email: string | null;
    phone: string | null;
    crmStatus: string;
  };
}

interface SmtpStatus {
  configured: boolean;
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  from: string;
  userMasked: string | null;
  hasPassword: boolean;
  missingVars: string[];
}

function OutreachHubContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabKey) || 'overview';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Overview state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  // Templates state
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [templateFilterCat, setTemplateFilterCat] = useState('ALL');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplCategory, setTplCategory] = useState<string>(TEMPLATE_CATEGORIES[0]);
  const [tplSubject, setTplSubject] = useState('');
  const [tplBody, setTplBody] = useState('');
  const [tplIsDefault, setTplIsDefault] = useState(false);
  const [tplSaving, setTplSaving] = useState(false);

  // Campaigns state
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);

  // Follow-ups state
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [followUpFilter, setFollowUpFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'COMPLETED'>('PENDING');
  const [followUpCounts, setFollowUpCounts] = useState({ pending: 0, overdue: 0, completed: 0 });

  // SMTP Settings state
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatus | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [verifyingSmtp, setVerifyingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{
    ok: boolean;
    message: string;
    hint?: string;
  } | null>(null);

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadAnalytics = useCallback(async () => {
    const res = await fetch('/api/outreach/analytics');
    const data = await res.json();
    if (data.success) {
      setAnalytics(data.analytics);
      setRecentActivities(data.recentOutreachActivities || []);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    const res = await fetch('/api/outreach/templates');
    const data = await res.json();
    if (data.success) {
      setTemplates(data.templates || []);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    const res = await fetch('/api/outreach/campaigns');
    const data = await res.json();
    if (data.success) {
      setCampaigns(data.campaigns || []);
    }
  }, []);

  const loadFollowUps = useCallback(async () => {
    const res = await fetch(`/api/outreach/follow-ups?status=${followUpFilter}`);
    const data = await res.json();
    if (data.success) {
      setFollowUps(data.followUps || []);
      setFollowUpCounts(data.counts || { pending: 0, overdue: 0, completed: 0 });
    }
  }, [followUpFilter]);

  const loadSmtpStatus = useCallback(async () => {
    const res = await fetch('/api/outreach/smtp');
    const data = await res.json();
    if (data.success) {
      setSmtpStatus(data.smtp);
    }
  }, []);

  useEffect(() => {
    const qTab = searchParams.get('tab') as TabKey | null;
    if (qTab && ['overview', 'templates', 'campaigns', 'follow-ups', 'settings', 'vendors'].includes(qTab)) {
      setActiveTab(qTab);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadAnalytics();
    void loadTemplates();
    void loadCampaigns();
    void loadSmtpStatus();
  }, [loadAnalytics, loadTemplates, loadCampaigns, loadSmtpStatus]);

  useEffect(() => {
    void loadFollowUps();
  }, [loadFollowUps]);

  const resetTemplateForm = () => {
    setEditingTemplateId(null);
    setTplName('');
    setTplCategory(TEMPLATE_CATEGORIES[0]);
    setTplSubject('');
    setTplBody('');
    setTplIsDefault(false);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTplSaving(true);
    setBanner(null);
    try {
      const url = editingTemplateId
        ? `/api/outreach/templates/${editingTemplateId}`
        : '/api/outreach/templates';
      const method = editingTemplateId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tplName,
          category: tplCategory,
          subject: tplSubject,
          body: tplBody,
          isDefault: tplIsDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBanner({ type: 'error', message: data.error || 'Could not save template.' });
        return;
      }
      setBanner({
        type: 'success',
        message: editingTemplateId ? 'Template updated successfully.' : 'Template created successfully.',
      });
      resetTemplateForm();
      await loadTemplates();
    } finally {
      setTplSaving(false);
    }
  };

  const handleTemplateAction = async (
    id: string,
    action: 'edit' | 'duplicate' | 'set_default' | 'delete',
    tpl?: EmailTemplateItem
  ) => {
    setBanner(null);
    if (action === 'edit' && tpl) {
      setEditingTemplateId(tpl.id);
      setTplName(tpl.name);
      setTplCategory(tpl.category);
      setTplSubject(tpl.subject);
      setTplBody(tpl.body);
      setTplIsDefault(tpl.isDefault);
      return;
    }
    if (action === 'duplicate') {
      await fetch(`/api/outreach/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate' }),
      });
      await loadTemplates();
      return;
    }
    if (action === 'set_default') {
      await fetch(`/api/outreach/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      await loadTemplates();
      return;
    }
    if (action === 'delete') {
      await fetch(`/api/outreach/templates/${id}`, { method: 'DELETE' });
      if (editingTemplateId === id) resetTemplateForm();
      await loadTemplates();
    }
  };

  const handleCampaignControl = async (id: string, action: 'PAUSE' | 'RESUME' | 'STOP') => {
    await fetch(`/api/outreach/campaigns/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    await loadCampaigns();
  };

  const handleFollowUpStatus = async (id: string, status: 'COMPLETED' | 'CANCELLED') => {
    await fetch(`/api/outreach/follow-ups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await Promise.all([loadFollowUps(), loadAnalytics()]);
  };

  const handleVerifySmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await fetch('/api/outreach/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testRecipient: testRecipient.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setSmtpTestResult({
          ok: true,
          message: testRecipient.trim()
            ? `SMTP verified and test email sent to ${testRecipient.trim()}!`
            : 'SMTP connection and authentication verified successfully!',
          hint: data.verification?.hint,
        });
      } else {
        setSmtpTestResult({
          ok: false,
          message: data.verification?.error || data.testEmail?.error || data.error || 'Verification failed.',
          hint: data.verification?.hint,
        });
      }
      await loadSmtpStatus();
    } catch {
      setSmtpTestResult({ ok: false, message: 'Network error testing SMTP connection.' });
    } finally {
      setVerifyingSmtp(false);
    }
  };

  const filteredTemplates =
    templateFilterCat === 'ALL'
      ? templates
      : templates.filter((t) => t.category === templateFilterCat);

  const tabs: Array<{ id: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Analytics & Activity', icon: BarChart3 },
    { id: 'templates', label: `Email Templates (${templates.length})`, icon: FileText },
    { id: 'campaigns', label: `Bulk Campaigns (${campaigns.length})`, icon: Send },
    { id: 'follow-ups', label: `Follow-Ups (${followUpCounts.pending})`, icon: CalendarClock },
    { id: 'settings', label: 'Gmail SMTP Settings', icon: Settings },
    { id: 'vendors', label: 'Hardware Vendors & Enquiries', icon: Store },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Outreach Hub"
        subtitle="Multi-channel email campaigns, reusable templates, follow-up schedule & Gmail SMTP delivery"
        action={
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-crm-blue hover:bg-crm-navy text-white text-xs font-semibold shadow-sm transition"
          >
            Select Leads for Outreach
          </Link>
        }
      />

      <div className="p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-crm-lightGrey dark:border-crm-sky/20 pb-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  active
                    ? 'bg-crm-blue text-white shadow-sm'
                    : 'bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy/80 dark:text-crm-lightGrey hover:bg-crm-sky/20 dark:hover:bg-crm-navySurface'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {banner && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              banner.type === 'success'
                ? 'bg-crm-sky/35 dark:bg-crm-blue/25 border-crm-blue/30 dark:border-crm-periwinkle/30 text-crm-navy dark:text-crm-sky'
                : 'bg-crm-orangeRed/15 dark:bg-crm-orangeRed/20 border-crm-orangeRed/30 text-crm-orangeRed dark:text-crm-coral'
            }`}
          >
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
        )}

        {/* TAB 1: ANALYTICS OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20">
                <div className="flex items-center justify-between text-xs text-crm-indigo dark:text-crm-periwinkle">
                  <span>Emails Delivered</span>
                  <Mail className="w-4 h-4 text-crm-blue dark:text-crm-sky" />
                </div>
                <p className="text-2xl font-bold text-crm-navy dark:text-white mt-2">
                  {analytics?.emailsSent ?? 0}
                </p>
                <p className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/75 mt-1">
                  Failed attempts: {analytics?.emailsFailed ?? 0}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20">
                <div className="flex items-center justify-between text-xs text-crm-indigo dark:text-crm-periwinkle">
                  <span>WhatsApp Confirmed Sent</span>
                  <MessageCircle className="w-4 h-4 text-crm-indigo dark:text-crm-periwinkle" />
                </div>
                <p className="text-2xl font-bold text-crm-navy dark:text-white mt-2">
                  {analytics?.whatsappConfirmedSent ?? 0}
                </p>
                <p className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/75 mt-1">
                  Chats opened (unconfirmed): {analytics?.whatsappOpened ?? 0}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20">
                <div className="flex items-center justify-between text-xs text-crm-indigo dark:text-crm-periwinkle">
                  <span>Calls & Leads Contacted</span>
                  <PhoneCall className="w-4 h-4 text-crm-periwinkle" />
                </div>
                <p className="text-2xl font-bold text-crm-navy dark:text-white mt-2">
                  {analytics?.leadsContacted ?? 0}
                </p>
                <p className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/75 mt-1">
                  Calls completed: {analytics?.callsCompleted ?? 0} • Won Conv: {analytics?.conversionRate ?? 0}%
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20">
                <div className="flex items-center justify-between text-xs text-crm-indigo dark:text-crm-periwinkle">
                  <span>Pending Follow-Ups</span>
                  <CalendarClock className="w-4 h-4 text-crm-coral" />
                </div>
                <p className="text-2xl font-bold text-crm-navy dark:text-white mt-2">
                  {analytics?.pendingFollowUps ?? 0}
                </p>
                <p className="text-[11px] text-crm-orangeRed dark:text-crm-coral mt-1">
                  Overdue: {analytics?.overdueFollowUps ?? 0} • Completed: {analytics?.completedFollowUps ?? 0}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-crm-navy dark:text-white">Recent Outreach Activity</h2>
                <button
                  onClick={() => void loadAnalytics()}
                  className="inline-flex items-center gap-1 text-xs text-crm-blue dark:text-crm-periwinkle hover:underline font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {recentActivities.length === 0 ? (
                <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/70 py-8 text-center">
                  No outreach communications recorded yet. Open any lead or select leads in All Leads to begin.
                </p>
              ) : (
                <div className="divide-y divide-crm-lightGrey dark:divide-crm-sky/15">
                  {recentActivities.map((act) => (
                    <div key={act.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/leads/${act.leadId}`}
                            className="font-semibold text-crm-blue dark:text-crm-periwinkle hover:underline"
                          >
                            {act.lead.businessName}
                          </Link>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-crm-lightGrey/50 dark:bg-crm-navySurface text-crm-navy dark:text-crm-lightGrey">
                            {act.channel || act.type}
                          </span>
                          {act.status && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                act.status === 'SENT' || act.status === 'CONFIRMED_SENT' || act.status === 'COMPLETED'
                                  ? 'bg-crm-sky/35 dark:bg-crm-blue/25 text-crm-navy dark:text-crm-sky'
                                  : act.status === 'FAILED'
                                  ? 'bg-crm-orangeRed/15 dark:bg-crm-orangeRed/20 text-crm-orangeRed dark:text-crm-coral'
                                  : 'bg-crm-coral/20 text-crm-navy dark:text-crm-coral'
                              }`}
                            >
                              {act.status}
                            </span>
                          )}
                        </div>
                        <p className="text-crm-navy/80 dark:text-crm-lightGrey mt-1">{act.content}</p>
                      </div>
                      <span className="text-[11px] text-crm-indigo/80 dark:text-crm-lightGrey/65 shrink-0">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TEMPLATES CRUD */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleSaveTemplate}
              className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-4 text-xs h-fit"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
                  {editingTemplateId ? 'Edit Email Template' : 'Create Email Template'}
                </h2>
                {editingTemplateId && (
                  <button type="button" onClick={resetTemplateForm} className="text-crm-blue dark:text-crm-periwinkle hover:underline">
                    Cancel Edit
                  </button>
                )}
              </div>

              <div>
                <label className="block font-semibold text-crm-indigo dark:text-crm-periwinkle mb-1">Template Name</label>
                <input
                  required
                  type="text"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="e.g. SEO Audit Pitch"
                  className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-crm-indigo dark:text-crm-periwinkle mb-1">Category</label>
                <select
                  value={tplCategory}
                  onChange={(e) => setTplCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                >
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-crm-indigo dark:text-crm-periwinkle mb-1">Subject</label>
                <input
                  required
                  type="text"
                  value={tplSubject}
                  onChange={(e) => setTplSubject(e.target.value)}
                  placeholder="Quick idea for {{businessName}}"
                  className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-crm-indigo dark:text-crm-periwinkle mb-1">Email Body</label>
                <textarea
                  required
                  rows={8}
                  value={tplBody}
                  onChange={(e) => setTplBody(e.target.value)}
                  placeholder="Hello {{contactName}}, ..."
                  className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                />
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {SUPPORTED_PLACEHOLDERS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setTplBody((prev) => `${prev}${prev ? ' ' : ''}${p.key}`)}
                      className="px-1.5 py-0.5 rounded bg-crm-lightGrey/45 dark:bg-crm-navySurface text-[10px] font-mono text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25"
                    >
                      {p.key}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tplIsDefault}
                  onChange={(e) => setTplIsDefault(e.target.checked)}
                  className="rounded border-crm-lightGrey text-crm-blue accent-crm-blue"
                />
                <span className="text-crm-navy dark:text-crm-lightGrey font-medium">Set as default outreach template</span>
              </label>

              <button
                type="submit"
                disabled={tplSaving}
                className="w-full py-2.5 rounded-xl bg-crm-blue hover:bg-crm-navy text-white font-bold shadow-sm transition"
              >
                {tplSaving ? 'Saving...' : editingTemplateId ? 'Update Template' : 'Save Template'}
              </button>
            </form>

            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <select
                  value={templateFilterCat}
                  onChange={(e) => setTemplateFilterCat(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 text-xs text-crm-navy dark:text-white"
                >
                  <option value="ALL">All Categories ({templates.length})</option>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {filteredTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-crm-navy dark:text-white">{tpl.name}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-crm-sky/35 dark:bg-crm-indigo/30 text-crm-indigo dark:text-crm-periwinkle">
                            {tpl.category}
                          </span>
                          {tpl.isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-crm-coral/20 text-crm-navy dark:text-crm-coral">
                              ★ Default
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-crm-navy/85 dark:text-crm-lightGrey mt-1">
                          Subject: {tpl.subject}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!tpl.isDefault && (
                          <button
                            onClick={() => handleTemplateAction(tpl.id, 'set_default')}
                            title="Set Default"
                            className="p-1.5 rounded-lg hover:bg-crm-coral/15 text-crm-indigo/70 dark:text-crm-lightGrey/65 hover:text-crm-coral"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleTemplateAction(tpl.id, 'duplicate')}
                          title="Duplicate Template"
                          className="p-1.5 rounded-lg hover:bg-crm-sky/30 dark:hover:bg-crm-navySurface text-crm-indigo/70 dark:text-crm-lightGrey/65 hover:text-crm-navy dark:hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleTemplateAction(tpl.id, 'edit', tpl)}
                          title="Edit Template"
                          className="p-1.5 rounded-lg hover:bg-crm-sky/30 dark:hover:bg-crm-navySurface text-crm-indigo/70 dark:text-crm-lightGrey/65 hover:text-crm-blue dark:hover:text-crm-periwinkle"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleTemplateAction(tpl.id, 'delete')}
                          title="Delete Template"
                          className="p-1.5 rounded-lg hover:bg-crm-orangeRed/15 text-crm-indigo/70 dark:text-crm-lightGrey/65 hover:text-crm-orangeRed dark:hover:text-crm-coral"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <pre className="whitespace-pre-wrap font-sans text-[11px] text-crm-indigo/85 dark:text-crm-lightGrey/75 line-clamp-3">
                      {tpl.body}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BULK CAMPAIGNS */}
        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-crm-navy dark:text-white">Outreach Campaigns & Queues</h2>
              <button
                onClick={() => void loadCampaigns()}
                className="inline-flex items-center gap-1 text-xs text-crm-blue dark:text-crm-periwinkle hover:underline font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {campaigns.length === 0 ? (
              <div className="p-10 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 text-center text-xs text-crm-indigo dark:text-crm-lightGrey/70">
                No bulk campaigns created yet. Select multiple leads in{' '}
                <Link href="/leads" className="text-crm-blue dark:text-crm-periwinkle underline">
                  All Leads
                </Link>{' '}
                to launch Bulk Email or Guided WhatsApp Outreach.
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 flex flex-wrap items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-crm-navy dark:text-white">{camp.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-crm-lightGrey/50 dark:bg-crm-navySurface text-crm-navy dark:text-crm-lightGrey">
                          {camp.channel}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            camp.status === 'COMPLETED'
                              ? 'bg-crm-sky/35 dark:bg-crm-blue/25 text-crm-navy dark:text-crm-sky'
                              : camp.status === 'RUNNING'
                              ? 'bg-crm-periwinkle/25 text-crm-blue dark:text-crm-periwinkle'
                              : 'bg-crm-coral/20 text-crm-navy dark:text-crm-coral'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </div>
                      <p className="text-crm-indigo/85 dark:text-crm-lightGrey/75">
                        Sent: <strong className="text-crm-blue dark:text-crm-sky">{camp.sentCount}</strong> • Failed:{' '}
                        <strong className="text-crm-orangeRed dark:text-crm-coral">{camp.failedCount}</strong> • Skipped:{' '}
                        <strong>{camp.skippedCount}</strong> • Pending: <strong>{camp.pendingCount}</strong> (Total{' '}
                        {camp.totalRecipients})
                      </p>
                      {camp.errorMessage && <p className="text-crm-orangeRed dark:text-crm-coral">{camp.errorMessage}</p>}
                    </div>

                    {camp.channel === 'EMAIL' && (
                      <div className="flex items-center gap-2">
                        {camp.status === 'RUNNING' && (
                          <button
                            onClick={() => handleCampaignControl(camp.id, 'PAUSE')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-crm-indigo hover:bg-crm-navy text-white font-semibold"
                          >
                            <Pause className="w-3.5 h-3.5" /> Pause
                          </button>
                        )}
                        {camp.status === 'PAUSED' && (
                          <button
                            onClick={() => handleCampaignControl(camp.id, 'RESUME')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy text-white font-semibold"
                          >
                            <Play className="w-3.5 h-3.5" /> Resume
                          </button>
                        )}
                        {['RUNNING', 'PAUSED'].includes(camp.status) && (
                          <button
                            onClick={() => handleCampaignControl(camp.id, 'STOP')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-crm-orangeRed hover:bg-crm-orangeRedDark text-white font-semibold"
                          >
                            <Square className="w-3.5 h-3.5" /> Stop
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FOLLOW-UPS */}
        {activeTab === 'follow-ups' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {(['PENDING', 'OVERDUE', 'COMPLETED', 'ALL'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFollowUpFilter(status)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    followUpFilter === status
                      ? 'bg-crm-blue text-white border-crm-blue'
                      : 'bg-white dark:bg-crm-navy border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy/80 dark:text-crm-lightGrey'
                  }`}
                >
                  {status === 'PENDING'
                    ? `Pending (${followUpCounts.pending})`
                    : status === 'OVERDUE'
                    ? `Overdue (${followUpCounts.overdue})`
                    : status === 'COMPLETED'
                    ? `Completed (${followUpCounts.completed})`
                    : 'All Follow-Ups'}
                </button>
              ))}
            </div>

            {followUps.length === 0 ? (
              <div className="p-10 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 text-center text-xs text-crm-indigo dark:text-crm-lightGrey/70">
                No follow-ups matching this filter. Schedule follow-ups from any Lead Profile page.
              </div>
            ) : (
              <div className="space-y-3">
                {followUps.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 flex flex-wrap items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/leads/${item.lead.id}`}
                          className="font-bold text-sm text-crm-blue dark:text-crm-periwinkle hover:underline flex items-center gap-1"
                        >
                          {item.lead.businessName} <ExternalLink className="w-3 h-3" />
                        </Link>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'COMPLETED'
                              ? 'bg-crm-sky/35 dark:bg-crm-blue/25 text-crm-navy dark:text-crm-sky'
                              : item.isOverdue
                              ? 'bg-crm-orangeRed/15 dark:bg-crm-orangeRed/20 text-crm-orangeRed dark:text-crm-coral'
                              : 'bg-crm-coral/20 text-crm-navy dark:text-crm-coral'
                          }`}
                        >
                          {item.isOverdue ? 'OVERDUE' : item.status}
                        </span>
                      </div>
                      <p className="text-crm-indigo/85 dark:text-crm-lightGrey/75">
                        Due: <strong>{new Date(item.dueAt).toLocaleDateString()}</strong> •{' '}
                        {item.lead.city || 'No city'} • {item.lead.phone || item.lead.email || 'No contact'}
                      </p>
                      {item.notes && <p className="text-crm-navy/85 dark:text-crm-lightGrey">{item.notes}</p>}
                    </div>

                    {item.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleFollowUpStatus(item.id, 'COMPLETED')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy text-white font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
                        </button>
                        <button
                          onClick={() => handleFollowUpStatus(item.id, 'CANCELLED')}
                          className="px-3 py-1.5 rounded-lg bg-crm-lightGrey/50 dark:bg-crm-navySurface text-crm-navy dark:text-crm-lightGrey font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: GMAIL SMTP SETTINGS & SETUP GUIDE */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            <div className="p-6 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-crm-navy dark:text-white">Gmail SMTP Connection Status</h2>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    smtpStatus?.configured
                      ? 'bg-crm-sky/35 dark:bg-crm-blue/25 text-crm-navy dark:text-crm-sky'
                      : 'bg-crm-coral/20 text-crm-navy dark:text-crm-coral'
                  }`}
                >
                  {smtpStatus?.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20 space-y-2">
                <div className="flex justify-between">
                  <span className="text-crm-indigo dark:text-crm-periwinkle">Provider</span>
                  <span className="font-mono font-semibold text-crm-navy dark:text-white">
                    {smtpStatus?.provider || 'gmail_smtp'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-crm-indigo dark:text-crm-periwinkle">Host & Port</span>
                  <span className="font-mono text-crm-navy dark:text-white">
                    {smtpStatus?.host || 'smtp.gmail.com'}:{smtpStatus?.port || 587} (TLS: {String(smtpStatus?.secure)})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-crm-indigo dark:text-crm-periwinkle">SMTP User</span>
                  <span className="font-mono text-crm-navy dark:text-white">{smtpStatus?.userMasked || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-crm-indigo dark:text-crm-periwinkle">App Password</span>
                  <span className="font-mono text-crm-navy dark:text-white">
                    {smtpStatus?.hasPassword ? '•••••••••••• (Set securely on server)' : 'Not set'}
                  </span>
                </div>
                {smtpStatus && smtpStatus.missingVars.length > 0 && (
                  <p className="text-crm-orangeRed dark:text-crm-coral pt-1">
                    Missing env variables: {smtpStatus.missingVars.join(', ')}
                  </p>
                )}
              </div>

              <form onSubmit={handleVerifySmtp} className="space-y-3 pt-2">
                <div>
                  <label className="block font-semibold text-crm-indigo dark:text-crm-periwinkle mb-1">
                    Optional Test Recipient Email (leave blank to verify auth only)
                  </label>
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="your-test-inbox@gmail.com"
                    className="w-full px-3 py-2 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={verifyingSmtp}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white font-bold shadow-sm transition"
                >
                  {verifyingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Test SMTP Connection & Delivery
                </button>
              </form>

              {smtpTestResult && (
                <div
                  className={`p-3 rounded-xl border ${
                    smtpTestResult.ok
                      ? 'bg-crm-sky/35 dark:bg-crm-blue/25 border-crm-blue/30 dark:border-crm-periwinkle/30 text-crm-navy dark:text-crm-sky'
                      : 'bg-crm-orangeRed/15 dark:bg-crm-orangeRed/20 border-crm-orangeRed/30 text-crm-orangeRed dark:text-crm-coral'
                  }`}
                >
                  <p className="font-semibold">{smtpTestResult.message}</p>
                  {smtpTestResult.hint && <p className="mt-1 opacity-90">{smtpTestResult.hint}</p>}
                </div>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-3">
              <h2 className="text-sm font-bold text-crm-navy dark:text-white">
                How to Configure Gmail SMTP (Google App Password)
              </h2>
              <ol className="list-decimal list-inside space-y-2 text-crm-navy/85 dark:text-crm-lightGrey leading-relaxed">
                <li>
                  Enable <strong>2-Step Verification</strong> on the Google Account you want to send from (Google Account → Security).
                </li>
                <li>
                  Open Google <strong>App Passwords</strong> (under Security → 2-Step Verification), select app name{' '}
                  <code>LeadPilot</code>, and generate a 16-character App Password.
                </li>
                <li>
                  Add these environment variables to your server <code>.env</code> file (never commit <code>.env</code>):
                </li>
              </ol>
              <pre className="p-3 rounded-xl bg-crm-navyDeep text-crm-lightGrey font-mono text-[11px] overflow-x-auto border border-crm-sky/20">
{`EMAIL_PROVIDER="gmail_smtp"
EMAIL_FROM="LeadPilot Team <yourname@gmail.com>"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="yourname@gmail.com"
SMTP_PASSWORD="your-16-char-google-app-password"`}
              </pre>
              <p className="text-crm-indigo/85 dark:text-crm-lightGrey/75">
                Restart the Next.js server after updating <code>.env</code>, then click <strong>Test SMTP Connection</strong> to confirm live delivery.
              </p>
            </div>
          </div>
        )}

        {/* TAB 6: VENDOR MANAGEMENT & COMPONENT ENQUIRIES */}
        {activeTab === 'vendors' && (
          <VendorManagementHub />
        )}
      </div>
    </div>
  );
}

export default function OutreachPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 text-center text-xs text-crm-indigo dark:text-crm-periwinkle">Loading Outreach Hub...</div>
      }
    >
      <OutreachHubContent />
    </Suspense>
  );
}

