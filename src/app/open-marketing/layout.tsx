'use client';

import React from 'react';
import { OpenMarketingHeader } from '@/components/open-marketing/OpenMarketingHeader';
import { OpenMarketingSubnav } from '@/components/open-marketing/OpenMarketingSubnav';
import { OpenMarketingProvider, useOpenMarketing } from '@/lib/open-marketing/context';
import { AlertTriangle, RefreshCw } from 'lucide-react';

function OpenMarketingInnerLayout({ children }: { children: React.ReactNode }) {
  const {
    dashboardData,
    error,
    isSyncing,
    syncToast,
    refresh,
    handleSync,
    handleUpdateOutputDir,
  } = useOpenMarketing();

  return (
    <div className="flex flex-col min-h-full bg-[#F8FAFC] text-[#172033]">
      {/* Unified Open Marketing Header */}
      <OpenMarketingHeader
        syncStatus={dashboardData?.syncStatus || null}
        onSync={handleSync}
        isSyncing={isSyncing}
        onUpdateOutputDir={handleUpdateOutputDir}
        activeTabTitle="Lead Intelligence Platform"
      />

      {/* Subnavigation Bar */}
      <OpenMarketingSubnav
        totalCount={dashboardData?.kpis.totalLeads}
        qualifiedCount={dashboardData?.kpis.qualifiedLeads}
      />

      {/* Toast Feedback */}
      {syncToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-[#4F46E5] text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-[#6366F1] animate-in fade-in slide-in-from-bottom-3 duration-200">
          <RefreshCw className="w-4 h-4 animate-spin text-white" />
          <span>{syncToast}</span>
        </div>
      )}

      {/* Content View */}
      <div className="flex-1 p-6 lg:p-8">
        {error && !dashboardData && (
          <div className="mb-6 bg-white border border-[#E2E8F0] rounded-xl p-6 max-w-xl mx-auto text-center space-y-3 shadow-md">
            <div className="w-10 h-10 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#172033]">Backend Service Standby</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              The Open Marketing backend service is starting up or awaiting data files.
              Ensure services are launched via <code className="bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[#172033] font-mono text-[11px] border border-[#E2E8F0]">npm run dev</code>.
            </p>
            <button
              onClick={() => refresh()}
              className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Retry Connection
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

export default function OpenMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OpenMarketingProvider>
      <OpenMarketingInnerLayout>{children}</OpenMarketingInnerLayout>
    </OpenMarketingProvider>
  );
}
