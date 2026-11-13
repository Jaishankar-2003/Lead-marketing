import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardOverview } from './pages/DashboardOverview';
import { AllLeadsPage } from './pages/AllLeadsPage';
import { QualifiedLeadsPage } from './pages/QualifiedLeadsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { DashboardData } from './types';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getDashboard();
      setDashboardData(data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message || 'Failed to connect to backend service');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.triggerSync();
      await fetchDashboardData();
      const count = res.kpis?.totalLeads ?? 0;
      const qual = res.kpis?.qualifiedLeads ?? 0;
      setSyncToast(`Sync complete! ${count} leads reloaded (${qual} qualified).`);
      setTimeout(() => setSyncToast(null), 3500);
    } catch (err: any) {
      console.error('Sync error:', err);
      setSyncToast(`Sync failed: ${err.message}`);
      setTimeout(() => setSyncToast(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateOutputDir = async (newPath: string) => {
    await api.updateConfig(newPath);
    await fetchDashboardData();
    setSyncToast(`Output folder switched to ${newPath}`);
    setTimeout(() => setSyncToast(null), 3500);
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard Overview';
      case 'all-leads':
        return 'All Discovered Businesses';
      case 'qualified-leads':
        return 'High-Priority Qualified Leads';
      case 'settings':
        return 'Dataset Settings & Verification';
      default:
        return 'Lead Intelligence';
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        totalCount={dashboardData?.kpis.totalLeads}
        qualifiedCount={dashboardData?.kpis.qualifiedLeads}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          syncStatus={dashboardData?.syncStatus || null}
          onSync={handleSync}
          isSyncing={isSyncing}
          onUpdateOutputDir={handleUpdateOutputDir}
          activeTabTitle={getTabTitle()}
        />

        {/* Sync Toast Notification */}
        {syncToast && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>{syncToast}</span>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center text-slate-400">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm">Connecting to local lead database...</p>
            </div>
          ) : error && !dashboardData ? (
            <div className="bg-card border border-rose-500/30 rounded-xl p-8 max-w-lg mx-auto text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-100">Unable to Connect</h3>
              <p className="text-xs text-slate-400">{error}</p>
              <button
                onClick={() => fetchDashboardData()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && dashboardData && (
                <DashboardOverview
                  data={dashboardData}
                  onNavigate={(tab) => setActiveTab(tab)}
                />
              )}

              {activeTab === 'all-leads' && <AllLeadsPage />}

              {activeTab === 'qualified-leads' && <QualifiedLeadsPage />}

              {activeTab === 'settings' && (
                <SettingsPage
                  syncStatus={dashboardData?.syncStatus || null}
                  onUpdateOutputDir={handleUpdateOutputDir}
                  onSync={handleSync}
                  isSyncing={isSyncing}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

