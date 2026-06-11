import type {
  ContentStatus,
  LeadStatus,
  TimingSignal,
} from "@/app/generated/prisma/client";
import type { ParsedCompanyEnrichment, ScrapedPost } from "@/lib/icp/types";

export type LeadScoreView = {
  fitPercent: number;
  fitReasons: string[];
  disqualifiers: string[];
  painPoints: string[];
  recommendedOffer: string | null;
  timingSignal: TimingSignal;
  dimensionScores: Record<string, number>;
  scoredAt: Date;
};

export type GeneratedContentView = {
  id: string;
  warmingComment: string | null;
  connectionNote: string | null;
  status: ContentStatus;
};

export type LeadSummaryView = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedInUrl: string;
  headline: string | null;
  status: LeadStatus;
  snoozedUntil: Date | null;
  rank: number;
  score: LeadScoreView | null;
  content: GeneratedContentView | null;
  enrichment: ParsedCompanyEnrichment | null;
};

export type DailyBatchView = {
  id: string;
  date: string;
  leadCount: number;
  leads: LeadSummaryView[];
  runMetadata: Record<string, unknown> | null;
};

export type BatchHistorySummary = {
  id: string;
  date: string;
  leadCount: number;
  actionedCount: number;
  runMetadata: Record<string, unknown> | null;
};

export type LeadDetailView = LeadSummaryView & {
  snListSource: string | null;
  scrapedAt: Date | null;
  recentPosts: ScrapedPost[];
  allContent: GeneratedContentView[];
};
