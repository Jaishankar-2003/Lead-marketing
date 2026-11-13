import { BusinessLead, DashboardCharts, DashboardKPIs } from '../types.js';

export class AnalyticsService {
  public static calculateKPIs(leads: BusinessLead[], qualifiedLeads: BusinessLead[]): DashboardKPIs {
    let withoutWebsites = 0;
    let brokenWebsites = 0;
    let workingWebsites = 0;
    let unavailableWebsites = 0;
    let withPhone = 0;
    let withEmail = 0;
    let withVerifiedContacts = 0;

    let webDevOpp = 0;
    let pcRepairOpp = 0;
    let networkingAmcOpp = 0;

    let needsVerification = 0;
    let unqualifiedLeads = 0;

    for (const lead of leads) {
      // Website status
      if (lead.websiteStatus === 'VERIFIED_NO_WEBSITE') withoutWebsites++;
      else if (lead.websiteStatus === 'WEBSITE_BROKEN') brokenWebsites++;
      else if (lead.websiteStatus === 'WEBSITE_FOUND') workingWebsites++;
      else if (lead.websiteStatus === 'WEBSITE_UNAVAILABLE') unavailableWebsites++;

      // Contacts
      const hasP = Boolean(lead.phone);
      const hasE = Boolean(lead.email);
      if (hasP) withPhone++;
      if (hasE) withEmail++;
      if (hasP || hasE) withVerifiedContacts++;

      // Qualification
      const qStatus = lead.leadScores?.qualificationStatus;
      if (qStatus === 'NEEDS_VERIFICATION') needsVerification++;
      else if (qStatus === 'UNQUALIFIED') unqualifiedLeads++;

      // Opportunities
      if (lead.primaryOpportunity === 'WEB_DEV') webDevOpp++;
      else if (lead.primaryOpportunity === 'PC_REPAIR') pcRepairOpp++;
      else if (lead.primaryOpportunity === 'NETWORKING_AMC') networkingAmcOpp++;
    }

    return {
      totalLeads: leads.length,
      qualifiedLeads: qualifiedLeads.length,
      needsVerification,
      unqualifiedLeads,
      withoutWebsites,
      brokenWebsites,
      workingWebsites,
      unavailableWebsites,
      withPhone,
      withEmail,
      withVerifiedContacts,
      topOpportunityBreakdown: {
        webDev: webDevOpp,
        pcRepair: pcRepairOpp,
        networkingAmc: networkingAmcOpp,
      },
    };
  }

  public static calculateCharts(leads: BusinessLead[]): DashboardCharts {
    const total = leads.length || 1;

    // 1. Qualification distribution
    const qualCounts: Record<string, number> = {
      QUALIFIED: 0,
      NEEDS_VERIFICATION: 0,
      UNQUALIFIED: 0,
    };
    for (const l of leads) {
      const q = l.leadScores?.qualificationStatus || 'UNQUALIFIED';
      qualCounts[q] = (qualCounts[q] || 0) + 1;
    }

    const qualificationDistribution = [
      { name: 'Qualified', value: qualCounts['QUALIFIED'], color: '#10b981', percentage: Math.round((qualCounts['QUALIFIED'] / total) * 100) },
      { name: 'Needs Verification', value: qualCounts['NEEDS_VERIFICATION'], color: '#f59e0b', percentage: Math.round((qualCounts['NEEDS_VERIFICATION'] / total) * 100) },
      { name: 'Unqualified', value: qualCounts['UNQUALIFIED'], color: '#64748b', percentage: Math.round((qualCounts['UNQUALIFIED'] / total) * 100) },
    ];

    // 2. Website status distribution
    const wsCounts: Record<string, number> = {};
    for (const l of leads) {
      wsCounts[l.websiteStatus] = (wsCounts[l.websiteStatus] || 0) + 1;
    }

    const websiteStatusDistribution = [
      { name: 'Verified No Website', value: wsCounts['VERIFIED_NO_WEBSITE'] || 0, color: '#8b5cf6' },
      { name: 'Website Found', value: wsCounts['WEBSITE_FOUND'] || 0, color: '#3b82f6' },
      { name: 'Website Unavailable', value: wsCounts['WEBSITE_UNAVAILABLE'] || 0, color: '#f97316' },
      { name: 'Website Broken', value: wsCounts['WEBSITE_BROKEN'] || 0, color: '#ef4444' },
      { name: 'Needs Verification', value: wsCounts['NEEDS_VERIFICATION'] || 0, color: '#64748b' },
    ].filter((item) => item.value > 0);

    // 3. Discovery sources
    const srcCounts: Record<string, number> = {};
    for (const l of leads) {
      for (const s of l.sources) {
        srcCounts[s] = (srcCounts[s] || 0) + 1;
      }
    }
    const discoverySourcesDistribution = Object.entries(srcCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 4. Commercial Opportunity distribution (Count of high or medium potential)
    let webOppCount = 0;
    let pcOppCount = 0;
    let amcOppCount = 0;

    for (const l of leads) {
      if ((l.leadScores?.websiteDevScore || 0) >= 40) webOppCount++;
      if ((l.leadScores?.pcRepairScore || 0) >= 40) pcOppCount++;
      if ((l.leadScores?.networkingAmcScore || 0) >= 40) amcOppCount++;
    }

    const opportunityDistribution = [
      { name: 'Web Design & Dev', value: webOppCount, color: '#06b6d4' },
      { name: 'PC Repair & Support', value: pcOppCount, color: '#f59e0b' },
      { name: 'Network & AMC', value: amcOppCount, color: '#10b981' },
    ];

    // 5. Location Distribution (Top areas)
    const locCounts: Record<string, number> = {};
    for (const l of leads) {
      const area = l.area || 'Unknown';
      locCounts[area] = (locCounts[area] || 0) + 1;
    }
    const locationDistribution = Object.entries(locCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // 6. Score Rating Levels breakdown
    const scoreDistribution = [
      {
        category: 'Web Dev',
        high: leads.filter((l) => l.leadScores?.websiteDevRating === 'HIGH').length,
        medium: leads.filter((l) => l.leadScores?.websiteDevRating === 'MEDIUM').length,
        low: leads.filter((l) => l.leadScores?.websiteDevRating === 'LOW').length,
        none: leads.filter((l) => l.leadScores?.websiteDevRating === 'NONE').length,
      },
      {
        category: 'PC Repair',
        high: leads.filter((l) => l.leadScores?.pcRepairRating === 'HIGH').length,
        medium: leads.filter((l) => l.leadScores?.pcRepairRating === 'MEDIUM').length,
        low: leads.filter((l) => l.leadScores?.pcRepairRating === 'LOW').length,
        none: leads.filter((l) => l.leadScores?.pcRepairRating === 'NONE').length,
      },
      {
        category: 'Network/AMC',
        high: leads.filter((l) => l.leadScores?.networkingAmcRating === 'HIGH').length,
        medium: leads.filter((l) => l.leadScores?.networkingAmcRating === 'MEDIUM').length,
        low: leads.filter((l) => l.leadScores?.networkingAmcRating === 'LOW').length,
        none: leads.filter((l) => l.leadScores?.networkingAmcRating === 'NONE').length,
      },
    ];

    return {
      qualificationDistribution,
      websiteStatusDistribution,
      discoverySourcesDistribution,
      opportunityDistribution,
      locationDistribution,
      scoreDistribution,
    };
  }
}

