export { logContentActivity } from "@/lib/agent/activity";
export {
  CONNECTION_NOTE_MAX_CHARS,
  CONTENT_BATCH_CONCURRENCY,
  DAILY_BATCH_SIZE,
  getDailyCronExpression,
  getTimezone,
  isContentGenerationConfigured,
  LEAD_LOOKBACK_DAYS,
  MAX_LEADS_PER_COMPANY,
  TIMING_MULTIPLIERS,
} from "@/lib/agent/config";
export {
  enforceConnectionNoteLimit,
  generateConnectionNote,
  generateLeadContent,
  generateWarmingComment,
} from "@/lib/agent/content-generator";
export { loadContentContext } from "@/lib/agent/context";
export {
  calculateRankScore,
  type RunDailyRankerOptions,
  runDailyRanker,
  selectTopLeadsWithDedup,
} from "@/lib/agent/daily-ranker";
export {
  type GenerateContentBatchOptions,
  type GenerateContentOptions,
  generateContentBatch,
  generateContentForLead,
} from "@/lib/agent/generate-content";
export {
  buildConnectionNotePrompt,
  buildWarmingCommentPrompt,
  formatEnrichment,
  formatFitReasons,
  formatPainPoints,
  formatProductContext,
} from "@/lib/agent/prompts";
export type {
  DailyRankerResult,
  RankedLeadCandidate,
} from "@/lib/agent/ranker-types";
export {
  type ConnectionNoteOutput,
  connectionNoteSchema,
  type WarmingCommentOutput,
  warmingCommentSchema,
} from "@/lib/agent/schema";
export type {
  ContentContext,
  ContentScoreContext,
  GenerateContentBatchResult,
  GenerateContentResult,
  GeneratedLeadContent,
  TimingSignalLabel,
} from "@/lib/agent/types";
