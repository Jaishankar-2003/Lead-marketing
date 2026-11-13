'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import {
  KanbanSquare,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Wrench,
  Code,
  Trash2,
  CheckSquare,
  Square,
  Check,
  AlertTriangle,
  X,
  MessageCircle
} from 'lucide-react';
import EmailComposerModal from '@/components/outreach/EmailComposerModal';
import WhatsAppModal from '@/components/outreach/WhatsAppModal';
import { extractLeadEmails, extractLeadPhones } from '@/lib/outreach-utils';

const STAGES = [
  { key: 'NEW', label: 'New', color: 'border-crm-blue/30 text-crm-navy dark:text-crm-sky bg-crm-sky/35 dark:bg-crm-blue/25' },
  { key: 'RESEARCHED', label: 'Researched', color: 'border-crm-indigo/30 text-crm-indigo dark:text-crm-periwinkle bg-crm-indigo/15 dark:bg-crm-periwinkle/20' },
  { key: 'CONTACTED', label: 'Contacted', color: 'border-crm-periwinkle/40 text-crm-navy dark:text-crm-sky bg-crm-periwinkle/20 dark:bg-crm-indigo/35' },
  { key: 'INTERESTED', label: 'Interested', color: 'border-crm-blue/40 text-crm-blue dark:text-crm-sky bg-crm-blue/15 dark:bg-crm-blue/30' },
  { key: 'FOLLOW_UP', label: 'Follow-Up', color: 'border-crm-coral/40 text-crm-navy dark:text-crm-coral bg-crm-coral/20' },
  { key: 'WON', label: 'Won Deal', color: 'border-crm-navy dark:border-crm-periwinkle/50 text-white bg-crm-blue' },
  { key: 'LOST', label: 'Lost', color: 'border-crm-orangeRed/30 text-crm-orangeRed dark:text-crm-coral bg-crm-orangeRed/15 dark:bg-crm-orangeRed/25' },
];

