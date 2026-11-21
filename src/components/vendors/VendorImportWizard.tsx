'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Columns,
  Layers,
  ShieldCheck,
  RefreshCw,
  Info,
  Check,
  Download,
} from 'lucide-react';
import { downloadSampleFile } from '@/lib/vendors/sampleTemplates';

interface UploadResponse {
  success: boolean;
  batchId: string;
  fileName: string;
  fileSize: number;
  sheetNames: string[];
  activeSheet: string;
  detectedLayout: string;
  sections: Array<{
    index: number;
    title?: string;
    startCol: number;
    endCol: number;
    headerRow: number;
    headers: Record<string, string>;
    detectedLocation?: {
      city?: string;
      state?: string;
      areaMarket?: string;
    };
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    warningRows: number;
    exactDuplicates: number;
    highMatches: number;
    newRecords: number;
  };
  sampleRows: Array<{
    rowNumber: number;
    sectionTitle?: string;
    name: string;
    phoneRaw: string;
    phones: Array<{ normalized: string; nationalFormat: string; type: string; canWhatsApp: boolean; label?: string }>;
    city?: string;
    state?: string;
    areaMarket?: string;
    address?: string;
    categories: string[];
    matchReason: string;
    matchDescription: string;
    existingVendorName?: string;
    existingVendorLocation?: string;
    suggestedAction: string;
  }>;
}

interface VendorImportWizardProps {
  onImportComplete: () => void;
  onNavigateTab: (tab: 'directory' | 'duplicates') => void;
}

