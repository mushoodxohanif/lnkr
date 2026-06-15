export { flashModel, proModel } from "@/lib/ai/models";
export { logScoringActivity } from "@/lib/icp/activity";
export {
  isScoringConfigured,
  LLM_SCORE_WEIGHT,
  RULE_SCORE_WEIGHT,
} from "@/lib/icp/config";
export {
  buildScoringContextFromRecords,
  loadICPCriteria,
  loadScoringContext,
  loadUserProfile,
  mapDbICPCriteria,
  parseCompanyEnrichment,
} from "@/lib/icp/context";
export { evaluateLeadWithLLM } from "@/lib/icp/llm-evaluator";
export { buildScoringPrompt } from "@/lib/icp/prompts";
export { scoreLeadWithRules } from "@/lib/icp/rules";
export {
  type LeadScoreLLMOutput,
  leadScoreSchema,
  llmDimensionScoresSchema,
  type TimingSignalValue,
  timingSignalSchema,
} from "@/lib/icp/schema";
export {
  formatScoringBatchMessage,
  type ScoreLeadOptions,
  type ScoreLeadsBatchOptions,
  scoreLead,
  scoreLeadsBatch,
} from "@/lib/icp/score-lead";
export { scoreLeadHybrid } from "@/lib/icp/scorer";
export type {
  HybridScoreResult,
  ParsedCompanyEnrichment,
  RuleDimensionScores,
  RuleScoreResult,
  ScoreLeadResult,
  ScoreLeadsBatchResult,
  ScoringContext,
  ScoringLead,
  ScrapedPost,
  StoredDimensionScores,
} from "@/lib/icp/types";