export default function PipelinePage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [emailModalLead, setEmailModalLead] = useState<any | null>(null);
  const [whatsAppModalLead, setWhatsAppModalLead] = useState<any | null>(null);

  // Common Delete Modal
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    ids: string[];
    title: string;
    deleting: boolean;
  }>({
    open: false,
    ids: [],
    title: '',
    deleting: false,
  });

  const fetchAllLeads = async () => {
    try {
      setLoading(true);
      // Fetch initial batch (limit=100)
      const res = await fetch('/api/leads?limit=100&page=1');
      const data = await res.json();
      if (data.success) {
        let allLeads = data.data || [];
        const totalPages = data.pagination?.totalPages || 1;

        // If total leads exceed page 1 (e.g. Page 2, Page 3), fetch all remaining pages
        if (totalPages > 1) {
          const remainingPagePromises = [];
          for (let p = 2; p <= totalPages; p++) {
            remainingPagePromises.push(
              fetch(`/api/leads?limit=100&page=${p}`)
                .then((r) => r.json())
                .catch((err) => {
                  console.error(`Failed to load pipeline page ${p}:`, err);
                  return null;
                })
            );
          }
          const otherPages = await Promise.all(remainingPagePromises);
          for (const pageData of otherPages) {
            if (pageData?.success && Array.isArray(pageData.data)) {
              allLeads = allLeads.concat(pageData.data);
            }
          }
        }
        setLeads(allLeads);
      }
    } catch (err) {
      console.error('Failed to load leads for pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLeads();
  }, []);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crmStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, crmStatus: newStatus } : l))
        );
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  // Selection Logic
  const isAllSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  };

  const handleToggleCard = (leadId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const openDeleteModalForSelected = () => {
    if (selectedIds.size === 0) return;
    setDeleteModal({
      open: true,
      ids: Array.from(selectedIds),
      title: `Delete ${selectedIds.size} Selected Lead${selectedIds.size > 1 ? 's' : ''}`,
      deleting: false,
    });
  };

  const openDeleteModalForSingle = (id: string, name: string) => {
    setDeleteModal({
      open: true,
      ids: [id],
      title: `Delete Lead: "${name}"`,
      deleting: false,
    });
  };

  const executeDelete = async () => {
    try {
      setDeleteModal((prev) => ({ ...prev, deleting: true }));
      const res = await fetch('/api/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: deleteModal.ids }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deleteModal.ids.forEach((id) => next.delete(id));
          return next;
        });
        setDeleteModal({ open: false, ids: [], title: '', deleting: false });
        setActionMessage(`Successfully cleared ${data.count || deleteModal.ids.length} lead(s) from database.`);
        setTimeout(() => setActionMessage(null), 4000);
        fetchAllLeads();
      } else {
        alert(data.error || 'Failed to delete leads');
        setDeleteModal((prev) => ({ ...prev, deleting: false }));
      }
    } catch (err: any) {
      alert(err.message || 'Delete operation failed');
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="CRM Pipeline"
        subtitle="Manage leads across all stages of your sales funnel"
        action={
          <div className="flex items-center gap-2">
            {leads.length > 0 && (
              <button
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crm-sky/40 hover:bg-crm-sky/70 dark:bg-crm-navySurface dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky text-xs font-semibold border border-crm-lightGrey dark:border-crm-sky/25 transition shadow-sm"
              >
                {isAllSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" /> Deselect All
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5" /> Select All ({leads.length})
                  </>
                )}
              </button>
            )}
            <button
              onClick={fetchAllLeads}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crm-sky/40 hover:bg-crm-sky/70 dark:bg-crm-navySurface dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky text-xs font-semibold border border-crm-lightGrey dark:border-crm-sky/25 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {actionMessage && (
        <div className="bg-crm-sky/35 dark:bg-crm-blue/20 border-b border-crm-blue/30 dark:border-crm-periwinkle/30 px-8 py-2.5 text-xs font-medium text-crm-navy dark:text-crm-sky flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-crm-blue dark:text-crm-periwinkle hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Selection Bar */}
      {selectedIds.size > 0 && (
        <div className="mx-6 mt-4 bg-crm-navy border border-crm-periwinkle/30 text-white px-5 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xs bg-crm-blue/50 border border-crm-sky/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-crm-sky" /> {selectedIds.size} {selectedIds.size === 1 ? 'lead' : 'leads'} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-crm-sky hover:text-white underline font-medium"
            >
              Deselect All
            </button>
          </div>
          <button
            onClick={openDeleteModalForSelected}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-crm-orangeRed hover:bg-crm-orangeRedDark text-white text-xs font-bold shadow-md transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected ({selectedIds.size})
          </button>
        </div>
      )}

      <div className="p-6 flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-[1300px] pb-6">
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.crmStatus === stage.key);
            return (
              <div
                key={stage.key}
                className="w-72 shrink-0 flex flex-col bg-crm-lightGrey/35 dark:bg-crm-navy/60 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 overflow-hidden shadow-sm"
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-between bg-white/70 dark:bg-crm-navyDeep/60">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${stage.color}`}>
                      {stage.label}
                    </span>
                  </div>
                  <span className="text-xs font-black text-crm-navy dark:text-crm-sky bg-white dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/25 px-2 py-0.5 rounded-full shadow-xs">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-xs text-crm-indigo/60 dark:text-crm-sky/50">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const isSelected = selectedIds.has(lead.id);
                      return (
                        <div
                          key={lead.id}
                          className={`p-3.5 rounded-xl border transition shadow-xs space-y-2.5 relative group ${
                            isSelected
                              ? 'border-crm-blue bg-crm-sky/30 dark:bg-crm-blue/25 ring-1 ring-crm-periwinkle'
                              : 'bg-white dark:bg-crm-navyDeep/90 border-crm-lightGrey dark:border-crm-sky/20 hover:border-crm-periwinkle dark:hover:border-crm-periwinkle/60'
                          }`}
                        >
                          {/* Card Header: Checkbox + Name + Badges + Delete */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-start gap-2 min-w-0">
                              <input
                                type="checkbox"
                                aria-label={`Select ${lead.businessName}`}
                                checked={isSelected}
                                onChange={() => handleToggleCard(lead.id)}
                                className="mt-0.5 w-3.5 h-3.5 rounded border-crm-lightGrey dark:border-crm-sky/30 text-crm-blue focus:ring-crm-periwinkle cursor-pointer accent-crm-blue shrink-0"
                              />
                              <Link
                                href={`/leads/${lead.id}`}
                                className="font-bold text-xs text-crm-navy dark:text-white hover:text-crm-blue dark:hover:text-crm-periwinkle transition line-clamp-1"
                              >
                                {lead.businessName}
                              </Link>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {lead.serviceProspect === 'PC_SUPPORT' && (
                                <span title="PC Support" className="text-crm-orangeRed dark:text-crm-coral">
                                  <Wrench className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {lead.serviceProspect === 'WEBSITE_DEV' && (
                                <span title="Web Dev" className="text-crm-blue dark:text-crm-sky">
                                  <Code className="w-3.5 h-3.5" />
                                </span>
                              )}
                              {lead.serviceProspect === 'BOTH' && (
                                <span title="Both Services" className="text-crm-indigo dark:text-crm-periwinkle">
                                  <Sparkles className="w-3.5 h-3.5" />
                                </span>
                              )}
                              <button
                                onClick={() => openDeleteModalForSingle(lead.id, lead.businessName)}
                                className="p-1 rounded text-crm-indigo/60 dark:text-crm-sky/60 hover:text-crm-orangeRed dark:hover:text-crm-coral opacity-60 hover:opacity-100 transition"
                                title="Delete lead from database"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="text-[11px] text-crm-indigo dark:text-crm-sky/75 truncate pl-5 flex items-center gap-1.5 flex-wrap">
                            {lead.source === 'open_marketing' ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
                                Open Marketing
                              </span>
                            ) : lead.source === 'google_maps' ? (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                                Google Maps
                              </span>
                            ) : lead.source === 'csv_import' ? (
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                CSV
                              </span>
                            ) : null}
                            <span className="truncate">
                              {lead.category || 'General Business'} &bull; {lead.city || 'Madurai'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-crm-indigo dark:text-crm-sky/80 pl-5">
                            {lead.phone && (
                              <span className="flex items-center gap-1 text-crm-navy dark:text-crm-sky">
                                <Phone className="w-2.5 h-2.5 text-crm-blue dark:text-crm-periwinkle" /> {lead.phone}
                              </span>
                            )}
                            {lead.website && (
                              <span className="flex items-center gap-1 text-crm-blue dark:text-crm-periwinkle truncate max-w-[100px]">
                                <Globe className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{lead.website.replace(/^https?:\/\//i, '')}</span>
                              </span>
                            )}
                          </div>

                          {/* Quick Outreach Actions */}
                          {(() => {
                            const emailAudit = extractLeadEmails(lead);
                            const phoneAudit = extractLeadPhones(lead);
                            const hasEmail = emailAudit.valid.length > 0 || Boolean(lead.email || lead.enrichedEmail);
                            const hasWa = phoneAudit.whatsappPhones.length > 0;
                            if (!hasEmail && !hasWa) return null;
                            return (
                              <div className="flex items-center gap-1.5 pl-5 pt-0.5">
                                {hasEmail && (
                                  <button
                                    onClick={() => setEmailModalLead(lead)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-crm-sky/35 hover:bg-crm-sky/70 dark:bg-crm-blue/25 dark:hover:bg-crm-blue/40 text-crm-blue dark:text-crm-sky text-[10px] font-semibold transition"
                                  >
                                    <Mail className="w-2.5 h-2.5" /> Email
                                  </button>
                                )}
                                {hasWa && (
                                  <button
                                    onClick={() => setWhatsAppModalLead(lead)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-crm-periwinkle/20 hover:bg-crm-periwinkle/35 dark:bg-crm-indigo/35 dark:hover:bg-crm-indigo/50 text-crm-indigo dark:text-crm-periwinkle text-[10px] font-semibold transition"
                                  >
                                    <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          {/* Stage Selector */}
                          <div className="pt-2 border-t border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-between text-[10px]">
                            <span className="text-crm-indigo dark:text-crm-sky/75 font-medium">Move Stage:</span>
                            <select
                              value={lead.crmStatus}
                              onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                              className="bg-crm-lightGrey/20 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-crm-sky rounded px-1.5 py-0.5 focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle text-[10px]"
                            >
                              {STAGES.map((s) => (
                                <option key={s.key} value={s.key}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Common Delete Modal for Pipeline */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 bg-crm-navyDeep/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-crm-orangeRed dark:text-crm-coral border-b border-crm-lightGrey dark:border-crm-sky/20 pb-3">
              <div className="w-9 h-9 rounded-xl bg-crm-orangeRed/15 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-crm-orangeRed dark:text-crm-coral" />
              </div>
              <div>
                <h3 className="text-base font-bold text-crm-navy dark:text-white">{deleteModal.title}</h3>
                <p className="text-xs text-crm-indigo dark:text-crm-sky/80">Database deletion confirmation</p>
              </div>
            </div>

            <div className="text-xs text-crm-indigo dark:text-crm-sky space-y-2">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-crm-navy dark:text-white">{deleteModal.ids.length}</strong> record(s) from the CRM pipeline?
              </p>
              <p className="text-crm-orangeRed dark:text-crm-coral font-medium">
                This action cannot be undone. Leads and their outreach activity history will be cleared from PostgreSQL.
              </p>
            </div>

            <div className="pt-3 border-t border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                disabled={deleteModal.deleting}
                onClick={() => setDeleteModal({ open: false, ids: [], title: '', deleting: false })}
                className="px-4 py-2 rounded-lg bg-crm-sky/35 dark:bg-crm-navySurface hover:bg-crm-sky/60 dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteModal.deleting}
                onClick={executeDelete}
                className="px-4 py-2 rounded-lg bg-crm-orangeRed hover:bg-crm-orangeRedDark disabled:opacity-40 text-white font-bold transition flex items-center gap-1.5"
              >
                {deleteModal.deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deleting from DB...
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

      <EmailComposerModal
        lead={emailModalLead}
        isOpen={Boolean(emailModalLead)}
        onClose={() => setEmailModalLead(null)}
        onSent={() => void fetchAllLeads()}
      />
      <WhatsAppModal
        lead={whatsAppModalLead}
        isOpen={Boolean(whatsAppModalLead)}
        onClose={() => setWhatsAppModalLead(null)}
        onUpdated={() => void fetchAllLeads()}
      />
    </div>
  );
}
