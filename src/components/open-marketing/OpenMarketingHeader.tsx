'use client';

import React, { useState } from 'react';
import {
  RefreshCw,
  FolderOpen,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FolderEdit,
} from 'lucide-react';
import { SyncResult } from '@/types/open-marketing';

interface HeaderProps {
  syncStatus: SyncResult | null;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onUpdateOutputDir: (path: string) => Promise<void>;
  activeTabTitle?: string;
}

export const OpenMarketingHeader: React.FC<HeaderProps> = ({
  syncStatus,
  onSync,
  isSyncing,
  onUpdateOutputDir,
  activeTabTitle = 'Open Marketing &bull; Lead Intelligence',
}) => {
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newPath, setNewPath] = useState(syncStatus?.outputDir || '');
  const [isUpdatingPath, setIsUpdatingPath] = useState(false);
  const [pathError, setPathError] = useState<string | null>(null);

  const handleOpenFolderModal = () => {
    setNewPath(syncStatus?.outputDir || '');
    setPathError(null);
    setShowFolderModal(true);
  };

  const handleSavePath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath.trim()) return;
    setIsUpdatingPath(true);
    setPathError(null);
    try {
      await onUpdateOutputDir(newPath.trim());
      setShowFolderModal(false);
    } catch (err: any) {
      setPathError(err.message || 'Failed to update output directory');
    } finally {
      setIsUpdatingPath(false);
    }
  };

  const formattedTime = syncStatus?.timestamp
    ? new Date(syncStatus.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Never';

  return (
    <>
      <header className="h-16 px-6 lg:px-8 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-20 gap-4 transition-colors">
        {/* Left: Active Tab Title & Integrated Module Pill */}
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-base lg:text-lg font-bold text-[#172033] tracking-tight flex items-center gap-2 truncate">
            <span className="truncate">{activeTabTitle}</span>
            <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE] uppercase tracking-wider shrink-0">
              Integrated Module
            </span>
          </h2>
        </div>

        {/* Right: Output Path, Sync Status & Button (Guaranteed Zero Overlap Flex) */}
        <div className="flex items-center gap-2.5 lg:gap-3 shrink-0">
          {/* Quick Dataset Folder Pill */}
          <button
            type="button"
            onClick={handleOpenFolderModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-xs text-[#475569] hover:text-[#172033] transition-colors shrink-0"
            title={`Configured Dataset Path: ${syncStatus?.outputDir || ''}\nClick to change output folder`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
            <span className="hidden 2xl:inline font-mono text-[11px] max-w-[160px] truncate text-[#475569]">
              {syncStatus?.outputDir ? syncStatus.outputDir.split('/').filter(Boolean).pop() || 'output' : 'output'}
            </span>
            <span className="hidden xl:inline 2xl:hidden font-sans text-xs">Dataset</span>
            <FolderEdit className="w-3 h-3 text-[#64748B] hover:text-[#172033] shrink-0" />
          </button>

          {/* Status Indicators */}
          {syncStatus && (
            <div className="flex items-center gap-2 text-xs shrink-0">
              {syncStatus.isStale ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline font-medium">Stale Data</span>
                </div>
              ) : syncStatus.success ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0] shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline font-medium">Synced</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA] shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline font-medium">Sync Error</span>
                </div>
              )}

              <div className="hidden lg:flex items-center gap-1.5 text-[#64748B] shrink-0">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">Last sync: <strong className="text-[#172033]">{formattedTime}</strong></span>
              </div>
            </div>
          )}

          {/* SYNC Button */}
          <button
            onClick={() => onSync()}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-3.5 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm shrink-0 ${
              isSyncing
                ? 'bg-[#4F46E5]/60 text-white cursor-not-allowed'
                : 'bg-[#4F46E5] hover:bg-[#4338CA] text-white active:scale-95'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">{isSyncing ? 'SYNCING...' : 'SYNC NOW'}</span>
          </button>
        </div>
      </header>

      {/* Change Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-[#4F46E5]" />
                <h3 className="text-base font-semibold text-[#172033]">Configure Output Directory</h3>
              </div>
              <button
                onClick={() => setShowFolderModal(false)}
                className="text-[#64748B] hover:text-[#172033] p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePath} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1.5">
                  Output Folder Path (containing JSON &amp; CSV files):
                </label>
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="/home/sri-jaya-shankaran/marketing/open marketing /output"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] text-xs font-mono focus:outline-none focus:border-[#4F46E5] focus:bg-white"
                />
                <p className="text-[11px] text-[#64748B] mt-1">
                  Target directory contains lead datasets: all_leads*.json, qualified_leads*.json, etc.
                </p>
              </div>

              {pathError && (
                <div className="p-3 rounded-lg bg-[#FEE2E2] border border-[#FECACA] text-[#B91C1C] text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{pathError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-[#475569] hover:text-[#172033] hover:bg-[#F1F5F9] border border-[#E2E8F0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPath}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-sm"
                >
                  {isUpdatingPath ? 'Updating & Syncing...' : 'Save & Reload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
