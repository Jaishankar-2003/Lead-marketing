'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  Phone,
  Mail,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Globe,
  GlobeX,
  Wrench,
  Code,
  Sparkles,
  AlertCircle,
  X,
  CheckSquare,
  Square,
  Check,
  AlertTriangle,
  MessageCircle,
  Send
} from 'lucide-react';
import EmailComposerModal from '@/components/outreach/EmailComposerModal';
import WhatsAppModal from '@/components/outreach/WhatsAppModal';
import BulkEmailModal from '@/components/outreach/BulkEmailModal';
import BulkWhatsAppModal from '@/components/outreach/BulkWhatsAppModal';
import { extractLeadEmails, extractLeadPhones } from '@/lib/outreach-utils';

interface LeadItem {
  id: string;
  businessName: string;
  contactName?: string | null;
  category: string | null;
  website: string | null;
  phone: string | null;
  enrichedPhone?: string | null;
  email: string | null;
  enrichedEmail?: string | null;
  doNotContact?: boolean;
  address: string | null;
  city: string | null;
  state: string | null;
  source: string;
  crmStatus: string;
  serviceProspect: string;
  prospectReason: string | null;
  createdAt: string;
}

function LeadsTableContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [filterOptions, setFilterOptions] = useState<{ cities: string[]; categories: string[] }>({
    cities: [],
    categories: [],
  });

  // Filter States initialized from URL search params
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [websiteFilter, setWebsiteFilter] = useState(searchParams.get('website') || 'all');
  const [crmStatus, setCrmStatus] = useState(searchParams.get('crmStatus') || '');
  const [serviceProspect, setServiceProspect] = useState(searchParams.get('serviceProspect') || '');
  const [contactFilter, setContactFilter] = useState(() => {
    if (searchParams.get('hasPhone') === 'true') return 'phone';
    if (searchParams.get('hasEmail') === 'true') return 'email';
    return 'all';
  });
  const [followUpFilter, setFollowUpFilter] = useState(searchParams.get('followUp') || 'all');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Outreach modals state (Additive)
  const [emailModalLead, setEmailModalLead] = useState<LeadItem | null>(null);
  const [whatsAppModalLead, setWhatsAppModalLead] = useState<LeadItem | null>(null);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [showBulkWhatsAppModal, setShowBulkWhatsAppModal] = useState(false);

  // Delete modal state
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

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    businessName: '',
    category: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    city: 'Madurai',
    notes: '',
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Sync state when URL params change
  useEffect(() => {
    const pSearch = searchParams.get('search') || '';
    const pCity = searchParams.get('city') || '';
    const pCategory = searchParams.get('category') || '';
    const pWebsite = searchParams.get('website') || 'all';
    const pCrmStatus = searchParams.get('crmStatus') || '';
    const pServiceProspect = searchParams.get('serviceProspect') || '';
    const pContact = searchParams.get('hasPhone') === 'true'
      ? 'phone'
      : searchParams.get('hasEmail') === 'true'
      ? 'email'
      : 'all';

    setSearch(pSearch);
    setCity(pCity);
    setCategory(pCategory);
    setWebsiteFilter(pWebsite);
    setCrmStatus(pCrmStatus);
    setServiceProspect(pServiceProspect);
    setContactFilter(pContact);
  }, [searchParams]);

  const fetchLeads = useCallback(async (targetPage = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', targetPage.toString());
      params.set('limit', '15');
      if (search) params.set('search', search);
      if (city) params.set('city', city);
      if (category) params.set('category', category);
      if (websiteFilter !== 'all') params.set('website', websiteFilter);
      if (crmStatus) params.set('crmStatus', crmStatus);
      if (serviceProspect) params.set('serviceProspect', serviceProspect);
      if (contactFilter === 'phone') params.set('hasPhone', 'true');
      if (contactFilter === 'email') params.set('hasEmail', 'true');
      if (followUpFilter !== 'all') params.set('followUp', followUpFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setLeads(data.data);
        setPagination(data.pagination);
        if (data.filters) {
          setFilterOptions(data.filters);
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [search, city, category, websiteFilter, crmStatus, serviceProspect, contactFilter, followUpFilter]);

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  // Selection handlers
  const isAllVisibleSelected = leads.length > 0 && leads.every((l) => selectedIds.has(l.id));

  const handleToggleSelectAll = () => {
    if (isAllVisibleSelected) {
      const next = new Set(selectedIds);
      leads.forEach((l) => next.delete(l.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      leads.forEach((l) => next.add(l.id));
      setSelectedIds(next);
    }
  };

  const handleToggleLead = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
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
        // Remove deleted IDs from selected set
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deleteModal.ids.forEach((id) => next.delete(id));
          return next;
        });
        setDeleteModal({ open: false, ids: [], title: '', deleting: false });
        setActionMessage(`Successfully deleted ${data.count || deleteModal.ids.length} lead(s) from database.`);
        setTimeout(() => setActionMessage(null), 4000);
        fetchLeads(pagination.page);
      } else {
        alert(data.error || 'Failed to delete leads');
        setDeleteModal((prev) => ({ ...prev, deleting: false }));
      }
    } catch (err: any) {
      alert(err.message || 'Delete operation failed');
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeadForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewLeadForm({
          businessName: '',
          category: '',
          website: '',
          phone: '',
          email: '',
          address: '',
          city: 'Madurai',
          notes: '',
        });
        setActionMessage('Lead added successfully!');
        setTimeout(() => setActionMessage(null), 3000);
        fetchLeads(1);
      } else {
        alert(data.error || 'Failed to add lead');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    try {
      setImporting(true);
      setImportResult(null);
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(data.result);
        fetchLeads(1);
      } else {
        alert(data.error || 'Import failed');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  const clearAllFilters = () => {
    setSearch('');
    setCity('');
    setCategory('');
    setWebsiteFilter('all');
    setCrmStatus('');
    setServiceProspect('');
    setContactFilter('all');
    setFollowUpFilter('all');
    router.push('/leads');
  };

  const hasActiveFilters = Boolean(
    search ||
      city ||
      category ||
      websiteFilter !== 'all' ||
      crmStatus ||
      serviceProspect ||
      contactFilter !== 'all' ||
      followUpFilter !== 'all'
  );

  const getExportUrl = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (city) params.set('city', city);
    if (category) params.set('category', category);
    if (websiteFilter !== 'all') params.set('website', websiteFilter);
    if (crmStatus) params.set('crmStatus', crmStatus);
    if (serviceProspect) params.set('serviceProspect', serviceProspect);
    if (contactFilter === 'phone') params.set('hasPhone', 'true');
    if (contactFilter === 'email') params.set('hasEmail', 'true');
    return `/api/export?${params.toString()}`;
  };

  const getProspectBadge = (prospect: string) => {
    switch (prospect) {
      case 'PC_SUPPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-crm-coral/20 text-crm-navy dark:text-crm-coral border border-crm-coral/40">
            <Wrench className="w-3 h-3" /> PC Support
          </span>
        );
      case 'WEBSITE_DEV':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-crm-sky/35 text-crm-navy dark:bg-crm-blue/25 dark:text-crm-sky border border-crm-blue/30 dark:border-crm-periwinkle/30">
            <Code className="w-3 h-3" /> Web Dev
          </span>
        );
      case 'BOTH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-crm-indigo/15 text-crm-indigo dark:bg-crm-periwinkle/20 dark:text-crm-periwinkle border border-crm-indigo/30 dark:border-crm-periwinkle/30">
            <Sparkles className="w-3 h-3" /> Both Services
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-crm-lightGrey/40 dark:bg-crm-navySurface text-crm-indigo dark:text-crm-sky/80 border border-crm-lightGrey dark:border-crm-sky/20">
            General
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="All Leads"
        subtitle={`Managing ${pagination.total} business leads and prospects`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-crm-sky/40 hover:bg-crm-sky/70 dark:bg-crm-navySurface dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25 transition shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </button>
            <a
              href={getExportUrl()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-crm-sky/40 hover:bg-crm-sky/70 dark:bg-crm-navySurface dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25 transition shadow-sm"
              download
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </a>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-crm-blue hover:bg-crm-navy text-white transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Lead
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

      <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Filters Bar */}
        <div className="glass-card p-4 rounded-xl border border-crm-lightGrey dark:border-crm-sky/20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-crm-indigo/70 dark:text-crm-sky/70 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-crm-lightGrey/15 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs text-crm-navy dark:text-white placeholder-crm-indigo/50 dark:placeholder-crm-sky/45 focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
            />
          </div>

          {/* City */}
          <div>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3 py-2 bg-crm-lightGrey/15 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs text-crm-navy dark:text-crm-sky focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
            >
              <option value="">All Cities</option>
              {filterOptions.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Website Availability */}
          <div>
            <select
              value={websiteFilter}
              onChange={(e) => setWebsiteFilter(e.target.value)}
              className="w-full px-3 py-2 bg-crm-lightGrey/15 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs text-crm-navy dark:text-crm-sky focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
            >
              <option value="all">Websites: All</option>
              <option value="has_website">Has Website</option>
              <option value="no_website">No Website (Web Dev Target)</option>
            </select>
          </div>

          {/* Service Prospect */}
          <div>
            <select
              value={serviceProspect}
              onChange={(e) => setServiceProspect(e.target.value)}
              className="w-full px-3 py-2 bg-crm-lightGrey/15 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs text-crm-navy dark:text-crm-sky focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
            >
              <option value="">Services: All</option>
              <option value="PC_SUPPORT">PC / IT Support</option>
              <option value="WEBSITE_DEV">Web Dev</option>
              <option value="BOTH">Both Services</option>
              <option value="GENERAL_BUSINESS">General</option>
            </select>
          </div>

          {/* CRM Status */}
          <div>
            <select
              value={crmStatus}
              onChange={(e) => setCrmStatus(e.target.value)}
              className="w-full px-3 py-2 bg-crm-lightGrey/15 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs text-crm-navy dark:text-crm-sky focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
            >
              <option value="">CRM Status: All</option>
              <option value="NEW">New</option>
              <option value="RESEARCHED">Researched</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="FOLLOW_UP">Follow-Up</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Contact filter & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-crm-indigo dark:text-crm-sky/80 font-medium">Contact Channel:</span>
            <button
              onClick={() => setContactFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                contactFilter === 'all'
                  ? 'bg-crm-blue text-white shadow-sm'
                  : 'bg-white dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25 hover:bg-crm-sky/30 dark:hover:text-white'
              }`}
            >
              All Leads
            </button>
            <button
              onClick={() => setContactFilter('phone')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                contactFilter === 'phone'
                  ? 'bg-crm-blue text-white shadow-sm'
                  : 'bg-white dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25 hover:bg-crm-sky/30 dark:hover:text-white'
              }`}
            >
              <Phone className="w-3 h-3" /> Has Phone
            </button>
            <button
              onClick={() => setContactFilter('email')}
              className={`px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                contactFilter === 'email'
                  ? 'bg-crm-blue text-white shadow-sm'
                  : 'bg-white dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25 hover:bg-crm-sky/30 dark:hover:text-white'
              }`}
            >
              <Mail className="w-3 h-3" /> Has Email
            </button>
            <span className="text-crm-lightGrey dark:text-crm-sky/30 mx-1">|</span>
            <span className="text-crm-indigo dark:text-crm-sky/80 font-medium">Follow-up:</span>
            <select
              value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value)}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/25 text-crm-navy dark:text-crm-sky font-medium"
            >
              <option value="all">Any</option>
              <option value="pending">Pending Follow-Up</option>
              <option value="overdue">Overdue Follow-Up</option>
              <option value="completed">Completed Follow-Up</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-crm-orangeRed dark:text-crm-coral hover:underline flex items-center gap-1 font-medium"
            >
              <X className="w-3.5 h-3.5" /> Clear All Filters
            </button>
          )}
        </div>

        {/* Multi-Select Floating Action Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-crm-navy border border-crm-periwinkle/30 text-white px-5 py-3 rounded-xl shadow-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-150">
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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowBulkEmailModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-crm-sky text-crm-navy hover:bg-white text-xs font-bold shadow-md transition"
              >
                <Send className="w-3.5 h-3.5" />
                Bulk Email ({selectedIds.size})
              </button>
              <button
                onClick={() => setShowBulkWhatsAppModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-periwinkle hover:text-crm-navy text-white text-xs font-bold shadow-md transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp Queue ({selectedIds.size})
              </button>
              <button
                onClick={openDeleteModalForSelected}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-crm-orangeRed hover:bg-crm-orangeRedDark text-white text-xs font-bold shadow-md transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected ({selectedIds.size})
              </button>
            </div>
          </div>
        )}

        {/* Leads Table */}
        <div className="glass-card rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-crm-lightGrey/35 dark:bg-crm-navyDeep/80 text-crm-navy dark:text-crm-sky font-semibold uppercase tracking-wider border-b border-crm-lightGrey dark:border-crm-sky/20">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all leads on this page"
                      checked={isAllVisibleSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-crm-lightGrey dark:border-crm-sky/30 text-crm-blue focus:ring-crm-periwinkle cursor-pointer accent-crm-blue"
                    />
                  </th>
                  <th className="px-5 py-3.5">Business Name</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5">Website</th>
                  <th className="px-4 py-3.5">Service Fit</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5">CRM Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crm-lightGrey/70 dark:divide-crm-sky/15">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-crm-indigo dark:text-crm-sky">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-crm-blue dark:text-crm-periwinkle" />
                        <span>Loading leads...</span>
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-crm-indigo dark:text-crm-sky/80">
                      <p className="font-semibold text-crm-navy dark:text-white text-sm">No leads match your criteria.</p>
                      <p className="text-xs text-crm-indigo dark:text-crm-sky/75 mt-1">
                        Try adjusting your filters, or discover new leads with Playwright.
                      </p>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const isSelected = selectedIds.has(lead.id);
                    return (
                      <tr
                        key={lead.id}
                        className={`transition group ${
                          isSelected
                            ? 'bg-crm-sky/30 dark:bg-crm-blue/25'
                            : 'hover:bg-crm-sky/15 dark:hover:bg-crm-navySurface/50'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select ${lead.businessName}`}
                            checked={isSelected}
                            onChange={() => handleToggleLead(lead.id)}
                            className="w-4 h-4 rounded border-crm-lightGrey dark:border-crm-sky/30 text-crm-blue focus:ring-crm-periwinkle cursor-pointer accent-crm-blue"
                          />
                        </td>

                        {/* Name */}
                        <td className="px-5 py-3.5 font-semibold text-crm-navy dark:text-white">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="hover:text-crm-blue dark:hover:text-crm-periwinkle transition flex items-center gap-1.5"
                          >
                            {lead.businessName}
                          </Link>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5 text-crm-indigo dark:text-crm-sky/85">
                          {lead.category || <span className="text-crm-indigo/50 dark:text-crm-sky/40">—</span>}
                        </td>

                        {/* Phone & Email */}
                        <td className="px-4 py-3.5 text-crm-navy dark:text-crm-lightGrey">
                          <div className="flex flex-col gap-1">
                            {lead.phone ? (
                              <a
                                href={`tel:${lead.phone}`}
                                className="flex items-center gap-1 text-crm-navy dark:text-crm-sky hover:text-crm-blue dark:hover:text-crm-periwinkle transition"
                              >
                                <Phone className="w-3 h-3 text-crm-blue dark:text-crm-periwinkle" /> {lead.phone}
                              </a>
                            ) : null}
                            {lead.email ? (
                              <a
                                href={`mailto:${lead.email}`}
                                className="flex items-center gap-1 text-crm-indigo dark:text-crm-sky/80 hover:text-crm-blue dark:hover:text-crm-periwinkle transition"
                              >
                                <Mail className="w-3 h-3 text-crm-indigo dark:text-crm-periwinkle" /> {lead.email}
                              </a>
                            ) : null}
                            {!lead.phone && !lead.email && (
                              <span className="text-crm-indigo/55 dark:text-crm-sky/45">No public contact</span>
                            )}
                          </div>
                        </td>

                        {/* Website */}
                        <td className="px-4 py-3.5">
                          {lead.website ? (
                            <a
                              href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-crm-blue dark:text-crm-periwinkle hover:underline max-w-[140px] truncate"
                            >
                              <Globe className="w-3 h-3 shrink-0" />
                              <span className="truncate">{lead.website.replace(/^https?:\/\//i, '')}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-crm-orangeRed dark:text-crm-coral font-medium">
                              <GlobeX className="w-3 h-3" /> No Website
                            </span>
                          )}
                        </td>

                        {/* Service Opportunity */}
                        <td className="px-4 py-3.5">
                          {getProspectBadge(lead.serviceProspect)}
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3.5 text-crm-indigo dark:text-crm-sky/80">
                          {lead.city || 'Madurai'}
                        </td>

                        {/* CRM Status */}
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-crm-sky/30 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25">
                            {lead.crmStatus}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(() => {
                              const emailAudit = extractLeadEmails(lead);
                              const phoneAudit = extractLeadPhones(lead);
                              const canEmail = emailAudit.valid.length > 0 || Boolean(lead.email || lead.enrichedEmail);
                              const canWhatsApp = phoneAudit.whatsappPhones.length > 0;
                              return (
                                <>
                                  {canEmail && (
                                    <button
                                      onClick={() => setEmailModalLead(lead)}
                                      className="p-1.5 rounded-md bg-crm-sky/35 hover:bg-crm-sky/70 dark:bg-crm-blue/25 dark:hover:bg-crm-blue/40 text-crm-blue dark:text-crm-sky transition"
                                      title={`Email ${lead.businessName}`}
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {canWhatsApp && (
                                    <button
                                      onClick={() => setWhatsAppModalLead(lead)}
                                      className="p-1.5 rounded-md bg-crm-periwinkle/20 hover:bg-crm-periwinkle/35 dark:bg-crm-indigo/35 dark:hover:bg-crm-indigo/50 text-crm-indigo dark:text-crm-periwinkle transition"
                                      title={`WhatsApp ${lead.businessName}`}
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              );
                            })()}
                            <Link
                              href={`/leads/${lead.id}`}
                              className="px-2.5 py-1 rounded-md bg-crm-sky/30 dark:bg-crm-navySurface hover:bg-crm-sky/60 dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky text-xs font-medium border border-crm-lightGrey dark:border-crm-sky/25 transition"
                            >
                              Details
                            </Link>
                            <button
                              onClick={() => openDeleteModalForSingle(lead.id, lead.businessName)}
                              className="p-1.5 rounded-md hover:bg-crm-orangeRed/15 text-crm-indigo/70 dark:text-crm-sky/70 hover:text-crm-orangeRed dark:hover:text-crm-coral transition"
                              title="Delete Lead from Database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-5 py-3 border-t border-crm-lightGrey dark:border-crm-sky/20 bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 flex items-center justify-between text-xs text-crm-indigo dark:text-crm-sky/80">
            <div>
              Showing {leads.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} leads
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLeads(pagination.page - 1)}
                className="p-1.5 rounded-lg border border-crm-lightGrey dark:border-crm-sky/25 bg-white dark:bg-crm-navySurface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-crm-sky/30 dark:hover:bg-crm-navyElevated text-crm-navy dark:text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-crm-navy dark:text-crm-sky">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLeads(pagination.page + 1)}
                className="p-1.5 rounded-lg border border-crm-lightGrey dark:border-crm-sky/25 bg-white dark:bg-crm-navySurface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-crm-sky/30 dark:hover:bg-crm-navyElevated text-crm-navy dark:text-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
                <strong className="text-crm-navy dark:text-white">{deleteModal.ids.length}</strong> record(s) from the database?
              </p>
              <p className="text-crm-orangeRed dark:text-crm-coral font-medium">
                This action cannot be undone. Associated activity logs will also be permanently cleared.
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

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-crm-navyDeep/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/20 pb-3">
              <h3 className="text-base font-bold text-crm-navy dark:text-white">Add New Business Lead</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-crm-indigo dark:text-crm-sky/80 hover:text-crm-navy dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-crm-navy dark:text-crm-sky font-medium mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={newLeadForm.businessName}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, businessName: e.target.value })
                  }
                  placeholder="e.g. Madurai Tech Services"
                  className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-crm-navy dark:text-crm-sky font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={newLeadForm.category}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, category: e.target.value })
                    }
                    placeholder="e.g. Computer Repair"
                    className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                  />
                </div>
                <div>
                  <label className="block text-crm-navy dark:text-crm-sky font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={newLeadForm.city}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, city: e.target.value })
                    }
                    placeholder="Madurai"
                    className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-crm-navy dark:text-crm-sky font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    value={newLeadForm.phone}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, phone: e.target.value })
                    }
                    placeholder="e.g. 09876543210"
                    className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                  />
                </div>
                <div>
                  <label className="block text-crm-navy dark:text-crm-sky font-medium mb-1">Website</label>
                  <input
                    type="text"
                    value={newLeadForm.website}
                    onChange={(e) =>
                      setNewLeadForm({ ...newLeadForm, website: e.target.value })
                    }
                    placeholder="e.g. https://example.com"
                    className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                  />
                </div>
              </div>

              <div>
                <label className="block text-crm-navy dark:text-crm-sky font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, email: e.target.value })
                  }
                  placeholder="contact@example.com"
                  className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                />
              </div>

              <div>
                <label className="block text-crm-navy dark:text-crm-sky font-medium mb-1">Address</label>
                <textarea
                  rows={2}
                  value={newLeadForm.address}
                  onChange={(e) =>
                    setNewLeadForm({ ...newLeadForm, address: e.target.value })
                  }
                  placeholder="Street / Area in Madurai..."
                  className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                />
              </div>

              <div className="pt-3 border-t border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-crm-sky/35 dark:bg-crm-navySurface hover:bg-crm-sky/60 dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy font-semibold text-white"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-crm-navyDeep/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/20 pb-3">
              <h3 className="text-base font-bold text-crm-navy dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" /> Import Leads from CSV
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="text-crm-indigo dark:text-crm-sky/80 hover:text-crm-navy dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!importResult ? (
              <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
                <p className="text-crm-indigo dark:text-crm-sky/85">
                  Upload any public business directory export or CSV lead list. Columns like{' '}
                  <code className="text-crm-blue dark:text-crm-periwinkle">Business Name</code>,{' '}
                  <code className="text-crm-blue dark:text-crm-periwinkle">Phone</code>,{' '}
                  <code className="text-crm-blue dark:text-crm-periwinkle">Website</code>, and{' '}
                  <code className="text-crm-blue dark:text-crm-periwinkle">Category</code> are detected automatically.
                </p>

                <div className="border-2 border-dashed border-crm-lightGrey dark:border-crm-sky/30 rounded-xl p-6 text-center hover:border-crm-blue dark:hover:border-crm-periwinkle transition">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    required
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-crm-indigo dark:text-crm-sky file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-crm-blue file:text-white hover:file:bg-crm-navy cursor-pointer"
                  />
                  {importFile && (
                    <p className="mt-2 text-crm-blue dark:text-crm-periwinkle font-medium">
                      Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-crm-lightGrey/25 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/20 text-[11px] text-crm-indigo dark:text-crm-sky/85 space-y-1">
                  <p className="font-semibold text-crm-navy dark:text-white">Intelligent Import Rules:</p>
                  <p>&bull; Automatically deduplicates by normalized website domain &amp; phone.</p>
                  <p>&bull; Classifies into PC Support vs Web Dev service opportunities.</p>
                  <p>&bull; Preserves existing lead records without overwriting notes.</p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-3 py-1.5 rounded-lg bg-crm-sky/35 dark:bg-crm-navySurface hover:bg-crm-sky/60 dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || importing}
                    className="px-4 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy disabled:opacity-40 font-semibold text-white flex items-center gap-1.5"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
                      </>
                    ) : (
                      'Run Import'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-crm-sky/30 dark:bg-crm-blue/20 border border-crm-blue/30 dark:border-crm-periwinkle/30 text-crm-navy dark:text-crm-sky space-y-1.5">
                  <p className="font-bold text-sm">Import Finished Successfully</p>
                  <p>Total rows parsed: {importResult.totalRows}</p>
                  <p className="font-semibold text-crm-blue dark:text-crm-periwinkle">
                    &bull; New leads saved: {importResult.importedCount}
                  </p>
                  <p className="text-crm-indigo dark:text-crm-coral">
                    &bull; Duplicates skipped: {importResult.duplicateCount}
                  </p>
                  {importResult.errorCount > 0 && (
                    <p className="text-crm-orangeRed dark:text-crm-coral">
                      &bull; Incomplete / skipped rows: {importResult.errorCount}
                    </p>
                  )}
                </div>

                {importResult.sampleImported.length > 0 && (
                  <div className="p-3 bg-crm-lightGrey/25 dark:bg-crm-navyDeep rounded-lg border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-crm-sky text-[11px]">
                    <span className="font-semibold text-crm-indigo dark:text-crm-periwinkle">Sample Leads Added:</span>
                    <ul className="mt-1 list-disc list-inside">
                      {importResult.sampleImported.map((name: string, i: number) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setShowImportModal(false);
                      setImportResult(null);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy text-white font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Outreach Modals */}
      <EmailComposerModal
        lead={emailModalLead}
        isOpen={Boolean(emailModalLead)}
        onClose={() => setEmailModalLead(null)}
        onSent={() => void fetchLeads(pagination.page)}
      />
      <WhatsAppModal
        lead={whatsAppModalLead}
        isOpen={Boolean(whatsAppModalLead)}
        onClose={() => setWhatsAppModalLead(null)}
        onUpdated={() => void fetchLeads(pagination.page)}
      />
      <BulkEmailModal
        leadIds={Array.from(selectedIds)}
        isOpen={showBulkEmailModal}
        onClose={() => setShowBulkEmailModal(false)}
        onCompleted={() => void fetchLeads(pagination.page)}
      />
      <BulkWhatsAppModal
        leadIds={Array.from(selectedIds)}
        isOpen={showBulkWhatsAppModal}
        onClose={() => setShowBulkWhatsAppModal(false)}
        onUpdated={() => void fetchLeads(pagination.page)}
      />
    </div>
  );
}

export default function AllLeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-crm-indigo dark:text-crm-sky">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-crm-blue dark:text-crm-periwinkle" />
          <span>Loading leads...</span>
        </div>
      }
    >
      <LeadsTableContent />
    </Suspense>
  );
}
