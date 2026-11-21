'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  FileQuestion,
  Plus,
  Search,
  MessageCircle,
  Mail,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight,
  X,
  ExternalLink,
  ShieldCheck,
  Cpu,
  Receipt,
  Sparkles,
  TrendingUp,
  Tag,
  AlertCircle,
  Trash2,
  Edit2,
  DollarSign,
  FileText,
  Zap,
  Check,
  Star,
  Layers,
  ArrowRight,
  User,
  Copy,
  Eye,
  EyeOff,
  LayoutList,
  LayoutGrid,
  Phone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { parseComponentListText } from '@/lib/vendors/componentParser';

interface ComponentItem {
  id: string;
  componentName: string;
  brand?: string;
  model?: string;
  specifications?: string;
  quantity: number;
  budget?: string;
  onlinePrice?: number;
  categoryId?: string;
  category?: { id: string; name: string };
}

interface Recipient {
  id: string;
  vendorId: string;
  status: string;
  channel?: string;
  contactUsed?: string;
  renderedSubject?: string;
  renderedMessage?: string;
  chatOpenedAt?: string;
  sentConfirmedAt?: string;
  emailSentAt?: string;
  quotations?: any[];
  vendor: {
    id: string;
    name: string;
    vendorCode?: string;
    city?: { name: string };
    area?: { name: string };
    contacts: Array<{ value: string; type: string; isWhatsApp: boolean; isPrimary: boolean; normalized?: string; label?: string }>;
  };
}

interface Quotation {
  id: string;
  recipientId: string;
  itemId?: string;
  availability?: string;
  availableQty?: number;
  brand?: string;
  model?: string;
  unitPrice?: number;
  gstPercent?: number;
  gstAmount?: number;
  totalPrice?: number;
  warranty?: string;
  deliveryTime?: string;
  remarks?: string;
  vendor?: { id: string; name: string; vendorCode: string };
  item?: { id: string; componentName: string };
}

interface Enquiry {
  id: string;
  requestCode: string;
  customerName?: string;
  customerLocation?: string;
  priority: string;
  urgency?: string;
  status: string;
  createdAt: string;
  items: ComponentItem[];
  recipients: Recipient[];
  quotations: Quotation[];
}

interface MatchedVendor {
  vendorId: string;
  vendorCode: string;
  name: string;
  contactPerson?: string;
  primaryPhone?: string;
  canWhatsApp: boolean;
  phones?: Array<{
    value: string;
    normalized?: string;
    isWhatsApp: boolean;
    label?: string;
    isPrimary: boolean;
  }>;
  primaryEmail?: string;
  cityName?: string;
  areaName?: string;
  categories: string[];
  matchScore: number;
  matchReasons: string[];
  isAlreadyRecipient: boolean;
}

