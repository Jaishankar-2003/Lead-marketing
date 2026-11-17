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
  Trash2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { useOpenMarketing } from '@/lib/open-marketing/context';

export default function OpenMarketingSettingsPage() {
  const {
    dashboardData,
    handleUpdateOutputDir,
    handleSync,
    handleDeleteOutputFile,
    handleClearOutputFiles,
    isSyncing,
  } = useOpenMarketing();

  const syncStatus = dashboardData?.syncStatus || null;

  const [inputPath, setInputPath] = useState(syncStatus?.outputDir || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // File deletion state
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const onConfirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    setFeedback(null);
    try {
      await handleDeleteOutputFile(fileToDelete);
      setFeedback({ type: 'success', message: `Deleted ${fileToDelete} and re-synchronized datasets!` });
      setFileToDelete(null);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || `Failed to delete ${fileToDelete}` });
    } finally {
      setIsDeleting(false);
    }
  };

  const onConfirmClearAll = async () => {
    setIsDeleting(true);
    setFeedback(null);
    try {
      await handleClearOutputFiles();
      setFeedback({ type: 'success', message: 'All output datasets deleted. Directory is clean!' });
      setShowClearModal(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to clear output files' });
    } finally {
      setIsDeleting(false);
    }
  };

  const files = syncStatus?.files ? Object.values(syncStatus.files) : [];
  const duplicatesResolved = syncStatus?.duplicatesResolved || 0;
  const rawRecordsScanned = syncStatus?.rawRecordsScanned || 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Directory Config Section */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
          <HardDrive className="w-5 h-5 text-[#4F46E5]" />
          <h2 className="text-base font-semibold text-[#172033]">Dataset Directory Configuration</h2>
        </div>

        <p className="text-xs text-[#64748B] leading-relaxed">
          The dashboard monitors this directory for JSON and CSV pipeline datasets (e.g.{' '}
          <code className="text-[#172033] bg-[#F1F5F9] px-1.5 py-0.5 rounded font-mono">all_leads*.json</code>,{' '}
          <code className="text-[#172033] bg-[#F1F5F9] px-1.5 py-0.5 rounded font-mono">qualified_leads*.json</code>).
          When new discoveries run, new timestamped output files are created without overwriting old scans, and all duplicates are merged automatically.
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#E2E8F0] gap-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#4F46E5]" />
            <div>
              <h2 className="text-base font-semibold text-[#172033]">Discovered Datasets &amp; Output Files</h2>
              <p className="text-[11px] text-[#64748B]">Manage, inspect, or delete generated output files</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {files.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                disabled={isSyncing || isDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#FEE2E2] text-[#DC2626] text-xs font-medium border border-[#FECACA] transition-colors shadow-sm disabled:opacity-50"
                title="Delete all output files from folder"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All</span>
              </button>
            )}

            <button
              onClick={() => handleSync()}
              disabled={isSyncing || isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] text-xs font-medium border border-[#CBD5E1] transition-colors shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Verifying...' : 'Re-verify Files'}</span>
            </button>
          </div>
        </div>

        {/* Multi-File Deduplication Status Banner */}
        {duplicatesResolved > 0 && (
          <div className="p-3.5 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#4F46E5] text-white flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-[#172033] block">Intelligent Multi-File Deduplication Active</span>
                <span className="text-[#475569] text-[11px] block">
                  Identified and resolved {duplicatesResolved} duplicate records across {files.length} dataset files. Contact info and sources were merged cleanly.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-white border border-[#CBD5E1] text-[#4F46E5] font-semibold text-[11px] shadow-sm shrink-0">
              {rawRecordsScanned} raw records &rarr; {syncStatus?.allLeadsCount} unique leads
            </span>
          </div>
        )}

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
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono">
              {files.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#94A3B8] font-sans">
                    No matching lead files detected in the configured directory.
                  </td>
                </tr>
              ) : (
                files.map((f) => (
                  <tr key={f.filename} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#172033] flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-[#4F46E5] flex-shrink-0" />
                      <span className="truncate max-w-xs" title={f.filename}>{f.filename}</span>
                    </td>
                    <td className="py-3 px-3 text-[#475569] font-sans">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          f.fileType === 'QUALIFIED_LEADS'
                            ? 'bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]'
                            : f.fileType === 'OTHER'
                            ? 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'
                            : 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE]'
                        }`}
                      >
                        {f.fileType === 'QUALIFIED_LEADS' ? 'Qualified' : f.fileType === 'OTHER' ? 'Text Export' : 'All Leads'}
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
                    <td className="py-3 px-3 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => setFileToDelete(f.filename)}
                        disabled={isSyncing || isDeleting}
                        title={`Delete ${f.filename}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[#DC2626] hover:bg-[#FEE2E2] border border-transparent hover:border-[#FECACA] text-xs font-semibold transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
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
        <h3 className="text-sm font-semibold text-[#172033]">Open Marketing Multi-File Architecture</h3>
        <ul className="text-xs text-[#64748B] space-y-2 list-disc list-inside leading-relaxed">
          <li><strong>Persistent Scan Files:</strong> Every new discovery run writes a dedicated timestamped dataset file (e.g. <code className="bg-[#F1F5F9] px-1 rounded text-[#172033]">all_leads_[category]_[area]_[timestamp].json</code>), ensuring previous discovery data is never erased or overwritten.</li>
          <li><strong>Intelligent Cross-File Deduplication:</strong> All files in the output directory are automatically merged. If the same business appears across multiple scans or imports, duplicates are collapsed while combining unique phone numbers, emails, websites, and sources.</li>
          <li><strong>Self-Service File Deletion:</strong> You can delete any individual scan file or clear all files directly from the table above. Deleting a file automatically recalculates lead metrics and removes unwanted data.</li>
        </ul>
      </div>

      {/* Delete Single File Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0 border border-[#FECACA]">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#172033]">Delete Output File</h3>
                <p className="text-xs text-[#64748B]">This file will be permanently removed from disk.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#172033] break-all">
              {fileToDelete}
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Are you sure? Once deleted, the dashboard will immediately re-sync and recalculate your lead database and metrics.
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] border border-[#CBD5E1]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDeleteFile}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm flex items-center gap-1.5"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Files Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 border border-[#FDE68A]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#172033]">Clear All Output Files</h3>
                <p className="text-xs text-[#64748B]">Delete all JSON, CSV, and TXT files in output folder</p>
              </div>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Are you sure you want to delete all <strong>{files.length}</strong> output files? This action will reset the Open Marketing lead database to empty until new discovery scans are executed.
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#475569] hover:bg-[#F1F5F9] border border-[#CBD5E1]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmClearAll}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm flex items-center gap-1.5"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting All...' : 'Yes, Delete All Files'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
