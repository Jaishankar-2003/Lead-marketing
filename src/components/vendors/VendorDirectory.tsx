'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Filter,
  Plus,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Tag,
  CheckCircle2,
  Clock,
  MoreVertical,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Star,
  CheckSquare,
  Square,
  Copy,
  Check,
  Send,
  Building2,
  User,
  Info,
} from 'lucide-react';

interface VendorContact {
  id: string;
  type: string;
  value: string;
  normalized?: string;
  kind?: string;
  label?: string;
  isPrimary: boolean;
  isWhatsApp: boolean;
}

interface VendorCategory {
  category: {
    id: string;
    name: string;
  };
}

interface VendorItem {
  id: string;
  vendorCode: string;
  name: string;
  contactPerson?: string;
  businessType?: string;
  status: string;
  doNotContact: boolean;
  fullAddress?: string;
  pincode?: string;
  state?: { id: string; name: string };
  city?: { id: string; name: string };
  area?: { id: string; name: string };
  contacts: VendorContact[];
  categories: VendorCategory[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface VendorDirectoryProps {
  initialCityId?: string;
  onOpenEnquiryModal?: (vendorId: string) => void;
}

export default function VendorDirectory({ initialCityId, onOpenEnquiryModal }: VendorDirectoryProps) {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState(initialCityId || 'ALL');
  const [selectedArea, setSelectedArea] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVendors, setTotalVendors] = useState(0);

  // Filter dropdown data
  const [states, setStates] = useState<Array<{ id: string; name: string }>>([]);
  const [cities, setCities] = useState<Array<{ id: string; name: string; parentId?: string }>>([]);
  const [areas, setAreas] = useState<Array<{ id: string; name: string; parentId?: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Multi-select & Bulk operations state
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Vendor Details Drawer (Safe inspection on row click)
  const [selectedVendorDetail, setSelectedVendorDetail] = useState<VendorItem | null>(null);

  // WhatsApp Integration with Templates state
  const [templates, setTemplates] = useState<any[]>([]);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [activeWhatsAppVendor, setActiveWhatsAppVendor] = useState<VendorItem | null>(null);
  const [activeWhatsAppPhone, setActiveWhatsAppPhone] = useState<string>('');
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');
  const [renderedWhatsAppMessage, setRenderedWhatsAppMessage] = useState<string>('');
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Vendor Add/Edit Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formContactPerson, setFormContactPerson] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCityId, setFormCityId] = useState('');
  const [formAreaId, setFormAreaId] = useState('');
  const [formCustomArea, setFormCustomArea] = useState('');
  const [isCustomArea, setIsCustomArea] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [formCategoryIds, setFormCategoryIds] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Load locations, categories, and message templates
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [locRes, catRes, tplRes] = await Promise.all([
          fetch('/api/vendors/locations'),
          fetch('/api/vendors/categories'),
          fetch('/api/vendors/templates'),
        ]);
        const locData = await locRes.json();
        const catData = await catRes.json();
        const tplData = await tplRes.json();

