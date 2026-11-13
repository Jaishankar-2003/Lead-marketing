'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Target,
  AlertTriangle,
  Globe,
  Globe2,
  PhoneCall,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useOpenMarketing } from '@/lib/open-marketing/context';
import { StatCard } from '@/components/open-marketing/StatCard';
import { QualificationChart } from '@/components/open-marketing/QualificationChart';
import { WebsiteStatusChart } from '@/components/open-marketing/WebsiteStatusChart';
import { SourcesChart } from '@/components/open-marketing/SourcesChart';
import { OpportunitiesChart } from '@/components/open-marketing/OpportunitiesChart';

export default function OpenMarketingOverviewPage() {
  const router = useRouter();
  const { dashboardData, loading, refresh } = useOpenMarketing();

  if (loading && !dashboardData) {
    return (
      <div className="h-96 flex flex-col items-center justify-center text-[#64748B]">
        <div className="w-10 h-10 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Connecting to local lead intelligence database...</p>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-16 text-[#64748B] bg-white border border-[#E2E8F0] rounded-xl p-8 max-w-lg mx-auto shadow-sm">
        <p className="text-sm mb-4 text-[#172033] font-medium">No dashboard dataset loaded.</p>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 bg-[#4F46E5] text-white rounded-lg text-xs font-semibold hover:bg-[#4338CA] shadow-sm transition-colors"
        >
          Reload Dashboard
        </button>
      </div>
    );
  }

  const { kpis, charts } = dashboardData;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner / Overview Summary (Guaranteed Responsive Flex & No Overlap) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6D28D9] bg-[#EDE9FE] px-2.5 py-1 rounded-md border border-[#DDD6FE] inline-flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Market Intelligence Active</span>
          </span>
          <h1 className="text-xl font-bold text-[#172033] tracking-tight">
            Local Business Lead Intelligence Overview
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Multi-engine business discovery auditing local web presence, mobile compliance, technical SEO, and commercial opportunity viability.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto shrink-0 flex-wrap">
          <Link
            href="/open-marketing/leads"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold shadow-sm transition-all"
          >
            <span>Browse All Leads</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/open-marketing/qualified"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#172033] text-xs font-semibold shadow-sm transition-all border border-[#CBD5E1]"
          >
            <Target className="w-4 h-4 text-[#16A34A]" />
            <span>Qualified Deals</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="Total Leads"
          value={kpis.totalLeads}
          subtext="Harvested businesses"
          icon={Users}
          variant="blue"
          onClick={() => router.push('/open-marketing/leads')}
        />
        <StatCard
          title="Qualified"
          value={kpis.qualifiedLeads}
          subtext="Ready for outreach"
          icon={Target}
          variant="emerald"
          badgeText="High Intent"
          onClick={() => router.push('/open-marketing/qualified')}
        />
        <StatCard
          title="No Website"
          value={kpis.withoutWebsites}
          subtext="Prime web dev leads"
          icon={Globe2}
          variant="purple"
          badgeText="High Value"
        />
        <StatCard
          title="Broken Sites"
          value={kpis.brokenWebsites}
          subtext="Fix & redesign targets"
          icon={AlertTriangle}
          variant="red"
        />
        <StatCard
          title="Phone Leads"
          value={kpis.withPhone}
          subtext="Click-to-call enabled"
          icon={PhoneCall}
          variant="cyan"
        />
        <StatCard
          title="Active Sites"
          value={kpis.workingWebsites}
          subtext="Audited businesses"
          icon={Globe}
          variant="slate"
        />
      </div>

      {/* Primary Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QualificationChart data={charts.qualificationDistribution} />
        <WebsiteStatusChart data={charts.websiteStatusDistribution} />
      </div>

      {/* Secondary Charts: Yield & Opportunity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SourcesChart data={charts.discoverySourcesDistribution} />
        <OpportunitiesChart data={charts.opportunityDistribution} />
      </div>

      {/* Quick Launchpad to Other Modules */}
      <div className="p-5 rounded-xl bg-white border border-[#E2E8F0] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#172033]">Need to Run a New Targeted Discovery?</h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            Discover new local shops, preschools, clinics, or firms with automated multi-engine scraping.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Link
            href="/open-marketing/discovery"
            className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-semibold transition-all shadow-sm"
          >
            Launch Business Discovery &rarr;
          </Link>
          <Link
            href="/open-marketing/settings"
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#F8FAFC] text-[#475569] hover:text-[#172033] text-xs font-medium border border-[#E2E8F0] transition-all"
          >
            Manage Datasets &amp; Sync
          </Link>
        </div>
      </div>
    </div>
  );
}
