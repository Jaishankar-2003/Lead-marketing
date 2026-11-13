import React, { useState } from 'react';
import {
  RefreshCw,
  FolderOpen,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FolderEdit,
} from 'lucide-react';
import { SyncResult } from '../../types';

interface HeaderProps {
  syncStatus: SyncResult | null;
  onSync: () => Promise<void>;
  isSyncing: boolean;
  onUpdateOutputDir: (path: string) => Promise<void>;
  activeTabTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  syncStatus,
  onSync,
  isSyncing,
  onUpdateOutputDir,
  activeTabTitle,
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
      <header className="h-16 px-8 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        {/* Left: Active Tab Title & Path */}
        <div className="flex items-center gap-6">
          <h2 className="text-lg font-semibold text-slate-100">{activeTabTitle}</h2>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-border text-xs text-slate-300">
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-slate-400 max-w-xs truncate" title={syncStatus?.outputDir}>
              {syncStatus?.outputDir || 'Loading path...'}
            </span>
            <button
              onClick={handleOpenFolderModal}
              title="Change Output Folder"
              className="text-blue-400 hover:text-blue-300 ml-1 p-0.5 rounded hover:bg-slate-800"
            >
              <FolderEdit className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Sync Status & Button */}
        <div className="flex items-center gap-4">
          {/* Status Indicators */}
          {syncStatus && (
            <div className="flex items-center gap-3 text-xs">
              {syncStatus.isStale ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Stale Data</span>
                </div>
              ) : syncStatus.success ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Synced</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Sync Error</span>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Last sync: <strong className="text-slate-300">{formattedTime}</strong></span>
              </div>
            </div>
          )}

          {/* SYNC Button */}
          <button
            onClick={() => onSync()}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-sm ${
              isSyncing
                ? 'bg-blue-600/50 text-blue-200 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'SYNCING...' : 'SYNC NOW'}</span>
          </button>
        </div>
      </header>

      {/* Change Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-semibold text-slate-100">Configure Output Directory</h3>
              </div>
              <button
                onClick={() => setShowFolderModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePath} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Folder Path (containing the 4 CSV and JSON files):
                </label>
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="/path/to/demos/output"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Target directory must contain: all_leads.csv, all_leads.json, qualified_leads.csv, qualified_leads.json.
                </p>
              </div>

              {pathError && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{pathError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPath}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white"
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

