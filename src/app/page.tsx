'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import {
  Users,
  Sparkles,
  Globe,
  GlobeX,
  Wrench,
  Code,
  Phone,
  Mail,
  ArrowRight,
  RefreshCw,
  Plus,
  Play,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Send,
  MessageCircle,
  CalendarClock
} from 'lucide-react';

interface OutreachAnalytics {
  emailsSent: number;
  emailsFailed: number;
  whatsappConfirmedSent: number;
  whatsappOpened: number;
  callsCompleted: number;
  leadsContacted: number;
  conversionRate: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
}

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  withWebsite: number;
  withoutWebsite: number;
  pcProspects: number;
  webDevProspects: number;
  bothProspects: number;
  withPhone: number;
  withEmail: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pipelineCounts, setPipelineCounts] = useState<Record<string, number>>({});
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [outreachStats, setOutreachStats] = useState<OutreachAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [res, outreachRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/outreach/analytics'),
      ]);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setPipelineCounts(data.pipelineCounts);
        setRecentLeads(data.recentLeads);
        setRecentJobs(data.recentJobs);
      }
      const outreachData = await outreachRes.json();
      if (outreachData.success && outreachData.analytics) {
        setOutreachStats(outreachData.analytics);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const pipelineStages = [
    { key: 'NEW', label: 'New', color: 'bg-crm-sky/35 text-crm-navy border-crm-blue/30 dark:bg-crm-blue/25 dark:text-crm-sky dark:border-crm-periwinkle/30' },
    { key: 'RESEARCHED', label: 'Researched', color: 'bg-crm-indigo/15 text-crm-indigo border-crm-indigo/30 dark:bg-crm-periwinkle/20 dark:text-crm-periwinkle dark:border-crm-periwinkle/30' },
    { key: 'CONTACTED', label: 'Contacted', color: 'bg-crm-periwinkle/20 text-crm-navy border-crm-periwinkle/40 dark:bg-crm-indigo/35 dark:text-crm-sky dark:border-crm-periwinkle/40' },
    { key: 'INTERESTED', label: 'Interested', color: 'bg-crm-blue/15 text-crm-blue border-crm-blue/30 dark:bg-crm-blue/30 dark:text-crm-sky dark:border-crm-sky/30' },
    { key: 'FOLLOW_UP', label: 'Follow-Up', color: 'bg-crm-coral/20 text-crm-navy border-crm-coral/40 dark:bg-crm-coral/20 dark:text-crm-coral dark:border-crm-coral/40' },
    { key: 'WON', label: 'Won', color: 'bg-crm-blue text-white border-crm-navy dark:bg-crm-blue dark:text-white dark:border-crm-periwinkle/50' },
    { key: 'LOST', label: 'Lost', color: 'bg-crm-orangeRed/15 text-crm-orangeRed border-crm-orangeRed/30 dark:bg-crm-orangeRed/25 dark:text-crm-coral dark:border-crm-orangeRed/40' },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="CRM Dashboard"
        subtitle="Real-time business opportunities and pipeline metrics"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 rounded-lg bg-crm-sky/40 hover:bg-crm-sky/70 dark:bg-crm-navySurface dark:hover:bg-crm-navyElevated text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25 transition"
              title="Refresh Stats"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/discovery"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-crm-blue hover:bg-crm-navy text-white transition shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Discover Leads
            </Link>
          </div>
        }
      />

      <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        {/* Open Marketing Module Quick Access Banner */}
        <section className="bg-gradient-to-r from-[#EEF2FF] via-white to-[#F0FDF4] dark:from-crm-navySurface dark:via-crm-navy dark:to-crm-navyElevated border border-[#C7D2FE] dark:border-crm-sky/30 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4F46E5] text-white uppercase tracking-wider">
                  Latest Module
                </span>
                <span className="text-xs font-semibold text-[#4F46E5] dark:text-crm-sky">
                  Open Marketing Lead Intelligence &amp; Discovery
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#172033] dark:text-white">
                Multi-Search Lead Intelligence &amp; Autonomous Scraper
              </h2>
              <p className="text-xs text-[#64748B] dark:text-crm-sky/80 mt-1 max-w-xl">
                Access your updated multi-engine discovery scraper (Headless / Headed), lead scoring, web audit, and deduplicated local business databases.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/open-marketing"
                className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Open Intelligence Hub</span>
              </Link>
              <Link
                href="/open-marketing/discovery"
                className="px-4 py-2 rounded-lg bg-white dark:bg-crm-navySurface hover:bg-[#F8FAFC] text-[#172033] dark:text-white text-xs font-semibold border border-[#CBD5E1] dark:border-crm-sky/30 shadow-sm transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
                <span>Business Discovery Scraper</span>
              </Link>
              <Link
                href="/open-marketing/leads"
                className="px-3.5 py-2 rounded-lg bg-white dark:bg-crm-navySurface hover:bg-[#F8FAFC] text-[#475569] dark:text-crm-sky text-xs font-medium border border-[#E2E8F0] dark:border-crm-sky/20 transition-all flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5 text-[#4F46E5]" />
                <span>Discovered Leads</span>
              </Link>
            </div>
          </div>
        </section>

        {/* KPI Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-crm-indigo dark:text-crm-sky/80">
              Lead Metrics &amp; Service Classification
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Leads */}
            <Link
              href="/leads"
              className="glass-card glass-card-hover p-5 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 relative overflow-hidden block transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-crm-indigo dark:text-crm-sky/80 group-hover:text-crm-blue dark:group-hover:text-crm-periwinkle transition">
                  Total Leads
                </span>
                <div className="w-8 h-8 rounded-xl bg-crm-blue/10 dark:bg-crm-blue/25 text-crm-blue dark:text-crm-periwinkle flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-crm-navy dark:text-white">
                {stats?.totalLeads ?? 0}
              </div>
              <p className="mt-1 text-xs text-crm-indigo/85 dark:text-crm-sky/75 flex items-center gap-1 group-hover:text-crm-blue dark:group-hover:text-crm-periwinkle transition">
                Registered in database &rarr;
              </p>
            </Link>

            {/* New Leads */}
            <Link
              href="/leads?crmStatus=NEW"
              className="glass-card glass-card-hover p-5 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 block transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-crm-indigo dark:text-crm-sky/80 group-hover:text-crm-blue dark:group-hover:text-crm-periwinkle transition">
                  New Leads
                </span>
                <div className="w-8 h-8 rounded-xl bg-crm-periwinkle/20 text-crm-blue dark:text-crm-periwinkle flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-crm-navy dark:text-white">
                {stats?.newLeads ?? 0}
              </div>
              <p className="mt-1 text-xs text-crm-indigo/85 dark:text-crm-sky/75 group-hover:text-crm-blue dark:group-hover:text-crm-periwinkle transition">
                Awaiting initial outreach &rarr;
              </p>
            </Link>

            {/* PC Support Prospects */}
            <Link
              href="/leads?serviceProspect=PC_SUPPORT"
              className="glass-card glass-card-hover p-5 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 block transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-crm-indigo dark:text-crm-sky/80 group-hover:text-crm-orangeRed dark:group-hover:text-crm-coral transition">
                  PC / IT Prospects
                </span>
                <div className="w-8 h-8 rounded-xl bg-crm-coral/20 text-crm-orangeRed dark:text-crm-coral flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-crm-orangeRed dark:text-crm-coral">
                {stats?.pcProspects ?? 0}
              </div>
              <p className="mt-1 text-xs text-crm-indigo/85 dark:text-crm-sky/75 group-hover:text-crm-orangeRed dark:group-hover:text-crm-coral transition">
                Hardware &amp; IT service match &rarr;
              </p>
            </Link>

            {/* Website Dev Prospects */}
            <Link
              href="/leads?serviceProspect=WEBSITE_DEV"
              className="glass-card glass-card-hover p-5 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 block transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-crm-indigo dark:text-crm-sky/80 group-hover:text-crm-indigo dark:group-hover:text-crm-sky transition">
                  Web Dev Prospects
                </span>
                <div className="w-8 h-8 rounded-xl bg-crm-indigo/15 dark:bg-crm-periwinkle/20 text-crm-indigo dark:text-crm-periwinkle flex items-center justify-center">
                  <Code className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-crm-indigo dark:text-crm-periwinkle">
                {stats?.webDevProspects ?? 0}
              </div>
              <p className="mt-1 text-xs text-crm-indigo/85 dark:text-crm-sky/75 group-hover:text-crm-indigo dark:group-hover:text-crm-periwinkle transition">
                No public website recorded &rarr;
              </p>
            </Link>

            {/* With Website */}
            <Link
              href="/leads?website=has_website"
              className="glass-card glass-card-hover p-5 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 block transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-crm-indigo dark:text-crm-sky/80 group-hover:text-crm-blue dark:group-hover:text-crm-sky transition">
                  With Website
                </span>
                <div className="w-8 h-8 rounded-xl bg-crm-sky/40 dark:bg-crm-blue/25 text-crm-blue dark:text-crm-sky flex items-center justify-center">
                  <Globe className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-crm-navy dark:text-white">
                {stats?.withWebsite ?? 0}
              </div>
              <p className="mt-1 text-xs text-crm-indigo/85 dark:text-crm-sky/75 group-hover:text-crm-blue dark:group-hover:text-crm-sky transition">
                Eligible for enrichment &rarr;
              </p>
            </Link>

            {/* Without Website */}
            <Link
              href="/leads?website=no_website"
              className="glass-card glass-card-hover p-5 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 block transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-crm-indigo dark:text-crm-sky/80 group-hover:text-crm-orangeRed dark:group-hover:text-crm-coral transition">
                  Without Website
                </span>
                <div className="w-8 h-8 rounded-xl bg-crm-orangeRed/15 dark:bg-crm-orangeRed/25 text-crm-orangeRed dark:text-crm-coral flex items-center justify-center">
                  <GlobeX className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-crm-navy dark:text-white">
                {stats?.withoutWebsite ?? 0}
              </div>
              <p className="mt-1 text-xs text-crm-indigo/85 dark:text-crm-sky/75 group-hover:text-crm-orangeRed dark:group-hover:text-crm-coral transition">
                Web redesign / creation targets &rarr;
              </p>
            </Link>

            {/* With Phone */}
            <Link
              href="/leads?hasPhone=true"
              className="glass-card glass-card-hover p-5 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 block transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-crm-indigo dark:text-crm-sky/80 group-hover:text-crm-blue dark:group-hover:text-crm-periwinkle transition">
                  Public Phone
                </span>
                <div className="w-8 h-8 rounded-xl bg-crm-blue/10 dark:bg-crm-periwinkle/20 text-crm-blue dark:text-crm-periwinkle flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-crm-navy dark:text-white">
                {stats?.withPhone ?? 0}
              </div>
              <p className="mt-1 text-xs text-crm-indigo/85 dark:text-crm-sky/75 group-hover:text-crm-blue dark:group-hover:text-crm-periwinkle transition">
                Direct caller leads &rarr;
              </p>
            </Link>

            {/* With Email */}
            <Link
              href="/leads?hasEmail=true"
              className="glass-card glass-card-hover p-5 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 block transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-crm-indigo dark:text-crm-sky/80 group-hover:text-crm-indigo dark:group-hover:text-crm-sky transition">
                  Public Email
                </span>
                <div className="w-8 h-8 rounded-xl bg-crm-indigo/15 dark:bg-crm-blue/25 text-crm-indigo dark:text-crm-sky flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-black text-crm-navy dark:text-white">
                {stats?.withEmail ?? 0}
              </div>
              <p className="mt-1 text-xs text-crm-indigo/85 dark:text-crm-sky/75 group-hover:text-crm-indigo dark:group-hover:text-crm-sky transition">
                Direct emailable leads &rarr;
              </p>
            </Link>
          </div>
        </section>

        {/* Pipeline Overview */}
        <section className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-crm-navy dark:text-white">CRM Pipeline Status</h3>
              <p className="text-xs text-crm-indigo dark:text-crm-sky/80">Click any stage to view matching leads in All Leads</p>
            </div>
            <Link
              href="/pipeline"
              className="text-xs text-crm-blue dark:text-crm-periwinkle hover:underline font-medium flex items-center gap-1"
            >
              Open Pipeline Board <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {pipelineStages.map((stage) => {
              const count = pipelineCounts[stage.key] || 0;
              return (
                <Link
                  key={stage.key}
                  href={`/leads?crmStatus=${stage.key}`}
                  className={`p-3.5 rounded-xl border ${stage.color} flex flex-col justify-between hover:scale-[1.02] transition-transform cursor-pointer shadow-sm`}
                  title={`View ${stage.label} leads`}
                >
                  <span className="text-xs font-semibold">{stage.label}</span>
                  <span className="text-2xl font-black mt-2">{count}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent Activity & Recent Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Leads */}
          <section className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-crm-navy dark:text-white">Recent Leads</h3>
              <Link
                href="/leads"
                className="text-xs text-crm-blue dark:text-crm-periwinkle hover:underline font-medium flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentLeads.length === 0 ? (
              <div className="text-center py-10 text-crm-indigo dark:text-crm-sky/80 text-sm">
                No leads recorded yet.
                <div className="mt-3">
                  <Link
                    href="/leads"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crm-sky/35 dark:bg-crm-blue/25 text-crm-navy dark:text-crm-sky border border-crm-blue/30 text-xs font-semibold hover:bg-crm-sky/60 dark:hover:bg-crm-blue/40 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add or Import Leads
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-crm-lightGrey/80 dark:divide-crm-sky/15">
                {recentLeads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="py-3 flex items-center justify-between hover:bg-crm-sky/20 dark:hover:bg-crm-navySurface/60 px-2 rounded-lg transition"
                  >
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-semibold text-crm-navy dark:text-white truncate">
                        {lead.businessName}
                      </p>
                      <p className="text-xs text-crm-indigo dark:text-crm-sky/75 truncate">
                        {lead.category || 'General Business'} &bull; {lead.city || 'Madurai'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-crm-sky/30 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky border border-crm-lightGrey dark:border-crm-sky/25">
                        {lead.crmStatus}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recent Automation Jobs */}
          <section className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-crm-navy dark:text-white">Recent Discovery Jobs</h3>
              <Link
                href="/discovery"
                className="text-xs text-crm-blue dark:text-crm-periwinkle hover:underline font-medium flex items-center gap-1"
              >
                Discovery Hub <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentJobs.length === 0 ? (
              <div className="text-center py-10 text-crm-indigo dark:text-crm-sky/80 text-sm">
                No automation jobs run yet.
                <div className="mt-3">
                  <Link
                    href="/discovery"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crm-sky/35 dark:bg-crm-blue/25 text-crm-navy dark:text-crm-sky border border-crm-blue/30 text-xs font-semibold hover:bg-crm-sky/60 dark:hover:bg-crm-blue/40 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-crm-blue dark:fill-crm-sky" /> Start First Job
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-crm-lightGrey/80 dark:divide-crm-sky/15 max-h-[440px] overflow-y-auto pr-1.5 scrollbar-thin">
                {recentJobs.map((job) => (
                  <div key={job.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <p className="text-sm font-semibold text-crm-navy dark:text-white">
                        {job.location} &bull; {job.totalKeywords} Keyword{job.totalKeywords > 1 ? 's' : ''}
                      </p>

                      {/* Executed Keywords Display with horizontal scroll */}
                      {job.selectedKeywords && job.selectedKeywords.length > 0 && (
                        <div className="space-y-1 max-w-full">
                          <span className="text-[11px] font-semibold text-crm-indigo dark:text-crm-sky/80 block">
                            Keywords ({job.selectedKeywords.length}):
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

                      <p className="text-xs text-crm-indigo dark:text-crm-sky/80">
                        Saved: <strong className="text-crm-blue dark:text-crm-periwinkle font-semibold">{job.newLeadsSaved}</strong> | Duplicates: {job.duplicatesSkipped} | Discovered: {job.totalDiscovered}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border shrink-0 ${
                        job.status === 'COMPLETED'
                          ? 'bg-crm-sky/35 text-crm-navy dark:bg-crm-blue/25 dark:text-crm-sky border-crm-blue/30 dark:border-crm-periwinkle/30'
                          : job.status === 'FAILED'
                          ? 'bg-crm-orangeRed/15 text-crm-orangeRed dark:text-crm-coral border-crm-orangeRed/30'
                          : job.status === 'RUNNING'
                          ? 'bg-crm-indigo/15 text-crm-indigo dark:bg-crm-periwinkle/20 dark:text-crm-periwinkle border-crm-periwinkle/40 animate-pulse'
                          : 'bg-crm-lightGrey/50 dark:bg-crm-navySurface text-crm-navy dark:text-crm-sky border-crm-lightGrey dark:border-crm-sky/25'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Outreach Performance & Pending Follow-Ups (Additive) */}
        <section className="glass-card p-6 rounded-2xl border border-crm-lightGrey dark:border-crm-sky/20 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-crm-navy dark:text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-crm-blue dark:text-crm-periwinkle" />
                Outreach Activity &amp; Follow-Ups
              </h2>
              <p className="text-xs text-crm-indigo dark:text-crm-sky/80">
                Verified delivery counts across Email, WhatsApp, Phone Calls, and Follow-Up reminders
              </p>
            </div>
            <Link
              href="/outreach"
              className="text-xs text-crm-blue dark:text-crm-periwinkle hover:underline flex items-center gap-1 font-medium"
            >
              Outreach Hub <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
              <span className="text-crm-indigo dark:text-crm-sky/80 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" /> Emails Sent
              </span>
              <p className="text-xl font-bold text-crm-navy dark:text-white mt-1">
                {outreachStats?.emailsSent ?? 0}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
              <span className="text-crm-indigo dark:text-crm-sky/80 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-crm-blue dark:text-crm-sky" /> WhatsApp Sent
              </span>
              <p className="text-xl font-bold text-crm-navy dark:text-white mt-1">
                {outreachStats?.whatsappConfirmedSent ?? 0}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
              <span className="text-crm-indigo dark:text-crm-sky/80 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-crm-indigo dark:text-crm-periwinkle" /> Calls Completed
              </span>
              <p className="text-xl font-bold text-crm-navy dark:text-white mt-1">
                {outreachStats?.callsCompleted ?? 0}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
              <span className="text-crm-indigo dark:text-crm-sky/80 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-crm-coral" /> Pending Follow-Ups
              </span>
              <p className="text-xl font-bold text-crm-navy dark:text-white mt-1">
                {outreachStats?.pendingFollowUps ?? 0}
                {(outreachStats?.overdueFollowUps ?? 0) > 0 && (
                  <span className="ml-1.5 text-[11px] font-semibold text-crm-orangeRed dark:text-crm-coral">
                    ({outreachStats?.overdueFollowUps} overdue)
                  </span>
                )}
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-crm-lightGrey/25 dark:bg-crm-navyDeep/70 border border-crm-lightGrey dark:border-crm-sky/20">
              <span className="text-crm-indigo dark:text-crm-sky/80 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-crm-blue dark:text-crm-periwinkle" /> Contacted → Won
              </span>
              <p className="text-xl font-bold text-crm-navy dark:text-white mt-1">
                {outreachStats?.conversionRate ?? 0}%
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