        if (locData.success) {
          setStates(locData.states || []);
          setCities(locData.cities || []);
          setAreas(locData.markets || []);
        }
        if (catData.success) {
          setCategories(catData.categories || []);
        }
        if (tplData.success && Array.isArray(tplData.templates)) {
          setTemplates(tplData.templates);
          const defaultTpl = tplData.templates.find((t: any) => t.isDefault && t.channel === 'WHATSAPP')
            || tplData.templates.find((t: any) => t.channel === 'WHATSAPP')
            || tplData.templates[0];
          if (defaultTpl) {
            setActiveTemplateId(defaultTpl.id);
          }
        }
      } catch (err) {
        console.error('Failed to load filter/template metadata:', err);
      }
    };
    void loadMetadata();
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedState !== 'ALL') params.append('stateId', selectedState);
      if (selectedCity !== 'ALL') params.append('cityId', selectedCity);
      if (selectedArea !== 'ALL') params.append('areaId', selectedArea);
      if (selectedCategory !== 'ALL') params.append('categoryId', selectedCategory);
      params.append('page', String(page));
      params.append('limit', '25');

      const res = await fetch(`/api/vendors?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setVendors(data.vendors || []);
        setTotalVendors(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, selectedState, selectedCity, selectedArea, selectedCategory, page]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  // Select all toggle - checks that every visible vendor is selected
  const allVisibleSelected = vendors.length > 0 && vendors.every((v) => selectedVendorIds.includes(v.id));

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      // Unselect all visible vendors
      const visibleIds = new Set(vendors.map((v) => v.id));
      setSelectedVendorIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      // Select all visible vendors (merge with any existing selection)
      const visibleIds = vendors.map((v) => v.id);
      setSelectedVendorIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectVendor = (vendorId: string) => {
    setSelectedVendorIds((prev) =>
      prev.includes(vendorId) ? prev.filter((id) => id !== vendorId) : [...prev, vendorId]
    );
  };

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (selectedVendorIds.length === 0) return;
    const count = selectedVendorIds.length;
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${count} selected vendor${count > 1 ? 's' : ''}? This action cannot be undone.`
    );
    if (!confirmed) return;

    const idsToDelete = [...selectedVendorIds];
    try {
      setBulkActionLoading(true);
      const res = await fetch('/api/vendors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorIds: idsToDelete }),
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically remove from state so UI updates instantaneously
        const deletedSet = new Set(idsToDelete);
        setVendors((prev) => prev.filter((v) => !deletedSet.has(v.id)));
        setTotalVendors((prev) => Math.max(0, prev - deletedSet.size));
        setSelectedVendorIds((prev) => prev.filter((id) => !deletedSet.has(id)));

        // If all items on this page were removed and page > 1, go back one page
        if (vendors.length <= deletedSet.size && page > 1) {
          setPage((p) => Math.max(1, p - 1));
        } else {
          void loadVendors();
        }
      } else {
        alert(data.error || 'Failed to delete selected vendors');
      }
    } catch (err) {
      console.error('Error during bulk delete:', err);
      alert('An error occurred while deleting vendors.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedVendorIds.length === 0) return;
    try {
      setBulkActionLoading(true);
      const res = await fetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorIds: selectedVendorIds, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedVendorIds([]);
        void loadVendors();
      } else {
        alert(data.error || 'Failed to update selected vendors');
      }
    } catch (err) {
      console.error('Error during bulk status update:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Individual Row Delete
  const handleDeleteVendor = async (vendorId: string, vendorName: string) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete vendor "${vendorName}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/vendors/${vendorId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        // Optimistically remove from state
        setVendors((prev) => prev.filter((v) => v.id !== vendorId));
        setTotalVendors((prev) => Math.max(0, prev - 1));
        setSelectedVendorIds((prev) => prev.filter((id) => id !== vendorId));
        if (selectedVendorDetail?.id === vendorId) setSelectedVendorDetail(null);

        if (vendors.length <= 1 && page > 1) {
          setPage((p) => Math.max(1, p - 1));
        } else {
          void loadVendors();
        }
      } else {
        alert(data.error || 'Failed to delete vendor');
      }
    } catch (err) {
      console.error('Error deleting vendor:', err);
      alert('An error occurred while deleting the vendor.');
    }
  };

  // Open modal for new vendor
  const handleOpenAddModal = () => {
    setEditingVendor(null);
    setFormName('');
    setFormContactPerson('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormCityId(selectedCity !== 'ALL' ? selectedCity : '');
    setFormAreaId(selectedArea !== 'ALL' ? selectedArea : '');
    setFormCustomArea('');
    setIsCustomArea(false);
    setNewCategoryInput('');
    setFormCategoryIds([]);
    setFormStatus('ACTIVE');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (v: VendorItem) => {
    setEditingVendor(v);
    setFormName(v.name);
    setFormContactPerson(v.contactPerson || '');
    const pPhone = v.contacts.find((c) => c.type === 'PHONE' && c.isPrimary) || v.contacts.find((c) => c.type === 'PHONE');
    const pEmail = v.contacts.find((c) => c.type === 'EMAIL');
    setFormPhone(pPhone?.value || '');
    setFormEmail(pEmail?.value || '');
    setFormAddress(v.fullAddress || '');
    setFormCityId(v.city?.id || '');
    setFormAreaId(v.area?.id || '');
    setFormCustomArea(v.area?.name || '');
    setIsCustomArea(false);
    setNewCategoryInput('');
    setFormCategoryIds(v.categories.map((c) => c.category.id));
    setFormStatus(v.status);
    setFormNotes(v.notes || '');
    setIsAddModalOpen(true);
  };

  // Dynamically add a new category directly from the modal
  const handleAddNewCategory = async () => {
    if (!newCategoryInput.trim()) return;
    try {
      setAddingCategory(true);
      const res = await fetch('/api/vendors/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryInput.trim() }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategories((prev) => {
          if (prev.some((c) => c.id === data.category.id)) return prev;
          return [...prev, data.category];
        });
        setFormCategoryIds((prev) => Array.from(new Set([...prev, data.category.id])));
        setNewCategoryInput('');
      } else {
        alert(data.error || 'Failed to create category');
      }
    } catch (err) {
      console.error('Error adding category:', err);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    try {
      setSaving(true);
      const resolvedAreaId = (!isCustomArea && formAreaId && formAreaId !== '__NEW__') ? formAreaId : undefined;
      const customAreaText = (isCustomArea || formAreaId === '__NEW__') ? formCustomArea.trim() : undefined;

      const payload: any = {
        name: formName.trim(),
        contactPerson: formContactPerson.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        fullAddress: formAddress.trim() || undefined,
        cityId: formCityId || undefined,
        areaId: resolvedAreaId,
        customAreaName: customAreaText || undefined,
        categoryIds: formCategoryIds,
        status: formStatus,
        notes: formNotes.trim() || undefined,
      };

      const url = editingVendor ? `/api/vendors/${editingVendor.id}` : '/api/vendors';
      const method = editingVendor ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        if (selectedVendorDetail && editingVendor && selectedVendorDetail.id === editingVendor.id) {
          setSelectedVendorDetail(data.vendor);
        }
        void loadVendors();
      } else {
        alert(data.error || 'Failed to save vendor');
      }
    } catch (err) {
      console.error('Error saving vendor:', err);
      alert('An unexpected error occurred while saving the vendor.');
    } finally {
      setSaving(false);
    }
  };

  // Render message using selected template and vendor placeholders
  const generateTemplateMessage = (vendor: VendorItem, tplId: string): string => {
    const tpl = templates.find((t) => t.id === tplId)
      || templates.find((t) => t.isDefault && t.channel === 'WHATSAPP')
      || templates.find((t) => t.channel === 'WHATSAPP')
      || templates[0];

    const vendorLocation = vendor.area?.name ? `${vendor.area.name}, ${vendor.city?.name || ''}` : (vendor.city?.name || 'Local Market');

    if (tpl) {
      let text = tpl.body;
      text = text.replace(/{{vendor_name}}/g, vendor.name || 'Vendor');
      text = text.replace(/{{customer_location}}/g, vendorLocation);
      text = text.replace(/{{urgency}}/g, 'Immediate Requirement');
      text = text.replace(/{{enquiry_code}}/g, `VEN-${vendor.vendorCode}`);
      return text;
    }

    return `Hello ${vendor.name}, urgent requirement. Please share your best possible price list for computer hardware components. Looking forward to your quotation. Thanks!`;
  };

  // Open WhatsApp Modal with live template selection and pre-filled message
  const handleOpenWhatsAppModal = (vendor: VendorItem, phoneStr?: string) => {
    const phoneToUse = phoneStr
      || vendor.contacts.find((c) => c.type === 'PHONE' && c.isPrimary)?.value
      || vendor.contacts.find((c) => c.type === 'PHONE')?.value;

    if (!phoneToUse) {
      alert(`Vendor "${vendor.name}" does not have a phone number recorded.`);
      return;
    }

    setActiveWhatsAppVendor(vendor);
    setActiveWhatsAppPhone(phoneToUse);

    const activeTpl = templates.find((t) => t.isDefault && t.channel === 'WHATSAPP')
      || templates.find((t) => t.channel === 'WHATSAPP')
      || templates[0];

    const tplId = activeTpl ? activeTpl.id : '';
    setActiveTemplateId(tplId);
    setRenderedWhatsAppMessage(generateTemplateMessage(vendor, tplId));
    setCopiedMessage(false);
    setIsWhatsAppModalOpen(true);
  };

  // When user switches template inside modal
  const handleSelectTemplateInModal = (tplId: string) => {
    setActiveTemplateId(tplId);
    if (activeWhatsAppVendor) {
      setRenderedWhatsAppMessage(generateTemplateMessage(activeWhatsAppVendor, tplId));
    }
  };

  // Launch WhatsApp Web with prefilled message
  const handleLaunchWhatsApp = (phoneStr: string, message: string) => {
    const cleanDigits = phoneStr.replace(/\D/g, '');
    const intlDigits = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const directUrl = `https://web.whatsapp.com/send?phone=${intlDigits}&text=${encodeURIComponent(message)}`;
    window.open(directUrl, '_blank');
    setIsWhatsAppModalOpen(false);
  };

  // Copy message to clipboard
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(renderedWhatsAppMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Filtered cities based on selected state
  const availableCities = selectedState === 'ALL'
    ? cities
    : cities.filter((c) => c.parentId === selectedState);

  // Filtered areas based on selected city
  const availableAreas = selectedCity === 'ALL'
    ? areas
    : areas.filter((a) => a.parentId === selectedCity);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-crm-indigo dark:text-crm-lightGrey/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search vendor name, contact person, phone, or address..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-xs text-crm-navy dark:text-white placeholder:text-crm-indigo/60 focus:outline-none focus:border-crm-blue"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Vendor
            </button>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1 text-xs">
          {/* State */}
          <div>
            <label className="block text-[10px] font-bold text-crm-indigo dark:text-crm-lightGrey/70 mb-1">STATE</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('ALL');
                setSelectedArea('ALL');
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
            >
              <option value="ALL">All States</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-[10px] font-bold text-crm-indigo dark:text-crm-lightGrey/70 mb-1">CITY</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedArea('ALL');
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
            >
              <option value="ALL">All Cities</option>
              {availableCities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Commercial Market / Area */}
          <div>
            <label className="block text-[10px] font-bold text-crm-indigo dark:text-crm-lightGrey/70 mb-1">MARKET / AREA</label>
            <select
              value={selectedArea}
              onChange={(e) => {
                setSelectedArea(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
            >
              <option value="ALL">All Markets</option>
              {availableAreas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-bold text-crm-indigo dark:text-crm-lightGrey/70 mb-1">COMPONENT TYPE</label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
            >
              <option value="ALL">All Components</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold text-crm-indigo dark:text-crm-lightGrey/70 mb-1">STATUS</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="VERIFICATION_PENDING">Pending Verification</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedVendorIds.length > 0 && (
        <div className="p-3 rounded-2xl bg-crm-navy text-white shadow-xl border border-crm-blue/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-crm-blue text-white font-bold text-xs">
              {selectedVendorIds.length} Selected
            </span>
            <span className="text-crm-lightGrey text-[11px]">
              Perform bulk actions on selected vendors
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('ACTIVE')}
              disabled={bulkActionLoading}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-600 text-white font-semibold transition flex items-center gap-1 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark Active
            </button>
            <button
              onClick={() => handleBulkStatusChange('VERIFICATION_PENDING')}
              disabled={bulkActionLoading}
              className="px-2.5 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white font-semibold transition flex items-center gap-1 disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5" />
              Mark Pending
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedVendorIds.length})
            </button>
            <button
              onClick={() => setSelectedVendorIds([])}
              className="px-2.5 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-crm-lightGrey transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Vendors Table */}
      <div className="rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 overflow-hidden shadow-sm">
        <div className="p-3 border-b border-crm-lightGrey dark:border-crm-sky/10 flex items-center justify-between text-xs text-crm-indigo dark:text-crm-lightGrey/80">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-crm-navy dark:text-white">{vendors.length}</strong> of{' '}
              <strong className="text-crm-navy dark:text-white">{totalVendors}</strong> hardware vendors
            </span>
            {selectedVendorIds.length > 0 && (
              <span className="text-crm-blue font-semibold">
                ({selectedVendorIds.length} selected)
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded-lg border border-crm-lightGrey dark:border-crm-sky/20 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px]">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded-lg border border-crm-lightGrey dark:border-crm-sky/20 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-crm-sky/20 dark:bg-crm-navySurface border-b border-crm-lightGrey dark:border-crm-sky/15 text-[10px] font-bold text-crm-indigo dark:text-crm-periwinkle uppercase tracking-wider">
              <tr>
                {/* SELECT ALL CHECKBOX */}
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleToggleSelectAll}
                    title="Select / Deselect all visible vendors"
                    className="rounded text-crm-blue focus:ring-crm-blue cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Code & Business Name</th>
                <th className="py-3 px-4">Location & Market</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">Products / Categories</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crm-lightGrey dark:divide-crm-sky/10">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-crm-indigo dark:text-crm-lightGrey/60">
                    Loading vendors directory...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-crm-indigo dark:text-crm-lightGrey/60">
                    No vendors found matching your filters.
                  </td>
                </tr>
              ) : (
                vendors.map((v) => {
                  const isSelected = selectedVendorIds.includes(v.id);
                  const phoneContacts = v.contacts?.filter((c) => c.type === 'PHONE') || [];
                  const primaryPhone = phoneContacts.find((c) => c.isPrimary) || phoneContacts[0];
                  const primaryEmail = v.contacts?.find((c) => c.type === 'EMAIL')?.value;

                  return (
                    <tr
                      key={v.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-crm-blue/10 dark:bg-crm-blue/15'
                          : 'hover:bg-crm-sky/10 dark:hover:bg-crm-navySurface/40'
                      }`}
                    >
                      {/* ROW SELECT CHECKBOX */}
                      <td className="py-3.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectVendor(v.id)}
                          className="rounded text-crm-blue focus:ring-crm-blue cursor-pointer"
                        />
                      </td>

                      {/* Code & Name (Clickable to open safe vendor drawer) */}
                      <td className="py-3.5 px-3">
                        <div
                          onClick={() => setSelectedVendorDetail(v)}
                          className="cursor-pointer group flex items-start gap-2"
                          title="Click to view full vendor details"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-crm-sky/30 dark:bg-crm-blue/20 text-crm-blue dark:text-crm-sky font-mono text-[10px] font-bold group-hover:bg-crm-blue group-hover:text-white transition">
                            {v.vendorCode}
                          </span>
                          <div>
                            <div className="font-semibold text-crm-navy dark:text-white group-hover:text-crm-blue transition flex items-center gap-1">
                              <span>{v.name}</span>
                            </div>
                            {v.contactPerson && (
                              <div className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/70">
                                Contact: {v.contactPerson}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-medium text-crm-navy dark:text-crm-lightGrey flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-crm-blue shrink-0" />
                            {v.area?.name ? `${v.area.name}, ` : ''}
                            {v.city?.name || 'City Unspecified'}
                          </div>
                          {v.fullAddress && (
                            <div className="text-[11px] text-crm-indigo/80 dark:text-crm-lightGrey/60 line-clamp-1 max-w-xs" title={v.fullAddress}>
                              {v.fullAddress}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Contacts */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          {phoneContacts.length > 0 ? (
                            phoneContacts.map((phone, pIdx) => (
                              <div key={pIdx} className="flex items-center gap-1.5 font-mono text-[11px] text-crm-navy dark:text-white">
                                <Phone className="w-3 h-3 text-crm-indigo shrink-0" />
                                <span>{phone.value}</span>
                                {phone.label && (
                                  <span className="px-1 py-0.2 rounded bg-crm-sky/30 dark:bg-crm-navySurface text-[9px] font-sans text-crm-indigo dark:text-crm-periwinkle font-medium">
                                    {phone.label}
                                  </span>
                                )}
                                {phone.isWhatsApp && (
                                  <span className="px-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-semibold">
                                    WA
                                  </span>
                                )}
                              </div>
                            ))
                          ) : (
                            <span className="text-[11px] text-crm-indigo/50">No phone</span>
                          )}
                          {primaryEmail && (
                            <div className="flex items-center gap-1.5 text-[11px] text-crm-indigo dark:text-crm-lightGrey/70">
                              <Mail className="w-3 h-3 text-crm-indigo shrink-0" />
                              <span className="truncate max-w-[140px]">{primaryEmail}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Categories */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {v.categories && v.categories.length > 0 ? (
                            v.categories.slice(0, 3).map((c) => (
                              <span
                                key={c.category.id}
                                className="px-2 py-0.5 rounded-md bg-crm-sky/20 dark:bg-crm-navySurface text-[10px] text-crm-navy dark:text-crm-lightGrey border border-crm-lightGrey dark:border-crm-sky/10"
                              >
                                {c.category.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-crm-indigo/50">General Hardware</span>
                          )}
                          {v.categories && v.categories.length > 3 && (
                            <span className="text-[10px] text-crm-blue self-center">
                              +{v.categories.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            v.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                              : v.status === 'VERIFICATION_PENDING'
                              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              : 'bg-crm-lightGrey dark:bg-crm-navySurface text-crm-indigo dark:text-crm-lightGrey'
                          }`}
                        >
                          {v.status === 'ACTIVE' ? (
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          ) : (
                            <Clock className="w-2.5 h-2.5" />
                          )}
                          {v.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Outreach & Management Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WHATSAPP WITH TEMPLATE */}
                          {primaryPhone && (
                            <button
                              onClick={() => handleOpenWhatsAppModal(v, primaryPhone.value)}
                              title="Send WhatsApp Enquiry with Active Template"
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition shadow-xs"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* EDIT VENDOR */}
                          <button
                            onClick={() => handleOpenEdit(v)}
                            title="Edit vendor profile"
                            className="p-1.5 rounded-lg bg-crm-sky/20 dark:bg-crm-navySurface text-crm-navy dark:text-crm-lightGrey hover:bg-crm-sky/30 transition shadow-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* DELETE VENDOR */}
                          <button
                            onClick={() => handleDeleteVendor(v.id, v.name)}
                            title="Delete / Archive vendor"
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition shadow-xs"
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
      </div>

      {/* SAFE VENDOR PROFILE DETAILS DRAWER / MODAL */}
      {selectedVendorDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-crm-blue/15 text-crm-blue">
                  {selectedVendorDetail.vendorCode}
                </span>
                <h3 className="text-base font-bold text-crm-navy dark:text-white">
                  {selectedVendorDetail.name}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedVendorDetail.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {selectedVendorDetail.status.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={() => setSelectedVendorDetail(null)}
                className="p-1 rounded-lg text-crm-indigo hover:text-crm-navy dark:text-crm-lightGrey"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface/40 border border-crm-lightGrey/60 space-y-2">
                <span className="font-bold text-[10px] uppercase text-crm-indigo">Contact & Location</span>
                <div>
                  <span className="text-crm-indigo/70 block">Contact Person:</span>
                  <span className="font-semibold text-crm-navy dark:text-white">
                    {selectedVendorDetail.contactPerson || 'Not Specified'}
                  </span>
                </div>
                <div>
                  <span className="text-crm-indigo/70 block">Market / Area & City:</span>
                  <span className="font-semibold text-crm-navy dark:text-white flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-crm-blue" />
                    {selectedVendorDetail.area?.name ? `${selectedVendorDetail.area.name}, ` : ''}
                    {selectedVendorDetail.city?.name || 'City Unspecified'}
                    {selectedVendorDetail.state?.name ? ` (${selectedVendorDetail.state.name})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-crm-indigo/70 block">Full Address:</span>
                  <p className="text-crm-navy dark:text-crm-lightGrey">
                    {selectedVendorDetail.fullAddress || 'Address not recorded'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface/40 border border-crm-lightGrey/60 space-y-2">
                <span className="font-bold text-[10px] uppercase text-crm-indigo">Communications</span>
                <div className="space-y-1.5">
                  {selectedVendorDetail.contacts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between font-mono">
                      <div className="flex items-center gap-1.5">
                        {c.type === 'PHONE' ? <Phone className="w-3 h-3 text-crm-blue" /> : <Mail className="w-3 h-3 text-crm-indigo" />}
                        <span>{c.value}</span>
                        {c.label && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-crm-sky/30 dark:bg-crm-navySurface text-crm-indigo dark:text-crm-periwinkle font-sans font-semibold">
                            {c.label}
                          </span>
                        )}
                        {c.isPrimary && (
                          <span className="text-[9px] px-1 rounded bg-crm-sky/30 text-crm-blue font-bold">Primary</span>
                        )}
                      </div>
                      {c.isWhatsApp && (
                        <button
                          onClick={() => {
                            setSelectedVendorDetail(null);
                            handleOpenWhatsAppModal(selectedVendorDetail, c.value);
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" /> WA
                        </button>
                      )}
                    </div>
                  ))}
                  {selectedVendorDetail.contacts.length === 0 && (
                    <p className="text-crm-indigo/50">No contact numbers recorded.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Supplied Categories */}
            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-[10px] uppercase text-crm-indigo">Supplied Categories</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedVendorDetail.categories && selectedVendorDetail.categories.length > 0 ? (
                  selectedVendorDetail.categories.map((c) => (
                    <span
                      key={c.category.id}
                      className="px-2.5 py-1 rounded-lg bg-crm-sky/20 dark:bg-crm-navySurface border border-crm-lightGrey/70 text-crm-navy dark:text-white font-medium"
                    >
                      {c.category.name}
                    </span>
                  ))
                ) : (
                  <span className="text-crm-indigo/50">General PC Hardware</span>
                )}
              </div>
            </div>

            {/* Actions Toolbar in Drawer */}
            <div className="flex items-center justify-between pt-3 border-t border-crm-lightGrey dark:border-crm-sky/15 text-xs">
              <button
                onClick={() => handleDeleteVendor(selectedVendorDetail.id, selectedVendorDetail.name)}
                className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Archive Vendor
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const v = selectedVendorDetail;
                    setSelectedVendorDetail(null);
                    handleOpenEdit(v);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-crm-sky/20 hover:bg-crm-sky/30 text-crm-navy dark:text-white font-semibold flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>

                {selectedVendorDetail.contacts.some((c) => c.isWhatsApp || c.type === 'PHONE') && (
                  <button
                    onClick={() => {
                      const v = selectedVendorDetail;
                      setSelectedVendorDetail(null);
                      handleOpenWhatsAppModal(v);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Send WhatsApp Enquiry
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP TEMPLATE COMPOSER & REDIRECT MODAL */}
      {isWhatsAppModalOpen && activeWhatsAppVendor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/15 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-crm-navy dark:text-white">
                    Send WhatsApp Message to {activeWhatsAppVendor.name}
                  </h3>
                  <span className="font-mono text-[11px] text-crm-indigo">
                    Target: {activeWhatsAppPhone}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsWhatsAppModalOpen(false)}
                className="p-1 rounded-lg text-crm-indigo hover:text-crm-navy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Template Selector */}
              <div>
                <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                  Select Enquiry Message Template
                </label>
                <select
                  value={activeTemplateId}
                  onChange={(e) => handleSelectTemplateInModal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white font-semibold"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.channel}) {tpl.isDefault ? '★ [Active Default]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Editable Message Preview */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80">
                    Message Preview (Ready for WhatsApp Web)
                  </label>
                  <button
                    onClick={handleCopyMessage}
                    className="text-[10px] text-crm-blue hover:underline flex items-center gap-1"
                  >
                    {copiedMessage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {copiedMessage ? 'Copied!' : 'Copy Text'}
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={renderedWhatsAppMessage}
                  onChange={(e) => setRenderedWhatsAppMessage(e.target.value)}
                  className="w-full p-3 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface/60 border border-crm-lightGrey dark:border-crm-sky/20 font-mono text-[11px] text-crm-navy dark:text-white leading-relaxed"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-300">
                Clicking <strong>Open in WhatsApp Web</strong> will redirect with this exact message pre-filled directly into WhatsApp Web chat for this vendor.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-crm-lightGrey dark:border-crm-sky/15">
                <button
                  type="button"
                  onClick={() => setIsWhatsAppModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-crm-lightGrey text-crm-navy dark:text-crm-lightGrey font-semibold hover:bg-crm-sky/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleLaunchWhatsApp(activeWhatsAppPhone, renderedWhatsAppMessage)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-2 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Open in WhatsApp Web
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/15 pb-3">
              <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
                {editingVendor ? 'Edit Vendor Profile' : 'Add New Hardware Vendor'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-crm-indigo hover:text-crm-navy dark:text-crm-lightGrey"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                    Shop / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Sri Balaji Computers"
                    className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                    Contact Person / Proprietor
                  </label>
                  <input
                    type="text"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    placeholder="e.g. Ramesh"
                    className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                    Phone / Mobile (WhatsApp) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 9842112345 or 0452-2345678"
                    className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. contact@balajicomputers.com"
                    className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                    City
                  </label>
                  <select
                    value={formCityId}
                    onChange={(e) => {
                      setFormCityId(e.target.value);
                      setFormAreaId('');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                  >
                    <option value="">Select City</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80">
                      Commercial Market / Area
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomArea(!isCustomArea);
                        if (!isCustomArea) setFormAreaId('__NEW__');
                        else setFormAreaId('');
                      }}
                      className="text-[10px] text-crm-blue hover:underline font-semibold"
                    >
                      {isCustomArea ? '← Select from list' : '+ Type custom area'}
                    </button>
                  </div>

                  {isCustomArea ? (
                    <input
                      type="text"
                      value={formCustomArea}
                      onChange={(e) => setFormCustomArea(e.target.value)}
                      placeholder="Type area (e.g. Railar nagar, Pothigai nagar)..."
                      className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-blue text-crm-navy dark:text-white placeholder:text-crm-indigo/50"
                    />
                  ) : (
                    <select
                      value={formAreaId}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCustomArea(true);
                          setFormAreaId('__NEW__');
                        } else {
                          setFormAreaId(e.target.value);
                          setFormCustomArea('');
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                    >
                      <option value="">Select Market</option>
                      {(formCityId ? areas.filter((a) => a.parentId === formCityId) : areas).map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                      <option value="__NEW__">+ Type Custom Area / Market...</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                  Full Address
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Shop No, Complex, Street Name..."
                  className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                />
              </div>

              {/* Component Categories handled with editable add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80">
                    Component Categories Supplied ({formCategoryIds.length} selected)
                  </label>
                  <span className="text-[10px] text-crm-indigo/60">
                    Check supplied categories or add new
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface/40 border border-crm-lightGrey dark:border-crm-sky/10 mb-2">
                  {categories.map((cat) => {
                    const isChecked = formCategoryIds.includes(cat.id);
                    return (
                      <label key={cat.id} className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormCategoryIds([...formCategoryIds, cat.id]);
                            } else {
                              setFormCategoryIds(formCategoryIds.filter((id) => id !== cat.id));
                            }
                          }}
                          className="rounded border-crm-lightGrey text-crm-blue"
                        />
                        <span className="truncate">{cat.name}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Inline Text Editable Add Component Category */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleAddNewCategory();
                      }
                    }}
                    placeholder="Type new component category (e.g. CCTV, Printers)..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-[11px] text-crm-navy dark:text-white placeholder:text-crm-indigo/50"
                  />
                  <button
                    type="button"
                    disabled={!newCategoryInput.trim() || addingCategory}
                    onClick={handleAddNewCategory}
                    className="px-3 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy text-white text-[11px] font-bold shrink-0 transition disabled:opacity-50 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {addingCategory ? 'Adding...' : 'Add Category'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-crm-lightGrey dark:border-crm-sky/15">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-crm-lightGrey hover:bg-crm-sky/20 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
