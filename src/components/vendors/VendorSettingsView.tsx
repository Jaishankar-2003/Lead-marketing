'use client';

import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Cpu,
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  Trash2,
  Save,
  Edit2,
  X,
  Check,
  Tag,
  Star,
} from 'lucide-react';

export default function VendorSettingsView() {
  const [activeSubTab, setActiveSubTab] = useState<'locations' | 'categories' | 'templates'>('locations');

  // Locations state
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [markets, setMarkets] = useState<any[]>([]);
  const [newLocName, setNewLocName] = useState('');
  const [newLocLevel, setNewLocLevel] = useState<'STATE' | 'CITY' | 'MARKET'>('CITY');
  const [newLocParentId, setNewLocParentId] = useState('');
  const [addingLoc, setAddingLoc] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [addingCat, setAddingCat] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<any[]>([]);
  const [newTplName, setNewTplName] = useState('');
  const [newTplChannel, setNewTplChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [newTplSubject, setNewTplSubject] = useState('');
  const [newTplBody, setNewTplBody] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [savingTpl, setSavingTpl] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [modalTplId, setModalTplId] = useState('');
  const [modalTplName, setModalTplName] = useState('');
  const [modalTplChannel, setModalTplChannel] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');
  const [modalTplSubject, setModalTplSubject] = useState('');
  const [modalTplBody, setModalTplBody] = useState('');
  const [modalSaving, setModalSaving] = useState(false);

  const loadAll = async () => {
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
        setMarkets(locData.markets || []);
      }
      if (catData.success) setCategories(catData.categories || []);
      if (tplData.success) setTemplates(tplData.templates || []);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;
    try {
      setAddingLoc(true);
      const res = await fetch('/api/vendors/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocName.trim(),
          level: newLocLevel,
          parentId: newLocParentId || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewLocName('');
        void loadAll();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingLoc(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      setAddingCat(true);
      const res = await fetch('/api/vendors/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCatName('');
        void loadAll();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddingCat(false);
    }
  };

  // Populate left form for editing
  const startEditInForm = (tpl: any) => {
    setEditingTemplateId(tpl.id);
    setNewTplName(tpl.name);
    setNewTplChannel(tpl.channel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP');
    setNewTplSubject(tpl.subject || '');
    setNewTplBody(tpl.body);
  };

  // Cancel left form edit
  const cancelFormEdit = () => {
    setEditingTemplateId(null);
    setNewTplName('');
    setNewTplSubject('');
    setNewTplBody('');
  };

  // Save template from left form (Create or Update)
  const handleSaveTemplateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName.trim() || !newTplBody.trim()) return;
    try {
      setSavingTpl(true);
      const url = editingTemplateId
        ? `/api/vendors/templates/${editingTemplateId}`
        : '/api/vendors/templates';
      const method = editingTemplateId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTplName.trim(),
          channel: newTplChannel,
          subject: newTplSubject.trim() || undefined,
          body: newTplBody.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        cancelFormEdit();
        void loadAll();
      } else {
        alert(data.error || 'Failed to save template');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTpl(false);
    }
  };

  // Open dedicated Edit Modal
  const openEditModal = (tpl: any) => {
    setModalTplId(tpl.id);
    setModalTplName(tpl.name);
    setModalTplChannel(tpl.channel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP');
    setModalTplSubject(tpl.subject || '');
    setModalTplBody(tpl.body);
    setIsEditModalOpen(true);
  };

  // Save template from Edit Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTplName.trim() || !modalTplBody.trim()) return;
    try {
      setModalSaving(true);
      const res = await fetch(`/api/vendors/templates/${modalTplId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: modalTplName.trim(),
          channel: modalTplChannel,
          subject: modalTplSubject.trim() || undefined,
          body: modalTplBody.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        if (editingTemplateId === modalTplId) {
          cancelFormEdit();
        }
        void loadAll();
      } else {
        alert(data.error || 'Failed to update template');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setModalSaving(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (tplId: string, tplName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete the template "${tplName}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/vendors/templates/${tplId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (editingTemplateId === tplId) {
          cancelFormEdit();
        }
        void loadAll();
      } else {
        alert(data.error || 'Failed to delete template');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Set template as active default
  const handleSetDefaultTemplate = async (tplId: string) => {
    try {
      const res = await fetch(`/api/vendors/templates/${tplId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (data.success) {
        void loadAll();
      } else {
        alert(data.error || 'Failed to set default template');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Insert placeholder into modal textarea
  const insertPlaceholder = (tag: string) => {
    setModalTplBody((prev) => `${prev} ${tag} `);
  };

  const PLACEHOLDERS = [
    { tag: '{{vendor_name}}', desc: 'Vendor shop name' },
    { tag: '{{customer_location}}', desc: 'Customer city/market' },
    { tag: '{{component_list}}', desc: 'Formatted parts list' },
    { tag: '{{urgency}}', desc: 'Urgency requirement' },
    { tag: '{{enquiry_code}}', desc: 'Enquiry ID' },
  ];

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-crm-lightGrey dark:border-crm-sky/15 pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('locations')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            activeSubTab === 'locations'
              ? 'bg-crm-blue text-white'
              : 'text-crm-indigo dark:text-crm-lightGrey hover:bg-crm-sky/20'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Location Hierarchy (States, Cities, Markets)
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            activeSubTab === 'categories'
              ? 'bg-crm-blue text-white'
              : 'text-crm-indigo dark:text-crm-lightGrey hover:bg-crm-sky/20'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          Hardware Component Categories
        </button>

        <button
          onClick={() => setActiveSubTab('templates')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            activeSubTab === 'templates'
              ? 'bg-crm-blue text-white'
              : 'text-crm-indigo dark:text-crm-lightGrey hover:bg-crm-sky/20'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Enquiry Message Templates
        </button>
      </div>

      {/* TAB: LOCATIONS */}
      {activeSubTab === 'locations' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add Location Form */}
          <div className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-4 text-xs">
            <h4 className="font-bold text-crm-navy dark:text-white uppercase tracking-wider">
              Add New Geographical Location
            </h4>
            <form onSubmit={handleAddLocation} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-crm-indigo mb-1">Level *</label>
                <select
                  value={newLocLevel}
                  onChange={(e: any) => setNewLocLevel(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15"
                >
                  <option value="STATE">State</option>
                  <option value="CITY">City</option>
                  <option value="MARKET">Commercial Market / Area</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-crm-indigo mb-1">Parent Location</label>
                <select
                  value={newLocParentId}
                  onChange={(e) => setNewLocParentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15"
                >
                  <option value="">No Parent (Top level)</option>
                  {newLocLevel === 'CITY' &&
                    states.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} (State)</option>
                    ))}
                  {newLocLevel === 'MARKET' &&
                    cities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} (City)</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-crm-indigo mb-1">Location Name *</label>
                <input
                  type="text"
                  required
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="e.g. Madurai, Simmakkal, Nehru Place"
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15"
                />
              </div>

              <button
                type="submit"
                disabled={addingLoc}
                className="w-full py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white font-bold shadow-sm"
              >
                {addingLoc ? 'Adding...' : 'Add Location'}
              </button>
            </form>
          </div>

          {/* Locations Tree View */}
          <div className="md:col-span-2 p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
            <h4 className="font-bold text-crm-navy dark:text-white uppercase tracking-wider text-xs">
              Configured Locations Hierarchy
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto text-xs">
              {states.map((state) => {
                const stateCities = cities.filter((c) => c.parentId === state.id);
                return (
                  <div key={state.id} className="p-3 rounded-xl bg-crm-sky/10 border border-crm-lightGrey/60 space-y-2">
                    <div className="font-bold text-crm-navy dark:text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-crm-blue" />
                      {state.name}
                    </div>

                    <div className="pl-4 space-y-1.5 border-l-2 border-crm-blue/30 ml-1">
                      {stateCities.map((city) => {
                        const cityMarkets = markets.filter((m) => m.parentId === city.id);
                        return (
                          <div key={city.id} className="space-y-1">
                            <div className="font-semibold text-crm-navy dark:text-crm-lightGrey flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-crm-indigo" />
                              {city.name}
                            </div>
                            {cityMarkets.length > 0 && (
                              <div className="flex flex-wrap gap-1 pl-4">
                                {cityMarkets.map((m) => (
                                  <span
                                    key={m.id}
                                    className="px-2 py-0.5 rounded-md bg-white dark:bg-crm-navySurface border border-crm-lightGrey text-[10px] text-crm-navy dark:text-crm-lightGrey"
                                  >
                                    {m.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: CATEGORIES */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey space-y-3 text-xs">
            <h4 className="font-bold text-crm-navy dark:text-white uppercase tracking-wider">
              Add Component Category
            </h4>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <input
                type="text"
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Liquid Coolers (AIO)"
                className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15"
              />
              <button
                type="submit"
                disabled={addingCat}
                className="w-full py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white font-bold"
              >
                {addingCat ? 'Adding...' : 'Add Category'}
              </button>
            </form>
          </div>

          <div className="md:col-span-2 p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey space-y-3">
            <h4 className="font-bold text-crm-navy dark:text-white uppercase tracking-wider text-xs">
              Active Component Categories ({categories.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto text-xs">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-2.5 rounded-xl bg-crm-sky/10 border border-crm-lightGrey flex items-center justify-between"
                >
                  <span className="font-medium text-crm-navy dark:text-white flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-crm-blue" />
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-crm-indigo">
                    {cat._count?.vendors ?? 0} vendors
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: TEMPLATES */}
      {activeSubTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Create or Edit Template Form (Left Column) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-crm-navy dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                {editingTemplateId ? <Edit2 className="w-3.5 h-3.5 text-crm-blue" /> : <Plus className="w-3.5 h-3.5 text-crm-blue" />}
                {editingTemplateId ? 'Edit Message Template' : 'Add Message Template'}
              </h4>
              {editingTemplateId && (
                <button
                  type="button"
                  onClick={cancelFormEdit}
                  className="text-[11px] text-crm-indigo hover:text-crm-navy flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              )}
            </div>

            {editingTemplateId && (
              <div className="p-2 rounded-lg bg-crm-blue/10 border border-crm-blue/20 text-[11px] text-crm-blue font-medium">
                Editing template: <strong>{newTplName}</strong>
              </div>
            )}

            <form onSubmit={handleSaveTemplateForm} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-crm-indigo mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={newTplName}
                  onChange={(e) => setNewTplName(e.target.value)}
                  placeholder="e.g. Urgent Availability Check"
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15 dark:bg-crm-navySurface text-crm-navy dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-crm-indigo mb-1">Channel</label>
                <select
                  value={newTplChannel}
                  onChange={(e: any) => setNewTplChannel(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15 dark:bg-crm-navySurface text-crm-navy dark:text-white"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>

              {newTplChannel === 'EMAIL' && (
                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo mb-1">Subject</label>
                  <input
                    type="text"
                    value={newTplSubject}
                    onChange={(e) => setNewTplSubject(e.target.value)}
                    placeholder="Quotation Request: {{enquiry_code}}"
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15 dark:bg-crm-navySurface text-crm-navy dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-crm-indigo mb-1">Message Body *</label>
                <textarea
                  rows={6}
                  required
                  value={newTplBody}
                  onChange={(e) => setNewTplBody(e.target.value)}
                  placeholder="Hello {{vendor_name}}, requirement for {{customer_location}}: {{component_list}}"
                  className="w-full px-2.5 py-1.5 rounded-lg border bg-crm-sky/15 dark:bg-crm-navySurface text-crm-navy dark:text-white font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingTpl}
                  className="flex-1 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingTpl ? 'Saving...' : editingTemplateId ? 'Update Template' : 'Save Template'}
                </button>
                {editingTemplateId && (
                  <button
                    type="button"
                    onClick={cancelFormEdit}
                    className="px-3 py-2 rounded-xl border border-crm-lightGrey text-crm-indigo hover:bg-crm-sky/20 transition font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Configured Templates List (Right 2 Columns) */}
          <div className="md:col-span-2 p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-crm-navy dark:text-white uppercase tracking-wider text-xs">
                Configured Enquiry Message Templates ({templates.length})
              </h4>
              <button
                onClick={loadAll}
                className="text-xs text-crm-blue hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto text-xs pr-1">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`p-4 rounded-xl border space-y-2 transition ${
                    editingTemplateId === tpl.id
                      ? 'bg-crm-blue/10 border-crm-blue ring-2 ring-crm-blue/20'
                      : 'bg-crm-sky/10 dark:bg-crm-navySurface/40 border-crm-lightGrey hover:border-crm-blue/40'
                  }`}
                >
                  {/* Template Card Header with Edit and Delete options */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-crm-navy dark:text-white">
                        {tpl.name}
                      </span>
                      {tpl.isDefault ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 shadow-xs">
                          <Star className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600" />
                          Active Template
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultTemplate(tpl.id)}
                          className="px-2 py-0.5 rounded-full border border-crm-lightGrey hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-crm-indigo hover:text-amber-700 text-[10px] font-medium transition flex items-center gap-1"
                          title="Set this template as the active default for WhatsApp redirects"
                        >
                          <Star className="w-2.5 h-2.5 text-amber-500" />
                          Set as Active
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-crm-blue/15 text-crm-blue font-bold text-[10px]">
                        {tpl.channel}
                      </span>

                      {/* EDIT OPTION BUTTON */}
                      <button
                        onClick={() => openEditModal(tpl)}
                        title="Edit this template"
                        className="px-2.5 py-1 rounded-lg bg-crm-blue hover:bg-crm-navy text-white text-[11px] font-semibold transition flex items-center gap-1 shadow-sm"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>

                      {/* Quick Edit in Form */}
                      <button
                        onClick={() => startEditInForm(tpl)}
                        title="Load into side form"
                        className="p-1 rounded-lg border border-crm-lightGrey hover:bg-crm-sky/20 text-crm-indigo hover:text-crm-navy transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {/* DELETE OPTION BUTTON */}
                      <button
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                        title="Delete this template"
                        className="p-1 rounded-lg border border-crm-lightGrey hover:bg-crm-orangeRed/10 text-crm-orangeRed transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {tpl.subject && (
                    <div className="text-[11px] font-semibold text-crm-indigo dark:text-crm-lightGrey/80">
                      Subject: {tpl.subject}
                    </div>
                  )}

                  <div className="text-[11px] whitespace-pre-wrap bg-white dark:bg-crm-navy p-3 rounded-lg border border-crm-lightGrey/70 text-crm-navy dark:text-crm-lightGrey font-mono max-h-48 overflow-y-auto">
                    {tpl.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED EDIT TEMPLATE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/15 pb-3">
              <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-crm-blue" />
                Edit Message Template
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-crm-indigo hover:text-crm-navy dark:text-crm-lightGrey"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                  Template Title *
                </label>
                <input
                  type="text"
                  required
                  value={modalTplName}
                  onChange={(e) => setModalTplName(e.target.value)}
                  placeholder="e.g. Component Availability & Price Check"
                  className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                  Channel
                </label>
                <select
                  value={modalTplChannel}
                  onChange={(e: any) => setModalTplChannel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>

              {modalTplChannel === 'EMAIL' && (
                <div>
                  <label className="block text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80 mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={modalTplSubject}
                    onChange={(e) => setModalTplSubject(e.target.value)}
                    placeholder="Quotation Request: {{enquiry_code}}"
                    className="w-full px-3 py-2 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white"
                  />
                </div>
              )}

              {/* Supported Dynamic Placeholders Helper */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80">
                    Insert Dynamic Tags
                  </label>
                  <span className="text-[10px] text-crm-indigo/60">Click to insert at cursor</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PLACEHOLDERS.map((p) => (
                    <button
                      key={p.tag}
                      type="button"
                      onClick={() => insertPlaceholder(p.tag)}
                      title={p.desc}
                      className="px-2 py-1 rounded-lg bg-crm-sky/20 hover:bg-crm-blue hover:text-white text-[10px] font-mono text-crm-blue dark:text-crm-sky transition border border-crm-lightGrey/70"
                    >
                      {p.tag}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-crm-indigo dark:text-crm-lightGrey/80">
                    Message Body *
                  </label>
                  <span className="text-[10px] text-crm-indigo/60">
                    {modalTplBody.length} characters
                  </span>
                </div>
                <textarea
                  rows={8}
                  required
                  value={modalTplBody}
                  onChange={(e) => setModalTplBody(e.target.value)}
                  placeholder="Write message template here..."
                  className="w-full p-3 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white font-mono text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-crm-lightGrey dark:border-crm-sky/15">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-crm-lightGrey dark:border-crm-sky/20 text-xs font-semibold text-crm-navy dark:text-crm-lightGrey hover:bg-crm-sky/20 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-5 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {modalSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