export default function ComponentEnquiriesHub() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // New Enquiry Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'quick_paste' | 'manual'>('quick_paste');
  const [pasteRawText, setPasteRawText] = useState('');
  const [custLocation, setCustLocation] = useState('');
  const [custName, setCustName] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [urgency, setUrgency] = useState('Immediate / Today');
  const [items, setItems] = useState<Array<{ componentName: string; brand: string; model: string; specifications: string; quantity: number; categoryId: string; onlinePrice?: number }>>([
    { componentName: 'AMD Ryzen 7 9700X', brand: 'AMD', model: '', specifications: '8 Cores / 16 Threads', quantity: 1, categoryId: '', onlinePrice: 34500 },
  ]);

  // Selected Enquiry Details
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'matching' | 'recipients' | 'quotes'>('items');
  const [enquiryLoading, setEnquiryLoading] = useState(false);

  // Matched Vendors State
  const [matchedVendors, setMatchedVendors] = useState<MatchedVendor[]>([]);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);

  // Templates list for WhatsApp & Email
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Item Edit State inside active enquiry
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemBrand, setEditItemBrand] = useState('');
  const [editItemSpecs, setEditItemSpecs] = useState('');
  const [editItemQty, setEditItemQty] = useState(1);
  const [editItemOnlinePrice, setEditItemOnlinePrice] = useState<string>('');
  const [editItemCatId, setEditItemCatId] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  // New Item Add inside active enquiry
  const [isAddingItemToEnquiry, setIsAddingItemToEnquiry] = useState(false);
  const [isPasteToExistingOpen, setIsPasteToExistingOpen] = useState(false);
  const [pasteToExistingText, setPasteToExistingText] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [newItemSpecs, setNewItemSpecs] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemOnlinePrice, setNewItemOnlinePrice] = useState('');
  const [newItemCatId, setNewItemCatId] = useState('');

  // Quote Recording Modal State
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteRecipient, setQuoteRecipient] = useState<Recipient | null>(null);
  const [quoteItemId, setQuoteItemId] = useState('');
  const [quoteUnitPrice, setQuoteUnitPrice] = useState('');
  const [quoteGstPercent, setQuoteGstPercent] = useState('18');
  const [quoteQty, setQuoteQty] = useState('1');
  const [quoteAvailability, setQuoteAvailability] = useState('AVAILABLE');
  const [quoteWarranty, setQuoteWarranty] = useState('3 Years');
  const [quoteDeliveryTime, setQuoteDeliveryTime] = useState('Ready Stock');
  const [quoteRemarks, setQuoteRemarks] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);

  // Outreached Vendors View & Filter State (Scalable for 100+ vendors)
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientStatusFilter, setRecipientStatusFilter] = useState('ALL');
  const [recipientViewMode, setRecipientViewMode] = useState<'table' | 'cards'>('table');
  const [expandedMsgRecipientId, setExpandedMsgRecipientId] = useState<string | null>(null);
  const [isGlobalTemplatePreviewOpen, setIsGlobalTemplatePreviewOpen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const handleCopyPhone = (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  const getGlobalTemplatePreview = (): string => {
    if (!selectedEnquiry) return '';
    const activeTpl = templates.find((t) => t.id === selectedTemplateId) || templates.find((t) => t.channel === 'WHATSAPP') || templates[0];

    const componentList = selectedEnquiry.items
      .map((it, idx) => `${idx + 1}. ${it.componentName}${it.brand ? ` (${it.brand})` : ''} - Qty: ${it.quantity}${it.specifications ? ` [${it.specifications}]` : ''}`)
      .join('\n');

    if (activeTpl) {
      let text = activeTpl.body;
      text = text.replace(/{{vendor_name}}/g, '[Vendor Name]');
      text = text.replace(/{{customer_location}}/g, selectedEnquiry.customerLocation || 'Tamil Nadu');
      text = text.replace(/{{component_list}}/g, componentList);
      text = text.replace(/{{urgency}}/g, selectedEnquiry.urgency || 'Immediate');
      text = text.replace(/{{enquiry_code}}/g, selectedEnquiry.requestCode);
      return text;
    }

    return `Hello [Vendor Name], urgent requirement for customer in ${selectedEnquiry.customerLocation || 'Tamil Nadu'}:\n\n${componentList}\n\nPlease share availability & best quotation. Thanks!`;
  };

  // Categories list
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Load Categories & Templates
  useEffect(() => {
    fetch('/api/vendors/categories')
      .then((res) => res.json())
      .then((d) => {
        if (d.success) setCategories(d.categories || []);
      })
      .catch(console.error);

    fetch('/api/vendors/templates')
      .then((res) => res.json())
      .then((d) => {
        if (d.success && d.templates) {
          setTemplates(d.templates);
          const defaultTpl = d.templates.find((t: any) => t.isDefault && t.channel === 'WHATSAPP') || d.templates[0];
          if (defaultTpl) setSelectedTemplateId(defaultTpl.id);
        }
      })
      .catch(console.error);
  }, []);

  const loadEnquiries = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/vendor-enquiries?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEnquiries(data.enquiries || []);
      }
    } catch (err) {
      console.error('Failed to load enquiries:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    void loadEnquiries();
  }, [loadEnquiries]);

  // Load single full enquiry with all nested relations safely
  const loadSingleEnquiry = async (enquiryId: string) => {
    try {
      setEnquiryLoading(true);
      const res = await fetch(`/api/vendor-enquiries/${enquiryId}`);
      const data = await res.json();
      if (data.success && data.enquiry) {
        setSelectedEnquiry(data.enquiry);
      }
    } catch (err) {
      console.error('Error fetching full enquiry:', err);
    } finally {
      setEnquiryLoading(false);
    }
  };

  // Load Smart Matched Vendors for selected enquiry
  const loadMatchedVendors = async (enquiryId: string) => {
    try {
      setMatchingLoading(true);
      const res = await fetch(`/api/vendor-enquiries/${enquiryId}/match-vendors`);
      const data = await res.json();
      if (data.success) {
        setMatchedVendors(data.matchedVendors || []);
      }
    } catch (err) {
      console.error('Failed to load matched vendors:', err);
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleOpenEnquiryDetails = (enq: Enquiry) => {
    // Set initially and fetch full fresh copy
    setSelectedEnquiry(enq);
    setActiveTab('items');
    void loadSingleEnquiry(enq.id);
    void loadMatchedVendors(enq.id);
  };

  // Handle Quick Paste parsing
  const handleParsePastedText = () => {
    if (!pasteRawText.trim()) {
      alert('Please paste the component list text first');
      return;
    }
    const parsed = parseComponentListText(pasteRawText, categories);
    if (parsed.length === 0) {
      alert('Could not find any component specifications in the pasted text. Please check the format.');
      return;
    }
    setItems(
      parsed.map((p) => ({
        componentName: p.componentName,
        brand: p.brand || '',
        model: p.model || '',
        specifications: p.specifications || '',
        quantity: p.quantity || 1,
        categoryId: p.categoryId || '',
        onlinePrice: p.onlinePrice,
      }))
    );
    setCreateMode('manual'); // Switch to review list
  };

  // Create New Enquiry
  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !items[0].componentName) {
      alert('Please enter at least one component requirement');
      return;
    }

    try {
      const res = await fetch('/api/vendor-enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: custName.trim() || undefined,
          customerLocation: custLocation.trim() || undefined,
          priority,
          urgency,
          items,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        void loadEnquiries();
        handleOpenEnquiryDetails(data.enquiry);
      } else {
        alert(data.error || 'Failed to create enquiry');
      }
    } catch (err) {
      console.error('Error creating enquiry:', err);
    }
  };

  // Save Item Updates inside active enquiry
  const handleSaveItemEdit = async (itemId: string) => {
    if (!selectedEnquiry) return;
    try {
      setSavingItem(true);
      const updatedItems = selectedEnquiry.items.map((it) => {
        if (it.id === itemId) {
          return {
            ...it,
            componentName: editItemName.trim() || it.componentName,
            brand: editItemBrand.trim() || null,
            specifications: editItemSpecs.trim() || null,
            quantity: editItemQty,
            onlinePrice: editItemOnlinePrice ? parseFloat(editItemOnlinePrice) : null,
            categoryId: editItemCatId || it.categoryId,
          };
        }
        return it;
      });

      const res = await fetch(`/api/vendor-enquiries/${selectedEnquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updatedItems }),
      });

      const data = await res.json();
      if (data.success) {
        setEditingItemId(null);
        void loadSingleEnquiry(selectedEnquiry.id);
        void loadEnquiries();
      } else {
        alert(data.error || 'Failed to update item');
      }
    } catch (err) {
      console.error('Error saving item edit:', err);
    } finally {
      setSavingItem(false);
    }
  };

  // Delete item from active enquiry
  const handleDeleteItem = async (itemId: string) => {
    if (!selectedEnquiry) return;
    if (selectedEnquiry.items.length <= 1) {
      alert('An enquiry must have at least one component requirement.');
      return;
    }
    const confirmed = window.confirm('Are you sure you want to delete this component item?');
    if (!confirmed) return;

    try {
      const remainingItems = selectedEnquiry.items.filter((it) => it.id !== itemId);
      const res = await fetch(`/api/vendor-enquiries/${selectedEnquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: remainingItems }),
      });

      const data = await res.json();
      if (data.success) {
        void loadSingleEnquiry(selectedEnquiry.id);
        void loadEnquiries();
      } else {
        alert(data.error || 'Failed to delete item');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  // Add new item to active enquiry
  const handleAddNewItemToEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry || !newItemName.trim()) return;

    try {
      setSavingItem(true);
      const currentItems = [...selectedEnquiry.items];
      currentItems.push({
        id: '', // Empty id triggers create in PUT handler
        componentName: newItemName.trim(),
        brand: newItemBrand.trim() || undefined,
        model: '',
        specifications: newItemSpecs.trim() || undefined,
        quantity: newItemQty,
        onlinePrice: newItemOnlinePrice ? parseFloat(newItemOnlinePrice) : undefined,
        categoryId: newItemCatId || undefined,
      });

      const res = await fetch(`/api/vendor-enquiries/${selectedEnquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: currentItems }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAddingItemToEnquiry(false);
        setNewItemName('');
        setNewItemBrand('');
        setNewItemSpecs('');
        setNewItemQty(1);
        setNewItemOnlinePrice('');
        setNewItemCatId('');
        void loadSingleEnquiry(selectedEnquiry.id);
        void loadEnquiries();
      } else {
        alert(data.error || 'Failed to add item');
      }
    } catch (err) {
      console.error('Error adding new item to enquiry:', err);
    } finally {
      setSavingItem(false);
    }
  };

  // Quick Paste & Add multiple items to existing enquiry
  const handleAddParsedItemsToEnquiry = async () => {
    if (!selectedEnquiry || !pasteToExistingText.trim()) return;
    try {
      setSavingItem(true);
      const parsed = parseComponentListText(pasteToExistingText, categories);
      if (parsed.length === 0) {
        alert('Could not parse any components from the pasted text. Please verify the format.');
        return;
      }

      const currentItems = [...selectedEnquiry.items];
      for (const p of parsed) {
        currentItems.push({
          id: '',
          componentName: p.componentName,
          brand: p.brand || undefined,
          model: '',
          specifications: p.specifications || undefined,
          quantity: p.quantity || 1,
          onlinePrice: p.onlinePrice || undefined,
          categoryId: p.categoryId || undefined,
        });
      }

      const res = await fetch(`/api/vendor-enquiries/${selectedEnquiry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: currentItems }),
      });

      const data = await res.json();
      if (data.success) {
        setIsPasteToExistingOpen(false);
        setPasteToExistingText('');
        void loadSingleEnquiry(selectedEnquiry.id);
        void loadEnquiries();
      } else {
        alert(data.error || 'Failed to add parsed components');
      }
    } catch (err) {
      console.error('Error adding parsed components to enquiry:', err);
    } finally {
      setSavingItem(false);
    }
  };

  // Delete Enquiry
  const handleDeleteEnquiry = async (enquiryId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this component enquiry?');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/vendor-enquiries/${enquiryId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSelectedEnquiry(null);
        void loadEnquiries();
      } else {
        alert(data.error || 'Failed to delete enquiry');
      }
    } catch (err) {
      console.error('Error deleting enquiry:', err);
    }
  };

  // Add matched vendors as recipients
  const handleAddRecipients = async () => {
    if (!selectedEnquiry || selectedVendorIds.length === 0) return;

    try {
      const res = await fetch(`/api/vendor-enquiries/${selectedEnquiry.id}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorIds: selectedVendorIds,
          templateId: selectedTemplateId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSelectedVendorIds([]);
        void loadSingleEnquiry(selectedEnquiry.id);
        void loadMatchedVendors(selectedEnquiry.id);
        setActiveTab('recipients');
      } else {
        alert(data.error || 'Failed to add recipients');
      }
    } catch (err) {
      console.error('Error adding recipients:', err);
    }
  };

  // Generate live preview text of WhatsApp message for a recipient
  const getRenderedWhatsAppMessage = (rec: Recipient): string => {
    if (!selectedEnquiry) return '';
    const activeTpl = templates.find((t) => t.id === selectedTemplateId) || templates.find((t) => t.channel === 'WHATSAPP') || templates[0];

    const componentList = selectedEnquiry.items
      .map((it, idx) => `${idx + 1}. ${it.componentName}${it.brand ? ` (${it.brand})` : ''} - Qty: ${it.quantity}${it.specifications ? ` [${it.specifications}]` : ''}`)
      .join('\n');

    if (activeTpl) {
      let text = activeTpl.body;
      text = text.replace(/{{vendor_name}}/g, rec.vendor.name);
      text = text.replace(/{{customer_location}}/g, selectedEnquiry.customerLocation || 'Madurai / Tamil Nadu');
      text = text.replace(/{{component_list}}/g, componentList);
      text = text.replace(/{{urgency}}/g, selectedEnquiry.urgency || 'Immediate');
      text = text.replace(/{{enquiry_code}}/g, selectedEnquiry.requestCode);
      return text;
    }

    return `Hello ${rec.vendor.name}, urgent requirement for customer in ${selectedEnquiry.customerLocation || 'Tamil Nadu'}:\n\n${componentList}\n\nPlease share availability & best quotation. Thanks!`;
  };

  // Open WhatsApp Web with live rendered template message
  const handleOpenWhatsApp = async (rec: Recipient, targetPhone?: string) => {
    if (!selectedEnquiry) return;
    try {
      const message = getRenderedWhatsAppMessage(rec);
      const contactToUse =
        targetPhone ||
        rec.contactUsed ||
        rec.vendor.contacts?.find((c) => c.type === 'PHONE' && c.isPrimary)?.normalized ||
        rec.vendor.contacts?.find((c) => c.type === 'PHONE')?.value;

      if (!contactToUse) {
        alert('Vendor has no valid phone number recorded.');
        return;
      }

      const cleanDigits = contactToUse.replace(/\D/g, '');
      const intlDigits = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
      const directUrl = `https://web.whatsapp.com/send?phone=${intlDigits}&text=${encodeURIComponent(message)}`;

      // 1. Immediately launch WhatsApp Web in new tab with the pre-filled encoded message
      window.open(directUrl, '_blank');

      // 2. Call backend to update recipient status to CHAT_OPENED & log activity
      await fetch(`/api/vendor-enquiries/${selectedEnquiry.id}/whatsapp/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: rec.id,
          message,
          templateId: selectedTemplateId || undefined,
          contactUsed: contactToUse,
        }),
      });

      void loadSingleEnquiry(selectedEnquiry.id);
    } catch (err) {
      console.error('Error opening WhatsApp:', err);
    }
  };

  // Confirm WhatsApp Sent
  const handleConfirmWhatsApp = async (recipientId: string) => {
    if (!selectedEnquiry) return;
    try {
      const res = await fetch(`/api/vendor-enquiries/${selectedEnquiry.id}/whatsapp/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (data.success) {
        void loadSingleEnquiry(selectedEnquiry.id);
        void loadEnquiries();
      } else {
        alert(data.error || 'Failed to confirm WhatsApp send');
      }
    } catch (err) {
      console.error('Error confirming WhatsApp:', err);
    }
  };

  // Send Email
  const handleSendEmail = async (recipientId: string) => {
    if (!selectedEnquiry) return;
    try {
      const res = await fetch(`/api/vendor-enquiries/${selectedEnquiry.id}/email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Email sent successfully!');
        void loadSingleEnquiry(selectedEnquiry.id);
      } else {
        alert(data.error || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
    }
  };

  // Save Recorded Quotation
  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEnquiry || !quoteRecipient) return;

    try {
      setSavingQuote(true);
      const res = await fetch(`/api/vendor-enquiries/${selectedEnquiry.id}/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: quoteRecipient.id,
          itemId: quoteItemId || undefined,
          unitPrice: quoteUnitPrice,
          gstPercent: quoteGstPercent,
          availableQty: quoteQty,
          availability: quoteAvailability,
          warranty: quoteWarranty,
          deliveryTime: quoteDeliveryTime,
          remarks: quoteRemarks,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsQuoteModalOpen(false);
        void loadSingleEnquiry(selectedEnquiry.id);
        void loadEnquiries();
        setActiveTab('quotes');
      } else {
        alert(data.error || 'Failed to record quote');
      }
    } catch (err) {
      console.error('Error saving quotation:', err);
    } finally {
      setSavingQuote(false);
    }
  };

  // Delete Quotation
  const handleDeleteQuote = async (quoteId: string) => {
    if (!selectedEnquiry) return;
    const confirmed = window.confirm('Are you sure you want to delete this recorded quote?');
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/vendor-enquiries/${selectedEnquiry.id}/quotations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId }),
      });
      const data = await res.json();
      if (data.success) {
        void loadSingleEnquiry(selectedEnquiry.id);
      } else {
        alert(data.error || 'Failed to delete quote');
      }
    } catch (err) {
      console.error('Error deleting quotation:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Header */}
      <div className="p-4 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-crm-indigo dark:text-crm-lightGrey/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search enquiries by client name, enquiry code, location, or component..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-xs text-crm-navy dark:text-white placeholder:text-crm-indigo/60 focus:outline-none focus:border-crm-blue"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-xs text-crm-navy dark:text-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <button
          onClick={() => {
            setCustName('');
            setCustLocation('');
            setCreateMode('quick_paste');
            setPasteRawText('');
            setItems([]);
            setIsCreateOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Component Enquiry
        </button>
      </div>

      {/* Enquiries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-xs text-crm-indigo dark:text-crm-lightGrey/60">
            Loading component enquiries...
          </div>
        ) : enquiries.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-2">
            <FileQuestion className="w-10 h-10 mx-auto text-crm-blue/50" />
            <h4 className="text-sm font-bold text-crm-navy dark:text-white">No Enquiries Found</h4>
            <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/70">
              Create an enquiry for computer components (RAM, SSD, GPU, etc.) and match local vendors.
            </p>
          </div>
        ) : (
          enquiries.map((enq) => (
            <div
              key={enq.id}
              onClick={() => handleOpenEnquiryDetails(enq)}
              className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 hover:border-crm-blue/50 cursor-pointer transition shadow-sm space-y-3 group"
            >
              {/* Client Name Prominently with User Icon & Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-crm-blue/15 text-crm-blue flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-crm-navy dark:text-white truncate" title={enq.customerName || 'Direct Customer'}>
                      {enq.customerName?.trim() || 'Direct Customer'}
                    </h4>
                    <span className="font-mono text-[10px] text-crm-indigo dark:text-crm-lightGrey/70 font-semibold block">
                      {enq.requestCode}
                    </span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    enq.status === 'OPEN'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : enq.status === 'IN_PROGRESS'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  }`}
                >
                  {enq.status.replace('_', ' ')}
                </span>
              </div>

              <div>
                <div className="font-semibold text-xs text-crm-navy dark:text-crm-lightGrey line-clamp-1">
                  {enq.items?.map((it) => it.componentName).join(', ') || 'Hardware Requirement'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-crm-indigo dark:text-crm-lightGrey/70 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-crm-blue shrink-0" />
                  <span>{enq.customerLocation || 'Customer Location Not Set'}</span>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-3 pt-2 border-t border-crm-lightGrey dark:border-crm-sky/15 text-[11px] text-crm-indigo dark:text-crm-lightGrey/75">
                <span>{enq.items?.length ?? 0} parts</span>
                <span>•</span>
                <span>{enq.recipients?.length ?? 0} vendors contacted</span>
                <span>•</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {enq.quotations?.length ?? 0} quotes received
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE ENQUIRY MODAL (WITH QUICK PASTE BUILD LIST OPTION) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/15 pb-3">
              <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-crm-blue" />
                Create Component Enquiry
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-crm-indigo hover:text-crm-navy"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEnquiry} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                    Customer Location (City / Market) *
                  </label>
                  <input
                    type="text"
                    required
                    value={custLocation}
                    onChange={(e) => setCustLocation(e.target.value)}
                    placeholder="e.g. Madurai, Simmakkal, or Coimbatore"
                    className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                    Client / Customer Name
                  </label>
                  <input
                    type="text"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar (Madurai Gaming Cafe)"
                    className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                  />
                </div>
              </div>

              {/* Mode Selector: Quick Paste vs Manual */}
              <div className="flex items-center gap-2 border-b border-crm-lightGrey dark:border-crm-sky/15 pb-2">
                <button
                  type="button"
                  onClick={() => setCreateMode('quick_paste')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                    createMode === 'quick_paste'
                      ? 'bg-crm-blue text-white shadow-sm'
                      : 'text-crm-indigo dark:text-crm-lightGrey hover:bg-crm-sky/20'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Quick Paste Build List (Auto-Parse 5+ Items)
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode('manual')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                    createMode === 'manual'
                      ? 'bg-crm-blue text-white shadow-sm'
                      : 'text-crm-indigo dark:text-crm-lightGrey hover:bg-crm-sky/20'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Manual Items Table ({items.length})
                </button>
              </div>

              {/* Quick Paste Area */}
              {createMode === 'quick_paste' && (
                <div className="space-y-3 p-4 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface/40 border border-crm-lightGrey dark:border-crm-sky/15">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-crm-navy dark:text-white">
                      Paste PC Component Requirements (WhatsApp/Specs/Quotes)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPasteRawText(`1. Processor: AMD Ryzen 7 9700X (8 Cores / 16 Threads)
2. Graphics Card: NVIDIA RTX 5060 Ti 16GB GDDR7
3. Motherboard: MSI PRO B650M-A WiFi
4. RAM: 64GB DDR5 6000MHz (2 × 32GB)
5. Storage: 2TB NVMe PCIe Gen4 SSD
6. CPU Cooler: DeepCool AK400 / AG400
7. Power Supply: 750W 80+ Gold, ATX 3.1
8. Cabinet: Airflow Mesh Mid-Tower`)
                      }
                      className="text-[10px] text-crm-blue hover:underline"
                    >
                      Fill Example Build
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    value={pasteRawText}
                    onChange={(e) => setPasteRawText(e.target.value)}
                    placeholder={`Paste component list here... e.g.:
1. Processor: AMD Ryzen 7 9700X (8 Cores / 16 Threads)
2. Graphics Card: NVIDIA RTX 5060 Ti 16GB GDDR7
3. Motherboard: MSI PRO B650M-A WiFi
4. RAM: 64GB DDR5 6000MHz (2 × 32GB)
5. Storage: 2TB NVMe PCIe Gen4 SSD - Online Price: Rs 12500`}
                    className="w-full p-3 rounded-xl bg-white dark:bg-crm-navy border border-crm-lightGrey font-mono text-[11px] leading-relaxed"
                  />

                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleParsePastedText}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Auto-Extract Components & Review
                    </button>
                  </div>
                </div>
              )}

              {/* Items Table Review (Manual mode or after quick-paste) */}
              {createMode === 'manual' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-crm-navy dark:text-white">
                      Extracted / Configured Items ({items.length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setItems([
                          ...items,
                          { componentName: '', brand: '', model: '', specifications: '', quantity: 1, categoryId: '', onlinePrice: undefined },
                        ])
                      }
                      className="text-[11px] text-crm-blue hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {items.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface/50 border border-crm-lightGrey dark:border-crm-sky/15 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[10px] text-crm-indigo">Item #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => setItems(items.filter((_, i) => i !== idx))}
                            className="text-crm-orangeRed hover:opacity-80 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              required
                              value={it.componentName}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].componentName = e.target.value;
                                setItems(updated);
                              }}
                              placeholder="Component (e.g. Ryzen 7 9700X)"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-crm-navy border border-crm-lightGrey text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <select
                              value={it.categoryId}
                              onChange={async (e) => {
                                if (e.target.value === '__NEW__') {
                                  const customName = window.prompt('Enter new hardware component category:');
                                  if (customName?.trim()) {
                                    const res = await fetch('/api/vendors/categories', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ name: customName.trim() }),
                                    });
                                    const data = await res.json();
                                    if (data.success && data.category) {
                                      setCategories((prev) => [...prev, data.category]);
                                      const updated = [...items];
                                      updated[idx].categoryId = data.category.id;
                                      setItems(updated);
                                    }
                                  }
                                } else {
                                  const updated = [...items];
                                  updated[idx].categoryId = e.target.value;
                                  setItems(updated);
                                }
                              }}
                              className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-crm-navy border border-crm-lightGrey text-xs"
                            >
                              <option value="">Select Category</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                              <option value="__NEW__">+ Add New Category...</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={it.brand}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].brand = e.target.value;
                              setItems(updated);
                            }}
                            placeholder="Brand"
                            className="px-2 py-1 rounded bg-white dark:bg-crm-navy border text-xs"
                          />
                          <input
                            type="text"
                            value={it.specifications}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].specifications = e.target.value;
                              setItems(updated);
                            }}
                            placeholder="Specs"
                            className="px-2 py-1 rounded bg-white dark:bg-crm-navy border text-xs"
                          />
                          <input
                            type="number"
                            min={1}
                            value={it.quantity}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].quantity = parseInt(e.target.value || '1', 10);
                              setItems(updated);
                            }}
                            placeholder="Qty"
                            className="px-2 py-1 rounded bg-white dark:bg-crm-navy border text-xs font-mono"
                          />
                          <input
                            type="number"
                            value={it.onlinePrice ?? ''}
                            onChange={(e) => {
                              const updated = [...items];
                              updated[idx].onlinePrice = e.target.value ? parseFloat(e.target.value) : undefined;
                              setItems(updated);
                            }}
                            placeholder="Online Price (₹)"
                            className="px-2 py-1 rounded bg-white dark:bg-crm-navy border text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-crm-lightGrey dark:border-crm-sky/15">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-crm-lightGrey text-xs font-semibold hover:bg-crm-sky/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={items.length === 0}
                  className="px-5 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  Create Enquiry & Match Vendors ({items.length} Parts)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SELECTED ENQUIRY DETAILS MODAL / DRAWER - FULL SCREEN VIEW */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-crm-navy flex flex-col w-screen h-screen overflow-hidden">
          {/* Top Header Bar */}
          <div className="px-6 py-3.5 border-b border-crm-lightGrey dark:border-crm-sky/15 bg-white/95 dark:bg-crm-navySurface/90 backdrop-blur flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-crm-blue/15 text-crm-blue flex items-center justify-center font-bold shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-crm-navy dark:text-white">
                    {selectedEnquiry.customerName?.trim() || 'Direct Client Enquiry'}
                  </h3>
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-crm-blue/15 text-crm-blue">
                    {selectedEnquiry.requestCode}
                  </span>
                  <button
                    onClick={() => handleDeleteEnquiry(selectedEnquiry.id)}
                    title="Delete this enquiry"
                    className="p-1 rounded text-crm-orangeRed hover:bg-crm-orangeRed/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/70 mt-0.5">
                  Client: <strong className="text-crm-navy dark:text-white">{selectedEnquiry.customerName?.trim() || 'Direct Client'}</strong> • Location: <strong className="text-crm-navy dark:text-white">{selectedEnquiry.customerLocation || 'Tamil Nadu'}</strong> • Parts: <strong className="text-crm-navy dark:text-white">{selectedEnquiry.items?.length || 0} requested</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedEnquiry(null)}
              className="px-3 py-1.5 rounded-xl border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white hover:bg-crm-sky/20 transition flex items-center gap-1.5 text-xs font-semibold"
              title="Close Full Screen"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>

          {/* Sub-tabs Bar */}
          <div className="px-6 py-2.5 border-b border-crm-lightGrey dark:border-crm-sky/15 bg-crm-sky/10 dark:bg-crm-navySurface/40 shrink-0">
            <div className="flex items-center gap-2 text-xs overflow-x-auto max-w-7xl mx-auto">
              <button
                onClick={() => setActiveTab('items')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'items'
                    ? 'bg-crm-blue text-white shadow-sm'
                    : 'text-crm-indigo dark:text-crm-lightGrey hover:bg-crm-sky/20'
                }`}
              >
                Parts Requested ({selectedEnquiry.items?.length ?? 0})
              </button>

              <button
                onClick={() => setActiveTab('matching')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'matching'
                    ? 'bg-crm-blue text-white shadow-sm'
                    : 'text-crm-indigo dark:text-crm-lightGrey hover:bg-crm-sky/20'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Smart Vendor Matching ({matchedVendors.length})
              </button>

              <button
                onClick={() => setActiveTab('recipients')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeTab === 'recipients'
                    ? 'bg-crm-blue text-white shadow-sm'
                    : 'text-crm-indigo dark:text-crm-lightGrey hover:bg-crm-sky/20'
                }`}
              >
                Outreached Vendors ({selectedEnquiry.recipients?.length ?? 0})
              </button>

              <button
                onClick={() => setActiveTab('quotes')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  activeTab === 'quotes'
                    ? 'bg-crm-blue text-white shadow-sm'
                    : 'text-crm-indigo dark:text-crm-lightGrey hover:bg-crm-sky/20'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                Price Comparison Matrix ({selectedEnquiry.quotations?.length ?? 0})
              </button>
            </div>
          </div>

          {/* Full Screen Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto">

            {/* TAB 1: ITEMS REQUESTED WITH EDIT & DELETE */}
            {activeTab === 'items' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-crm-navy dark:text-white uppercase tracking-wider">
                    Required Components List
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsPasteToExistingOpen(!isPasteToExistingOpen);
                        setIsAddingItemToEnquiry(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Zap className="w-3 h-3" />
                      {isPasteToExistingOpen ? 'Close Paste' : 'Quick Paste Multi-Items'}
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingItemToEnquiry(!isAddingItemToEnquiry);
                        setIsPasteToExistingOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-crm-blue hover:bg-crm-navy text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {isAddingItemToEnquiry ? 'Cancel' : 'Add Single Component'}
                    </button>
                  </div>
                </div>

                {/* Paste Multi-Items box */}
                {isPasteToExistingOpen && (
                  <div className="p-4 rounded-xl bg-crm-sky/15 border border-emerald-500/30 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" />
                        Paste Unstructured / Numbered Component List
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPasteToExistingText(`1. Processor: AMD Ryzen 7 9700X (8 Cores / 16 Threads)
2. Graphics Card: NVIDIA RTX 5060 Ti 16GB GDDR7
3. Motherboard: MSI PRO B650M-A WiFi
4. RAM: 64GB DDR5 6000MHz (2 × 32GB)
5. Storage: 2TB NVMe PCIe Gen4 SSD - Online Price: Rs 12500
6. CPU Cooler: DeepCool AK400 / AG400
7. Power Supply: 750W 80+ Gold, ATX 3.1
8. Cabinet: Airflow Mesh Mid-Tower`)
                        }
                        className="text-[10px] text-crm-blue hover:underline"
                      >
                        Insert Example 8-Item PC Build
                      </button>
                    </div>
                    <textarea
                      rows={6}
                      value={pasteToExistingText}
                      onChange={(e) => setPasteToExistingText(e.target.value)}
                      placeholder="Paste component requirements text here..."
                      className="w-full p-3 rounded-xl bg-white dark:bg-crm-navy border border-crm-lightGrey font-mono text-[11px] leading-relaxed"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPasteToExistingOpen(false)}
                        className="px-3 py-1.5 rounded-lg border text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={savingItem || !pasteToExistingText.trim()}
                        onClick={handleAddParsedItemsToEnquiry}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        {savingItem ? 'Extracting & Saving...' : 'Auto-Extract & Add to Enquiry'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Form to add item to existing enquiry */}
                {isAddingItemToEnquiry && (
                  <form onSubmit={handleAddNewItemToEnquiry} className="p-3.5 rounded-xl bg-crm-sky/15 border border-crm-blue/30 space-y-2 text-xs">
                    <span className="font-bold text-crm-blue">Add Component Requirement</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          required
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Component Name (e.g. 1TB NVMe SSD)"
                          className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-crm-navy"
                        />
                      </div>
                      <select
                        value={newItemCatId}
                        onChange={async (e) => {
                          if (e.target.value === '__NEW__') {
                            const customName = window.prompt('Enter new hardware component category:');
                            if (customName?.trim()) {
                              const res = await fetch('/api/vendors/categories', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ name: customName.trim() }),
                              });
                              const data = await res.json();
                              if (data.success && data.category) {
                                setCategories((prev) => [...prev, data.category]);
                                setNewItemCatId(data.category.id);
                              }
                            }
                          } else {
                            setNewItemCatId(e.target.value);
                          }
                        }}
                        className="px-2 py-1.5 rounded-lg border bg-white dark:bg-crm-navy"
                      >
                        <option value="">Category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                        <option value="__NEW__">+ Add New Category...</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={newItemBrand}
                        onChange={(e) => setNewItemBrand(e.target.value)}
                        placeholder="Brand"
                        className="px-2 py-1 rounded border bg-white dark:bg-crm-navy"
                      />
                      <input
                        type="text"
                        value={newItemSpecs}
                        onChange={(e) => setNewItemSpecs(e.target.value)}
                        placeholder="Specs"
                        className="px-2 py-1 rounded border bg-white dark:bg-crm-navy"
                      />
                      <input
                        type="number"
                        min={1}
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(parseInt(e.target.value || '1', 10))}
                        placeholder="Qty"
                        className="px-2 py-1 rounded border bg-white dark:bg-crm-navy"
                      />
                      <input
                        type="number"
                        value={newItemOnlinePrice}
                        onChange={(e) => setNewItemOnlinePrice(e.target.value)}
                        placeholder="Online Price (₹)"
                        className="px-2 py-1 rounded border bg-white dark:bg-crm-navy text-emerald-600 font-bold"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingItemToEnquiry(false)}
                        className="px-3 py-1 rounded-lg border text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingItem}
                        className="px-4 py-1 rounded-lg bg-crm-blue text-white font-bold"
                      >
                        {savingItem ? 'Adding...' : 'Add Item'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Items List */}
                <div className="space-y-2">
                  {selectedEnquiry.items?.map((it) => (
                    <div
                      key={it.id}
                      className="p-3.5 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface/50 border border-crm-lightGrey dark:border-crm-sky/15 text-xs space-y-2"
                    >
                      {editingItemId === it.id ? (
                        /* Edit mode */
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={editItemName}
                              onChange={(e) => setEditItemName(e.target.value)}
                              className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border bg-white dark:bg-crm-navy"
                            />
                            <select
                              value={editItemCatId}
                              onChange={async (e) => {
                                if (e.target.value === '__NEW__') {
                                  const customName = window.prompt('Enter new hardware component category:');
                                  if (customName?.trim()) {
                                    const res = await fetch('/api/vendors/categories', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ name: customName.trim() }),
                                    });
                                    const data = await res.json();
                                    if (data.success && data.category) {
                                      setCategories((prev) => [...prev, data.category]);
                                      setEditItemCatId(data.category.id);
                                    }
                                  }
                                } else {
                                  setEditItemCatId(e.target.value);
                                }
                              }}
                              className="px-2 py-1.5 rounded-lg border bg-white dark:bg-crm-navy"
                            >
                              <option value="">Category</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                              <option value="__NEW__">+ Add New Category...</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <input
                              type="text"
                              value={editItemBrand}
                              onChange={(e) => setEditItemBrand(e.target.value)}
                              placeholder="Brand"
                              className="px-2 py-1 rounded border bg-white dark:bg-crm-navy"
                            />
                            <input
                              type="text"
                              value={editItemSpecs}
                              onChange={(e) => setEditItemSpecs(e.target.value)}
                              placeholder="Specs"
                              className="px-2 py-1 rounded border bg-white dark:bg-crm-navy"
                            />
                            <input
                              type="number"
                              min={1}
                              value={editItemQty}
                              onChange={(e) => setEditItemQty(parseInt(e.target.value || '1', 10))}
                              placeholder="Qty"
                              className="px-2 py-1 rounded border bg-white dark:bg-crm-navy"
                            />
                            <input
                              type="number"
                              value={editItemOnlinePrice}
                              onChange={(e) => setEditItemOnlinePrice(e.target.value)}
                              placeholder="Online Price (₹)"
                              className="px-2 py-1 rounded border bg-white dark:bg-crm-navy text-emerald-600 font-bold"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingItemId(null)}
                              className="px-3 py-1 rounded-lg border"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveItemEdit(it.id)}
                              disabled={savingItem}
                              className="px-3 py-1 rounded-lg bg-crm-blue text-white font-bold"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Normal display */
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-crm-navy dark:text-white flex items-center gap-2">
                              <span>{it.componentName}</span>
                              {it.category && (
                                <span className="px-2 py-0.5 rounded bg-crm-sky/20 text-crm-blue text-[10px] font-semibold">
                                  {it.category.name}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/70 mt-0.5">
                              {it.brand ? `Brand: ${it.brand} | ` : ''}
                              {it.specifications ? `Specs: ${it.specifications} | ` : ''}
                              Qty: <strong>{it.quantity}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Online Price Badge */}
                            <div className="text-right">
                              <span className="text-[10px] text-crm-indigo/70 block">Online Benchmark:</span>
                              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                {it.onlinePrice ? `₹${it.onlinePrice.toLocaleString()}` : 'Not Set'}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setEditingItemId(it.id);
                                setEditItemName(it.componentName);
                                setEditItemBrand(it.brand || '');
                                setEditItemSpecs(it.specifications || '');
                                setEditItemQty(it.quantity);
                                setEditItemOnlinePrice(it.onlinePrice ? String(it.onlinePrice) : '');
                                setEditItemCatId(it.categoryId || '');
                              }}
                              title="Edit component item"
                              className="p-1.5 rounded-lg border border-crm-lightGrey hover:bg-crm-sky/20 text-crm-indigo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDeleteItem(it.id)}
                              title="Delete component item"
                              className="p-1.5 rounded-lg border border-crm-lightGrey hover:bg-crm-orangeRed/10 text-crm-orangeRed"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: SMART MATCHING */}
            {activeTab === 'matching' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/80">
                    Showing vendors ranked by proximity to <strong>{selectedEnquiry.customerLocation || 'target location'}</strong> and category specialization.
                  </p>
                  {selectedVendorIds.length > 0 && (
                    <button
                      onClick={handleAddRecipients}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      Add {selectedVendorIds.length} Selected to Outreach
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {matchingLoading ? (
                    <div className="p-8 text-center text-xs text-crm-indigo">Matching vendors...</div>
                  ) : matchedVendors.length === 0 ? (
                    <div className="p-8 text-center text-xs text-crm-indigo">No matching vendors found.</div>
                  ) : (
                    matchedVendors.map((mv) => {
                      const isSelected = selectedVendorIds.includes(mv.vendorId);
                      return (
                        <div
                          key={mv.vendorId}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${
                            mv.isAlreadyRecipient
                              ? 'bg-crm-sky/5 border-crm-lightGrey opacity-75'
                              : isSelected
                              ? 'bg-crm-blue/10 border-crm-blue'
                              : 'bg-white dark:bg-crm-navySurface/40 border-crm-lightGrey dark:border-crm-sky/15 hover:border-crm-blue/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {!mv.isAlreadyRecipient ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedVendorIds([...selectedVendorIds, mv.vendorId]);
                                  } else {
                                    setSelectedVendorIds(selectedVendorIds.filter((id) => id !== mv.vendorId));
                                  }
                                }}
                                className="rounded text-crm-blue"
                              />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            <div>
                              <div className="font-bold text-crm-navy dark:text-white flex items-center gap-1.5">
                                <span>{mv.name}</span>
                                <span className="font-mono text-[10px] text-crm-indigo">({mv.vendorCode})</span>
                              </div>
                              <div className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/70">
                                {mv.areaName ? `${mv.areaName}, ` : ''}{mv.cityName || 'City'}
                                {mv.phones && mv.phones.length > 0 ? (
                                  <span className="inline-flex flex-wrap items-center gap-1.5 ml-1">
                                    •
                                    {mv.phones.map((p, pIdx) => (
                                      <span key={pIdx} className="inline-flex items-center gap-0.5 font-mono text-[10.5px]">
                                        <span>{p.value}</span>
                                        {p.label && <span className="text-[9px] text-crm-indigo">({p.label})</span>}
                                        {p.isWhatsApp && (
                                          <span className="px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[8px] font-bold">
                                            WA
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </span>
                                ) : (
                                  <span> • {mv.primaryPhone || 'No phone'}</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {mv.matchReasons.map((r, ri) => (
                                  <span
                                    key={ri}
                                    className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-semibold"
                                  >
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 rounded-full bg-crm-blue/15 text-crm-blue font-bold text-[10px]">
                              {mv.matchScore}% Match
                            </span>
                            {mv.isAlreadyRecipient && (
                              <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                                Added to enquiry
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: OUTREACHED RECIPIENTS WITH COMPACT HIGH-READABILITY CRM VIEW (SCALABLE FOR 100+ VENDORS) */}
            {activeTab === 'recipients' && (() => {
              const allRecipients = selectedEnquiry.recipients || [];
              const totalRecipients = allRecipients.length;
              const readyRecipients = allRecipients.filter((r) => r.status === 'READY_TO_CONTACT').length;
              const chatOpenedRecipients = allRecipients.filter((r) => r.status === 'CHAT_OPENED').length;
              const sentConfirmedRecipients = allRecipients.filter((r) => r.status === 'SENT_CONFIRMED').length;
              const quotedRecipients = allRecipients.filter((r) => r.status === 'QUOTED' || (r.quotations && r.quotations.length > 0)).length;

              const filteredRecipients = allRecipients.filter((rec) => {
                if (recipientStatusFilter !== 'ALL') {
                  if (recipientStatusFilter === 'QUOTED') {
                    const isQuoted = rec.status === 'QUOTED' || (rec.quotations && rec.quotations.length > 0);
                    if (!isQuoted) return false;
                  } else if (rec.status !== recipientStatusFilter) {
                    return false;
                  }
                }

                if (recipientSearch.trim()) {
                  const q = recipientSearch.toLowerCase();
                  const vendorName = rec.vendor?.name?.toLowerCase() || '';
                  const vendorCode = rec.vendor?.vendorCode?.toLowerCase() || '';
                  const cityName = rec.vendor?.city?.name?.toLowerCase() || '';
                  const areaName = rec.vendor?.area?.name?.toLowerCase() || '';
                  const phone = (rec.contactUsed || rec.vendor?.contacts?.map((c) => c.value).join(' ') || '').toLowerCase();
                  if (!vendorName.includes(q) && !vendorCode.includes(q) && !cityName.includes(q) && !areaName.includes(q) && !phone.includes(q)) {
                    return false;
                  }
                }

                return true;
              });

              return (
                <div className="space-y-4">
                  {/* Top Bar: Template Selector + Collapsible Template Text Preview */}
                  <div className="p-3.5 rounded-2xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold text-crm-navy dark:text-white">Active WhatsApp Template:</span>
                          <p className="text-[11px] text-crm-indigo/70 dark:text-crm-lightGrey/70">Pre-fills WhatsApp chat when contacting vendors</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTemplateId}
                          onChange={(e) => setSelectedTemplateId(e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-crm-lightGrey dark:border-crm-sky/20 bg-white dark:bg-crm-navy text-xs font-semibold text-crm-navy dark:text-white max-w-xs focus:outline-none"
                        >
                          {templates.map((tpl) => (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.name} ({tpl.channel})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setIsGlobalTemplatePreviewOpen(!isGlobalTemplatePreviewOpen)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                            isGlobalTemplatePreviewOpen
                              ? 'bg-crm-blue text-white border-crm-blue'
                              : 'bg-white dark:bg-crm-navy border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white hover:bg-crm-sky/20'
                          }`}
                        >
                          {isGlobalTemplatePreviewOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-crm-blue" />}
                          <span>{isGlobalTemplatePreviewOpen ? 'Hide Template' : 'Preview Template'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Global Template Preview */}
                    {isGlobalTemplatePreviewOpen && (
                      <div className="pt-2 border-t border-crm-lightGrey/60 dark:border-crm-sky/15">
                        <div className="p-3 rounded-xl bg-white dark:bg-crm-navy border border-crm-lightGrey/80 dark:border-crm-sky/20 text-xs font-mono whitespace-pre-wrap text-crm-navy dark:text-crm-lightGrey">
                          {getGlobalTemplatePreview()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary KPI Pills (Interactive Filter Chips) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      onClick={() => setRecipientStatusFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                        recipientStatusFilter === 'ALL'
                          ? 'bg-crm-blue text-white shadow-sm'
                          : 'bg-crm-sky/20 dark:bg-crm-navySurface text-crm-navy dark:text-white hover:bg-crm-sky/30'
                      }`}
                    >
                      <span>All Outreached</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/20 text-[10px]">
                        {totalRecipients}
                      </span>
                    </button>

                    <button
                      onClick={() => setRecipientStatusFilter('READY_TO_CONTACT')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                        recipientStatusFilter === 'READY_TO_CONTACT'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Ready to Contact</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                        {readyRecipients}
                      </span>
                    </button>

                    <button
                      onClick={() => setRecipientStatusFilter('CHAT_OPENED')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                        recipientStatusFilter === 'CHAT_OPENED'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 hover:bg-blue-100'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Opened</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                        {chatOpenedRecipients}
                      </span>
                    </button>

                    <button
                      onClick={() => setRecipientStatusFilter('SENT_CONFIRMED')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                        recipientStatusFilter === 'SENT_CONFIRMED'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sent Confirmed</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                        {sentConfirmedRecipients}
                      </span>
                    </button>

                    <button
                      onClick={() => setRecipientStatusFilter('QUOTED')}
                      className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                        recipientStatusFilter === 'QUOTED'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Quotes Recorded</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/10 text-[10px]">
                        {quotedRecipients}
                      </span>
                    </button>
                  </div>

                  {/* Search and Layout Toolbar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-crm-indigo dark:text-crm-lightGrey/60" />
                      <input
                        type="text"
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        placeholder="Search outreached vendors by name, code, phone, city, or market..."
                        className="w-full pl-8 pr-4 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-xs text-crm-navy dark:text-white placeholder:text-crm-indigo/60 focus:outline-none focus:border-crm-blue"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/70">
                        Showing <strong>{filteredRecipients.length}</strong> of {totalRecipients}
                      </span>

                      {/* View Switcher: Table vs Cards */}
                      <div className="flex items-center p-0.5 rounded-xl bg-crm-sky/20 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20">
                        <button
                          onClick={() => setRecipientViewMode('table')}
                          title="High-Density Table View (Best for 100+ vendors)"
                          className={`p-1.5 rounded-lg transition ${
                            recipientViewMode === 'table'
                              ? 'bg-white dark:bg-crm-navy text-crm-blue shadow-sm'
                              : 'text-crm-indigo dark:text-crm-lightGrey hover:text-crm-navy'
                          }`}
                        >
                          <LayoutList className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRecipientViewMode('cards')}
                          title="Card Grid View"
                          className={`p-1.5 rounded-lg transition ${
                            recipientViewMode === 'cards'
                              ? 'bg-white dark:bg-crm-navy text-crm-blue shadow-sm'
                              : 'text-crm-indigo dark:text-crm-lightGrey hover:text-crm-navy'
                          }`}
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Empty States */}
                  {totalRecipients === 0 ? (
                    <div className="p-12 text-center rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-3">
                      <MessageCircle className="w-10 h-10 mx-auto text-crm-blue/50" />
                      <h4 className="text-sm font-bold text-crm-navy dark:text-white">No Vendors Added to this Enquiry Yet</h4>
                      <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/70 max-w-md mx-auto">
                        Go to the "Smart Vendor Matching" tab to discover and select matching vendors based on component categories and location.
                      </p>
                      <button
                        onClick={() => setActiveTab('matching')}
                        className="px-4 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-semibold shadow-sm transition inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Go to Smart Vendor Matching
                      </button>
                    </div>
                  ) : filteredRecipients.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-2">
                      <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/70">
                        No vendors match your current search or status filter.
                      </p>
                      <button
                        onClick={() => {
                          setRecipientSearch('');
                          setRecipientStatusFilter('ALL');
                        }}
                        className="text-xs font-semibold text-crm-blue hover:underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : recipientViewMode === 'table' ? (
                    /* HIGH DENSITY TABLE VIEW FOR 100+ VENDORS */
                    <div className="border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl overflow-hidden bg-white dark:bg-crm-navy shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-crm-sky/20 dark:bg-crm-navySurface text-[10.5px] font-bold text-crm-indigo uppercase border-b border-crm-lightGrey dark:border-crm-sky/15">
                            <tr>
                              <th className="py-3 px-4">Vendor & Phone</th>
                              <th className="py-3 px-4">Market / Location</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right min-w-[380px]">Outreach & Pricing Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-crm-lightGrey dark:divide-crm-sky/10">
                            {filteredRecipients.map((rec) => {
                              const phoneContacts = rec.vendor?.contacts?.filter((c) => c.type === 'PHONE') || [];
                              const isMsgExpanded = expandedMsgRecipientId === rec.id;
                              const hasQuotes = rec.status === 'QUOTED' || (rec.quotations && rec.quotations.length > 0);

                              return (
                                <React.Fragment key={rec.id}>
                                  <tr className="hover:bg-crm-sky/10 dark:hover:bg-crm-sky/5 transition">
                                    {/* Vendor Name, Code & Phone */}
                                    <td className="py-3 px-4">
                                      <div className="font-bold text-sm text-crm-navy dark:text-white flex items-center gap-1.5">
                                        <span>{rec.vendor?.name || 'Vendor'}</span>
                                        {rec.vendor?.vendorCode && (
                                          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-crm-sky/30 dark:bg-crm-navySurface text-crm-indigo dark:text-crm-lightGrey font-semibold">
                                            {rec.vendor.vendorCode}
                                          </span>
                                        )}
                                      </div>
                                      {phoneContacts.length > 0 ? (
                                        <div className="mt-1 space-y-1">
                                          {phoneContacts.map((ph, pIdx) => {
                                            const phVal = ph.normalized || ph.value;
                                            const isUsed = rec.contactUsed === phVal || rec.contactUsed === ph.value;
                                            return (
                                              <div key={pIdx} className="flex items-center gap-1.5 text-[11px] text-crm-indigo dark:text-crm-lightGrey/75">
                                                <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                                <span className={`font-mono ${isUsed ? 'text-emerald-700 dark:text-emerald-300 font-bold' : 'font-medium'}`}>
                                                  {ph.value}
                                                </span>
                                                {ph.label && (
                                                  <span className="px-1.5 py-0.2 rounded bg-crm-sky/30 dark:bg-crm-navySurface text-[9px] font-semibold text-crm-indigo dark:text-crm-periwinkle font-sans">
                                                    {ph.label}
                                                  </span>
                                                )}
                                                {ph.isWhatsApp && (
                                                  <span className="px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[8.5px] font-bold">
                                                    WA
                                                  </span>
                                                )}
                                                <button
                                                  onClick={(e) => handleCopyPhone(ph.value, e)}
                                                  title="Copy phone"
                                                  className="p-0.5 rounded text-crm-indigo hover:text-crm-blue"
                                                >
                                                  {copiedPhone === ph.value ? (
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                  ) : (
                                                    <Copy className="w-3 h-3" />
                                                  )}
                                                </button>
                                                {ph.isWhatsApp && (
                                                  <button
                                                    onClick={() => handleOpenWhatsApp(rec, phVal)}
                                                    title="Open WhatsApp for this number"
                                                    className="text-[9.5px] text-emerald-600 hover:text-emerald-700 underline font-semibold ml-0.5"
                                                  >
                                                    Chat
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <span className="text-[11px] text-crm-orangeRed">No phone recorded</span>
                                      )}
                                    </td>

                                    {/* Market / Location */}
                                    <td className="py-3 px-4">
                                      <div className="font-medium text-crm-navy dark:text-white">
                                        {rec.vendor?.area?.name || 'Local Market'}
                                      </div>
                                      <div className="flex items-center gap-1 text-[11px] text-crm-indigo dark:text-crm-lightGrey/70">
                                        <MapPin className="w-3 h-3 text-crm-blue shrink-0" />
                                        <span>{rec.vendor?.city?.name || 'Tamil Nadu'}</span>
                                      </div>
                                    </td>

                                    {/* Outreach Status */}
                                    <td className="py-3 px-4">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                          rec.status === 'READY_TO_CONTACT'
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                            : rec.status === 'CHAT_OPENED'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                            : rec.status === 'SENT_CONFIRMED'
                                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                        }`}
                                      >
                                        {hasQuotes ? 'Quote Recorded' : rec.status.replace(/_/g, ' ')}
                                      </span>
                                    </td>

                                    {/* Action Buttons: Open WhatsApp Web | Confirm Sent | Send Email | Record Quote */}
                                    <td className="py-3 px-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        {/* Open WhatsApp Web */}
                                        <button
                                          onClick={() => handleOpenWhatsApp(rec)}
                                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm text-xs shrink-0 transition"
                                          title="Open WhatsApp Web chat pre-filled with requirement"
                                        >
                                          <MessageCircle className="w-3.5 h-3.5" />
                                          Open WhatsApp Web
                                        </button>

                                        {/* Confirm Sent (when chat opened) */}
                                        {rec.status === 'CHAT_OPENED' && (
                                          <button
                                            onClick={() => handleConfirmWhatsApp(rec.id)}
                                            className="px-2.5 py-1.5 rounded-lg border border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-semibold text-xs shrink-0 transition"
                                            title="Mark requirement as sent"
                                          >
                                            Confirm Sent
                                          </button>
                                        )}

                                        {/* Send Email */}
                                        <button
                                          onClick={() => handleSendEmail(rec.id)}
                                          className="px-2.5 py-1.5 rounded-lg bg-crm-sky/30 dark:bg-crm-blue/20 text-crm-navy dark:text-white hover:bg-crm-sky/40 font-semibold flex items-center gap-1 text-xs shrink-0 transition"
                                          title="Send enquiry via email"
                                        >
                                          <Mail className="w-3.5 h-3.5 text-crm-blue" />
                                          Send Email
                                        </button>

                                        {/* Record Quote */}
                                        <button
                                          onClick={() => {
                                            setQuoteRecipient(rec);
                                            setQuoteItemId(selectedEnquiry.items[0]?.id || '');
                                            setQuoteUnitPrice('');
                                            setIsQuoteModalOpen(true);
                                          }}
                                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1 shadow-sm text-xs shrink-0 transition"
                                          title="Record vendor quote & prices"
                                        >
                                          <Receipt className="w-3.5 h-3.5" />
                                          Record Quote
                                        </button>

                                        {/* Toggle Individual Message Preview */}
                                        <button
                                          onClick={() => setExpandedMsgRecipientId(isMsgExpanded ? null : rec.id)}
                                          className={`p-1.5 rounded-lg border text-xs font-semibold transition shrink-0 ${
                                            isMsgExpanded
                                              ? 'bg-crm-blue text-white border-crm-blue'
                                              : 'border-crm-lightGrey text-crm-indigo hover:text-crm-navy hover:bg-crm-sky/20'
                                          }`}
                                          title={isMsgExpanded ? 'Hide message preview' : 'Preview message for this vendor'}
                                        >
                                          {isMsgExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>

                                  {/* Collapsible Message Preview Sub-Row */}
                                  {isMsgExpanded && (
                                    <tr className="bg-crm-sky/10 dark:bg-crm-navySurface/40">
                                      <td colSpan={4} className="p-4 border-t border-crm-lightGrey/50">
                                        <div className="p-3.5 rounded-xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-1.5">
                                          <div className="flex items-center justify-between text-[11px] font-bold text-crm-indigo">
                                            <span>WhatsApp Message Preview for {rec.vendor?.name}:</span>
                                            <button
                                              onClick={() => setExpandedMsgRecipientId(null)}
                                              className="text-xs text-crm-indigo hover:text-crm-navy underline"
                                            >
                                              Close Preview
                                            </button>
                                          </div>
                                          <p className="text-[11px] whitespace-pre-wrap font-mono text-crm-navy dark:text-crm-lightGrey bg-crm-sky/10 p-2.5 rounded-lg border border-crm-lightGrey/40">
                                            {getRenderedWhatsAppMessage(rec)}
                                          </p>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* CARD GRID VIEW (COMPACT & CLEAN) */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredRecipients.map((rec) => {
                        const phoneContacts = rec.vendor?.contacts?.filter((c) => c.type === 'PHONE') || [];
                        const isMsgExpanded = expandedMsgRecipientId === rec.id;
                        const hasQuotes = rec.status === 'QUOTED' || (rec.quotations && rec.quotations.length > 0);

                        return (
                          <div
                            key={rec.id}
                            className="p-4 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/15 space-y-3 text-xs shadow-sm hover:border-crm-blue/40 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-sm text-crm-navy dark:text-white flex items-center gap-1.5">
                                  <span>{rec.vendor?.name || 'Vendor'}</span>
                                  {rec.vendor?.vendorCode && (
                                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-crm-sky/30 dark:bg-crm-navySurface text-crm-indigo dark:text-crm-lightGrey font-semibold">
                                      {rec.vendor.vendorCode}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/70 mt-0.5">
                                  {rec.vendor?.area?.name ? `${rec.vendor.area.name}, ` : ''}{rec.vendor?.city?.name || 'City'}
                                </div>
                                {phoneContacts.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                    {phoneContacts.map((ph, pIdx) => {
                                      const phVal = ph.normalized || ph.value;
                                      const isUsed = rec.contactUsed === phVal || rec.contactUsed === ph.value;
                                      return (
                                        <span
                                          key={pIdx}
                                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-mono border ${
                                            isUsed
                                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold'
                                              : 'bg-crm-sky/20 dark:bg-crm-navySurface border-crm-lightGrey dark:border-crm-sky/15 text-crm-navy dark:text-white'
                                          }`}
                                        >
                                          <Phone className="w-2.5 h-2.5 text-emerald-600" />
                                          <span>{ph.value}</span>
                                          {ph.label && <span className="text-[9px] text-crm-indigo font-sans">({ph.label})</span>}
                                          {ph.isWhatsApp && (
                                            <span className="px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[8px] font-bold">
                                              WA
                                            </span>
                                          )}
                                          <button
                                            onClick={(e) => handleCopyPhone(ph.value, e)}
                                            title="Copy"
                                            className="text-crm-indigo hover:text-crm-blue"
                                          >
                                            {copiedPhone === ph.value ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                                          </button>
                                          {ph.isWhatsApp && (
                                            <button
                                              onClick={() => handleOpenWhatsApp(rec, phVal)}
                                              title="Chat with this number"
                                              className="text-[9.5px] text-emerald-600 hover:text-emerald-700 underline font-semibold ml-0.5"
                                            >
                                              Chat
                                            </button>
                                          )}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                  rec.status === 'READY_TO_CONTACT'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                    : rec.status === 'CHAT_OPENED'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                    : rec.status === 'SENT_CONFIRMED'
                                    ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                }`}
                              >
                                {hasQuotes ? 'Quote Recorded' : rec.status.replace(/_/g, ' ')}
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-crm-lightGrey dark:border-crm-sky/15">
                              {/* Open WhatsApp Web */}
                              <button
                                onClick={() => handleOpenWhatsApp(rec)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm text-xs transition"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                Open WhatsApp Web
                              </button>

                              {/* Confirm Sent */}
                              {rec.status === 'CHAT_OPENED' && (
                                <button
                                  onClick={() => handleConfirmWhatsApp(rec.id)}
                                  className="px-2.5 py-1.5 rounded-lg border border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-semibold text-xs transition"
                                >
                                  Confirm Sent
                                </button>
                              )}

                              {/* Send Email */}
                              <button
                                onClick={() => handleSendEmail(rec.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-crm-sky/30 dark:bg-crm-blue/20 text-crm-navy dark:text-white hover:bg-crm-sky/40 font-semibold flex items-center gap-1 text-xs transition"
                              >
                                <Mail className="w-3.5 h-3.5 text-crm-blue" />
                                Send Email
                              </button>

                              {/* Record Quote */}
                              <button
                                onClick={() => {
                                  setQuoteRecipient(rec);
                                  setQuoteItemId(selectedEnquiry.items[0]?.id || '');
                                  setQuoteUnitPrice('');
                                  setIsQuoteModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1 shadow-sm text-xs transition"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                Record Quote
                              </button>

                              {/* Toggle Individual Message Preview */}
                              <button
                                onClick={() => setExpandedMsgRecipientId(isMsgExpanded ? null : rec.id)}
                                className={`p-1.5 rounded-lg border text-xs font-semibold transition ${
                                  isMsgExpanded
                                    ? 'bg-crm-blue text-white border-crm-blue'
                                    : 'border-crm-lightGrey text-crm-indigo hover:text-crm-navy hover:bg-crm-sky/20'
                                }`}
                                title={isMsgExpanded ? 'Hide message preview' : 'Preview message for this vendor'}
                              >
                                {isMsgExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>

                            {/* Message Preview Box (Collapsible) */}
                            {isMsgExpanded && (
                              <div className="p-3 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface border border-crm-lightGrey/60 space-y-1">
                                <span className="text-[10px] font-bold text-crm-indigo dark:text-crm-lightGrey/70 uppercase">
                                  WhatsApp Message Preview:
                                </span>
                                <p className="text-[11px] whitespace-pre-wrap font-mono text-crm-navy dark:text-crm-lightGrey">
                                  {getRenderedWhatsAppMessage(rec)}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB 4: QUOTATION COMPARISON MATRIX WITH ONLINE BENCHMARK PRICE & SAVINGS */}
            {activeTab === 'quotes' && (
              <div className="space-y-6">
                {selectedEnquiry.items?.map((item) => {
                  const itemQuotes = (selectedEnquiry.quotations || []).filter((q) => q.itemId === item.id || !q.itemId);
                  const lowestPrice = itemQuotes.length > 0
                    ? Math.min(...itemQuotes.map((q) => q.totalPrice || q.unitPrice || Infinity))
                    : null;

                  const onlinePrice = item.onlinePrice || null;
                  const savings = (onlinePrice && lowestPrice) ? (onlinePrice - lowestPrice) : null;
                  const savingsPercent = (onlinePrice && lowestPrice && onlinePrice > 0)
                    ? Math.round(((onlinePrice - lowestPrice) / onlinePrice) * 100)
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-3 shadow-sm"
                    >
                      {/* Component Header with Online Price and Best Rate */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-crm-lightGrey dark:border-crm-sky/15 pb-3">
                        <div>
                          <div className="font-bold text-sm text-crm-navy dark:text-white flex items-center gap-2">
                            <span>{item.componentName}</span>
                            <span className="text-[11px] text-crm-indigo">Qty: {item.quantity}</span>
                          </div>
                          {item.specifications && (
                            <div className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/70">
                              {item.specifications}
                            </div>
                          )}
                        </div>

                        {/* Price Comparison Pills */}
                        <div className="flex items-center gap-3">
                          {/* Online Price */}
                          <div className="p-2 rounded-xl bg-crm-sky/15 border border-crm-lightGrey text-xs text-right">
                            <span className="text-[10px] text-crm-indigo block font-semibold">Online Price</span>
                            <span className="font-mono font-bold text-crm-navy dark:text-white">
                              {onlinePrice ? `₹${onlinePrice.toLocaleString()}` : 'Not Set'}
                            </span>
                          </div>

                          {/* Best Vendor Price */}
                          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 text-xs text-right">
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">Best Vendor Rate</span>
                            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                              {lowestPrice && lowestPrice !== Infinity ? `₹${lowestPrice.toLocaleString()}` : 'No quotes'}
                            </span>
                          </div>

                          {/* Savings vs Online */}
                          {savings !== null && (
                            <div
                              className={`p-2 rounded-xl border text-xs text-right font-bold ${
                                savings >= 0
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}
                            >
                              <span className="text-[10px] block font-semibold">
                                {savings >= 0 ? 'Margin Saved' : 'Higher than Online'}
                              </span>
                              <span>
                                {savings >= 0 ? `+₹${savings.toLocaleString()}` : `-₹${Math.abs(savings).toLocaleString()}`} ({savingsPercent}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vendor Quotations Table for this Item */}
                      {itemQuotes.length === 0 ? (
                        <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/60 py-2 text-center">
                          No quotations recorded from vendors for this item yet. Click "Record Quote" in Outreached Vendors to log prices.
                        </p>
                      ) : (
                        <div className="border border-crm-lightGrey dark:border-crm-sky/20 rounded-xl overflow-x-auto text-xs">
                          <table className="w-full text-left">
                            <thead className="bg-crm-sky/20 dark:bg-crm-navySurface text-[10px] font-bold text-crm-indigo uppercase">
                              <tr>
                                <th className="py-2.5 px-3">Vendor Name</th>
                                <th className="py-2.5 px-3">Unit Price (₹)</th>
                                <th className="py-2.5 px-3">GST %</th>
                                <th className="py-2.5 px-3">Total Price (₹)</th>
                                <th className="py-2.5 px-3">Stock</th>
                                <th className="py-2.5 px-3">Warranty</th>
                                <th className="py-2.5 px-3">Delivery</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-crm-lightGrey dark:divide-crm-sky/10">
                              {itemQuotes.map((q) => {
                                const isLowest = (q.totalPrice || q.unitPrice) === lowestPrice;
                                return (
                                  <tr
                                    key={q.id}
                                    className={`hover:bg-crm-sky/10 transition ${
                                      isLowest ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-semibold' : ''
                                    }`}
                                  >
                                    <td className="py-2.5 px-3 font-semibold text-crm-navy dark:text-white flex items-center gap-1.5">
                                      <span>{q.vendor?.name || 'Vendor'}</span>
                                      {isLowest && (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center gap-0.5">
                                          <Star className="w-2.5 h-2.5 fill-emerald-700" /> Best Rate
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono">₹{q.unitPrice ?? 'N/A'}</td>
                                    <td className="py-2.5 px-3">{q.gstPercent ?? 18}%</td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                      ₹{q.totalPrice ?? q.unitPrice ?? 'N/A'}
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">
                                        {q.availability || 'Available'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3">{q.warranty || 'Standard'}</td>
                                    <td className="py-2.5 px-3">{q.deliveryTime || 'Immediate'}</td>
                                    <td className="py-2.5 px-3 text-right">
                                      <button
                                        onClick={() => handleDeleteQuote(q.id)}
                                        title="Delete quotation"
                                        className="text-crm-orangeRed hover:opacity-80 p-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECORD QUOTE MODAL */}
      {isQuoteModalOpen && quoteRecipient && selectedEnquiry && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-crm-lightGrey pb-3">
              <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-purple-600" />
                Record Quotation from {quoteRecipient.vendor?.name || 'Vendor'}
              </h3>
              <button onClick={() => setIsQuoteModalOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-crm-indigo mb-1">Component</label>
                <select
                  value={quoteItemId}
                  onChange={(e) => setQuoteItemId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15"
                >
                  {selectedEnquiry.items?.map((it) => (
                    <option key={it.id} value={it.id}>{it.componentName} (Qty: {it.quantity})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo mb-1">Unit Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={quoteUnitPrice}
                    onChange={(e) => setQuoteUnitPrice(e.target.value)}
                    placeholder="e.g. 2400"
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo mb-1">GST %</label>
                  <input
                    type="number"
                    value={quoteGstPercent}
                    onChange={(e) => setQuoteGstPercent(e.target.value)}
                    placeholder="18"
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo mb-1">Stock Availability</label>
                  <select
                    value={quoteAvailability}
                    onChange={(e) => setQuoteAvailability(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15"
                  >
                    <option value="AVAILABLE">Ready Stock</option>
                    <option value="PARTIAL">Partial Stock</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo mb-1">Warranty</label>
                  <input
                    type="text"
                    value={quoteWarranty}
                    onChange={(e) => setQuoteWarranty(e.target.value)}
                    placeholder="e.g. 3 Years Brand"
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-crm-indigo mb-1">Remarks / Payment Terms</label>
                <input
                  type="text"
                  value={quoteRemarks}
                  onChange={(e) => setQuoteRemarks(e.target.value)}
                  placeholder="e.g. Delivery today evening, Cash on delivery"
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuote}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm"
                >
                  {savingQuote ? 'Saving...' : 'Save Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
