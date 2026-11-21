'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ArrowRight,
  GitMerge,
  CopyPlus,
  Ban,
  CheckCircle2,
  RefreshCw,
  Phone,
  MapPin,
  FileSpreadsheet,
} from 'lucide-react';

interface PendingRecord {
  id: string;
  sheetName?: string;
  sourceRow?: number;
  name?: string;
  phones: string[];
  address?: string;
  matchType?: string;
  matchReason?: string;
  matchVendorId?: string;
  matchVendor?: {
    id: string;
    vendorCode: string;
    name: string;
    status: string;
    fullAddress?: string;
    city?: { name: string };
    area?: { name: string };
    contacts: Array<{ value: string; type: string; isPrimary: boolean; isWhatsApp: boolean }>;
  };
  batch: {
    fileName: string;
  };
}

export default function VendorDuplicateReview() {
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadPending = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vendors/duplicates');
      const data = await res.json();
      if (data.success) {
        setRecords(data.pendingReviews || []);
      }
    } catch (err) {
      console.error('Failed to load duplicate review queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPending();
  }, []);

  const handleResolve = async (recordId: string, decision: 'MERGE' | 'KEEP_SEPARATE' | 'SKIP') => {
    try {
      setActionLoading(recordId);
      const res = await fetch('/api/vendors/duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, decision }),
      });
      const data = await res.json();
      if (data.success) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
      } else {
        alert(data.error || 'Failed to process decision');
      }
    } catch (err) {
      console.error('Error resolving duplicate:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            Duplicate Resolution & Manual Review Queue
          </h3>
          <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/75 mt-0.5">
            Compare imported records that matched existing phone numbers or business names.
          </p>
        </div>
        <button
          onClick={loadPending}
          className="p-2 rounded-xl border border-crm-lightGrey dark:border-crm-sky/20 text-crm-indigo hover:text-crm-navy transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-crm-indigo dark:text-crm-lightGrey/60">
          Loading duplicate queue...
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
          <h4 className="text-sm font-bold text-crm-navy dark:text-white">Review Queue is Clear!</h4>
          <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/70 max-w-sm mx-auto">
            All spreadsheet records have been verified or resolved. No pending duplicate conflicts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((r) => (
            <div
              key={r.id}
              className="p-5 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-4 shadow-sm"
            >
              {/* Match Reason Banner */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/30 text-xs text-purple-900 dark:text-purple-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {r.matchReason || 'Potential duplicate match detected'}
                </span>
                <span className="text-[11px] text-purple-700 dark:text-purple-400 font-mono">
                  From: {r.batch.fileName} (Row #{r.sourceRow})
                </span>
              </div>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Incoming record */}
                <div className="p-4 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface/50 border border-crm-lightGrey dark:border-crm-sky/15 space-y-2 text-xs">
                  <div className="text-[10px] font-bold text-crm-indigo dark:text-crm-periwinkle uppercase tracking-wider">
                    Incoming Record (Imported)
                  </div>
                  <div className="font-bold text-sm text-crm-navy dark:text-white">
                    {r.name || 'Unnamed Vendor'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-crm-navy dark:text-white">
                      <Phone className="w-3 h-3 text-crm-indigo" />
                      <span>{r.phones.join(', ') || 'No phone'}</span>
                    </div>
                    {r.address && (
                      <div className="flex items-start gap-1.5 text-crm-indigo dark:text-crm-lightGrey/80">
                        <MapPin className="w-3 h-3 text-crm-indigo shrink-0 mt-0.5" />
                        <span>{r.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Existing Vendor */}
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/20 space-y-2 text-xs">
                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Existing Database Vendor</span>
                    {r.matchVendor && (
                      <span className="font-mono text-emerald-800 dark:text-emerald-300 font-bold">
                        {r.matchVendor.vendorCode}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-crm-navy dark:text-white">
                    {r.matchVendor?.name || 'Unknown Existing Vendor'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-crm-navy dark:text-white">
                      <Phone className="w-3 h-3 text-crm-indigo" />
                      <span>
                        {r.matchVendor?.contacts.map((c) => c.value).join(', ') || 'No phone recorded'}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 text-crm-indigo dark:text-crm-lightGrey/80">
                      <MapPin className="w-3 h-3 text-crm-indigo shrink-0 mt-0.5" />
                      <span>
                        {r.matchVendor?.area?.name ? `${r.matchVendor.area.name}, ` : ''}
                        {r.matchVendor?.city?.name || ''}{' '}
                        {r.matchVendor?.fullAddress ? `(${r.matchVendor.fullAddress})` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolution Decision Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-crm-lightGrey dark:border-crm-sky/15">
                <button
                  disabled={actionLoading === r.id}
                  onClick={() => handleResolve(r.id, 'SKIP')}
                  className="px-3.5 py-2 rounded-xl border border-crm-lightGrey text-xs font-semibold hover:bg-crm-sky/20 transition flex items-center gap-1.5 text-crm-indigo dark:text-crm-lightGrey disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" /> Skip This Row
                </button>

                <button
                  disabled={actionLoading === r.id}
                  onClick={() => handleResolve(r.id, 'KEEP_SEPARATE')}
                  className="px-3.5 py-2 rounded-xl border border-crm-blue text-crm-blue hover:bg-crm-blue/10 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CopyPlus className="w-3.5 h-3.5" /> Keep as Separate Vendor
                </button>

                {r.matchVendorId && (
                  <button
                    disabled={actionLoading === r.id}
                    onClick={() => handleResolve(r.id, 'MERGE')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <GitMerge className="w-3.5 h-3.5" /> Merge into Existing Vendor
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
