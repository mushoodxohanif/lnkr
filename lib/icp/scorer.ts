import type { TimingSignal } from "@/app/generated/prisma/client";
import { logScoringActivity } from "@/lib/icp/activity";
import {
  isScoringConfigured,
  LLM_SCORE_WEIGHT,
  RULE_SCORE_WEIGHT,
} from "@/lib/icp/config";
import { getErrorMessage, isLlmFallbackError } from "@/lib/icp/llm-errors";
import { evaluateLeadWithLLM } from "@/lib/icp/llm-evaluator";
import { scoreLeadWithRules } from "@/lib/icp/rules";
import type { LeadScoreLLMOutput } from "@/lib/icp/schema";
import type { HybridScoreResult, ScoringContext } from "@/lib/icp/types";

function mapTimingSignal(
  value: LeadScoreLLMOutput["timing_signal"],
): TimingSignal {
  switch (value) {
    case "hot":
      return "HOT";
    case "cold":
      return "COLD";
    default:
      return "WARM";
  }
}

function mergeUnique(values: string[], limit = 8): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(trimmed);
    if (merged.length >= limit) break;
  }

  return merged;
}

function blendFitPercent(
  ruleFitPercent: number,
  llmFitPercent: number | null,
): number {
  if (llmFitPercent === null) {
    return ruleFitPercent;
  }

  return Math.round(
    ruleFitPercent * RULE_SCORE_WEIGHT + llmFitPercent * LLM_SCORE_WEIGHT,
  );
}

export async function scoreLeadHybrid(
  context: ScoringContext,
  options: { skipLlm?: boolean } = {},
): Promise<HybridScoreResult> {
  const ruleResult = scoreLeadWithRules(context);
  let llmResult: LeadScoreLLMOutput | null = null;
  let ruleOnlyFallback = false;

  if (!options.skipLlm && isScoringConfigured()) {
    try {
      llmResult = await evaluateLeadWithLLM(context);
    } catch (error) {
      if (!isLlmFallbackError(error)) {
        throw error;
      }

      ruleOnlyFallback = true;
      await logScoringActivity(
        "score_lead_llm_fallback",
        "Lead",
        context.lead.id,
        { message: getErrorMessage(error) },
      );
    }
  }

  const llmFitPercent = llmResult?.fit_percent ?? null;
  let fitPercent = blendFitPercent(ruleResult.fitPercent, llmFitPercent);

  const disqualifiers = mergeUnique([
    ...ruleResult.disqualifiers,
    ...(llmResult?.disqualifiers ?? []),
  ]);

  if (ruleResult.hardDisqualified) {
    fitPercent = Math.min(fitPercent, 15);
  }

  const fitReasons = mergeUnique([
    ...ruleResult.fitReasons,
    ...(llmResult?.fit_reasons ?? []),
  ]);

  const painPoints = mergeUnique(llmResult?.pain_points ?? [], 5);
  const recommendedOffer = llmResult?.recommended_offer ?? null;
  const timingSignal = llmResult
    ? mapTimingSignal(llmResult.timing_signal)
    : ruleResult.dimensionScores.signals >= 70
      ? "HOT"
      : "WARM";

  return {
    fitPercent,
    dimensionScores: {
      ...ruleResult.dimensionScores,
      ruleFitPercent: ruleResult.fitPercent,
      llmFitPercent: llmFitPercent ?? undefined,
      llm: llmResult?.dimension_scores,
    },
    fitReasons,
    disqualifiers,
    painPoints,
    recommendedOffer,
    timingSignal,
    ruleFitPercent: ruleResult.fitPercent,
    llmFitPercent,
    hardDisqualified: ruleResult.hardDisqualified,
    ruleOnlyFallback: ruleOnlyFallback || undefined,
  };
}
