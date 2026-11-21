'use client';

import React, { useState } from 'react';
import {
  Store,
  FileSpreadsheet,
  ShieldAlert,
  FileQuestion,
  Settings,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import VendorDashboard from './VendorDashboard';
import VendorDirectory from './VendorDirectory';
import VendorImportWizard from './VendorImportWizard';
import VendorDuplicateReview from './VendorDuplicateReview';
import ComponentEnquiriesHub from './ComponentEnquiriesHub';
import VendorSettingsView from './VendorSettingsView';

type VendorSubTab = 'dashboard' | 'directory' | 'import' | 'duplicates' | 'enquiries' | 'settings';

export default function VendorManagementHub() {
  const [subTab, setSubTab] = useState<VendorSubTab>('dashboard');
  const [filteredCityId, setFilteredCityId] = useState<string | undefined>(undefined);

  const subNavItems: Array<{ id: VendorSubTab; label: string; icon: any }> = [
    { id: 'dashboard', label: 'Vendor Dashboard', icon: LayoutDashboard },
    { id: 'directory', label: 'Vendors Directory', icon: Users },
    { id: 'import', label: 'Excel Import Wizard', icon: FileSpreadsheet },
    { id: 'duplicates', label: 'Duplicate Review Queue', icon: ShieldAlert },
    { id: 'enquiries', label: 'Component Enquiries & Quotes', icon: FileQuestion },
    { id: 'settings', label: 'Locations & Categories', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Subnavigation Pills */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-crm-sky/15 dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20">
        {subNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = subTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setSubTab(item.id);
                if (item.id !== 'directory') setFilteredCityId(undefined);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                isActive
                  ? 'bg-crm-blue text-white shadow-sm'
                  : 'text-crm-navy/80 dark:text-crm-lightGrey hover:bg-crm-sky/30 dark:hover:bg-crm-navySurface'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Subview Content */}
      {subTab === 'dashboard' && (
        <VendorDashboard
          onNavigateTab={(tab) => setSubTab(tab)}
          onFilterCity={(cityId) => setFilteredCityId(cityId)}
        />
      )}

      {subTab === 'directory' && (
        <VendorDirectory initialCityId={filteredCityId} />
      )}

      {subTab === 'import' && (
        <VendorImportWizard
          onImportComplete={() => setSubTab('directory')}
          onNavigateTab={(tab) => setSubTab(tab)}
        />
      )}

      {subTab === 'duplicates' && (
        <VendorDuplicateReview />
      )}

      {subTab === 'enquiries' && (
        <ComponentEnquiriesHub />
      )}

      {subTab === 'settings' && (
        <VendorSettingsView />
      )}
    </div>
  );
}
