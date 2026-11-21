'use client';

import React, { useEffect, useState } from 'react';
import {
  Store,
  CheckCircle2,
  Clock,
  HelpCircle,
  FileQuestion,
  Receipt,
  MapPin,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Phone,
  MessageCircle,
} from 'lucide-react';

interface StatsData {
  totalVendors: number;
  activeVendors: number;
  pendingVerification: number;
  totalEnquiries: number;
  openEnquiries: number;
  quotationsCount: number;
  cityBreakdown: Array<{
    cityId: string;
    cityName: string;
    count: number;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    content: string;
    createdAt: string;
    vendor?: { name: string; vendorCode: string };
    enquiry?: { requestCode: string };
  }>;
}

interface VendorDashboardProps {
  onNavigateTab: (tab: 'directory' | 'import' | 'enquiries' | 'duplicates' | 'settings') => void;
  onFilterCity?: (cityId: string) => void;
}

export default function VendorDashboard({ onNavigateTab, onFilterCity }: VendorDashboardProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vendors/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load vendor stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-crm-blue/10 via-crm-sky/15 to-transparent dark:from-crm-blue/20 dark:via-crm-sky/10 border border-crm-blue/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-crm-navy dark:text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-crm-blue" />
            Hardware Vendor & Component Procurement Hub
          </h2>
          <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/80 mt-1">
            Manage multi-city PC component vendors (Madurai, Coimbatore, Bangalore SP Road, Nehru Place), import multi-section Excel sheets, and dispatch part enquiries via WhatsApp & Email.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('import')}
            className="px-3.5 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            Import Excel
          </button>
          <button
            onClick={() => onNavigateTab('enquiries')}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 text-crm-navy dark:text-white hover:bg-crm-sky/20 text-xs font-semibold transition flex items-center gap-1.5"
          >
            New Part Enquiry
          </button>
          <button
            onClick={loadStats}
            title="Refresh statistics"
            className="p-2 rounded-xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 text-crm-indigo hover:text-crm-navy dark:text-crm-lightGrey transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vendors */}
        <div
          onClick={() => onNavigateTab('directory')}
          className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 cursor-pointer hover:border-crm-blue/50 transition group"
        >
          <div className="flex items-center justify-between text-xs text-crm-indigo dark:text-crm-periwinkle">
            <span>Total Hardware Vendors</span>
            <Store className="w-4 h-4 text-crm-blue" />
          </div>
          <p className="text-2xl font-bold text-crm-navy dark:text-white mt-2">
            {stats?.totalVendors ?? 0}
          </p>
          <div className="flex items-center justify-between mt-2 text-[11px] text-crm-indigo dark:text-crm-lightGrey/75">
            <span>{stats?.activeVendors ?? 0} active / verified</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition text-crm-blue" />
          </div>
        </div>

        {/* Verification Pending */}
        <div
          onClick={() => onNavigateTab('directory')}
          className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 cursor-pointer hover:border-amber-400/50 transition group"
        >
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
            <span>Pending Verification</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-crm-navy dark:text-white mt-2">
            {stats?.pendingVerification ?? 0}
          </p>
          <div className="flex items-center justify-between mt-2 text-[11px] text-crm-indigo dark:text-crm-lightGrey/75">
            <span>Needs detail check</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition text-amber-500" />
          </div>
        </div>

        {/* Active Enquiries */}
        <div
          onClick={() => onNavigateTab('enquiries')}
          className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 cursor-pointer hover:border-crm-blue/50 transition group"
        >
          <div className="flex items-center justify-between text-xs text-crm-indigo dark:text-crm-periwinkle">
            <span>Active Enquiries</span>
            <FileQuestion className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-crm-navy dark:text-white mt-2">
            {stats?.openEnquiries ?? 0}
          </p>
          <div className="flex items-center justify-between mt-2 text-[11px] text-crm-indigo dark:text-crm-lightGrey/75">
            <span>{stats?.totalEnquiries ?? 0} total enquiries</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition text-purple-500" />
          </div>
        </div>

        {/* Quotations Received */}
        <div
          onClick={() => onNavigateTab('enquiries')}
          className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 cursor-pointer hover:border-emerald-500/50 transition group"
        >
          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400">
            <span>Quotations Logged</span>
            <Receipt className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-crm-navy dark:text-white mt-2">
            {stats?.quotationsCount ?? 0}
          </p>
          <div className="flex items-center justify-between mt-2 text-[11px] text-crm-indigo dark:text-crm-lightGrey/75">
            <span>Competitive price bids</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition text-emerald-500" />
          </div>
        </div>
      </div>

      {/* City Breakdown & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* City Breakdown */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-crm-navy dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-crm-blue" />
              Vendors by City / Market
            </h3>
            <button
              onClick={() => onNavigateTab('directory')}
              className="text-[11px] text-crm-blue hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-2">
            {stats?.cityBreakdown && stats.cityBreakdown.length > 0 ? (
              stats.cityBreakdown.map((c) => (
                <div
                  key={c.cityId}
                  onClick={() => {
                    if (onFilterCity) onFilterCity(c.cityId);
                    onNavigateTab('directory');
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-crm-sky/20 dark:hover:bg-crm-navySurface cursor-pointer transition text-xs"
                >
                  <span className="font-medium text-crm-navy dark:text-crm-lightGrey flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-crm-blue" />
                    {c.cityName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-crm-sky/30 dark:bg-crm-blue/20 text-crm-blue dark:text-crm-sky font-semibold text-[11px]">
                    {c.count} vendors
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/60 py-4 text-center">
                No vendors imported yet. Click "Import Excel" to upload your vendor lists.
              </p>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
          <h3 className="text-xs font-bold text-crm-navy dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-crm-blue" />
            Recent Vendor & Enquiry Activities
          </h3>

          <div className="space-y-3">
            {stats?.recentActivities && stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface/50 border border-crm-lightGrey dark:border-crm-sky/10 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-crm-navy dark:text-white">
                      {act.content}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-crm-indigo dark:text-crm-lightGrey/70">
                      {act.vendor && (
                        <span className="font-semibold text-crm-blue">
                          {act.vendor.name} ({act.vendor.vendorCode})
                        </span>
                      )}
                      {act.enquiry && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-mono">
                          {act.enquiry.requestCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-crm-indigo dark:text-crm-lightGrey/60 shrink-0">
                    {new Date(act.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/60 py-4 text-center">
                No recent activity recorded yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
