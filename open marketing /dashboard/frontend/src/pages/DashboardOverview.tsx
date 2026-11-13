import React from 'react';
import {
  Users,
  Target,
  AlertTriangle,
  Globe,
  Globe2,
  PhoneCall,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { DashboardData } from '../types';
import { StatCard } from '../components/common/StatCard';
import { QualificationChart } from '../components/charts/QualificationChart';
import { WebsiteStatusChart } from '../components/charts/WebsiteStatusChart';
import { SourcesChart } from '../components/charts/SourcesChart';
import { OpportunitiesChart } from '../components/charts/OpportunitiesChart';

interface DashboardOverviewProps {
  data: DashboardData;
  onNavigate: (tab: 'all-leads' | 'qualified-leads') => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  data,
  onNavigate,
}) => {
  const { kpis, charts } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Banner / Summary */}
      <div className="bg-gradient-to-r from-blue-900/40 via-card to-card border border-blue-500/20 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Pipeline Intelligence Overview
          </span>
          <h2 className="text-xl font-bold text-slate-100 mt-1">
            {kpis.qualifiedLeads} High-Value Qualified Leads Discovered
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Out of {kpis.totalLeads} surveyed businesses in the target area, {kpis.withoutWebsites} operate without any website and {kpis.brokenWebsites} have fatal site errors.
          </p>
        </div>

        <button
          onClick={() => onNavigate('qualified-leads')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all flex-shrink-0"
        >
          <span>View Qualified Leads</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Primary KPI Grid (8 metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Discovered"
          value={kpis.totalLeads}
          subtext="Unique local businesses"
          icon={Users}
          variant="blue"
          onClick={() => onNavigate('all-leads')}
        />
        <StatCard
          title="Qualified Leads"
          value={kpis.qualifiedLeads}
          subtext="Score ≥ 40 with verified contact"
          icon={Target}
          variant="emerald"
          badgeText="High Intent"
          onClick={() => onNavigate('qualified-leads')}
        />
        <StatCard
          title="Needs Verification"
          value={kpis.needsVerification}
          subtext="High potential, missing direct contact"
          icon={HelpCircle}
          variant="amber"
          onClick={() => onNavigate('all-leads')}
        />
        <StatCard
          title="Unqualified"
          value={kpis.unqualifiedLeads}
          subtext="Low service opportunity match"
          icon={AlertTriangle}
          variant="slate"
        />

        <StatCard
          title="No Official Website"
          value={kpis.withoutWebsites}
          subtext="Prime Web Dev prospects"
          icon={Globe2}
          variant="purple"
          badgeText="Web Dev Lead"
          onClick={() => onNavigate('qualified-leads')}
        />
        <StatCard
          title="Broken Websites"
          value={kpis.brokenWebsites}
          subtext="404, 500, or DNS failures"
          icon={AlertTriangle}
          variant="red"
          badgeText="Rebuild Lead"
        />
        <StatCard
          title="Working Websites"
          value={kpis.workingWebsites}
          subtext="200 OK audited websites"
          icon={Globe}
          variant="cyan"
        />
        <StatCard
          title="Verified Contacts"
          value={kpis.withVerifiedContacts}
          subtext={`${kpis.withPhone} phone, ${kpis.withEmail} email`}
          icon={PhoneCall}
          variant="emerald"
        />
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QualificationChart data={charts.qualificationDistribution} />
        <WebsiteStatusChart data={charts.websiteStatusDistribution} />
        <SourcesChart data={charts.discoverySourcesDistribution} />
        <OpportunitiesChart data={charts.opportunityDistribution} />
      </div>
    </div>
  );
};
