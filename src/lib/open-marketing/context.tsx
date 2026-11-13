'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { openMarketingApi } from '@/lib/open-marketing/api';
import { DashboardData } from '@/types/open-marketing';

export interface OpenMarketingContextType {
  dashboardData: DashboardData | null;
  loading: boolean;
  error: string | null;
  isSyncing: boolean;
  syncToast: string | null;
  refresh: () => Promise<void>;
  handleSync: () => Promise<void>;
  handleUpdateOutputDir: (path: string) => Promise<void>;
}

const OpenMarketingContext = createContext<OpenMarketingContextType>({
  dashboardData: null,
  loading: true,
  error: null,
  isSyncing: false,
  syncToast: null,
  refresh: async () => {},
  handleSync: async () => {},
  handleUpdateOutputDir: async () => {},
});

export const useOpenMarketing = () => useContext(OpenMarketingContext);

export function OpenMarketingProvider({ children }: { children: React.ReactNode }) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const data = await openMarketingApi.getDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.warn('Open Marketing data fetch:', err.message);
      setError(err.message || 'Unable to connect to Open Marketing backend on port 3001');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncToast(null);
    try {
      const res = await openMarketingApi.triggerSync();
      const count = res.kpis?.totalLeads ?? res.syncResult?.allLeadsCount ?? 0;
      const qual = res.kpis?.qualifiedLeads ?? res.syncResult?.qualifiedLeadsCount ?? 0;
      setSyncToast(`Sync complete! Reloaded ${count} leads (${qual} qualified).`);
      await fetchDashboardData();
    } catch (err: any) {
      setSyncToast(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  const handleUpdateOutputDir = async (newPath: string) => {
    setIsSyncing(true);
    try {
      await openMarketingApi.updateConfig(newPath);
      await fetchDashboardData();
      setSyncToast(`Output folder switched to: ${newPath}`);
    } catch (err: any) {
      throw err;
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  const value: OpenMarketingContextType = {
    dashboardData,
    loading,
    error,
    isSyncing,
    syncToast,
    refresh: fetchDashboardData,
    handleSync,
    handleUpdateOutputDir,
  };

  return (
    <OpenMarketingContext.Provider value={value}>
      {children}
    </OpenMarketingContext.Provider>
  );
}
