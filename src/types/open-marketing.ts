export type WebsiteStatus =
  | 'VERIFIED_NO_WEBSITE'
  | 'WEBSITE_FOUND'
  | 'WEBSITE_UNAVAILABLE'
  | 'WEBSITE_BROKEN'
  | 'NEEDS_VERIFICATION';

export type LocationStatus =
  | 'EXACT_AREA_MATCH'
  | 'NEARBY_AREA_MATCH'
  | 'CITY_ONLY_MATCH'
  | 'LOCATION_UNVERIFIED';

export type QualificationStatus = 'QUALIFIED' | 'NEEDS_VERIFICATION' | 'UNQUALIFIED';

export type ScoreLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
}

export interface WebsiteAnalysis {
  isAccessible: boolean;
  statusCode: number | null;
  hasHttps: boolean;
  isMobileFriendly: boolean;
  hasOutdatedIndicators: boolean;
  outdatedReasons: string[];
  hasContactInfo: boolean;
  extractedEmails: string[];
  extractedPhones: string[];
  socialLinks: SocialLinks;
  improvementOpportunities: string[];
  responseTimeMs: number | null;
  websiteStatus: WebsiteStatus;
}

export interface LeadScores {
  websiteDevScore: number;
  websiteDevRating: ScoreLevel;
  pcRepairScore: number;
  pcRepairRating: ScoreLevel;
  networkingAmcScore: number;
  networkingAmcRating: ScoreLevel;
  qualificationReason: string;
  qualificationStatus: QualificationStatus;
}

export interface BusinessLead {
  id: string;
  businessName: string;
  category: string;
  websiteUrl: string | null;
  rootDomain: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  area: string;
  city: string;
  country: string;
  locationStatus: LocationStatus;
  websiteStatus: WebsiteStatus;
  googleMapsUrl: string | null;
  socialLinks: SocialLinks;
  description: string | null;
  sources: string[];
  websiteAnalysis?: WebsiteAnalysis;
  leadScores: LeadScores;
  collectedAt: string;
  primaryOpportunity?: 'WEB_DEV' | 'PC_REPAIR' | 'NETWORKING_AMC' | 'NONE';
  sourceFile?: string;
  sourceFiles?: string[];
}

export interface FileInfo {
  filename: string;
  path: string;
  exists: boolean;
  sizeBytes: number;
  lastModified: string | null;
  recordsCount: number;
  status: 'OK' | 'MISSING' | 'ERROR';
  fileType?: 'ALL_LEADS' | 'QUALIFIED_LEADS' | 'OTHER';
  errorMessage?: string;
}

export interface SyncResult {
  success: boolean;
  timestamp: string;
  outputDir: string;
  allLeadsCount: number;
  qualifiedLeadsCount: number;
  totalFilesScanned?: number;
  datasetsFound?: string[];
  rawRecordsScanned?: number;
  duplicatesResolved?: number;
  files: Record<string, FileInfo>;
  isStale: boolean;
  warning?: string;
  errors: string[];
}

export interface DashboardKPIs {
  totalLeads: number;
  qualifiedLeads: number;
  needsVerification: number;
  unqualifiedLeads: number;
  withoutWebsites: number;
  brokenWebsites: number;
  workingWebsites: number;
  unavailableWebsites: number;
  withPhone: number;
  withEmail: number;
  withVerifiedContacts: number;
  topOpportunityBreakdown: {
    webDev: number;
    pcRepair: number;
    networkingAmc: number;
  };
}

export interface DistributionItem {
  name: string;
  value: number;
  color?: string;
  percentage?: number;
}

export interface DashboardCharts {
  qualificationDistribution: DistributionItem[];
  websiteStatusDistribution: DistributionItem[];
  discoverySourcesDistribution: DistributionItem[];
  opportunityDistribution: DistributionItem[];
  locationDistribution: DistributionItem[];
  scoreDistribution: {
    category: string;
    high: number;
    medium: number;
    low: number;
    none: number;
  }[];
}

export interface DashboardData {
  kpis: DashboardKPIs;
  charts: DashboardCharts;
  syncStatus: SyncResult | null;
}

export interface LeadFilterParams {
  search?: string;
  area?: string;
  category?: string;
  websiteStatus?: string;
  locationStatus?: string;
  qualificationStatus?: string;
  source?: string;
  opportunityType?: string;
  datasetFile?: string;
  hasPhone?: boolean;
  hasEmail?: boolean;
  minScore?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filterOptions: {
    areas: string[];
    categories: string[];
    websiteStatuses: string[];
    qualificationStatuses: string[];
    locationStatuses: string[];
    sources: string[];
    datasetFiles?: string[];
  };
  syncStatus?: SyncResult | null;
}

export type BrowserExecutionMode = 'headless' | 'headed';

export type DiscoveryJobStatus =
  | 'IDLE'
  | 'QUEUED'
  | 'RUNNING'
  | 'STOPPING'
  | 'STOPPED'
  | 'COMPLETED'
  | 'FAILED';

export interface DiscoveryJobState {
  jobId: string | null;
  status: DiscoveryJobStatus;
  category: string;
  area: string;
  city: string;
  startTime: number | null;
  endTime: number | null;
  elapsedSeconds: number;
  logs: string[];
  counters: {
    discoveredCount: number;
    processedCount: number;
    qualifiedCount: number;
    errorCount: number;
  };
  error?: string | null;
  command?: string;
  headless: boolean;
  browserMode: BrowserExecutionMode;
}
