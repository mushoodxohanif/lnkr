export type EnrichmentProviderName = "datalayer" | "apollo";

export type CompanyEnrichmentInput = {
  domain?: string;
  companyName?: string;
  linkedInUrl?: string;
};

export type ContactEnrichmentInput = {
  linkedInUrl?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  title?: string;
};

export type CompanyFunding = {
  totalAmount?: number;
  lastRoundType?: string;
  lastRoundDate?: string;
  leadInvestors?: string[];
  revenueRange?: string;
  annualRevenue?: number;
  events?: Array<{
    type?: string;
    date?: string;
    amount?: string;
    investors?: string;
  }>;
};

export type CompanyTechStack = {
  technologies: string[];
  crm?: string;
  cms?: string;
  cloud?: string;
  marketing?: string;
  sales?: string;
  analytics?: string;
  development?: string[];
  ecommerce?: string;
};

export type CompanySignals = {
  employeeGrowthRate?: number;
  monthlyTraffic?: number;
  organicTraffic?: number;
  googleAdSpend?: number;
  openRoles?: Record<string, number>;
  hasMobileApp?: boolean;
  hasWebApp?: boolean;
  hiringSignals?: string[];
  headquarters?: {
    city?: string;
    state?: string;
    countryCode?: string;
  };
  founded?: number;
  specialties?: string[];
};

export type EnrichedCompanyData = {
  domain: string;
  companyName?: string;
  employeeCount?: number;
  industry?: string;
  funding?: CompanyFunding;
  techStack?: CompanyTechStack;
  signals?: CompanySignals;
  provider: EnrichmentProviderName;
  raw?: Record<string, unknown>;
};

export type EnrichedContactData = {
  fullName?: string;
  email?: string;
  emailStatus?: string;
  title?: string;
  companyName?: string;
  jobLevel?: string;
  jobFunction?: string;
  linkedInUrl?: string;
  skills?: string[];
  location?: {
    city?: string;
    state?: string;
    countryCode?: string;
  };
  provider: EnrichmentProviderName;
  raw?: Record<string, unknown>;
};

export type EnrichCompanyOptions = {
  forceRefresh?: boolean;
};

export type EnrichContactOptions = {
  forceRefresh?: boolean;
};

export type EnrichLeadResult = {
  leadId: string;
  status: "cached" | "enriched" | "skipped" | "not_found";
  domain?: string;
  companyEnrichmentId?: string;
  message?: string;
};

export type EnrichLeadsBatchResult = {
  processed: number;
  enriched: number;
  cached: number;
  skipped: number;
  notFound: number;
  errors: number;
  results: EnrichLeadResult[];
};

export class EnrichmentError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EnrichmentError";
  }
}
