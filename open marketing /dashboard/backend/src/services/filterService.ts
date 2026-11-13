import { BusinessLead, LeadFilterParams, PaginatedResult } from '../types.js';

export class FilterService {
  public static filterAndPaginate(
    leads: BusinessLead[],
    params: LeadFilterParams
  ): PaginatedResult<BusinessLead> {
    let filtered = [...leads];

    // Global Search
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter((l) => {
        return (
          l.businessName.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          (l.address && l.address.toLowerCase().includes(q)) ||
          (l.phone && l.phone.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q)) ||
          (l.websiteUrl && l.websiteUrl.toLowerCase().includes(q))
        );
      });
    }

    // Area filter
    if (params.area && params.area !== 'ALL') {
      filtered = filtered.filter((l) => l.area.toLowerCase() === params.area?.toLowerCase());
    }

    // Category filter
    if (params.category && params.category !== 'ALL') {
      filtered = filtered.filter((l) => l.category.toLowerCase() === params.category?.toLowerCase());
    }

    // Website status filter
    if (params.websiteStatus && params.websiteStatus !== 'ALL') {
      filtered = filtered.filter((l) => l.websiteStatus === params.websiteStatus);
    }

    // Location status filter
    if (params.locationStatus && params.locationStatus !== 'ALL') {
      filtered = filtered.filter((l) => l.locationStatus === params.locationStatus);
    }

    // Qualification status filter
    if (params.qualificationStatus && params.qualificationStatus !== 'ALL') {
      filtered = filtered.filter(
        (l) => l.leadScores?.qualificationStatus === params.qualificationStatus
      );
    }

    // Source filter
    if (params.source && params.source !== 'ALL') {
      filtered = filtered.filter((l) => l.sources.includes(params.source!));
    }

    // Opportunity type filter
    if (params.opportunityType && params.opportunityType !== 'ALL') {
      if (params.opportunityType === 'WEB_DEV') {
        filtered = filtered.filter((l) => (l.leadScores?.websiteDevScore || 0) >= 40);
      } else if (params.opportunityType === 'PC_REPAIR') {
        filtered = filtered.filter((l) => (l.leadScores?.pcRepairScore || 0) >= 40);
      } else if (params.opportunityType === 'NETWORKING_AMC') {
        filtered = filtered.filter((l) => (l.leadScores?.networkingAmcScore || 0) >= 40);
      }
    }

    // Dataset file filter
    if (params.datasetFile && params.datasetFile !== 'ALL') {
      filtered = filtered.filter((l) => l.sourceFile === params.datasetFile);
    }

    // Contact availability
    if (params.hasPhone === true) {
      filtered = filtered.filter((l) => Boolean(l.phone));
    }
    if (params.hasEmail === true) {
      filtered = filtered.filter((l) => Boolean(l.email));
    }

    // Min Score
    if (typeof params.minScore === 'number' && !isNaN(params.minScore) && params.minScore > 0) {
      const min = params.minScore;
      filtered = filtered.filter((l) => {
        const scores = l.leadScores;
        return (
          scores.websiteDevScore >= min ||
          scores.pcRepairScore >= min ||
          scores.networkingAmcScore >= min
        );
      });
    }

    // Sorting
    const sortBy = params.sortBy || 'leadScores.websiteDevScore';
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortBy) {
        case 'businessName':
          valA = a.businessName.toLowerCase();
          valB = b.businessName.toLowerCase();
          break;
        case 'websiteDevScore':
        case 'leadScores.websiteDevScore':
          valA = a.leadScores?.websiteDevScore || 0;
          valB = b.leadScores?.websiteDevScore || 0;
          break;
        case 'pcRepairScore':
        case 'leadScores.pcRepairScore':
          valA = a.leadScores?.pcRepairScore || 0;
          valB = b.leadScores?.pcRepairScore || 0;
          break;
        case 'networkingAmcScore':
        case 'leadScores.networkingAmcScore':
          valA = a.leadScores?.networkingAmcScore || 0;
          valB = b.leadScores?.networkingAmcScore || 0;
          break;
        case 'websiteStatus':
          valA = a.websiteStatus;
          valB = b.websiteStatus;
          break;
        case 'collectedAt':
          valA = a.collectedAt;
          valB = b.collectedAt;
          break;
        default:
          valA = a.businessName;
          valB = b.businessName;
      }

      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    // Pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(50000, params.limit || 25));
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedData = filtered.slice(startIndex, startIndex + limit);

    // Extract dynamic filter options from raw leads
    const distinctAreas = Array.from(new Set(leads.map((l) => l.area).filter(Boolean))).sort();
    const distinctCategories = Array.from(new Set(leads.map((l) => l.category).filter(Boolean))).sort();
    const distinctWebsiteStatuses = Array.from(new Set(leads.map((l) => l.websiteStatus).filter(Boolean))).sort();
    const distinctQualificationStatuses = Array.from(
      new Set(leads.map((l) => l.leadScores?.qualificationStatus).filter(Boolean))
    ).sort();
    const distinctLocationStatuses = Array.from(new Set(leads.map((l) => l.locationStatus).filter(Boolean))).sort();

    const allSources = new Set<string>();
    leads.forEach((l) => l.sources.forEach((s) => allSources.add(s)));
    const distinctSources = Array.from(allSources).sort();

    const distinctDatasetFiles = Array.from(
      new Set(leads.map((l) => l.sourceFile).filter(Boolean) as string[])
    ).sort();

    return {
      data: paginatedData,
      total,
      page,
      limit,
      totalPages,
      filterOptions: {
        areas: distinctAreas,
        categories: distinctCategories,
        websiteStatuses: distinctWebsiteStatuses,
        qualificationStatuses: distinctQualificationStatuses,
        locationStatuses: distinctLocationStatuses,
        sources: distinctSources,
        datasetFiles: distinctDatasetFiles,
      },
    };
  }
}
