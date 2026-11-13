'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Compass,
  Play,
  Square,
  Terminal,
  Copy,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  ShieldCheck,
  EyeOff,
  Eye,
  Building,
  Target,
  RefreshCw,
} from 'lucide-react';
import { openMarketingApi } from '@/lib/open-marketing/api';
import { DiscoveryJobState, DiscoveryJobStatus, BrowserExecutionMode } from '@/types/open-marketing';

const PRESET_CATEGORIES = [
  'Chartered Accountants',
  'Computer Repair Shops',
  'Schools & Preschools',
  'Medical Clinics',
  'Web Design Companies',
  'Hardware Stores',
];

const PRESET_AREAS = [
  'Anna Nagar',
  'KK Nagar',
  'Simmakkal',
  'Goripalayam',
  'Tallakulam',
  'Mattuthavani',
];

export default function OpenMarketingDiscoveryPage() {
  const [category, setCategory] = useState('Chartered Accountants');
  const [area, setArea] = useState('Anna Nagar');
  const [city, setCity] = useState('Madurai');
  const [browserMode, setBrowserMode] = useState<BrowserExecutionMode>('headless');

  const [jobState, setJobState] = useState<DiscoveryJobState>({
    jobId: null,
    status: 'IDLE',
    category: '',
    area: '',
    city: '',
    startTime: null,
    endTime: null,
    elapsedSeconds: 0,
    logs: [],
    counters: {
      discoveredCount: 0,
      processedCount: 0,
      qualifiedCount: 0,
      errorCount: 0,
    },
    error: null,
    command: '',
    headless: true,
    browserMode: 'headless',
  });

  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const logBoxRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const commandString = `npm run discover -- --category "${category}" --area "${area}" --city "${city}" --browser-mode ${browserMode}`;

  const copyCommand = () => {
    navigator.clipboard.writeText(commandString);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const state = await openMarketingApi.getDiscoveryStatus();
      setJobState(state);
      setActionError(null);
    } catch (err: any) {
      console.warn('Discovery status poll warning:', err.message);
    }
  }, []);

  // Polling loop when job is active
  useEffect(() => {
    fetchStatus();

    const isJobActive = jobState.status === 'RUNNING' || jobState.status === 'STOPPING' || jobState.status === 'QUEUED';

    if (isJobActive) {
      pollTimerRef.current = setInterval(() => {
        fetchStatus();
      }, 1500);
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [fetchStatus, jobState.status]);

  // Auto-scroll log box
  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [jobState.logs]);

  const handleStartDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim() || !area.trim()) return;

    setIsStarting(true);
    setActionError(null);

    try {
      const res = await openMarketingApi.runDiscovery({ category, area, city, browserMode });
      if (res.job) {
        setJobState(res.job);
      }
      await fetchStatus();
    } catch (err: any) {
      setActionError(err.message || 'Failed to start discovery execution');
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopDiscovery = async () => {
    if (jobState.status !== 'RUNNING' && jobState.status !== 'STOPPING') return;

    setIsStopping(true);
    setActionError(null);

    try {
      const res = await openMarketingApi.stopDiscovery();
      if (res.job) {
        setJobState(res.job);
      }
      await fetchStatus();
    } catch (err: any) {
      setActionError(err.message || 'Failed to stop discovery');
    } finally {
      setIsStopping(false);
    }
  };

  const isRunning = jobState.status === 'RUNNING';
  const isStoppingState = jobState.status === 'STOPPING';
  const isBusy = isRunning || isStoppingState || isStarting;

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#4F46E5] mb-1">
              <Compass className="w-4 h-4" />
              <span>Headless Automation Engine</span>
            </div>
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">
              Business Discovery &amp; Web Presence Scraper
            </h1>
            <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
              Harvest local business leads across Google Maps and directories in the background. Playwright automation runs in <strong>Headless Mode</strong> without displaying visible browser windows.
            </p>
          </div>

          <Link
            href="/open-marketing/leads"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#172033] text-xs font-semibold border border-[#CBD5E1] transition-all shrink-0"
          >
            <Layers className="w-4 h-4 text-[#4F46E5]" />
            <span>View All Discovered Leads</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Main Grid: Parameters Form & Live Process Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-bold text-[#172033] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#4F46E5]" />
              <span>Discovery Parameters</span>
            </h2>
            <span className="text-[11px] font-medium text-[#64748B] flex items-center gap-1.5">
              {browserMode === 'headless' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                  <EyeOff className="w-3 h-3 text-[#16A34A]" />
                  Headless Mode
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                  <Eye className="w-3 h-3 text-[#7C3AED]" />
                  Headed Mode
                </>
              )}
            </span>
          </div>

          <form onSubmit={handleStartDiscovery} className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Business Category / Keyword:
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isBusy}
                placeholder="e.g. Chartered Accountants, Schools, Clinics"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] text-xs focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-[#94A3B8] self-center mr-1">Presets:</span>
                {PRESET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setCategory(cat)}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] border border-[#E2E8F0] transition-all disabled:opacity-50"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Area */}
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Target Locality / Area:
              </label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                disabled={isBusy}
                placeholder="e.g. Anna Nagar, KK Nagar, Goripalayam"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] text-xs focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] text-[#94A3B8] self-center mr-1">Local Areas:</span>
                {PRESET_AREAS.map((ar) => (
                  <button
                    key={ar}
                    type="button"
                    disabled={isBusy}
                    onClick={() => setArea(ar)}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#475569] border border-[#E2E8F0] transition-all disabled:opacity-50"
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                City / Region:
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={isBusy}
                placeholder="Madurai"
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-[#172033] text-xs focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Browser Execution Mode Selection */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#172033]">
                  Browser Execution Mode:
                </label>
                <span className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold">
                  {browserMode === 'headless' ? 'Background Automation' : 'Live Interactive Window'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Headless Mode */}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setBrowserMode('headless')}
                  className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    browserMode === 'headless'
                      ? 'bg-[#EEF2FF] border-[#4F46E5] ring-1 ring-[#4F46E5] shadow-sm'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F1F5F9]'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-lg ${
                            browserMode === 'headless'
                              ? 'bg-[#4F46E5] text-white shadow-sm'
                              : 'bg-white border border-[#E2E8F0] text-[#64748B]'
                          }`}
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            browserMode === 'headless' ? 'text-[#172033]' : 'text-[#475569]'
                          }`}
                        >
                          Headless Mode
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          browserMode === 'headless'
                            ? 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]'
                            : 'bg-white text-[#64748B] border border-[#E2E8F0]'
                        }`}
                      >
                        Default
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-snug">
                      Runs Playwright Chromium silently in the background. No visible browser window. Suitable for normal automated discovery.
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-[#4F46E5] font-medium flex items-center gap-1">
                    <span>headless: true</span>
                  </div>
                </button>

                {/* Option 2: Headed Mode */}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setBrowserMode('headed')}
                  className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    browserMode === 'headed'
                      ? 'bg-[#EEF2FF] border-[#4F46E5] ring-1 ring-[#4F46E5] shadow-sm'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F1F5F9]'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1.5 rounded-lg ${
                            browserMode === 'headed'
                              ? 'bg-[#4F46E5] text-white shadow-sm'
                              : 'bg-white border border-[#E2E8F0] text-[#64748B]'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            browserMode === 'headed' ? 'text-[#172033]' : 'text-[#475569]'
                          }`}
                        >
                          Headed Mode
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          browserMode === 'headed'
                            ? 'bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]'
                            : 'bg-white text-[#64748B] border border-[#E2E8F0]'
                        }`}
                      >
                        Live GUI
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] leading-snug">
                      Opens a visible Chromium window. Allows observing the scraping process in real-time. Useful for debugging and inspection.
                    </p>
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-[#7C3AED] font-medium flex items-center gap-1">
                    <span>headless: false</span>
                  </div>
                </button>
              </div>
            </div>

            {actionError && (
              <div className="p-3.5 rounded-lg text-xs flex items-center gap-2 border bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Action Buttons Row */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={isBusy}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold text-white shadow-sm transition-all ${
                  isBusy
                    ? 'bg-[#4F46E5]/50 cursor-not-allowed'
                    : 'bg-[#4F46E5] hover:bg-[#4338CA] active:scale-95'
                }`}
              >
                <Play className={`w-3.5 h-3.5 ${isStarting ? 'animate-spin' : ''}`} />
                <span>{isStarting ? 'Starting Background Job...' : isRunning ? 'Discovery in Progress...' : 'Start Discovery'}</span>
              </button>

              {/* MANDATORY STOP BUTTON */}
              {(isRunning || isStoppingState) && (
                <button
                  type="button"
                  onClick={handleStopDiscovery}
                  disabled={isStoppingState || isStopping}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] shadow-sm transition-all shrink-0 active:scale-95 disabled:opacity-60"
                  title="Safely terminate active discovery process and close Playwright browser"
                >
                  <Square className={`w-3.5 h-3.5 fill-current ${isStoppingState || isStopping ? 'animate-pulse' : ''}`} />
                  <span>{isStoppingState || isStopping ? 'Stopping...' : 'Stop Discovery'}</span>
                </button>
              )}
            </div>
          </form>

          {/* Standalone CLI execution tip */}
          <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#64748B] flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-[#4F46E5]" />
                CLI Command (Optional)
              </span>
              <button
                type="button"
                onClick={copyCommand}
                className="text-[11px] text-[#4F46E5] hover:underline flex items-center gap-1"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-[#16A34A]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 font-mono text-[10px] text-[#475569] break-all select-all">
              {commandString}
            </div>
          </div>
        </div>

        {/* Live Process Monitoring Card */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#4F46E5]" />
              <h2 className="text-sm font-bold text-[#172033]">Discovery Process Monitor</h2>
            </div>

            {/* Process Status Pill */}
            <div>
              {jobState.status === 'RUNNING' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
                  <span>RUNNING</span>
                </span>
              )}
              {jobState.status === 'STOPPING' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                  <RefreshCw className="w-3 h-3 animate-spin text-[#D97706]" />
                  <span>STOPPING</span>
                </span>
              )}
              {jobState.status === 'STOPPED' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                  <Square className="w-2.5 h-2.5 fill-current text-[#64748B]" />
                  <span>STOPPED</span>
                </span>
              )}
              {jobState.status === 'COMPLETED' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>COMPLETED</span>
                </span>
              )}
              {jobState.status === 'FAILED' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" />
                  <span>FAILED</span>
                </span>
              )}
              {jobState.status === 'IDLE' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                  <Clock className="w-3 h-3" />
                  <span>IDLE</span>
                </span>
              )}
            </div>
          </div>

          {/* Job Details Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] font-semibold block uppercase">Target Category</span>
              <span className="text-[#172033] font-bold truncate block mt-0.5" title={jobState.category || category}>
                {jobState.category || category}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] font-semibold block uppercase">Area / City</span>
              <span className="text-[#172033] font-bold truncate block mt-0.5" title={`${jobState.area || area}, ${jobState.city || city}`}>
                {jobState.area ? `${jobState.area}, ${jobState.city}` : `${area}, ${city}`}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] font-semibold block uppercase">Browser Mode</span>
              {jobState.browserMode === 'headed' || (!jobState.browserMode && jobState.headless === false) ? (
                <span className="text-[#6D28D9] font-bold flex items-center gap-1 mt-0.5 uppercase tracking-wide">
                  <Eye className="w-3.5 h-3.5 text-[#7C3AED]" />
                  HEADED
                </span>
              ) : (
                <span className="text-[#15803D] font-bold flex items-center gap-1 mt-0.5 uppercase tracking-wide">
                  <EyeOff className="w-3.5 h-3.5 text-[#16A34A]" />
                  HEADLESS
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[10px] text-[#64748B] font-semibold block uppercase">Elapsed Time</span>
              <span className="text-[#172033] font-mono font-bold block mt-0.5">
                {formatElapsed(jobState.elapsedSeconds)}
              </span>
            </div>
          </div>

          {/* Live Discovery Counters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-center">
              <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Discovered</span>
              <span className="text-lg font-black text-[#172033] block mt-0.5">
                {jobState.counters.discoveredCount}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#EEF2FF] border border-[#C7D2FE] text-center">
              <span className="text-[10px] font-semibold text-[#4F46E5] uppercase block">Audited</span>
              <span className="text-lg font-black text-[#4F46E5] block mt-0.5">
                {jobState.counters.processedCount}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] text-center">
              <span className="text-[10px] font-semibold text-[#15803D] uppercase block">Qualified</span>
              <span className="text-lg font-black text-[#15803D] block mt-0.5">
                {jobState.counters.qualifiedCount}
              </span>
            </div>
          </div>

          {/* Terminal Log Stream */}
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#475569] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#64748B]" />
                Live Execution Logs
              </span>
              {jobState.jobId && (
                <span className="font-mono text-[10px] text-[#64748B]">ID: {jobState.jobId}</span>
              )}
            </div>

            <div
              ref={logBoxRef}
              className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 font-mono text-[11px] text-[#E2E8F0] h-48 overflow-y-auto space-y-1 select-text shadow-inner"
            >
              {jobState.logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#64748B] italic">
                  Awaiting background discovery launch...
                </div>
              ) : (
                jobState.logs.map((line, idx) => {
                  const isErr = line.includes('[STDERR]') || line.includes('[ERROR]') || line.includes('Fatal');
                  const isSuccess = line.includes('completed') || line.includes('🏆') || line.includes('🎉') || line.includes('✓');
                  const isStop = line.includes('[STOP');

                  let textColor = 'text-[#E2E8F0]';
                  if (isErr) textColor = 'text-[#F87171]';
                  else if (isSuccess) textColor = 'text-[#4ADE80]';
                  else if (isStop) textColor = 'text-[#FBBF24]';

                  return (
                    <div key={idx} className={`leading-snug break-words ${textColor}`}>
                      {line}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Post-Process Feedback Action Banner */}
          {jobState.status === 'COMPLETED' && (
            <div className="p-3.5 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span className="font-semibold text-[#15803D] truncate">
                  Discovery completed! New leads are synchronized.
                </span>
              </div>
              <Link
                href="/open-marketing/leads"
                className="px-3 py-1.5 rounded bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold shrink-0 shadow-sm transition-colors"
              >
                View Leads
              </Link>
            </div>
          )}

          {jobState.status === 'STOPPED' && (
            <div className="p-3 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0] text-xs text-[#475569] flex items-center gap-2">
              <Square className="w-3.5 h-3.5 text-[#64748B] shrink-0 fill-current" />
              <span>Discovery was stopped by the user. Historical and partially discovered records are safely preserved.</span>
            </div>
          )}

          {jobState.status === 'FAILED' && (
            <div className="p-3 rounded-lg bg-[#FEE2E2] border border-[#FECACA] text-xs text-[#B91C1C] flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
              <span>{jobState.error || 'Discovery failed. Check terminal logs above for diagnostic details.'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
