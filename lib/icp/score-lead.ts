import type { LeadStatus, Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { logScoringActivity } from "@/lib/icp/activity";
import { isScoringConfigured } from "@/lib/icp/config";
import { loadScoringContext } from "@/lib/icp/context";
import { scoreLeadHybrid } from "@/lib/icp/scorer";
import type {
  HybridScoreResult,
  ScoreLeadResult,
  ScoreLeadsBatchResult,
} from "@/lib/icp/types";

export type ScoreLeadOptions = {
  skipLlm?: boolean;
  forceRescore?: boolean;
};

function resolveLeadStatus(
  fitPercent: number,
  threshold: number,
  hardDisqualified: boolean,
): LeadStatus {
  if (hardDisqualified || fitPercent < threshold) {
    return "ARCHIVED";
  }

  return "QUALIFIED";
}

async function persistLeadScore(
  leadId: string,
  score: HybridScoreResult,
  threshold: number,
): Promise<{ leadScoreId: string; status: LeadStatus }> {
  const status = resolveLeadStatus(
    score.fitPercent,
    threshold,
    score.hardDisqualified,
  );

  const leadScore = await db.leadScore.create({
    data: {
      leadId,
      fitPercent: score.fitPercent,
      dimensionScores: score.dimensionScores as Prisma.InputJsonValue,
      fitReasons: score.fitReasons,
      disqualifiers: score.disqualifiers,
      painPoints: score.painPoints,
      recommendedOffer: score.recommendedOffer,
      timingSignal: score.timingSignal,
    },
  });

  await db.lead.update({
    where: { id: leadId },
    data: { status },
  });

  return { leadScoreId: leadScore.id, status };
}

export async function scoreLead(
  leadId: string,
  options: ScoreLeadOptions = {},
): Promise<ScoreLeadResult> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: { companyEnrichment: true },
  });

  if (!lead) {
    return {
      leadId,
      status: "skipped",
      message: "Lead not found.",
    };
  }

  const context = await loadScoringContext(lead);
  if (!context) {
    return {
      leadId,
      status: "skipped",
      message: "ICP criteria not configured. Save ICP settings first.",
    };
  }

  if (!options.skipLlm && !isScoringConfigured()) {
    return {
      leadId,
      status: "skipped",
      message:
        "GOOGLE_GENERATIVE_AI_API_KEY is not configured. Set it or pass skipLlm for rule-only scoring.",
    };
  }

  if (!options.forceRescore) {
    const recentScore = await db.leadScore.findFirst({
      where: { leadId },
      orderBy: { scoredAt: "desc" },
    });

    if (recentScore) {
      return {
        leadId,
        status:
          recentScore.fitPercent >= context.icp.fitThreshold
            ? "scored"
            : "archived",
        fitPercent: recentScore.fitPercent,
        leadScoreId: recentScore.id,
        message: "Lead already scored. Use forceRescore to re-run.",
      };
    }
  }

  try {
    const hybridScore = await scoreLeadHybrid(context, {
      skipLlm: options.skipLlm,
    });

    const { leadScoreId, status } = await persistLeadScore(
      leadId,
      hybridScore,
      context.icp.fitThreshold,
    );

    await logScoringActivity("score_lead", "LeadScore", leadScoreId, {
      leadId,
      fitPercent: hybridScore.fitPercent,
      ruleFitPercent: hybridScore.ruleFitPercent,
      llmFitPercent: hybridScore.llmFitPercent,
      timingSignal: hybridScore.timingSignal,
      status,
      skipLlm: options.skipLlm ?? false,
    });

    return {
      leadId,
      status: status === "ARCHIVED" ? "archived" : "scored",
      fitPercent: hybridScore.fitPercent,
      leadScoreId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown scoring error";

    await logScoringActivity("score_lead_error", "Lead", leadId, { message });

    throw error;
  }
}

export type ScoreLeadsBatchOptions = {
  skipLlm?: boolean;
  forceRescore?: boolean;
  limit?: number;
  onlyUnscored?: boolean;
  statuses?: LeadStatus[];
};

export async function scoreLeadsBatch(
  options: ScoreLeadsBatchOptions = {},
): Promise<ScoreLeadsBatchResult> {
  const statuses = options.statuses ?? ["NEW"];
  const leads = await db.lead.findMany({
    where: {
      status: { in: statuses },
      ...(options.onlyUnscored === false
        ? {}
        : {
            scores: { none: {} },
          }),
    },
    orderBy: { scrapedAt: "desc" },
    take: options.limit ?? 50,
    select: { id: true },
  });

  const results: ScoreLeadResult[] = [];
  let scored = 0;
  let archived = 0;
  let skipped = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      const result = await scoreLead(lead.id, {
        skipLlm: options.skipLlm,
        forceRescore: options.forceRescore,
      });
      results.push(result);

      switch (result.status) {
        case "scored":
          scored += 1;
          break;
        case "archived":
          archived += 1;
          break;
        case "skipped":
          skipped += 1;
          break;
      }
    } catch (error) {
      errors += 1;
      results.push({
        leadId: lead.id,
        status: "skipped",
        message:
          error instanceof Error ? error.message : "Unknown scoring error",
      });
    }
  }

  const summary: ScoreLeadsBatchResult = {
    processed: leads.length,
    scored,
    archived,
    skipped,
    errors,
    results,
  };

  await logScoringActivity("score_batch", "Lead", undefined, summary);

  return summary;
}
