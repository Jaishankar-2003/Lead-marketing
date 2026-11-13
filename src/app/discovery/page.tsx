'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/Header';
import {
  Compass,
  Play,
  Pause,
  RotateCcw,
  Square,
  Sparkles,
  Plus,
  Trash2,
  CheckSquare,
  SquareDashed,
  MapPin,
  Tag,
  RefreshCw,
  Terminal,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';

const PRESET_CITIES = [
  'Madurai',
  'Chennai',
  'Coimbatore',
  'Tiruchirappalli',
  'Salem',
  'Tirunelveli',
  'Erode',
  'Vellore',
  'Dindigul',
  'Thanjavur',
  'Bangalore',
];

const PRESET_CATEGORIES: Record<string, string[]> = {
  'IT Support & PC Repair': [
    'computer repair shops',
    'laptop service centers',
    'PC repair services',
    'computer service centers',
    'hardware service providers',
    'IT support companies',
    'network maintenance services',
    'CCTV and IT hardware',
  ],
  'Website Design & Development': [
    'web design companies',
    'website development companies',
    'digital marketing agencies',
    'software development companies',
    'IT consultants',
    'e-commerce web solutions',
  ],
  'All Target Services': [
    'computer repair shops',
    'laptop service centers',
    'PC repair services',
    'computer service centers',
    'web design companies',
    'website development companies',
    'IT support companies',
    'hardware service providers',
    'IT consultants',
    'software development companies',
  ],
};

export default function LeadDiscoveryPage() {
  const [location, setLocation] = useState('Madurai');
  const [selectedCategory, setSelectedCategory] = useState('All Target Services');
  const [keywords, setKeywords] = useState<string[]>(PRESET_CATEGORIES['All Target Services']);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(
    new Set(PRESET_CATEGORIES['All Target Services'])
  );
  const [customKeyword, setCustomKeyword] = useState('');
  const [maxResults, setMaxResults] = useState('0'); // '0' means unlimited

  // Active Job & Polling
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Poll status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/automation/status');
      const data = await res.json();
      if (data.success) {
        setActiveJob(data.activeJob);
        setRecentJobs(data.recentJobs || []);
      }
    } catch (err) {
      console.error('Failed to poll automation status:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Poll every 2.5 seconds when a job is in progress
    const interval = setInterval(() => {
      fetchStatus();
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Keyword Generation
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    const kwList = PRESET_CATEGORIES[cat] || [];
    setKeywords(kwList);
    setSelectedKeywords(new Set(kwList));
  };

  const handleAddCustomKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customKeyword.trim().toLowerCase();
    if (!clean) return;
    if (keywords.includes(clean)) {
      alert('Keyword already exists in the list.');
      return;
    }
    setKeywords((prev) => [...prev, clean]);
    setSelectedKeywords((prev) => new Set([...prev, clean]));
    setCustomKeyword('');
  };

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      if (next.has(kw)) {
        next.delete(kw);
      } else {
        next.add(kw);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedKeywords(new Set(keywords));
  };

  const handleDeselectAll = () => {
    setSelectedKeywords(new Set());
  };

  const removeKeyword = (kw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== kw));
    setSelectedKeywords((prev) => {
      const next = new Set(prev);
      next.delete(kw);
      return next;
    });
  };

  // Automation Actions
  const handleControlAction = async (action: 'START' | 'PAUSE' | 'RESUME' | 'STOP' | 'RETRY') => {
    try {
      setLoadingAction(true);
      setStatusMessage(null);

      const payload: any = { action };
      if (action === 'START') {
        payload.location = location.trim() || 'Madurai';
        payload.keywords = Array.from(selectedKeywords);
        payload.maxResults = parseInt(maxResults, 10);
      } else {
        payload.jobId = activeJob?.id || recentJobs[0]?.id;
      }

      const res = await fetch('/api/automation/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(data.message || `Action ${action} dispatched.`);
        setTimeout(() => setStatusMessage(null), 4000);
        if (action === 'STOP') {
          setActiveJob(null);
        }
        await fetchStatus();
      } else {
        alert(data.error || `Failed to execute ${action}`);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Progress Calculations
  const progressPercent = useMemo(() => {
    if (!activeJob || activeJob.totalKeywords === 0) return 0;
    return Math.round((activeJob.completedKeywords / activeJob.totalKeywords) * 100);
  }, [activeJob]);

  const isRunning = activeJob?.status === 'RUNNING';
  const isPausing = activeJob?.status === 'PAUSING';
  const isPaused = activeJob?.status === 'PAUSED';
  const isStopping = activeJob?.status === 'STOPPING';

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Lead Discovery & Automation Hub"
        subtitle="Configure target keywords, launch Playwright collection, and monitor real-time lead ingestion"
      />

      {statusMessage && (
        <div className="bg-crm-sky/35 dark:bg-crm-blue/20 border-b border-crm-blue/30 dark:border-crm-periwinkle/30 px-8 py-2 text-xs font-medium text-crm-navy dark:text-crm-sky flex items-center justify-between">
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Real-time Automation Control Banner */}
        <section className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-crm-lightGrey dark:border-crm-sky/20 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-crm-navy dark:text-white tracking-tight">
                  Playwright Automation Worker
                </h2>
                {activeJob ? (
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      isRunning
                        ? 'bg-crm-blue/15 dark:bg-crm-periwinkle/20 text-crm-blue dark:text-crm-periwinkle border-crm-blue/30 dark:border-crm-periwinkle/40 animate-pulse'
                        : isPaused
                        ? 'bg-crm-coral/20 text-crm-navy dark:text-crm-coral border-crm-coral/40'
                        : isStopping || isPausing
                        ? 'bg-crm-indigo/15 dark:bg-crm-indigo/30 text-crm-indigo dark:text-crm-sky border-crm-indigo/30'
                        : 'bg-crm-lightGrey/40 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky border-crm-lightGrey dark:border-crm-sky/25'
                    }`}
                  >
                    {activeJob.status}
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-crm-lightGrey/40 dark:bg-crm-navySurface text-crm-indigo dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25">
                    IDLE (READY TO START)
                  </span>
                )}
              </div>
              <p className="text-xs text-crm-indigo dark:text-crm-sky/80 mt-1">
                Direct background browser automation running with checkpoint persistence
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* START */}
              {(!activeJob || ['COMPLETED', 'STOPPED', 'FAILED'].includes(activeJob.status)) && (
                <button
                  onClick={() => handleControlAction('START')}
                  disabled={loadingAction || selectedKeywords.size === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white font-bold text-xs shadow-lg shadow-crm-blue/25 disabled:opacity-40 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  START COLLECTION ({selectedKeywords.size})
                </button>
              )}

              {/* PAUSE */}
              {isRunning && (
                <button
                  onClick={() => handleControlAction('PAUSE')}
                  disabled={loadingAction}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-crm-coral/20 hover:bg-crm-coral/35 text-crm-navy dark:text-crm-coral border border-crm-coral/50 font-bold text-xs transition"
                >
                  <Pause className="w-3.5 h-3.5" />
                  PAUSE
                </button>
              )}

              {/* RESUME */}
              {isPaused && (
                <button
                  onClick={() => handleControlAction('RESUME')}
                  disabled={loadingAction}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-crm-blue hover:bg-crm-navy text-white font-bold text-xs shadow-lg shadow-crm-blue/25 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  RESUME FROM CHECKPOINT
                </button>
              )}

              {/* STOP */}
              {(isRunning || isPaused || isPausing || isStopping) && (
                <button
                  onClick={() => handleControlAction('STOP')}
                  disabled={loadingAction}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-crm-orangeRed hover:bg-crm-orangeRedDark text-white font-bold text-xs shadow-sm transition"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  {isStopping ? 'FORCE STOP' : 'STOP SAFELY'}
                </button>
              )}

              {/* RETRY */}
              {activeJob?.status === 'FAILED' && (
                <button
                  onClick={() => handleControlAction('RETRY')}
                  disabled={loadingAction}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-crm-indigo hover:bg-crm-navy text-white font-bold text-xs transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  RETRY JOB
                </button>
              )}
            </div>
          </div>

          {/* Live Progress Bar & Active State */}
          {activeJob ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-crm-indigo dark:text-crm-sky/80">
                    Current Keyword:{' '}
                    <strong className="text-crm-navy dark:text-white font-semibold">
                      {activeJob.currentKeyword || 'Initializing search feed...'}
                    </strong>
                  </span>
                  <span className="text-crm-blue dark:text-crm-periwinkle font-bold">
                    {activeJob.completedKeywords} / {activeJob.totalKeywords} Keywords ({progressPercent}%)
                  </span>
                </div>

                <div className="w-full h-2.5 bg-crm-lightGrey dark:bg-crm-navyDeep rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-crm-blue via-crm-periwinkle to-crm-indigo rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Live Metric Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                  <span className="text-crm-indigo dark:text-crm-sky/80 block font-medium">Total Discovered</span>
                  <span className="text-xl font-bold text-crm-navy dark:text-white mt-1 block">
                    {activeJob.totalDiscovered}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                  <span className="text-crm-indigo dark:text-crm-sky/80 block font-medium">New Leads Saved</span>
                  <span className="text-xl font-bold text-crm-blue dark:text-crm-periwinkle mt-1 block">
                    {activeJob.newLeadsSaved}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                  <span className="text-crm-indigo dark:text-crm-sky/80 block font-medium">Duplicates Skipped</span>
                  <span className="text-xl font-bold text-crm-coral mt-1 block">
                    {activeJob.duplicatesSkipped}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
                  <span className="text-crm-indigo dark:text-crm-sky/80 block font-medium">Failed / Skipped</span>
                  <span className="text-xl font-bold text-crm-orangeRed dark:text-crm-coral mt-1 block">
                    {activeJob.failedRecords}
                  </span>
                </div>
              </div>

              {/* Live Activity Log Terminal */}
              <div className="rounded-xl bg-crm-navyDeep border border-crm-sky/20 p-3 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-crm-sky/80 text-[10px] pb-1 border-b border-crm-sky/15">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-crm-periwinkle" /> Worker Activity Stream
                  </span>
                  <span>Auto-updating</span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 text-crm-sky">
                  {activeJob.logs && Array.isArray(activeJob.logs) && activeJob.logs.length > 0 ? (
                    activeJob.logs.map((log: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-crm-sky/60 shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`font-semibold shrink-0 uppercase text-[10px] ${
                            log.level === 'error'
                              ? 'text-crm-orangeRed'
                              : log.level === 'warn'
                              ? 'text-crm-coral'
                              : 'text-crm-periwinkle'
                          }`}
                        >
                          [{log.level}]
                        </span>
                        <span>{log.message}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-crm-sky/60">Waiting for automation output logs...</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 border border-crm-lightGrey dark:border-crm-sky/20 text-xs text-crm-indigo dark:text-crm-sky flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
                <span>No active discovery job running. Select keywords below and click Start.</span>
              </div>
              <span className="text-[11px] text-crm-indigo/80 dark:text-crm-sky/75">Worker Status: Ready</span>
            </div>
          )}
        </section>

        {/* Configuration Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings Column (1/3) */}
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-5">
              <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
                Target Geography &amp; Location
              </h3>

              {/* Custom City / Market Location Input */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-crm-navy dark:text-crm-sky flex items-center justify-between">
                  <span>City / Market Location</span>
                  <span className="text-[10px] text-crm-blue dark:text-crm-periwinkle font-semibold uppercase">
                    Active: {location || 'Madurai'}
                  </span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter city or area (e.g. Madurai, Anna Nagar, Chennai)..."
                    className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs font-semibold text-crm-navy dark:text-white placeholder-crm-indigo/50 dark:placeholder-crm-sky/45 focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle shadow-inner"
                  />
                </div>

                {/* Quick Select Presets */}
                <div>
                  <span className="text-[10px] text-crm-indigo dark:text-crm-sky/80 block font-medium mb-1.5">
                    Quick Select Cities:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_CITIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setLocation(c)}
                        className={`px-2 py-1 rounded-md text-[10px] font-medium transition ${
                          location.toLowerCase() === c.toLowerCase()
                            ? 'bg-crm-blue text-white shadow-xs'
                            : 'bg-crm-lightGrey/40 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky hover:bg-crm-sky/40 dark:hover:text-white border border-crm-lightGrey dark:border-crm-sky/20'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-crm-indigo dark:text-crm-sky/80 mt-1">
                  Google Maps query will search: <strong className="text-crm-navy dark:text-white">&ldquo;[Keyword] in {location}&rdquo;</strong>
                </p>
              </div>

              {/* Leads Limit Per Keyword */}
              <div className="pt-3 border-t border-crm-lightGrey dark:border-crm-sky/20">
                <label className="block text-xs font-medium text-crm-navy dark:text-crm-sky mb-1.5 flex items-center justify-between">
                  <span>Leads Limit per Keyword</span>
                  <span className="text-[10px] text-crm-blue dark:text-crm-periwinkle font-bold uppercase">
                    {maxResults === '0' ? 'Unlimited' : `${maxResults} Max`}
                  </span>
                </label>
                <select
                  value={maxResults}
                  onChange={(e) => setMaxResults(e.target.value)}
                  className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs font-semibold text-crm-navy dark:text-white focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                >
                  <option value="0">Unlimited (Extract All Available on Maps)</option>
                  <option value="50">50 Leads per keyword</option>
                  <option value="100">100 Leads per keyword</option>
                  <option value="200">200 Leads per keyword</option>
                  <option value="20">20 Leads (Fast Test)</option>
                </select>
                <p className="mt-1 text-[11px] text-crm-indigo dark:text-crm-sky/80">
                  {maxResults === '0'
                    ? 'Playwright will scroll Google Maps until the end of the results feed.'
                    : `Stops after collecting ${maxResults} unique business leads per keyword.`}
                </p>
              </div>

              {/* Service Category Presets */}
              <div className="pt-3 border-t border-crm-lightGrey dark:border-crm-sky/20">
                <label className="block text-xs font-medium text-crm-navy dark:text-crm-sky mb-1.5">
                  Service Category Preset
                </label>
                <div className="space-y-1.5">
                  {Object.keys(PRESET_CATEGORIES).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition ${
                        selectedCategory === cat
                          ? 'bg-crm-sky/40 dark:bg-crm-blue/30 text-crm-navy dark:text-white border border-crm-blue/40 dark:border-crm-periwinkle/40'
                          : 'bg-crm-lightGrey/25 dark:bg-crm-navyDeep/60 text-crm-indigo dark:text-crm-sky/80 hover:bg-crm-sky/25 dark:hover:bg-crm-navySurface border border-crm-lightGrey dark:border-crm-sky/20'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Add Custom Keyword */}
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
              <h3 className="text-sm font-bold text-crm-navy dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
                Add Custom Keyword
              </h3>

              <form onSubmit={handleAddCustomKeyword} className="space-y-2">
                <input
                  type="text"
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value)}
                  placeholder="e.g. printer repair service"
                  className="w-full px-3 py-2 bg-crm-lightGrey/20 dark:bg-crm-navyDeep border border-crm-lightGrey dark:border-crm-sky/25 rounded-lg text-xs text-crm-navy dark:text-white placeholder-crm-indigo/50 dark:placeholder-crm-sky/45 focus:outline-none focus:border-crm-blue dark:focus:border-crm-periwinkle"
                />
                <button
                  type="submit"
                  disabled={!customKeyword.trim()}
                  className="w-full py-2 bg-crm-sky/40 hover:bg-crm-sky/70 dark:bg-crm-navySurface dark:hover:bg-crm-navyElevated disabled:opacity-40 text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25 text-xs font-semibold rounded-lg transition"
                >
                  Add Keyword
                </button>
              </form>
            </div>
          </div>

          {/* Keywords Selection List (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
              <div className="flex items-center justify-between border-b border-crm-lightGrey dark:border-crm-sky/20 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-crm-navy dark:text-white">Selected Search Queries</h3>
                  <p className="text-xs text-crm-indigo dark:text-crm-sky/80 mt-0.5">
                    {selectedKeywords.size} of {keywords.length} keywords selected for automation
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2.5 py-1 rounded-md bg-crm-sky/35 dark:bg-crm-navySurface hover:bg-crm-sky/60 dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky text-xs font-medium border border-crm-lightGrey dark:border-crm-sky/25 transition"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 rounded-md bg-crm-sky/35 dark:bg-crm-navySurface hover:bg-crm-sky/60 dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky text-xs font-medium border border-crm-lightGrey dark:border-crm-sky/25 transition"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Keyword List Pills */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {keywords.map((kw) => {
                  const isChecked = selectedKeywords.has(kw);
                  return (
                    <div
                      key={kw}
                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                        isChecked
                          ? 'bg-crm-sky/30 dark:bg-crm-navySurface border-crm-blue/40 dark:border-crm-periwinkle/40 text-crm-navy dark:text-white'
                          : 'bg-white dark:bg-crm-navyDeep/50 border-crm-lightGrey dark:border-crm-sky/20 text-crm-indigo/70 dark:text-crm-sky/60'
                      }`}
                    >
                      <div
                        onClick={() => toggleKeyword(kw)}
                        className="flex items-center gap-3 cursor-pointer flex-1"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleKeyword(kw)}
                          className="rounded border-crm-lightGrey dark:border-crm-sky/30 bg-white dark:bg-crm-navyDeep text-crm-blue accent-crm-blue focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-semibold capitalize text-crm-navy dark:text-white">{kw}</span>
                          <span className="text-[11px] text-crm-indigo dark:text-crm-sky/75 block">
                            Query: &ldquo;{kw} in {location}&rdquo;
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => removeKeyword(kw)}
                        className="p-1.5 text-crm-indigo/70 dark:text-crm-sky/70 hover:text-crm-orangeRed dark:hover:text-crm-coral transition"
                        title="Remove keyword"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Discovery History */}
            <div className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-crm-navy dark:text-white">Recent Discovery Jobs</h3>
                {recentJobs.length > 0 && (
                  <span className="text-[11px] font-medium text-crm-indigo dark:text-crm-sky/80">
                    {recentJobs.length} {recentJobs.length === 1 ? 'job' : 'jobs'} logged
                  </span>
                )}
              </div>
              {recentJobs.length === 0 ? (
                <p className="text-xs text-crm-indigo dark:text-crm-sky/80 py-3">No previous jobs found.</p>
              ) : (
                <div className="divide-y divide-crm-lightGrey/80 dark:divide-crm-sky/15 text-xs max-h-[460px] overflow-y-auto pr-1.5">
                  {recentJobs.map((job) => (
                    <div key={job.id} className="py-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <p className="font-semibold text-crm-navy dark:text-white">
                            {job.location} &bull; {job.totalKeywords} Keyword{job.totalKeywords > 1 ? 's' : ''}
                          </p>
                          <p className="text-[11px] text-crm-indigo dark:text-crm-sky/80">
                            Saved: <strong className="text-crm-blue dark:text-crm-periwinkle">{job.newLeadsSaved}</strong> |
                            Duplicates: {job.duplicatesSkipped} | Discovered: {job.totalDiscovered}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              job.status === 'COMPLETED'
                                ? 'bg-crm-sky/35 text-crm-navy dark:bg-crm-blue/25 dark:text-crm-sky border-crm-blue/30 dark:border-crm-periwinkle/30'
                                : job.status === 'FAILED'
                                ? 'bg-crm-orangeRed/15 text-crm-orangeRed dark:text-crm-coral border-crm-orangeRed/30'
                                : job.status === 'PAUSED'
                                ? 'bg-crm-coral/20 text-crm-navy dark:text-crm-coral border-crm-coral/40'
                                : 'bg-crm-lightGrey/50 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky border-crm-lightGrey dark:border-crm-sky/25'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>
                      </div>

                      {/* Executed Keywords Display with horizontal scroll */}
                      {job.selectedKeywords && job.selectedKeywords.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-crm-indigo dark:text-crm-sky/80 block">
                            Search Keywords ({job.selectedKeywords.length}):
                          </span>
                          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1.5 pt-0.5 scrollbar-thin">
                            {job.selectedKeywords.map((kw: string, i: number) => (
                              <span
                                key={i}
                                className="shrink-0 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-crm-sky/35 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky border border-crm-periwinkle/40 dark:border-crm-sky/25 whitespace-nowrap shadow-2xs"
                              >
                                &ldquo;{kw}&rdquo;
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
