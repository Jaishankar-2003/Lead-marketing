export interface SearchInput {
  category: string;
  area: string;
  city: string;
  country: string;
  maxSubcategories?: number;
  skipWebsiteAnalysis?: boolean;
  browserMode?: 'headless' | 'headed';
  headless?: boolean;
}

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
  socialLinks: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
  improvementOpportunities: string[];
  responseTimeMs: number | null;
  websiteStatus: WebsiteStatus;
}

export interface LeadScores {
  websiteDevScore: number;        // 0 - 100
  websiteDevRating: ScoreLevel;
  pcRepairScore: number;          // 0 - 100
  pcRepairRating: ScoreLevel;
  networkingAmcScore: number;     // 0 - 100
  networkingAmcRating: ScoreLevel;
  qualificationReason: string;
  qualificationStatus: QualificationStatus;
}

export type SearchIntent =
  | 'business_discovery'
  | 'contact_discovery'
  | 'website_discovery'
  | 'locality_grid'
  | 'district_context'
  | 'service_quote';

export interface QueryItem {
  query: string;
  category: string;
  intent?: SearchIntent;
}

export interface SourceMetrics {
  sourceName: string;
  queriesExecuted: number;
  rawResultsCount: number;
  validBusinessCount: number;
  uniqueLeadsContributed: number;
  duplicateCount: number;
  websitesFound: number;
  phonesExtracted: number;
  emailsExtracted: number;
  failedRequests: number;
  executionTimeMs: number;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'DISABLED';
  errorMessage?: string;
}

export interface SearchSourceAdapter {
  readonly sourceName: string;
  readonly isEnabled: boolean;
  healthCheck(): Promise<{
    available: boolean;
    reason?: string;
    authType?: 'api_key' | 'public_web' | 'self_hosted';
  }>;
  search(
    queries: QueryItem[],
    options?: { browser?: any; maxResults?: number }
  ): Promise<RawDiscoveredItem[]>;
  getMetrics(): SourceMetrics;
}

export interface RawDiscoveredItem {
  businessName?: string;
  websiteUrl?: string | null;
  category?: string;
  address?: string | null;
  area?: string;
  city?: string;
  phone?: string | null;
  email?: string | null;
  googleMapsUrl?: string | null;
  description?: string | null;
  source: string;
  rawLocationSnippet?: string | null;
  query?: string;
  searchPosition?: number;
  sourceEvidence?: Array<{
    source: string;
    query?: string;
    position?: number;
    snippet?: string;
    extractedAt: string;
  }>;
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
  socialLinks: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
  description: string | null;
  sources: string[];
  websiteAnalysis?: WebsiteAnalysis;
  leadScores: LeadScores;
  collectedAt: string;
}