export default function VendorImportWizard({
  onImportComplete,
  onNavigateTab,
}: VendorImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<'UPDATE_EXISTING' | 'SKIP_DUPLICATES' | 'MANUAL_REVIEW' | 'ADD_NEW'>('UPDATE_EXISTING');
  const [commitResult, setCommitResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
    }
  };

  const handleUploadAndAnalyze = async (sheetName?: string) => {
    if (!file) return;

    try {
      setUploading(true);
      setErrorMsg(null);
      const formData = new FormData();
      formData.append('file', file);
      if (sheetName) {
        formData.append('sheet', sheetName);
      }

      const res = await fetch('/api/vendors/import/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to analyze spreadsheet.');
        return;
      }

      setUploadData(data);
      setSelectedSheet(data.activeSheet);
      setCurrentStep(2);
    } catch (err: any) {
      console.error('Error analyzing spreadsheet:', err);
      setErrorMsg(err.message || 'An error occurred during file analysis.');
    } finally {
      setUploading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!uploadData?.batchId) return;

    try {
      setCommitting(true);
      setErrorMsg(null);
      const res = await fetch('/api/vendors/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: uploadData.batchId,
          mode: selectedMode,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to commit import.');
        return;
      }

      setCommitResult(data.summary);
      setCurrentStep(6);
      onImportComplete();
    } catch (err: any) {
      console.error('Error committing import:', err);
      setErrorMsg(err.message || 'Failed to commit import.');
    } finally {
      setCommitting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Upload File' },
    { num: 2, label: 'Layout Detection' },
    { num: 3, label: 'Section Mapping' },
    { num: 4, label: 'Duplicate Check' },
    { num: 5, label: 'Import Mode' },
    { num: 6, label: 'Completed' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Step Progress Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => {
            const isCurrent = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            return (
              <div key={s.num} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                      isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-crm-blue text-white ring-4 ring-crm-blue/20'
                        : 'bg-crm-sky/30 dark:bg-crm-navySurface text-crm-indigo dark:text-crm-lightGrey/60'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span
                    className={`text-xs hidden md:inline font-semibold ${
                      isCurrent
                        ? 'text-crm-navy dark:text-white'
                        : isCompleted
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-crm-indigo/60 dark:text-crm-lightGrey/50'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 hidden sm:block ${
                      isCompleted ? 'bg-emerald-500' : 'bg-crm-lightGrey dark:bg-crm-sky/15'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-crm-orangeRed/10 border border-crm-orangeRed/30 text-xs text-crm-orangeRed dark:text-crm-coral flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: FILE UPLOAD */}
      {currentStep === 1 && (
        <div className="p-8 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 text-center space-y-6">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base font-bold text-crm-navy dark:text-white">
              Upload Hardware Vendor Spreadsheet
            </h3>
            <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/80">
              Supports Excel (.xlsx, .xls) and CSV (.csv). Automatically detects multiple side-by-side city sections, mixed mobile & STD landline numbers, and duplicate phone numbers.
            </p>
          </div>

          <div className="max-w-lg mx-auto border-2 border-dashed border-crm-lightGrey dark:border-crm-sky/30 rounded-2xl p-8 hover:border-crm-blue transition bg-crm-sky/10 dark:bg-crm-navySurface/40">
            <UploadCloud className="w-12 h-12 mx-auto text-crm-blue dark:text-crm-sky mb-3" />
            <input
              type="file"
              id="vendor-excel-upload"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="vendor-excel-upload"
              className="px-4 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-semibold cursor-pointer shadow-sm transition inline-block"
            >
              Choose Spreadsheet File
            </label>
            <p className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/60 mt-2">
              {file ? file.name : 'No file chosen yet (Max 15MB)'}
            </p>
          </div>

          {/* Sample Template Downloads */}
          <div className="max-w-lg mx-auto p-4 rounded-2xl bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20 text-left space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-crm-navy dark:text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Download Ready-to-Use Sample Templates
              </span>
              <span className="text-[10px] text-crm-indigo dark:text-crm-lightGrey/60 font-semibold">
                Pre-formatted as per parser
              </span>
            </div>
            <p className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/75">
              Not sure about the required spreadsheet format? Download our pre-formatted templates with realistic Indian computer hardware vendor data:
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => downloadSampleFile('xlsx')}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                title="Download standard vendor list in Excel format (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                Sample Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => downloadSampleFile('csv')}
                className="px-3 py-1.5 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                title="Download standard vendor list in CSV format (.csv)"
              >
                <Download className="w-3.5 h-3.5" />
                Sample CSV (.csv)
              </button>
              <button
                type="button"
                onClick={() => downloadSampleFile('multi-section')}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                title="Download horizontal side-by-side city sections format (Madurai, Coimbatore, Bangalore in columns)"
              >
                <Download className="w-3.5 h-3.5" />
                Multi-City Section (.xlsx)
              </button>
            </div>
          </div>

          {file && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => handleUploadAndAnalyze()}
                disabled={uploading}
                className="px-6 py-2.5 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing Sheet & Duplicates...
                  </>
                ) : (
                  <>
                    Analyze Structure & Duplicates
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: LAYOUT DETECTION REVIEW */}
      {currentStep === 2 && uploadData && (
        <div className="p-6 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-6">
          <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/15 pb-4">
            <div>
              <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-crm-blue" />
                Sheet Structure & Layout Auto-Detection
              </h3>
              <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/75 mt-0.5">
                File: <strong className="text-crm-navy dark:text-white">{uploadData.fileName}</strong> | Layout:{' '}
                <span className="px-2 py-0.5 rounded bg-crm-sky/30 dark:bg-crm-blue/20 text-crm-blue font-mono font-bold">
                  {uploadData.detectedLayout}
                </span>
              </p>
            </div>

            {uploadData.sheetNames.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <label className="font-semibold text-crm-indigo dark:text-crm-lightGrey">Sheet:</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => {
                    setSelectedSheet(e.target.value);
                    void handleUploadAndAnalyze(e.target.value);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-crm-sky/15 dark:bg-crm-navySurface border border-crm-lightGrey text-xs"
                >
                  {uploadData.sheetNames.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Sections overview */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-crm-navy dark:text-white uppercase tracking-wider">
              Detected Sections ({uploadData.sections.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {uploadData.sections.map((sec) => (
                <div
                  key={sec.index}
                  className="p-3.5 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface/50 border border-crm-lightGrey dark:border-crm-sky/15 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-crm-navy dark:text-white">
                      {sec.title || `Section ${sec.index + 1}`}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-crm-blue/10 text-crm-blue font-mono text-[10px]">
                      Cols {sec.startCol + 1}–{sec.endCol + 1}
                    </span>
                  </div>
                  {sec.detectedLocation && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Auto-detected location: {sec.detectedLocation.areaMarket || sec.detectedLocation.city || 'India'}
                    </div>
                  )}
                  <div className="text-[10px] text-crm-indigo dark:text-crm-lightGrey/70">
                    Headers: {Object.values(sec.headers).join(', ') || 'Auto-indexed'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-crm-lightGrey dark:border-crm-sky/15">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl border border-crm-lightGrey dark:border-crm-sky/20 text-xs font-semibold hover:bg-crm-sky/20 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              Continue to Mapping <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SECTION MAPPING REVIEW */}
      {currentStep === 3 && uploadData && (
        <div className="p-6 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-6">
          <div className="border-b border-crm-lightGrey dark:border-crm-sky/15 pb-3">
            <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
              <Columns className="w-4 h-4 text-crm-blue" />
              Field and Column Assignment Review
            </h3>
            <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/75 mt-0.5">
              Verified mapping of business names, phone numbers, addresses, and component categories.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <p className="font-semibold">Automatic Field Alignment Succeeded</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                All {uploadData.sections.length} detected section(s) have verified mappings for vendor name, contact phone (supporting mobile & landlines), and locality.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-crm-lightGrey dark:border-crm-sky/15">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl border border-crm-lightGrey text-xs font-semibold hover:bg-crm-sky/20 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              Review Duplicate Analysis <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DUPLICATE CHECK & PREVIEW */}
      {currentStep === 4 && uploadData && (
        <div className="p-6 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-6">
          <div className="border-b border-crm-lightGrey dark:border-crm-sky/15 pb-3">
            <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-crm-blue" />
              Duplicate Engine & Data Validation
            </h3>
            <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/75 mt-0.5">
              Phone digits and trade names matched against existing vendors in the database and within this file.
            </p>
          </div>

          {/* Stats Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-crm-sky/10 dark:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/15">
              <div className="text-[11px] text-crm-indigo dark:text-crm-lightGrey/75">Total Rows Found</div>
              <div className="text-xl font-bold text-crm-navy dark:text-white mt-1">
                {uploadData.summary.totalRows}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400">Clean New Records</div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {uploadData.summary.newRecords}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
              <div className="text-[11px] text-amber-700 dark:text-amber-400">Exact / High Matches</div>
              <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                {uploadData.summary.exactDuplicates + uploadData.summary.highMatches}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/30">
              <div className="text-[11px] text-purple-700 dark:text-purple-400">Warnings / Incomplete</div>
              <div className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                {uploadData.summary.warningRows}
              </div>
            </div>
          </div>

          {/* Sample Rows Preview Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-crm-navy dark:text-white uppercase tracking-wider">
              Preview Extracted Records (Sample 50 Rows)
            </h4>
            <div className="max-h-80 overflow-y-auto border border-crm-lightGrey dark:border-crm-sky/20 rounded-xl overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-crm-sky/20 dark:bg-crm-navySurface text-[10px] font-bold text-crm-indigo dark:text-crm-periwinkle uppercase sticky top-0 border-b border-crm-lightGrey dark:border-crm-sky/15">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Vendor / Shop Name</th>
                    <th className="py-2.5 px-3">Extracted Phone(s)</th>
                    <th className="py-2.5 px-3">Location / Market</th>
                    <th className="py-2.5 px-3">Duplicate Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-crm-lightGrey dark:divide-crm-sky/10">
                  {uploadData.sampleRows.map((r, i) => (
                    <tr key={i} className="hover:bg-crm-sky/10 dark:hover:bg-crm-navySurface/40">
                      <td className="py-2 px-3 font-mono text-[10px] text-crm-indigo">#{r.rowNumber}</td>
                      <td className="py-2 px-3 font-semibold text-crm-navy dark:text-white">{r.name}</td>
                      <td className="py-2 px-3">
                        {r.phones && r.phones.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {r.phones.map((p, pIdx) => (
                              <span
                                key={pIdx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-crm-sky/30 dark:bg-crm-navySurface text-[10.5px] font-mono text-crm-navy dark:text-white"
                              >
                                <span>{p.nationalFormat || p.normalized}</span>
                                {p.label && <span className="text-[9px] text-crm-indigo font-sans">({p.label})</span>}
                                {p.canWhatsApp && (
                                  <span className="px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[8.5px] font-bold">
                                    WA
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="font-mono text-[11px] text-crm-indigo/70">{r.phoneRaw || 'None'}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-crm-indigo dark:text-crm-lightGrey">
                        {r.areaMarket ? `${r.areaMarket}, ` : ''}{r.city || 'India'}
                      </td>
                      <td className="py-2 px-3">
                        {r.matchReason === 'NONE' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                            New Vendor
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-semibold"
                            title={r.matchDescription}
                          >
                            {r.matchReason.replace(/_/g, ' ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-crm-lightGrey dark:border-crm-sky/15">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl border border-crm-lightGrey text-xs font-semibold hover:bg-crm-sky/20 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              className="px-5 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              Select Import Mode <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: IMPORT MODE SELECTION */}
      {currentStep === 5 && uploadData && (
        <div className="p-6 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 space-y-6">
          <div className="border-b border-crm-lightGrey dark:border-crm-sky/15 pb-3">
            <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-crm-blue" />
              Choose Import & Deduplication Strategy
            </h3>
            <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/75 mt-0.5">
              Select how to handle records with matching phone numbers or existing vendor names.
            </p>
          </div>

          <div className="space-y-3">
            {/* Option 1: Update Existing */}
            <label
              className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                selectedMode === 'UPDATE_EXISTING'
                  ? 'border-crm-blue bg-crm-sky/20 dark:bg-crm-blue/15'
                  : 'border-crm-lightGrey dark:border-crm-sky/15 hover:bg-crm-sky/10'
              }`}
            >
              <input
                type="radio"
                name="importMode"
                checked={selectedMode === 'UPDATE_EXISTING'}
                onChange={() => setSelectedMode('UPDATE_EXISTING')}
                className="mt-1"
              />
              <div className="space-y-1 text-xs">
                <span className="font-bold text-crm-navy dark:text-white">
                  Update Existing Vendors & Import New (Recommended)
                </span>
                <p className="text-crm-indigo dark:text-crm-lightGrey/70">
                  Adds any new phone numbers, address lines, or categories to matching existing vendors, while creating fresh profiles for new vendors.
                </p>
              </div>
            </label>

            {/* Option 2: Skip Duplicates */}
            <label
              className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                selectedMode === 'SKIP_DUPLICATES'
                  ? 'border-crm-blue bg-crm-sky/20 dark:bg-crm-blue/15'
                  : 'border-crm-lightGrey dark:border-crm-sky/15 hover:bg-crm-sky/10'
              }`}
            >
              <input
                type="radio"
                name="importMode"
                checked={selectedMode === 'SKIP_DUPLICATES'}
                onChange={() => setSelectedMode('SKIP_DUPLICATES')}
                className="mt-1"
              />
              <div className="space-y-1 text-xs">
                <span className="font-bold text-crm-navy dark:text-white">
                  Skip Duplicates (Import Clean New Records Only)
                </span>
                <p className="text-crm-indigo dark:text-crm-lightGrey/70">
                  Strict mode. Ignores any row matching an existing phone number or vendor name without making any changes to existing records.
                </p>
              </div>
            </label>

            {/* Option 3: Manual Review */}
            <label
              className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                selectedMode === 'MANUAL_REVIEW'
                  ? 'border-crm-blue bg-crm-sky/20 dark:bg-crm-blue/15'
                  : 'border-crm-lightGrey dark:border-crm-sky/15 hover:bg-crm-sky/10'
              }`}
            >
              <input
                type="radio"
                name="importMode"
                checked={selectedMode === 'MANUAL_REVIEW'}
                onChange={() => setSelectedMode('MANUAL_REVIEW')}
                className="mt-1"
              />
              <div className="space-y-1 text-xs">
                <span className="font-bold text-crm-navy dark:text-white">
                  Queue Duplicates for Manual Side-by-Side Review
                </span>
                <p className="text-crm-indigo dark:text-crm-lightGrey/70">
                  Imports clear new vendors immediately, and sends duplicate matches to the dedicated Duplicate Review screen for individual human decisions.
                </p>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-crm-lightGrey dark:border-crm-sky/15">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 rounded-xl border border-crm-lightGrey text-xs font-semibold hover:bg-crm-sky/20 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button
              onClick={handleCommitImport}
              disabled={committing}
              className="px-6 py-2.5 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              {committing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Importing Vendors...
                </>
              ) : (
                <>
                  Commit & Save Vendors
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: IMPORT RESULTS & SUMMARY */}
      {currentStep === 6 && commitResult && (
        <div className="p-8 rounded-2xl bg-white dark:bg-crm-navy border border-crm-lightGrey dark:border-crm-sky/20 text-center space-y-6">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-crm-navy dark:text-white">
              Vendors Imported Successfully!
            </h3>
            <p className="text-xs text-crm-indigo dark:text-crm-lightGrey/80">
              Your hardware vendor directory has been updated with the parsed and deduplicated records.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-xs">
            <div className="p-3.5 rounded-xl bg-crm-sky/15 dark:bg-crm-navySurface">
              <span className="text-crm-indigo dark:text-crm-lightGrey/70">New Vendors</span>
              <p className="text-xl font-bold text-crm-navy dark:text-white mt-1">
                {commitResult.importedCount}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
              <span className="text-emerald-700 dark:text-emerald-400">Updated</span>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                {commitResult.updatedCount}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20">
              <span className="text-amber-700 dark:text-amber-400">Skipped</span>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                {commitResult.skippedCount}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/20">
              <span className="text-purple-700 dark:text-purple-400">Review Queue</span>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                {commitResult.reviewCount}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              onClick={() => onNavigateTab('directory')}
              className="px-5 py-2.5 rounded-xl bg-crm-blue hover:bg-crm-navy text-white text-xs font-bold shadow-sm transition"
            >
              Go to Vendors Directory
            </button>
            {commitResult.reviewCount > 0 && (
              <button
                onClick={() => onNavigateTab('duplicates')}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm transition"
              >
                Review Pending Duplicates ({commitResult.reviewCount})
              </button>
            )}
            <button
              onClick={() => {
                setFile(null);
                setUploadData(null);
                setCommitResult(null);
                setCurrentStep(1);
              }}
              className="px-4 py-2.5 rounded-xl border border-crm-lightGrey text-xs font-semibold hover:bg-crm-sky/20 transition"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
