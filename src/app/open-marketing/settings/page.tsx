'use client';

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
import { useOpenMarketing } from '@/lib/open-marketing/context';

export default function OpenMarketingSettingsPage() {
  const { dashboardData, handleUpdateOutputDir, handleSync, isSyncing } = useOpenMarketing();
  const syncStatus = dashboardData?.syncStatus || null;

  const [inputPath, setInputPath] = useState(syncStatus?.outputDir || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const defaultPath = '/home/sri-jaya-shankaran/marketing/open marketing /output';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPath.trim()) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      await handleUpdateOutputDir(inputPath.trim());
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
      await handleUpdateOutputDir(defaultPath);
      setFeedback({ type: 'success', message: 'Reset to local workspace output directory!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reset path' });
    } finally {
      setIsSaving(false);
    }
  };

  const files = syncStatus?.files ? Object.values(syncStatus.files) : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Directory Config Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
          <HardDrive className="w-5 h-5 text-[#4F46E5]" />
          <h2 className="text-base font-semibold text-[#172033]">Dataset Directory Configuration</h2>
        </div>

        <p className="text-xs text-[#64748B] leading-relaxed">
          The dashboard continuously monitors this local directory for JSON and CSV pipeline datasets (e.g. <code className="text-[#172033] bg-[#F1F5F9] px-1.5 py-0.5 rounded font-mono">all_leads*.json</code>, <code className="text-[#172033] bg-[#F1F5F9] px-1.5 py-0.5 rounded font-mono">qualified_leads*.json</code>). When new discoveries are completed, clicking <strong>SYNC NOW</strong> reloads metrics instantly.
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1.5">
              Configured Directory Path:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="/home/sri-jaya-shankaran/marketing/open marketing /output"
                className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] text-xs font-mono focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-colors"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-sm transition-colors shrink-0 disabled:opacity-60"
              >
                {isSaving ? 'Updating...' : 'Save & Reload'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-[#64748B] hover:text-[#172033] flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to local open marketing/output</span>
            </button>
          </div>
        </form>

        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]'
                : 'bg-[#FEE2E2] border-[#FECACA] text-[#B91C1C]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#16A34A]" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#DC2626]" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* Target Files Inspector */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#4F46E5]" />
            <h2 className="text-base font-semibold text-[#172033]">Discovered Datasets Health Inspector</h2>
          </div>

          <button
            onClick={() => handleSync()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] text-xs font-medium border border-[#CBD5E1] transition-colors shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Verifying...' : 'Re-verify Files'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#172033]">
            <thead className="bg-[#F8FAFC] text-[#64748B] uppercase text-[11px] border-b border-[#E2E8F0]">
              <tr>
                <th className="py-2.5 px-3">Filename</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Records Count</th>
                <th className="py-2.5 px-3">File Size</th>
                <th className="py-2.5 px-3">Last Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono">
              {files.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#94A3B8] font-sans">
                    No matching lead files detected in the configured directory.
                  </td>
                </tr>
              ) : (
                files.map((f) => (
                  <tr key={f.filename} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#172033] flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-[#4F46E5] flex-shrink-0" />
                      <span>{f.filename}</span>
                    </td>
                    <td className="py-3 px-3 text-[#475569] font-sans">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          f.fileType === 'QUALIFIED_LEADS'
                            ? 'bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]'
                            : 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]'
                        }`}
                      >
                        {f.fileType === 'QUALIFIED_LEADS' ? 'Qualified' : 'All Leads'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {f.status === 'OK' ? (
                        <span className="text-[#15803D] font-sans text-xs bg-[#DCFCE7] border border-[#BBF7D0] px-2 py-0.5 rounded font-medium">
                          Available
                        </span>
                      ) : (
                        <span className="text-[#B91C1C] font-sans text-xs bg-[#FEE2E2] border border-[#FECACA] px-2 py-0.5 rounded font-medium">
                          {f.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-[#172033] font-sans">
                      {f.recordsCount > 0 ? `${f.recordsCount} rows` : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-[#64748B]">
                      {(f.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-3 text-[#64748B] text-[11px] font-sans">
                      {f.lastModified ? new Date(f.lastModified).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {syncStatus?.warning && (
          <div className="p-3 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{syncStatus.warning}</span>
          </div>
        )}
      </div>

      {/* Sync Architecture Rules */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-[#172033]">Open Marketing Integration Rules</h3>
        <ul className="text-xs text-[#64748B] space-y-2 list-disc list-inside leading-relaxed">
          <li><strong>Zero Scraper Interference:</strong> Synchronization only performs non-blocking reads of generated files.</li>
          <li><strong>Clean In-Memory Reload:</strong> Synchronization atomically refreshes cached metrics without appending duplicate rows.</li>
          <li><strong>Autonomous Backend:</strong> Express backend runs locally on port 3001, bridged through Next.js proxy at <code className="text-[#172033] bg-[#F1F5F9] px-1.5 py-0.5 rounded font-mono">/api/open-marketing/*</code>.</li>
        </ul>
      </div>
    </div>
  );
}
