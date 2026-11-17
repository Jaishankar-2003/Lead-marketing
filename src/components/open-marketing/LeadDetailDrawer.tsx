'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Gauge,
  AlertCircle,
  Copy,
  Check,
  Building2,
  Calendar,
  MessageCircle,
  Clock,
  FileText,
  CheckCircle2,
  KanbanSquare,
  Sparkles,
  History,
  AlertTriangle,
  Send,
  Plus,
  RefreshCw,
  Ban,
  UserCheck,
} from 'lucide-react';
import { BusinessLead } from '@/types/open-marketing';
import {
  WebsiteStatusBadge,
  LocationStatusBadge,
  QualificationBadge,
} from './Badge';
import { ScoreBar } from './ScoreBar';
import { openMarketingApi } from '@/lib/open-marketing/api';
import EmailComposerModal, { OutreachLeadSummary } from '@/components/outreach/EmailComposerModal';
import WhatsAppModal from '@/components/outreach/WhatsAppModal';

const CRM_STAGES = [
  { key: 'NEW', label: 'New', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { key: 'RESEARCHED', label: 'Researched', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'CONTACTED', label: 'Contacted', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'INTERESTED', label: 'Interested', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'FOLLOW_UP', label: 'Follow-Up', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'WON', label: 'Won Deal', color: 'bg-green-100 text-green-800 border-green-300' },
  { key: 'LOST', label: 'Lost', color: 'bg-red-50 text-red-700 border-red-200' },
];

interface LeadDetailDrawerProps {
  lead: BusinessLead | null;
  onClose: () => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({ lead, onClose }) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // CRM Bridge States
  const [crmLead, setCrmLead] = useState<any | null>(null);
  const [syncingCrm, setSyncingCrm] = useState(false);
  const [crmError, setCrmError] = useState<string | null>(null);

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Notes
  const [notesInput, setNotesInput] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);

  // Follow-Up
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(false);

  // Status Change
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingOptOut, setUpdatingOptOut] = useState(false);

  // Initial Sync when lead changes
  const syncLead = useCallback(async (targetLead: BusinessLead) => {
    setSyncingCrm(true);
    setCrmError(null);
    try {
      const res = await openMarketingApi.syncLeadWithCrm(targetLead);
      if (res.lead) {
        setCrmLead(res.lead);
        setNotesInput(res.lead.notes || '');
      }
    } catch (err: any) {
      console.warn('CRM Sync Warning:', err.message);
      setCrmError(err.message || 'Could not sync lead to CRM');
    } finally {
      setSyncingCrm(false);
    }
  }, []);

  const refreshCrmData = useCallback(async () => {
    if (!crmLead?.id) return;
    try {
      const res = await openMarketingApi.getCrmLeadDetails(crmLead.id);
      if (res.lead) {
        setCrmLead(res.lead);
        setNotesInput(res.lead.notes || '');
      }
    } catch (err: any) {
      console.warn('Refresh CRM failed:', err.message);
    }
  }, [crmLead?.id]);

  useEffect(() => {
    if (lead) {
      syncLead(lead);
    } else {
      setCrmLead(null);
      setNotesInput('');
      setFollowUpDate('');
      setFollowUpNotes('');
    }
  }, [lead, syncLead]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  // Status Change Handler
  const handleStageChange = async (newStage: string) => {
    if (!crmLead?.id || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await openMarketingApi.updateLeadCrmStatus(crmLead.id, newStage);
      await refreshCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to update CRM stage');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Notes Save Handler
  const handleSaveNotes = async () => {
    if (!crmLead?.id || savingNotes) return;
    setSavingNotes(true);
    setNotesSuccess(false);
    try {
      await openMarketingApi.saveLeadNotes(crmLead.id, notesInput.trim());
      setNotesSuccess(true);
      setTimeout(() => setNotesSuccess(false), 2500);
      await refreshCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  // Follow-Up Scheduling Handler
  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crmLead?.id || !followUpDate || schedulingFollowUp) return;
    setSchedulingFollowUp(true);
    try {
      await openMarketingApi.scheduleFollowUp(
        crmLead.id,
        new Date(followUpDate).toISOString(),
        followUpNotes.trim() || undefined
      );
      setFollowUpDate('');
      setFollowUpNotes('');
      await refreshCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule follow-up');
    } finally {
      setSchedulingFollowUp(false);
    }
  };

  // Complete Follow-Up Handler
  const handleCompleteFollowUp = async (fuId: string) => {
    try {
      await openMarketingApi.completeFollowUp(fuId);
      await refreshCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to complete follow-up');
    }
  };

  // Opt-out Toggle Handler
  const handleToggleOptOut = async () => {
    if (!crmLead?.id || updatingOptOut) return;
    setUpdatingOptOut(true);
    try {
      await openMarketingApi.toggleOptOut(crmLead.id, !crmLead.doNotContact);
      await refreshCrmData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle opt-out status');
    } finally {
      setUpdatingOptOut(false);
    }
  };

  // Summary object for outreach modals
  const outreachSummary: OutreachLeadSummary | null = useMemo(() => {
    if (!crmLead && !lead) return null;
    return {
      id: crmLead?.id || 'temp',
      businessName: crmLead?.businessName || lead?.businessName || '',
      category: crmLead?.category || lead?.category || null,
      city: crmLead?.city || lead?.city || null,
      website: crmLead?.website || lead?.websiteUrl || null,
      email: crmLead?.email || lead?.email || null,
      enrichedEmail: crmLead?.enrichedEmail || null,
      phone: crmLead?.phone || lead?.phone || null,
      enrichedPhone: crmLead?.enrichedPhone || null,
      serviceProspect: crmLead?.serviceProspect || null,
      doNotContact: Boolean(crmLead?.doNotContact),
    };
  }, [crmLead, lead]);

  if (!lead) return null;

  const wa = lead.websiteAnalysis;
  const scores = lead.leadScores;
  const currentStage = crmLead?.crmStatus || 'NEW';
  const followUps = crmLead?.followUps || [];
  const activities = crmLead?.activities || [];
  const isDoNotContact = Boolean(crmLead?.doNotContact);

  return (
    <>
      <div className="fixed inset-0 z-40 overflow-hidden bg-slate-900/40 backdrop-blur-sm flex justify-end">
        <div className="w-full max-w-2xl bg-white border-l border-[#E2E8F0] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-6 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-start justify-between gap-4 shrink-0">
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <QualificationBadge status={scores.qualificationStatus} />
                <WebsiteStatusBadge status={lead.websiteStatus} />
                <LocationStatusBadge status={lead.locationStatus} />
                {crmLead && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE] uppercase tracking-wider flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    CRM Synced
                  </span>
                )}
                {isDoNotContact && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-300 uppercase tracking-wider flex items-center gap-1">
                    <Ban className="w-3 h-3" />
                    Opted Out
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-[#172033] tracking-tight mt-1.5 truncate" title={lead.businessName}>
                {lead.businessName}
              </h2>
              <p className="text-xs text-[#64748B] flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                <span className="truncate">{lead.category}</span>
                <span>&bull;</span>
                <MapPin className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
                <span className="truncate">{lead.area}, {lead.city}</span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9] border border-[#CBD5E1] transition-colors shrink-0 shadow-sm"
              title="Close Drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CRM Action Bar: Outreach Modals, Opt-Out, and Profile Link */}
          <div className="px-6 py-3 bg-white border-b border-[#E2E8F0] flex items-center justify-between gap-2.5 flex-wrap shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Send Email Button */}
              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                disabled={(!lead.email && !crmLead?.email) || isDoNotContact || syncingCrm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  isDoNotContact
                    ? 'Lead is marked Do Not Contact'
                    : !lead.email
                    ? 'No email address discovered for this lead'
                    : 'Compose outreach email via Gmail SMTP'
                }
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Email</span>
              </button>

              {/* WhatsApp Button */}
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(true)}
                disabled={(!lead.phone && !crmLead?.phone) || isDoNotContact || syncingCrm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  isDoNotContact
                    ? 'Lead is marked Do Not Contact'
                    : !lead.phone
                    ? 'No phone number discovered for this lead'
                    : 'Open persistent WhatsApp Web chat'
                }
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              {/* Do Not Contact Toggle */}
              <button
                type="button"
                onClick={handleToggleOptOut}
                disabled={updatingOptOut || !crmLead?.id}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isDoNotContact
                    ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                    : 'bg-[#F8FAFC] text-[#64748B] border-[#CBD5E1] hover:text-[#172033]'
                }`}
                title={isDoNotContact ? 'Clear Do Not Contact status' : 'Mark as Do Not Contact (Suppress Outreach)'}
              >
                <Ban className="w-3 h-3 text-red-600" />
                <span>{isDoNotContact ? 'Opted Out' : 'Opt Out'}</span>
              </button>
            </div>

            {/* View in Primary CRM Profile */}
            {crmLead?.id && (
              <Link
                href={`/leads/${crmLead.id}`}
                target="_blank"
                className="flex items-center gap-1 text-xs text-[#4F46E5] hover:text-[#4338CA] hover:underline font-semibold"
                title="Open complete profile in primary Marketing CRM"
              >
                <span>Full CRM Profile</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </div>

          {/* Drawer Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {crmError && (
              <div className="p-3 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#B45309] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706]" />
                <span>{crmError}</span>
              </div>
            )}

            {/* Section A: CRM Pipeline Stage Selector */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KanbanSquare className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="text-xs font-semibold text-[#172033] uppercase tracking-wider">
                    CRM Pipeline Stage
                  </h3>
                </div>
                <span className="text-[11px] text-[#64748B]">
                  Current Stage: <strong className="text-[#172033] font-bold">{currentStage}</strong>
                </span>
              </div>

              {/* Segmented Stage Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                {CRM_STAGES.map((st) => {
                  const isActive = currentStage === st.key;
                  return (
                    <button
                      key={st.key}
                      type="button"
                      disabled={updatingStatus || !crmLead?.id}
                      onClick={() => handleStageChange(st.key)}
                      className={`px-2.5 py-1.5 rounded-lg border font-medium text-center transition-all ${
                        isActive
                          ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-sm font-semibold'
                          : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                      } disabled:opacity-60`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section B: Follow-Up Management */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="text-xs font-semibold text-[#172033] uppercase tracking-wider">
                    Follow-Up Management
                  </h3>
                </div>
                {followUps.length > 0 && (
                  <span className="text-[11px] font-semibold text-[#4F46E5]">
                    {followUps.filter((f: any) => f.status === 'PENDING').length} Pending
                  </span>
                )}
              </div>

              {/* Schedule Follow-Up Form */}
              <form onSubmit={handleScheduleFollowUp} className="space-y-2 bg-white border border-[#E2E8F0] rounded-lg p-3 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] text-[#64748B] mb-1 font-medium">Due Date &amp; Time:</label>
                    <input
                      type="datetime-local"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      disabled={schedulingFollowUp || !crmLead?.id}
                      className="w-full px-2.5 py-1.5 rounded border border-[#CBD5E1] text-[#172033] text-xs focus:outline-none focus:border-[#4F46E5]"
                      required
                    />
                  </div>
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] text-[#64748B] mb-1 font-medium">Follow-Up Note (Optional):</label>
                    <input
                      type="text"
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      disabled={schedulingFollowUp || !crmLead?.id}
                      placeholder="e.g. Call regarding web redesign quote"
                      className="w-full px-2.5 py-1.5 rounded border border-[#CBD5E1] text-[#172033] text-xs focus:outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={schedulingFollowUp || !followUpDate || !crmLead?.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{schedulingFollowUp ? 'Scheduling...' : 'Schedule Follow-Up'}</span>
                  </button>
                </div>
              </form>

              {/* Scheduled Follow-ups List */}
              {followUps.length > 0 && (
                <div className="space-y-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-[#64748B] block">Scheduled Reminders:</span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {followUps.map((fu: any) => {
                      const isPending = fu.status === 'PENDING';
                      const isOverdue = isPending && new Date(fu.dueAt) < new Date();
                      return (
                        <div
                          key={fu.id}
                          className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-2 shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  !isPending
                                    ? 'bg-slate-100 text-slate-600 border-slate-300'
                                    : isOverdue
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {!isPending ? 'COMPLETED' : isOverdue ? 'OVERDUE' : 'PENDING'}
                              </span>
                              <span className="text-[11px] font-medium text-[#172033]">
                                {new Date(fu.dueAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            </div>
                            {fu.notes && (
                              <p className="text-[11px] text-[#64748B] truncate mt-0.5">{fu.notes}</p>
                            )}
                          </div>

                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleCompleteFollowUp(fu.id)}
                              className="px-2 py-1 rounded bg-[#DCFCE7] hover:bg-[#BBF7D0] text-[#15803D] text-[11px] font-semibold border border-[#BBF7D0] shrink-0 transition-colors"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Section C: Internal CRM Notes */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="text-xs font-semibold text-[#172033] uppercase tracking-wider">
                    Internal CRM Notes
                  </h3>
                </div>
                {notesSuccess && (
                  <span className="text-[11px] font-semibold text-[#16A34A] flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Saved!
                  </span>
                )}
              </div>

              <textarea
                rows={3}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                disabled={savingNotes || !crmLead?.id}
                placeholder="Log internal sales notes, requirements, or conversation context..."
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#CBD5E1] text-[#172033] text-xs focus:outline-none focus:border-[#4F46E5] shadow-sm leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={savingNotes || !crmLead?.id}
                  className="px-3 py-1.5 rounded bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>

            {/* Section D: Unified Activity Timeline */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#4F46E5]" />
                  <h3 className="text-xs font-semibold text-[#172033] uppercase tracking-wider">
                    Unified Activity Timeline
                  </h3>
                </div>
                <span className="text-[11px] text-[#64748B]">
                  {activities.length} Recorded Events
                </span>
              </div>

              {activities.length === 0 ? (
                <div className="p-4 rounded-lg bg-white border border-[#E2E8F0] text-center text-xs text-[#94A3B8] italic">
                  No outreach or CRM activities logged yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {activities.map((act: any) => {
                    const isEmail = act.type === 'EMAIL';
                    const isWhatsApp = act.type === 'WHATSAPP';
                    const isCall = act.type === 'CALL';
                    const isStatus = act.type === 'STATUS_CHANGE';

                    return (
                      <div
                        key={act.id}
                        className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] flex items-start gap-2.5 shadow-sm text-xs"
                      >
                        <div
                          className={`p-1.5 rounded-md mt-0.5 shrink-0 ${
                            isEmail
                              ? 'bg-[#EEF2FF] text-[#4F46E5]'
                              : isWhatsApp
                              ? 'bg-[#DCFCE7] text-[#15803D]'
                              : isCall
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isEmail && <Mail className="w-3.5 h-3.5" />}
                          {isWhatsApp && <MessageCircle className="w-3.5 h-3.5" />}
                          {isCall && <Phone className="w-3.5 h-3.5" />}
                          {isStatus && <KanbanSquare className="w-3.5 h-3.5" />}
                          {!isEmail && !isWhatsApp && !isCall && !isStatus && <Clock className="w-3.5 h-3.5" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#172033] truncate">
                              {act.type} &bull; {act.status || 'LOGGED'}
                            </span>
                            <span className="text-[10px] text-[#94A3B8] shrink-0">
                              {new Date(act.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-0.5 break-words">
                            {act.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 1. Contact Information Card */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-[#4F46E5] uppercase tracking-wider">
                1. Contact Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Phone */}
                <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-2 rounded-md bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] text-[#64748B] block">Phone Number</span>
                      {lead.phone ? (
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-xs font-semibold text-[#172033] hover:underline font-mono truncate block"
                        >
                          {lead.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-[#94A3B8] font-mono">N/A</span>
                      )}
                    </div>
                  </div>
                  {lead.phone && (
                    <button
                      onClick={() => copyToClipboard(lead.phone!, 'phone')}
                      className="p-1.5 text-[#94A3B8] hover:text-[#172033] rounded hover:bg-[#F1F5F9] shrink-0"
                      title="Copy Phone"
                    >
                      {copiedItem === 'phone' ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Email */}
                <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-2 rounded-md bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] text-[#64748B] block">Email Address</span>
                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-xs font-semibold text-[#4F46E5] hover:underline truncate block"
                          title={lead.email}
                        >
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-xs text-[#94A3B8]">N/A</span>
                      )}
                    </div>
                  </div>
                  {lead.email && (
                    <button
                      onClick={() => copyToClipboard(lead.email!, 'email')}
                      className="p-1.5 text-[#94A3B8] hover:text-[#172033] rounded hover:bg-[#F1F5F9] shrink-0"
                      title="Copy Email"
                    >
                      {copiedItem === 'email' ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Lead Scoring Tracks */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-[#4F46E5] uppercase tracking-wider">
                  2. Triple-Track Lead Scoring (0–100)
                </h3>
                <span className="text-xs text-[#64748B]">
                  Status: <strong className="text-[#172033]">{scores.qualificationStatus}</strong>
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
                <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] text-xs text-[#475569] leading-relaxed shadow-sm">
                  <span className="font-semibold text-[#172033] block mb-1">Qualification Insights:</span>
                  <p className="leading-relaxed text-[#64748B]">{scores.qualificationReason}</p>
                </div>
              )}
            </div>

            {/* 3. Website Audit & Technical Findings */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-[#4F46E5] uppercase tracking-wider">
                  3. Technical Website Audit
                </h3>
                {lead.websiteUrl && (
                  <a
                    href={lead.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-[#4F46E5] hover:underline font-mono truncate max-w-[200px]"
                  >
                    <span className="truncate">{lead.rootDomain || 'Visit Site'}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                )}
              </div>

              {lead.websiteUrl ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-sm">
                    <span className="text-[#64748B] block text-[11px]">HTTP Status</span>
                    <span className="font-semibold text-[#172033]">
                      {wa?.statusCode ? `${wa.statusCode}` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-sm">
                    <span className="text-[#64748B] block text-[11px] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#16A34A]" /> SSL / HTTPS
                    </span>
                    <span className={`font-semibold ${wa?.hasHttps ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                      {wa ? (wa.hasHttps ? 'Secure' : 'Insecure') : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-sm">
                    <span className="text-[#64748B] block text-[11px] flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-[#4F46E5]" /> Mobile Viewport
                    </span>
                    <span className={`font-semibold ${wa?.isMobileFriendly ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
                      {wa ? (wa.isMobileFriendly ? 'Responsive' : 'Non-Responsive') : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-[#E2E8F0] shadow-sm">
                    <span className="text-[#64748B] block text-[11px] flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-[#4F46E5]" /> Latency
                    </span>
                    <span className="font-semibold text-[#172033]">
                      {wa?.responseTimeMs ? `${wa.responseTimeMs} ms` : 'N/A'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-lg bg-[#EDE9FE] border border-[#DDD6FE] text-xs text-[#6D28D9] leading-relaxed">
                  🏢 Business has no verified website recorded on Google Maps or directory registries.
                  <br />
                  <span className="font-semibold text-[#5B21B6]">Action: Prime prospect for custom business website development.</span>
                </div>
              )}

              {/* Improvement Opportunities */}
              {wa?.improvementOpportunities && wa.improvementOpportunities.length > 0 && (
                <div className="p-3 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] space-y-1.5 text-xs text-[#B45309]">
                  <span className="font-semibold block flex items-center gap-1.5 text-[#92400E]">
                    <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" /> Detected Optimization Deficiencies:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-[#78350F] pl-1">
                    {wa.improvementOpportunities.map((opp, idx) => (
                      <li key={idx}>{opp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 4. Location & Map Details */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-[#4F46E5] uppercase tracking-wider">
                4. Geographical Verification
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[#64748B] block text-[11px]">Full Discovered Address:</span>
                    <span className="text-[#172033] font-medium leading-relaxed block">{lead.address || 'N/A'}</span>
                  </div>
                  <LocationStatusBadge status={lead.locationStatus} />
                </div>

                {lead.googleMapsUrl && (
                  <div className="pt-2">
                    <a
                      href={lead.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#172033] hover:bg-[#F1F5F9] text-xs border border-[#CBD5E1] transition-colors shadow-sm"
                    >
                      <MapPin className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>View on Google Maps</span>
                      <ExternalLink className="w-3 h-3 text-[#64748B]" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Social Presence & Sources */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Social Links */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-2.5">
                <h3 className="text-xs font-semibold text-[#4F46E5] uppercase tracking-wider">
                  5. Social Profiles
                </h3>
                <div className="space-y-1.5 text-xs">
                  {lead.socialLinks?.facebook && (
                    <a href={lead.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-[#4F46E5] hover:underline flex items-center gap-1 truncate">
                      Facebook <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                  {lead.socialLinks?.instagram && (
                    <a href={lead.socialLinks.instagram} target="_blank" rel="noreferrer" className="text-[#E1306C] hover:underline flex items-center gap-1 truncate">
                      Instagram <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                  {lead.socialLinks?.linkedin && (
                    <a href={lead.socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-[#0A66C2] hover:underline flex items-center gap-1 truncate">
                      LinkedIn <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  )}
                  {!lead.socialLinks?.facebook && !lead.socialLinks?.instagram && !lead.socialLinks?.linkedin && (
                    <span className="text-[#94A3B8] italic">No social links detected</span>
                  )}
                </div>
              </div>

              {/* Discovery Sources */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-2.5">
                <h3 className="text-xs font-semibold text-[#4F46E5] uppercase tracking-wider">
                  6. Contributing Discovery Engines
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {lead.sources.map((s, idx) => (
                    <span key={idx} className="text-xs px-2.5 py-1 rounded bg-white text-[#172033] border border-[#CBD5E1] shadow-sm">
                      {s}
                    </span>
                  ))}
                </div>
                {(lead.sourceFiles && lead.sourceFiles.length > 0) ? (
                  <div className="pt-1 text-xs text-[#64748B]">
                    <span className="text-[11px] text-[#94A3B8] block">Contributing Dataset Files ({lead.sourceFiles.length}):</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {lead.sourceFiles.map((sf, idx) => (
                        <span key={idx} className="font-mono text-[#4F46E5] bg-white px-2 py-0.5 rounded border border-[#E2E8F0] inline-block text-[11px]">
                          {sf}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : lead.sourceFile ? (
                  <div className="pt-1 text-xs text-[#64748B]">
                    <span className="text-[11px] text-[#94A3B8] block">Dataset Source File:</span>
                    <span className="font-mono text-[#4F46E5] bg-white px-2 py-0.5 rounded border border-[#E2E8F0] inline-block mt-0.5 truncate max-w-full">
                      {lead.sourceFile}
                    </span>
                  </div>
                ) : null}
                <p className="text-[11px] text-[#94A3B8] flex items-center gap-1 pt-1">
                  <Calendar className="w-3 h-3 text-[#4F46E5]" />
                  <span>Harvested: {new Date(lead.collectedAt).toLocaleDateString()}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Outreach Modals */}
      {showEmailModal && outreachSummary && (
        <EmailComposerModal
          lead={outreachSummary}
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onSent={() => {
            setShowEmailModal(false);
            refreshCrmData();
          }}
        />
      )}

      {showWhatsAppModal && outreachSummary && (
        <WhatsAppModal
          lead={outreachSummary}
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          onUpdated={() => {
            refreshCrmData();
          }}
        />
      )}
    </>
  );
};
