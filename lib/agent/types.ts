import type { LeadScore, TimingSignal } from "@/app/generated/prisma/client";
import type { ScoringContext } from "@/lib/icp/types";

export type ContentScoreContext = Pick<
  LeadScore,
  | "fitPercent"
  | "fitReasons"
  | "painPoints"
  | "recommendedOffer"
  | "timingSignal"
>;

export type ContentContext = ScoringContext & {
  score: ContentScoreContext;
};

export type GeneratedLeadContent = {
  warmingComment: string | null;
  connectionNote: string;
  painPoints: string[];
  personalizationHooks: string[];
  referencedPostDetail?: string;
  insightHook?: string;
};

export type GenerateContentResult = {
  leadId: string;
  status: "generated" | "skipped" | "error";
  generatedContentId?: string;
  message?: string;
};

export type GenerateContentBatchResult = {
  processed: number;
  generated: number;
  skipped: number;
  errors: number;
  results: GenerateContentResult[];
};

export type TimingSignalLabel = Lowercase<TimingSignal>;
