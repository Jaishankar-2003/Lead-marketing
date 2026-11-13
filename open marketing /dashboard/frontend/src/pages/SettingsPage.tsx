import React, { useState } from 'react';
import {
  FolderOpen,
  FileCheck,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { SyncResult } from '../types';

interface SettingsPageProps {
  syncStatus: SyncResult | null;
  onUpdateOutputDir: (path: string) => Promise<void>;
  onSync: () => Promise<void>;
  isSyncing: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  syncStatus,
  onUpdateOutputDir,
  onSync,
  isSyncing,
}) => {
  const [inputPath, setInputPath] = useState(syncStatus?.outputDir || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const defaultPath = '/home/sri-jaya-shankaran/Downloads/demos/output';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPath.trim()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await onUpdateOutputDir(inputPath.trim());
      setFeedback({ type: 'success', message: 'Output directory updated and synchronized successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update output directory' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = async () => {
    setInputPath(defaultPath);
    setIsSaving(true);
    setFeedback(null);
    try {
      await onUpdateOutputDir(defaultPath);
      setFeedback({ type: 'success', message: 'Reset to default output directory!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reset path' });
    } finally {
      setIsSaving(false);
    }
  };

  const files = syncStatus?.files ? Object.values(syncStatus.files) : [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Directory Config Section */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <HardDrive className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-semibold text-slate-100">Dataset Directory Configuration</h2>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          The dashboard continuously monitors this local directory for the 4 standardized pipeline outputs. When you run new discoveries or restore previous backups, clicking <strong>SYNC</strong> reloads these files instantly.
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Configured Directory Path:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="/path/to/demos/output"
                className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                {isSaving ? 'Updating...' : 'Save & Reload'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to default directory</span>
            </button>
          </div>
        </form>

        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Target Files Inspector */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-slate-100">Standard Output Files Status</h2>
          </div>

          <button
            onClick={() => onSync()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Verifying...' : 'Re-verify Files'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Filename</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Records Count</th>
                <th className="py-2.5 px-3">File Size</th>
                <th className="py-2.5 px-3">Last Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {files.map((f) => (
                <tr key={f.filename} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-semibold text-slate-100 flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>{f.filename}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-sans">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                        f.fileType === 'QUALIFIED_LEADS'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {f.fileType === 'QUALIFIED_LEADS' ? 'Qualified' : 'All Leads'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {f.status === 'OK' ? (
                      <span className="text-emerald-400 font-sans text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        Available
                      </span>
                    ) : (
                      <span className="text-rose-400 font-sans text-xs bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                        {f.status}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-200 font-sans">
                    {f.recordsCount > 0 ? `${f.recordsCount} rows` : 'N/A'}
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {(f.sizeBytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[11px] font-sans">
                    {f.lastModified ? new Date(f.lastModified).toLocaleString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {syncStatus?.warning && (
          <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{syncStatus.warning}</span>
          </div>
        )}
      </div>

      {/* Sync Health & Diagnostics */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-slate-100">Sync Architecture Rules</h3>
        <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
          <li><strong>Never Duplicates:</strong> Previous in-memory data is completely replaced, never appended.</li>
          <li><strong>Fixed Filenames:</strong> Only monitors standard pipeline filenames (`all_leads.*`, `qualified_leads.*`).</li>
          <li><strong>Zero Scraper Interference:</strong> Read-only visualization; the scraping engine is never invoked automatically by sync.</li>
          <li><strong>Safe Local Access:</strong> Restricted to valid local directories on your system.</li>
        </ul>
      </div>
    </div>
  );
};
