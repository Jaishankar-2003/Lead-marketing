'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  Save,
  Trash2,
  ExternalLink,
  Wrench,
  Code,
  Sparkles,
  Clock,
  CheckCircle2,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Send,
  MessageSquare,
  History,
  RefreshCw,
  PhoneCall,
  CalendarPlus,
  AlertTriangle,
  Check,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Layers,
  FileText,
  XCircle,
  AlertCircle,
  Share2,
  Lightbulb,
  CheckCircle,
  Activity,
  Copy,
  MessageCircle,
  ShieldOff
} from 'lucide-react';
import EmailComposerModal from '@/components/outreach/EmailComposerModal';
import WhatsAppModal from '@/components/outreach/WhatsAppModal';
import { extractLeadEmails, extractLeadPhones } from '@/lib/outreach-utils';

export default function LeadDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [lead, setLead] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // SEO Accordion States (Additive)
  const [expandedSeoCategory, setExpandedSeoCategory] = useState<string | null>('ssr');
  const [showMissingSamples, setShowMissingSamples] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Form states
  const [crmStatus, setCrmStatus] = useState('NEW');
  const [notes, setNotes] = useState('');
  const [nextFollowUpAt, setNextFollowUpAt] = useState('');
  const [lastContactedAt, setLastContactedAt] = useState('');

  // Editable fields
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    businessName: '',
    category: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    state: '',
  });

  // Activity log input
  const [activityType, setActivityType] = useState('NOTE');
  const [activityContent, setActivityContent] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Outreach states (Additive)
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [leadFollowUps, setLeadFollowUps] = useState<any[]>([]);
  const [followUpDateInput, setFollowUpDateInput] = useState('');
  const [followUpNotesInput, setFollowUpNotesInput] = useState('');
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [updatingOptOut, setUpdatingOptOut] = useState(false);

  const fetchLeadFollowUps = async () => {
    try {
      const res = await fetch(`/api/outreach/follow-ups?leadId=${params.id}&status=ALL`);
      const data = await res.json();
      if (data.success) setLeadFollowUps(data.followUps || []);
    } catch {
      // Non-blocking
    }
  };

  const fetchLead = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/leads/${params.id}`);
      const data = await res.json();
      if (data.success) {
        const item = data.data;
        setLead(item);
        setCrmStatus(item.crmStatus);
        setNotes(item.notes || '');
        setNextFollowUpAt(
          item.nextFollowUpAt ? new Date(item.nextFollowUpAt).toISOString().split('T')[0] : ''
        );
        setLastContactedAt(
          item.lastContactedAt ? new Date(item.lastContactedAt).toISOString().split('T')[0] : ''
        );
        setEditForm({
          businessName: item.businessName || '',
          category: item.category || '',
          phone: item.phone || '',
          email: item.email || '',
          website: item.website || '',
          address: item.address || '',
          city: item.city || '',
          state: item.state || '',
        });
      } else {
        alert(data.error || 'Lead not found');
        router.push('/leads');
      }
    } catch (err) {
      console.error('Failed to fetch lead:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
    fetchLeadFollowUps();
  }, [params.id]);

  const handleCopyText = async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1600);
  };

  const handleLogCallCompleted = async (phoneNumber: string) => {
    if (!lead) return;
    const res = await fetch('/api/outreach/whatsapp/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        action: 'CALL_COMPLETED',
        recipient: phoneNumber,
        notes: 'Logged from Lead Profile',
      }),
    });
    const data = await res.json();
    if (data.success) {
      setMessage(`Logged phone call to ${phoneNumber} and updated CRM status.`);
      await fetchLead();
    } else {
      setMessage(data.error || 'Could not log call.');
    }
  };

  const handleToggleOptOut = async () => {
    if (!lead) return;
    setUpdatingOptOut(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/opt-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doNotContact: !lead.doNotContact }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(
          data.lead.doNotContact
            ? 'Lead marked as Do Not Contact.'
            : 'Do Not Contact flag cleared.'
        );
        await fetchLead();
      }
    } finally {
      setUpdatingOptOut(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !followUpDateInput) return;
    setSavingFollowUp(true);
    try {
      const res = await fetch('/api/outreach/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          dueAt: new Date(followUpDateInput).toISOString(),
          notes: followUpNotesInput,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFollowUpDateInput('');
        setFollowUpNotesInput('');
        setMessage('Follow-up scheduled successfully.');
        await Promise.all([fetchLead(), fetchLeadFollowUps()]);
      }
    } finally {
      setSavingFollowUp(false);
    }
  };

  const handleCompleteFollowUp = async (followUpId: string) => {
    await fetch(`/api/outreach/follow-ups/${followUpId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    await Promise.all([fetchLead(), fetchLeadFollowUps()]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const payload: any = {
        crmStatus,
        notes,
        nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null,
        lastContactedAt: lastContactedAt ? new Date(lastContactedAt).toISOString() : null,
      };

      if (isEditing) {
        payload.businessName = editForm.businessName;
        payload.category = editForm.category;
        payload.phone = editForm.phone;
        payload.email = editForm.email;
        payload.website = editForm.website;
        payload.address = editForm.address;
        payload.city = editForm.city;
        payload.state = editForm.state;
      }

      const res = await fetch(`/api/leads/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setLead(data.data);
        setIsEditing(false);
        setMessage('Changes saved successfully!');
        setTimeout(() => setMessage(null), 3500);
      } else {
        alert(data.error || 'Failed to update lead');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityContent.trim()) return;

    try {
      const res = await fetch(`/api/leads/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newActivity: {
            type: activityType,
            content: activityContent.trim(),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLead(data.data);
        setActivityContent('');
        setMessage('Activity logged.');
        setTimeout(() => setMessage(null), 2500);
      }
    } catch (err) {
      console.error('Failed to add activity:', err);
    }
  };

  const handleEnrichWebsite = async () => {
    try {
      setEnriching(true);
      setMessage(null);

      const res = await fetch(`/api/leads/${params.id}/enrich`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setLead(data.data);
        setMessage('Website analysis and enrichment completed!');
        setTimeout(() => setMessage(null), 3500);
      } else {
        alert(data.error || 'Enrichment failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEnriching(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(`/api/leads/${params.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/leads');
      } else {
        alert(data.error || 'Delete failed');
        setDeleting(false);
      }
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-crm-indigo dark:text-crm-sky">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-crm-blue dark:text-crm-periwinkle" />
        <span>Loading lead profile...</span>
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title={lead.businessName}
        subtitle={`${lead.category || 'General Business'} • ${lead.city || 'Madurai'}`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/leads"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-crm-sky/40 hover:bg-crm-sky/70 dark:bg-crm-navySurface dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25 transition shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Leads
            </Link>
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-crm-blue hover:bg-crm-navy text-white transition shadow-sm"
              title="Compose Email Outreach"
            >
              <Mail className="w-3.5 h-3.5" /> Email
            </button>
            <button
              onClick={() => setShowWhatsAppModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-crm-indigo hover:bg-crm-navy text-white transition shadow-sm"
              title="Open WhatsApp Outreach"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-1.5 rounded-lg bg-crm-orangeRed/10 hover:bg-crm-orangeRed/20 text-crm-orangeRed dark:text-crm-coral border border-crm-orangeRed/30 transition"
              title="Delete Lead"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-crm-blue hover:bg-crm-navy text-white transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      />

      {message && (
        <div className="bg-crm-sky/35 dark:bg-crm-blue/20 border-b border-crm-blue/30 dark:border-crm-periwinkle/30 px-8 py-2.5 text-xs font-medium text-crm-navy dark:text-crm-sky flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
            <span>{message}</span>
          </div>
        </div>
      )}

      <div className="p-8 space-y-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Fit & Opportunity Banner */}
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 bg-gradient-to-r from-white to-crm-sky/25 dark:from-crm-navy dark:to-crm-navySurface">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-crm-indigo dark:text-crm-sky/80">
                  Business Opportunity Analysis
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-crm-indigo/15 dark:bg-crm-periwinkle/20 text-crm-indigo dark:text-crm-periwinkle border border-crm-indigo/30 dark:border-crm-periwinkle/30">
                  {lead.serviceProspect.replace('_', ' ')}
                </span>
              </div>
              <p className="mt-3 text-sm text-crm-navy dark:text-white font-medium">
                {lead.prospectReason || 'Standard business prospect.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {lead.serviceProspect === 'PC_SUPPORT' || lead.serviceProspect === 'BOTH' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-crm-coral/20 text-crm-navy dark:text-crm-coral border border-crm-coral/40">
                    <Wrench className="w-3.5 h-3.5" /> Pitch PC Repair &amp; IT Maintenance
                  </span>
                ) : null}
                {lead.serviceProspect === 'WEBSITE_DEV' || lead.serviceProspect === 'BOTH' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-crm-sky/35 dark:bg-crm-blue/25 text-crm-navy dark:text-crm-sky border border-crm-blue/30 dark:border-crm-periwinkle/30">
                    <Code className="w-3.5 h-3.5" /> Pitch Modern Website &amp; Landing Page
                  </span>
                ) : null}
              </div>
            </div>

            {/* Website Enrichment Card (Phase 5) */}
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
              <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/20 pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
                  <h3 className="text-sm font-bold text-crm-navy dark:text-white">Website Intelligence &amp; Enrichment</h3>
                </div>
                {lead.website && (
                  <button
                    onClick={handleEnrichWebsite}
                    disabled={enriching}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-crm-sky/40 dark:bg-crm-blue/25 hover:bg-crm-sky/70 dark:hover:bg-crm-blue/40 text-crm-navy dark:text-crm-sky border border-crm-blue/30 dark:border-crm-periwinkle/30 text-xs font-semibold disabled:opacity-40 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${enriching ? 'animate-spin' : ''}`} />
                    {enriching ? 'Crawling Website...' : 'Enrich Website'}
                  </button>
                )}
              </div>

              {!lead.website ? (
                <div className="p-4 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20 text-xs text-crm-indigo dark:text-crm-sky/80">
                  <span className="text-crm-orangeRed dark:text-crm-coral font-semibold block mb-1">No Website Recorded</span>
                  This business has no registered website. Primary service prospect for Website Design &amp; Development.
                </div>
              ) : lead.websiteStatus ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                    <span className="text-crm-indigo dark:text-crm-sky/80 block font-medium">Availability</span>
                    <span
                      className={`inline-flex items-center gap-1 mt-1 font-bold ${
                        lead.websiteStatus === 'ONLINE' ? 'text-crm-blue dark:text-crm-periwinkle' : 'text-crm-orangeRed dark:text-crm-coral'
                      }`}
                    >
                      {lead.websiteStatus}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                    <span className="text-crm-indigo dark:text-crm-sky/80 block font-medium">SSL Security</span>
                    <span className="inline-flex items-center gap-1 mt-1 font-semibold text-crm-navy dark:text-white">
                      {lead.isHttps ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" /> HTTPS Valid
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-crm-orangeRed dark:text-crm-coral" /> Insecure / HTTP
                        </>
                      )}
                    </span>
                  </div>

                  <div className="sm:col-span-2 p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                    <span className="text-crm-indigo dark:text-crm-sky/80 block font-medium">Discovered Page Title</span>
                    <p className="mt-1 text-crm-navy dark:text-white font-medium">{lead.pageTitle || 'N/A'}</p>
                  </div>

                  {lead.aboutUrl && (
                    <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                      <span className="text-crm-indigo dark:text-crm-sky/80 block font-medium">About Page</span>
                      <a
                        href={lead.aboutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-crm-blue dark:text-crm-periwinkle hover:underline flex items-center gap-1 truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{lead.aboutUrl}</span>
                      </a>
                    </div>
                  )}

                  {lead.contactUrl && (
                    <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                      <span className="text-crm-indigo dark:text-crm-sky/80 block font-medium">Contact Page</span>
                      <a
                        href={lead.contactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-crm-blue dark:text-crm-periwinkle hover:underline flex items-center gap-1 truncate"
                      >
                        <ExternalLink className="w-3 h-3 shrink-0" />
                        <span className="truncate">{lead.contactUrl}</span>
                      </a>
                    </div>
                  )}

                  {lead.enrichedEmail && (
                    <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                      <span className="text-crm-indigo dark:text-crm-sky/80 block font-medium">Extracted Public Email</span>
                      <span className="mt-1 text-crm-blue dark:text-crm-sky font-semibold">{lead.enrichedEmail}</span>
                    </div>
                  )}

                  {lead.enrichedPhone && (
                    <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                      <span className="text-crm-indigo dark:text-crm-sky/80 block font-medium">Extracted Public Phone</span>
                      <span className="mt-1 text-crm-blue dark:text-crm-sky font-semibold">{lead.enrichedPhone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20 text-xs text-crm-indigo dark:text-crm-sky/80 flex items-center justify-between">
                  <span>Website URL present: <code className="text-crm-blue dark:text-crm-periwinkle">{lead.website}</code></span>
                  <span className="text-crm-indigo/80 dark:text-crm-sky/70">Not enriched yet. Click Enrich Website above.</span>
                </div>
              )}
            </div>

            {/* SEO & SSR Performance Analysis Card (Additive Feature) */}
            {lead.website && (
              <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-crm-lightGrey dark:border-crm-sky/20 pb-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
                    <h3 className="text-sm font-bold text-crm-navy dark:text-white">
                      SEO &amp; SSR Content Rendering Analysis
                    </h3>
                  </div>

                  {lead.seoScore !== null && lead.seoScore !== undefined ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                          lead.seoScore >= 90
                            ? 'bg-crm-blue text-white border-crm-navy'
                            : lead.seoScore >= 75
                            ? 'bg-crm-sky/35 text-crm-navy dark:bg-crm-blue/25 dark:text-crm-sky border-crm-blue/30 dark:border-crm-periwinkle/30'
                            : lead.seoScore >= 50
                            ? 'bg-crm-coral/20 text-crm-navy dark:text-crm-coral border-crm-coral/40'
                            : 'bg-crm-orangeRed/15 text-crm-orangeRed dark:text-crm-coral border-crm-orangeRed/30'
                        }`}
                      >
                        {lead.seoAnalysisResults?.classification || (lead.seoScore >= 90 ? 'Excellent' : lead.seoScore >= 75 ? 'Good' : lead.seoScore >= 50 ? 'Needs Improvement' : 'Poor')}
                      </span>
                      <span className="text-xs font-bold text-crm-navy dark:text-white bg-crm-lightGrey/40 dark:bg-crm-navySurface px-2 py-0.5 rounded-md border border-crm-lightGrey dark:border-crm-sky/25">
                        {lead.seoScore}/100
                      </span>
                    </div>
                  ) : lead.seoStatus === 'FAILED' ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-crm-orangeRed/15 text-crm-orangeRed dark:text-crm-coral border border-crm-orangeRed/30">
                      Analysis Failed
                    </span>
                  ) : lead.seoStatus === 'UNAVAILABLE' ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase bg-crm-lightGrey/50 dark:bg-crm-navySurface text-crm-indigo dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25">
                      Site Unreachable
                    </span>
                  ) : (
                    <span className="text-xs text-crm-indigo dark:text-crm-sky/80 font-medium">
                      Click Enrich Website above to analyze
                    </span>
                  )}
                </div>

                {lead.seoScore !== null && lead.seoScore !== undefined ? (
                  <div className="space-y-6">
                    {/* Overall Score & Category Breakdown Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                        <span className="text-[11px] text-crm-indigo dark:text-crm-sky/80 block font-medium">Technical SEO</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-base font-bold text-crm-navy dark:text-white">{lead.technicalSeoScore ?? 0}</span>
                          <span className="text-[10px] text-crm-indigo/75 dark:text-crm-sky/70">/ 30 pts</span>
                        </div>
                        <div className="w-full bg-crm-lightGrey dark:bg-crm-navyDeep h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-crm-blue h-full rounded-full transition-all"
                            style={{ width: `${Math.round(((lead.technicalSeoScore ?? 0) / 30) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                        <span className="text-[11px] text-crm-indigo dark:text-crm-sky/80 block font-medium">SSR &amp; Rendering</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-base font-bold text-crm-navy dark:text-white">{lead.ssrScore ?? 0}</span>
                          <span className="text-[10px] text-crm-indigo/75 dark:text-crm-sky/70">/ 30 pts</span>
                        </div>
                        <div className="w-full bg-crm-lightGrey dark:bg-crm-navyDeep h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-crm-indigo dark:bg-crm-periwinkle h-full rounded-full transition-all"
                            style={{ width: `${Math.round(((lead.ssrScore ?? 0) / 30) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                        <span className="text-[11px] text-crm-indigo dark:text-crm-sky/80 block font-medium">HTML Structure</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-base font-bold text-crm-navy dark:text-white">{lead.structureScore ?? 0}</span>
                          <span className="text-[10px] text-crm-indigo/75 dark:text-crm-sky/70">/ 20 pts</span>
                        </div>
                        <div className="w-full bg-crm-lightGrey dark:bg-crm-navyDeep h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-crm-periwinkle h-full rounded-full transition-all"
                            style={{ width: `${Math.round(((lead.structureScore ?? 0) / 20) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                        <span className="text-[11px] text-crm-indigo dark:text-crm-sky/80 block font-medium">Social Metadata</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-base font-bold text-crm-navy dark:text-white">{lead.socialSeoScore ?? 0}</span>
                          <span className="text-[10px] text-crm-indigo/75 dark:text-crm-sky/70">/ 10 pts</span>
                        </div>
                        <div className="w-full bg-crm-lightGrey dark:bg-crm-navyDeep h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-crm-coral h-full rounded-full transition-all"
                            style={{ width: `${Math.round(((lead.socialSeoScore ?? 0) / 10) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20 col-span-2 sm:col-span-1">
                        <span className="text-[11px] text-crm-indigo dark:text-crm-sky/80 block font-medium">Accessibility &amp; Schema</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-base font-bold text-crm-navy dark:text-white">{lead.accessibilityScore ?? 0}</span>
                          <span className="text-[10px] text-crm-indigo/75 dark:text-crm-sky/70">/ 10 pts</span>
                        </div>
                        <div className="w-full bg-crm-lightGrey dark:bg-crm-navyDeep h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-crm-navy dark:bg-crm-sky h-full rounded-full transition-all"
                            style={{ width: `${Math.round(((lead.accessibilityScore ?? 0) / 10) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SSR Content Validation Detail Box (Highest Priority) */}
                    <div className="p-4 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-crm-lightGrey dark:border-crm-sky/20 pb-3">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-crm-navy dark:text-white">
                            Server-Side Rendering (SSR) Content Validation
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-crm-indigo dark:text-crm-sky/80">
                            Framework:
                          </span>
                          <span className="text-xs font-bold text-crm-blue dark:text-crm-sky bg-crm-sky/35 dark:bg-crm-navySurface px-2 py-0.5 rounded border border-crm-periwinkle/40 dark:border-crm-sky/25">
                            {lead.ssrFramework || 'Standard Web'}
                          </span>
                        </div>
                      </div>

                      {/* SSR Coverage Bar & Character Metrics */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-crm-navy dark:text-crm-sky">
                            Visible Text in Initial Server HTML (SSR Coverage):
                          </span>
                          <span
                            className={`font-bold ${
                              (lead.ssrCoveragePercentage ?? 0) >= 80
                                ? 'text-crm-blue dark:text-crm-periwinkle'
                                : (lead.ssrCoveragePercentage ?? 0) >= 50
                                ? 'text-crm-coral'
                                : 'text-crm-orangeRed dark:text-crm-coral'
                            }`}
                          >
                            {lead.ssrCoveragePercentage ?? 0}%
                          </span>
                        </div>
                        <div className="w-full bg-crm-lightGrey dark:bg-crm-navyDeep h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (lead.ssrCoveragePercentage ?? 0) >= 80
                                ? 'bg-crm-blue'
                                : (lead.ssrCoveragePercentage ?? 0) >= 50
                                ? 'bg-crm-coral'
                                : 'bg-crm-orangeRed'
                            }`}
                            style={{ width: `${Math.min(100, lead.ssrCoveragePercentage ?? 0)}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-white dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20">
                          <span className="text-crm-indigo dark:text-crm-sky/75 block text-[11px]">Total Visible Text Examined</span>
                          <span className="text-sm font-bold text-crm-navy dark:text-white mt-0.5 block">
                            {lead.seoAnalysisResults?.ssrDetails?.totalRenderedCharacters?.toLocaleString() ?? 0} chars
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20">
                          <span className="text-crm-indigo dark:text-crm-sky/75 block text-[11px]">Server-Rendered (SSR-Present)</span>
                          <span className="text-sm font-bold text-crm-blue dark:text-crm-periwinkle mt-0.5 block">
                            {lead.seoAnalysisResults?.ssrDetails?.ssrPresentCharacters?.toLocaleString() ?? 0} chars
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20">
                          <span className="text-crm-indigo dark:text-crm-sky/75 block text-[11px]">Client-Rendered-Only Text</span>
                          <span
                            className={`text-sm font-bold mt-0.5 block ${
                              (lead.seoAnalysisResults?.ssrDetails?.clientOnlyCharacters ?? 0) > 0
                                ? 'text-crm-orangeRed dark:text-crm-coral'
                                : 'text-crm-indigo dark:text-crm-sky'
                            }`}
                          >
                            {lead.seoAnalysisResults?.ssrDetails?.clientOnlyCharacters?.toLocaleString() ?? 0} chars
                          </span>
                        </div>
                      </div>

                      {/* Missing Text Samples Drawer */}
                      {lead.seoAnalysisResults?.ssrDetails?.missingTextSamples &&
                        lead.seoAnalysisResults.ssrDetails.missingTextSamples.length > 0 && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setShowMissingSamples(!showMissingSamples)}
                              className="text-xs font-semibold text-crm-blue dark:text-crm-periwinkle hover:underline flex items-center gap-1.5"
                            >
                              {showMissingSamples ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {showMissingSamples
                                ? 'Hide client-rendered text samples'
                                : `View ${lead.seoAnalysisResults.ssrDetails.missingTextSamples.length} client-rendered text sample(s) missing from raw HTML`}
                            </button>

                            {showMissingSamples && (
                              <div className="mt-2.5 p-3 rounded-lg bg-white dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20 space-y-1.5">
                                <p className="text-[11px] text-crm-indigo dark:text-crm-sky/80 font-medium mb-1">
                                  The following visible text is rendered via client-side JavaScript and is missing from the initial server response:
                                </p>
                                {lead.seoAnalysisResults.ssrDetails.missingTextSamples.map((sample: string, i: number) => (
                                  <div key={i} className="text-xs font-mono text-crm-navy dark:text-crm-lightGrey bg-crm-lightGrey/30 dark:bg-crm-navySurface p-1.5 rounded border border-crm-lightGrey dark:border-crm-sky/20">
                                    <span className="text-crm-orangeRed dark:text-crm-coral mr-1.5 font-bold">✘</span>
                                    {sample}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    {/* Detailed Checks Tabs / Accordion */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/20 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-crm-navy dark:text-crm-sky">
                          Audit Checks ({lead.seoAnalysisResults?.passedChecksCount ?? 0} Passed • {lead.seoAnalysisResults?.warningChecksCount ?? 0} Warnings • {lead.seoAnalysisResults?.failedChecksCount ?? 0} Failed)
                        </span>
                        <div className="flex gap-1 text-xs">
                          {['technical', 'ssr', 'structure', 'social', 'accessibility'].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setExpandedSeoCategory(expandedSeoCategory === cat ? null : cat)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                                expandedSeoCategory === cat
                                  ? 'bg-crm-blue text-white'
                                  : 'bg-crm-lightGrey/40 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky hover:bg-crm-sky/40 dark:hover:bg-crm-navyElevated'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Active Category Checks List */}
                      {expandedSeoCategory && lead.seoAnalysisResults?.categories?.[expandedSeoCategory] && (
                        <div className="space-y-2 pt-1">
                          {lead.seoAnalysisResults.categories[expandedSeoCategory].checks.map((chk: any) => (
                            <div
                              key={chk.id}
                              className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="flex items-start gap-2.5">
                                {chk.status === 'PASS' ? (
                                  <CheckCircle2 className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle shrink-0 mt-0.5" />
                                ) : chk.status === 'WARN' ? (
                                  <AlertTriangle className="w-4 h-4 text-crm-coral shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-crm-orangeRed dark:text-crm-coral shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-crm-navy dark:text-white">
                                      {chk.name}
                                    </span>
                                    {chk.value && (
                                      <span className="text-[10px] font-mono bg-crm-sky/35 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky px-1.5 py-0.5 rounded">
                                        {chk.value}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-crm-indigo dark:text-crm-sky/80 mt-0.5">
                                    {chk.message}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded self-start sm:self-auto shrink-0 ${
                                  chk.status === 'PASS'
                                    ? 'bg-crm-sky/35 dark:bg-crm-blue/25 text-crm-navy dark:text-crm-sky'
                                    : chk.status === 'WARN'
                                    ? 'bg-crm-coral/20 text-crm-navy dark:text-crm-coral'
                                    : 'bg-crm-orangeRed/15 dark:bg-crm-orangeRed/25 text-crm-orangeRed dark:text-crm-coral'
                                }`}
                              >
                                {chk.score} / {chk.maxScore} pts
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actionable Recommendations for Pitching */}
                    {lead.seoAnalysisResults?.recommendations &&
                      lead.seoAnalysisResults.recommendations.length > 0 && (
                        <div className="p-4 rounded-xl bg-crm-sky/25 dark:bg-crm-navySurface border border-crm-periwinkle/40 dark:border-crm-sky/25 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Lightbulb className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
                              <h4 className="text-xs font-bold uppercase tracking-wider text-crm-navy dark:text-white">
                                Actionable Pitch &amp; Service Recommendations ({lead.seoAnalysisResults.recommendations.length})
                              </h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowRecommendations(!showRecommendations)}
                              className="text-xs text-crm-blue dark:text-crm-periwinkle hover:underline"
                            >
                              {showRecommendations ? 'Hide' : 'Show'}
                            </button>
                          </div>

                          {showRecommendations && (
                            <ul className="space-y-1.5 pt-1 text-xs text-crm-navy dark:text-crm-sky">
                              {lead.seoAnalysisResults.recommendations.map((rec: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-crm-blue dark:text-crm-periwinkle font-bold">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20 text-xs text-crm-indigo dark:text-crm-sky/80 flex items-center justify-between">
                    <span>
                      SEO &amp; SSR Analysis runs automatically during website enrichment.
                    </span>
                    <span className="text-crm-indigo/80 dark:text-crm-sky/75">
                      Target: <code className="text-crm-blue dark:text-crm-periwinkle">{lead.website}</code>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Business Contact & Profile Card */}
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-5">
              <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/20 pb-3">
                <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
                  Business Profile
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs font-semibold text-crm-blue dark:text-crm-periwinkle hover:underline"
                >
                  {isEditing ? 'Cancel Edit' : 'Edit Info'}
                </button>
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-crm-indigo dark:text-crm-sky font-medium mb-1">Company Name</label>
                    <input
                      type="text"
                      value={editForm.businessName}
                      onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                      className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-crm-indigo dark:text-crm-sky font-medium mb-1">Category</label>
                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-crm-indigo dark:text-crm-sky font-medium mb-1">Phone</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-crm-indigo dark:text-crm-sky font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-crm-indigo dark:text-crm-sky font-medium mb-1">Website</label>
                    <input
                      type="text"
                      value={editForm.website}
                      onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                      className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-crm-indigo dark:text-crm-sky font-medium mb-1">City</label>
                    <input
                      type="text"
                      value={editForm.city}
                      onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-crm-indigo dark:text-crm-sky font-medium mb-1">Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-crm-lightGrey dark:border-crm-sky/20">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg bg-crm-sky/40 hover:bg-crm-sky/70 dark:bg-crm-navySurface dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25 text-xs font-semibold transition disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20">
                    <span className="text-crm-indigo dark:text-crm-sky/80 font-medium block">Phone Number</span>
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="mt-1 font-semibold text-crm-navy dark:text-white hover:text-crm-blue dark:hover:text-crm-periwinkle transition flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" /> {lead.phone}
                      </a>
                    ) : (
                      <span className="mt-1 text-crm-indigo/55 dark:text-crm-sky/50 block">Not available</span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20">
                    <span className="text-crm-indigo dark:text-crm-sky/80 font-medium block">Business Email</span>
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="mt-1 font-semibold text-crm-navy dark:text-white hover:text-crm-blue dark:hover:text-crm-periwinkle transition flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" /> {lead.email}
                      </a>
                    ) : (
                      <span className="mt-1 text-crm-indigo/55 dark:text-crm-sky/50 block">Not recorded</span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20">
                    <span className="text-crm-indigo dark:text-crm-sky/80 font-medium block">Official Website</span>
                    {lead.website ? (
                      <a
                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 font-semibold text-crm-blue dark:text-crm-periwinkle hover:underline flex items-center gap-1.5 truncate"
                      >
                        <Globe className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle shrink-0" />
                        <span className="truncate">{lead.website}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                      </a>
                    ) : (
                      <span className="mt-1 text-crm-orangeRed dark:text-crm-coral font-medium block">
                        No registered website (Target for web dev)
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20">
                    <span className="text-crm-indigo dark:text-crm-sky/80 font-medium block">Location</span>
                    <p className="mt-1 font-semibold text-crm-navy dark:text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle shrink-0" />
                      {lead.city || 'Madurai'}, {lead.state || 'Tamil Nadu'}
                    </p>
                  </div>

                  {lead.address && (
                    <div className="sm:col-span-2 p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20">
                      <span className="text-crm-indigo dark:text-crm-sky/80 font-medium block">Full Address</span>
                      <p className="mt-1 text-crm-navy dark:text-crm-lightGrey">{lead.address}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Communication History & Activity Timeline */}
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
              <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/20 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
                  <h3 className="text-sm font-bold text-crm-navy dark:text-white">Communication &amp; Activity Log</h3>
                </div>
                <span className="text-xs text-crm-indigo dark:text-crm-sky/80">
                  {lead.activities?.length || 0} Events
                </span>
              </div>

              {/* Add Activity Form */}
              <form onSubmit={handleAddActivity} className="p-3 bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 rounded-xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-2.5">
                <div className="flex items-center gap-2">
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value)}
                    className="px-2.5 py-1 bg-white dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs font-semibold text-crm-blue dark:text-crm-sky"
                  >
                    <option value="NOTE">Note</option>
                    <option value="CALL">Phone Call</option>
                    <option value="EMAIL">Email Outreach</option>
                    <option value="MEETING">Client Meeting</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={activityContent}
                    onChange={(e) => setActivityContent(e.target.value)}
                    placeholder="Log a call, quotation discussion, or client update..."
                    className="flex-1 px-3 py-1 bg-white dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs text-crm-navy dark:text-white placeholder-crm-indigo/50 dark:placeholder-crm-sky/45 focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-crm-blue hover:bg-crm-navy text-xs font-semibold text-white flex items-center gap-1 shadow-sm"
                  >
                    <Send className="w-3 h-3" /> Add
                  </button>
                </div>
              </form>

              {/* Activity Timeline */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 text-xs">
                {lead.activities && lead.activities.length > 0 ? (
                  lead.activities.map((act: any) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-crm-lightGrey/20 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20 flex items-start gap-3"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-crm-navySurface text-crm-blue dark:text-crm-periwinkle flex items-center justify-center shrink-0 mt-0.5 border border-crm-lightGrey dark:border-crm-sky/25">
                        {act.type === 'CALL' ? (
                          <PhoneCall className="w-3.5 h-3.5 text-crm-indigo dark:text-crm-periwinkle" />
                        ) : act.type === 'EMAIL' ? (
                          <Mail className="w-3.5 h-3.5 text-crm-blue dark:text-crm-sky" />
                        ) : act.type === 'WHATSAPP' ? (
                          <MessageCircle className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" />
                        ) : act.type === 'FOLLOW_UP' ? (
                          <CalendarPlus className="w-3.5 h-3.5 text-crm-coral" />
                        ) : act.type === 'OPT_OUT' ? (
                          <ShieldOff className="w-3.5 h-3.5 text-crm-orangeRed dark:text-crm-coral" />
                        ) : act.type === 'ENRICHMENT' ? (
                          <Globe className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5 text-crm-indigo dark:text-crm-sky" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-crm-navy dark:text-white uppercase text-[10px]">
                              {act.channel || act.type}
                            </span>
                            {act.status && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  act.status === 'SENT' ||
                                  act.status === 'CONFIRMED_SENT' ||
                                  act.status === 'COMPLETED'
                                    ? 'bg-crm-sky/40 dark:bg-crm-blue/30 text-crm-navy dark:text-crm-sky'
                                    : act.status === 'FAILED'
                                    ? 'bg-crm-orangeRed/15 dark:bg-crm-orangeRed/25 text-crm-orangeRed dark:text-crm-coral'
                                    : 'bg-crm-coral/20 text-crm-navy dark:text-crm-coral'
                                }`}
                              >
                                {act.status}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-crm-indigo/75 dark:text-crm-sky/70">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {act.recipient && (
                          <p className="text-[10px] text-crm-indigo dark:text-crm-sky/80 mt-0.5">
                            To: {act.recipient} {act.subject ? `• ${act.subject}` : ''}
                          </p>
                        )}
                        <p className="mt-1 text-crm-navy dark:text-crm-lightGrey leading-relaxed">{act.content}</p>
                        {act.errorDetails && (
                          <p className="mt-1 text-[10px] text-crm-orangeRed dark:text-crm-coral">Error: {act.errorDetails}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-crm-indigo/70 dark:text-crm-sky/60 text-xs">
                    No communication history yet. Use the form above to log outreach activities.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CRM Controls & Scheduling Column (1/3) */}
          <div className="space-y-6">
            {/* Multi-Channel Contact Actions Hub */}
            {(() => {
              const emailInfo = extractLeadEmails(lead);
              const phoneInfo = extractLeadPhones(lead);
              const primaryEmail = emailInfo.valid[0] || lead.email || lead.enrichedEmail;
              const primaryPhone = phoneInfo.rawPhones[0] || lead.phone || lead.enrichedPhone;
              const hasAnyContact = Boolean(
                primaryEmail || primaryPhone || lead.website || lead.contactUrl || lead.linkedinUrl
              );

              return (
                <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-crm-navy dark:text-white">Multi-Channel Outreach</h3>
                    {lead.doNotContact && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-crm-orangeRed/15 dark:bg-crm-orangeRed/25 text-crm-orangeRed dark:text-crm-coral">
                        Do Not Contact
                      </span>
                    )}
                  </div>

                  {!hasAnyContact && (
                    <p className="text-crm-indigo dark:text-crm-sky/80">No contact channels extracted yet. Run Website Enrichment to discover email or phone.</p>
                  )}

                  {primaryEmail && (
                    <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-crm-blue dark:text-crm-periwinkle truncate">
                          {primaryEmail}
                        </span>
                        <button
                          onClick={() => handleCopyText(primaryEmail, 'email')}
                          className="text-crm-indigo/70 dark:text-crm-sky/70 hover:text-crm-navy dark:hover:text-white shrink-0"
                          title="Copy Email"
                        >
                          {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button
                        onClick={() => setShowEmailModal(true)}
                        disabled={Boolean(lead.doNotContact)}
                        className="w-full py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <Mail className="w-3.5 h-3.5" /> Compose Email
                      </button>
                    </div>
                  )}

                  {primaryPhone && (
                    <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-crm-blue dark:text-crm-sky truncate">
                          {primaryPhone}
                        </span>
                        <button
                          onClick={() => handleCopyText(primaryPhone, 'phone')}
                          className="text-crm-indigo/70 dark:text-crm-sky/70 hover:text-crm-navy dark:hover:text-white shrink-0"
                          title="Copy Phone"
                        >
                          {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {phoneInfo.whatsappPhones.length > 0 && (
                          <button
                            onClick={() => setShowWhatsAppModal(true)}
                            disabled={Boolean(lead.doNotContact)}
                            className="py-1.5 px-2 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </button>
                        )}
                        <a
                          href={`tel:${primaryPhone}`}
                          className="py-1.5 px-2 rounded-lg bg-crm-sky/40 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-crm-sky font-semibold flex items-center justify-center gap-1 hover:bg-crm-sky/70 dark:hover:bg-crm-navyElevated transition"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      </div>
                      <button
                        onClick={() => handleLogCallCompleted(primaryPhone)}
                        disabled={Boolean(lead.doNotContact)}
                        className="w-full py-1.5 rounded-lg bg-crm-indigo/15 dark:bg-crm-periwinkle/20 hover:bg-crm-indigo/25 dark:hover:bg-crm-periwinkle/30 disabled:opacity-50 text-crm-indigo dark:text-crm-periwinkle font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Mark Call Completed
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {lead.website && (
                      <a
                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-crm-lightGrey/40 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky hover:bg-crm-sky/40 dark:hover:bg-crm-navyElevated font-medium"
                      >
                        <Globe className="w-3 h-3" /> Website <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {lead.contactUrl && (
                      <a
                        href={lead.contactUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-crm-lightGrey/40 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky hover:bg-crm-sky/40 dark:hover:bg-crm-navyElevated font-medium"
                      >
                        <FileText className="w-3 h-3" /> Contact Page <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                    {lead.linkedinUrl && (
                      <a
                        href={lead.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-crm-sky/35 dark:bg-crm-blue/25 text-crm-blue dark:text-crm-sky hover:bg-crm-sky/60 font-medium"
                      >
                        <Share2 className="w-3 h-3" /> LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  <div className="pt-2 border-t border-crm-lightGrey dark:border-crm-sky/20">
                    <button
                      onClick={handleToggleOptOut}
                      disabled={updatingOptOut}
                      className={`w-full py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 border transition ${
                        lead.doNotContact
                          ? 'bg-crm-sky/35 dark:bg-crm-blue/25 border-crm-blue/30 dark:border-crm-periwinkle/30 text-crm-navy dark:text-crm-sky'
                          : 'bg-crm-orangeRed/10 dark:bg-crm-orangeRed/20 border-crm-orangeRed/30 text-crm-orangeRed dark:text-crm-coral'
                      }`}
                    >
                      <ShieldOff className="w-3.5 h-3.5" />
                      {lead.doNotContact ? 'Re-Enable Outreach (Clear Do-Not-Contact)' : 'Mark Do Not Contact / Opt Out'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Follow-Up Scheduler Card */}
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-crm-coral" /> Follow-Up Tasks
              </h3>
              <form onSubmit={handleScheduleFollowUp} className="space-y-2">
                <input
                  type="date"
                  required
                  value={followUpDateInput}
                  onChange={(e) => setFollowUpDateInput(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                />
                <input
                  type="text"
                  value={followUpNotesInput}
                  onChange={(e) => setFollowUpNotesInput(e.target.value)}
                  placeholder="Follow-up note (optional)"
                  className="w-full px-3 py-1.5 rounded-lg bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-white"
                />
                <button
                  type="submit"
                  disabled={savingFollowUp || !followUpDateInput}
                  className="w-full py-1.5 rounded-lg bg-crm-indigo hover:bg-crm-navy disabled:opacity-50 text-white font-semibold"
                >
                  {savingFollowUp ? 'Scheduling...' : 'Schedule Follow-Up'}
                </button>
              </form>

              {leadFollowUps.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-crm-lightGrey dark:border-crm-sky/20 max-h-40 overflow-y-auto">
                  {leadFollowUps.map((fu) => (
                    <div
                      key={fu.id}
                      className="p-2.5 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-crm-navy dark:text-white">
                          {new Date(fu.dueAt).toLocaleDateString()}{' '}
                          <span
                            className={`ml-1 text-[10px] ${
                              fu.status === 'COMPLETED'
                                ? 'text-crm-blue dark:text-crm-periwinkle'
                                : fu.isOverdue
                                ? 'text-crm-orangeRed dark:text-crm-coral'
                                : 'text-crm-indigo dark:text-crm-coral'
                            }`}
                          >
                            ({fu.isOverdue ? 'OVERDUE' : fu.status})
                          </span>
                        </p>
                        {fu.notes && <p className="text-[11px] text-crm-indigo dark:text-crm-sky/80 truncate">{fu.notes}</p>}
                      </div>
                      {fu.status === 'PENDING' && (
                        <button
                          onClick={() => handleCompleteFollowUp(fu.id)}
                          className="px-2 py-1 rounded bg-crm-blue hover:bg-crm-navy text-white text-[10px] font-bold shrink-0"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Card */}
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
              <h3 className="text-sm font-bold text-crm-navy dark:text-white">CRM Pipeline Status</h3>
              <div>
                <label className="block text-xs font-medium text-crm-indigo dark:text-crm-sky/80 mb-1.5">
                  Current Deal Stage
                </label>
                <select
                  value={crmStatus}
                  onChange={(e) => setCrmStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs font-semibold text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                >
                  <option value="NEW">New</option>
                  <option value="RESEARCHED">Researched</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="INTERESTED">Interested</option>
                  <option value="FOLLOW_UP">Follow-Up</option>
                  <option value="WON">Won Deal</option>
                  <option value="LOST">Lost / Unqualified</option>
                </select>
              </div>

              {/* Follow-up date */}
              <div className="pt-2 border-t border-crm-lightGrey dark:border-crm-sky/20">
                <label className="block text-xs font-medium text-crm-indigo dark:text-crm-sky/80 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" /> Next Follow-Up Date
                </label>
                <input
                  type="date"
                  value={nextFollowUpAt}
                  onChange={(e) => setNextFollowUpAt(e.target.value)}
                  className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                />
              </div>

              {/* Last Contacted */}
              <div className="pt-2 border-t border-crm-lightGrey dark:border-crm-sky/20">
                <label className="block text-xs font-medium text-crm-indigo dark:text-crm-sky/80 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" /> Last Contacted Date
                </label>
                <input
                  type="date"
                  value={lastContactedAt}
                  onChange={(e) => setLastContactedAt(e.target.value)}
                  className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                />
              </div>
            </div>

            {/* Notes Section */}
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-3">
              <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
                Internal Account Notes
              </h3>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hardware specs, client budget, special instructions..."
                className="w-full p-3 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-xl text-xs text-crm-navy dark:text-white placeholder-crm-indigo/50 dark:placeholder-crm-sky/45 focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy text-xs font-semibold text-white shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>

            {/* Source Provenance */}
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 text-xs space-y-3">
              <h3 className="font-bold text-crm-navy dark:text-white text-sm">Lead Provenance</h3>
              <div className="space-y-1.5 text-crm-indigo dark:text-crm-sky/80">
                <p>
                  <strong className="text-crm-navy dark:text-white">Data Source:</strong> {lead.source}
                </p>
                <p>
                  <strong className="text-crm-navy dark:text-white">Discovered On:</strong>{' '}
                  {new Date(lead.collectedAt).toLocaleDateString()}
                </p>
                {lead.job && (
                  <p>
                    <strong className="text-crm-navy dark:text-white">Job:</strong> {lead.job.location} (
                    {lead.job.status})
                  </p>
                )}
                {lead.sourceUrl && (
                  <p className="truncate">
                    <strong className="text-crm-navy dark:text-white">Source Link:</strong>{' '}
                    <a
                      href={lead.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-crm-blue dark:text-crm-periwinkle hover:underline"
                    >
                      View Record
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-crm-navyDeep/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-crm-orangeRed dark:text-crm-coral border-b border-crm-lightGrey dark:border-crm-sky/20 pb-3">
              <div className="w-9 h-9 rounded-xl bg-crm-orangeRed/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-crm-orangeRed dark:text-crm-coral" />
              </div>
              <div>
                <h3 className="text-base font-bold text-crm-navy dark:text-white">Delete Lead</h3>
                <p className="text-xs text-crm-indigo dark:text-crm-sky/80">Permanent database deletion</p>
              </div>
            </div>

            <p className="text-xs text-crm-indigo dark:text-crm-sky">
              Are you sure you want to permanently delete lead <strong className="text-crm-navy dark:text-white">&ldquo;{lead.businessName}&rdquo;</strong>?
              This will clear all communication logs and data from PostgreSQL.
            </p>

            <div className="pt-3 border-t border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg bg-crm-sky/35 dark:bg-crm-navySurface hover:bg-crm-sky/60 dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-crm-orangeRed hover:bg-crm-orangeRedDark disabled:opacity-40 text-white font-bold transition flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Outreach Modals */}
      <EmailComposerModal
        lead={lead}
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onSent={() => void fetchLead()}
      />
      <WhatsAppModal
        lead={lead}
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onUpdated={() => void fetchLead()}
      />
    </div>
  );
}
