import type {
  CompanyEnrichment,
  Lead,
  TimingSignal,
} from "@/app/generated/prisma/client";
import type {
  CompanyFunding,
  CompanySignals,
  CompanyTechStack,
} from "@/lib/enrichment/types";
import type { LeadScoreLLMOutput } from "@/lib/icp/schema";
import type { ICPCriteriaData, UserProfileData } from "@/lib/settings/types";

export type ScrapedPost = {
  text: string;
  postedAt?: string;
  url?: string;
};

export type ParsedCompanyEnrichment = {
  domain: string;
  companyName?: string;
  employeeCount?: number;
  industry?: string;
  funding?: CompanyFunding;
  techStack?: CompanyTechStack;
  signals?: CompanySignals;
};

export type ScoringLead = Pick<
  Lead,
  | "id"
  | "linkedInUrl"
  | "name"
  | "headline"
  | "title"
  | "company"
  | "location"
  | "recentPosts"
  | "rawProfileSnapshot"
> & {
  companyEnrichment?: CompanyEnrichment | null;
};

export type ScoringContext = {
  lead: ScoringLead;
  enrichment: ParsedCompanyEnrichment | null;
  icp: ICPCriteriaData;
  product: UserProfileData | null;
  recentPosts: ScrapedPost[];
};

export type RuleDimensionScores = {
  title: number;
  company: number;
  industry: number;
  geo: number;
  techStack: number;
  signals: number;
};

export type RuleScoreResult = {
  dimensionScores: RuleDimensionScores;
  fitPercent: number;
  fitReasons: string[];
  disqualifiers: string[];
  hardDisqualified: boolean;
};

export type StoredDimensionScores = RuleDimensionScores & {
  ruleFitPercent: number;
  llmFitPercent?: number;
  llm?: LeadScoreLLMOutput["dimension_scores"];
};

export type HybridScoreResult = {
  fitPercent: number;
  dimensionScores: StoredDimensionScores;
  fitReasons: string[];
  disqualifiers: string[];
  painPoints: string[];
  recommendedOffer: string | null;
  timingSignal: TimingSignal;
  ruleFitPercent: number;
  llmFitPercent: number | null;
  hardDisqualified: boolean;
};

export type ScoreLeadResult = {
  leadId: string;
  status: "scored" | "skipped" | "archived";
  fitPercent?: number;
  leadScoreId?: string;
  message?: string;
};

export type ScoreLeadsBatchResult = {
  processed: number;
  scored: number;
  archived: number;
  skipped: number;
  errors: number;
  results: ScoreLeadResult[];
};
