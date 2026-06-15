import { z } from "zod";

export const timingSignalSchema = z.enum(["hot", "warm", "cold"]);

export const llmDimensionScoresSchema = z.object({
  title: z.number().min(0).max(100),
  company: z.number().min(0).max(100),
  signals: z.number().min(0).max(100),
  timing: z.number().min(0).max(100),
});

export const leadScoreSchema = z.object({
  fit_percent: z.number().min(0).max(100),
  dimension_scores: llmDimensionScoresSchema,
  fit_reasons: z.array(z.string()).max(5),
  disqualifiers: z.array(z.string()).max(5),
  pain_points: z.array(z.string()).max(5),
  recommended_offer: z.string().max(500),
  timing_signal: timingSignalSchema,
});

export type LeadScoreLLMOutput = z.infer<typeof leadScoreSchema>;
export type TimingSignalValue = z.infer<typeof timingSignalSchema>;
