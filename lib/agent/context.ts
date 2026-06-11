import type { LeadScore } from "@/app/generated/prisma/client";
import type { ContentContext, ContentScoreContext } from "@/lib/agent/types";
import { db } from "@/lib/db";
import { loadScoringContext } from "@/lib/icp/context";

function mapLeadScore(
  score: Pick<
    LeadScore,
    | "fitPercent"
    | "fitReasons"
    | "painPoints"
    | "recommendedOffer"
    | "timingSignal"
  >,
): ContentScoreContext {
  return {
    fitPercent: score.fitPercent,
    fitReasons: score.fitReasons,
    painPoints: score.painPoints,
    recommendedOffer: score.recommendedOffer,
    timingSignal: score.timingSignal,
  };
}

export async function loadContentContext(
  leadId: string,
): Promise<ContentContext | null> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      companyEnrichment: true,
      scores: {
        orderBy: { scoredAt: "desc" },
        take: 1,
      },
    },
  });

  if (!lead) return null;

  const latestScore = lead.scores[0];
  if (!latestScore) return null;

  const scoringContext = await loadScoringContext(lead);
  if (!scoringContext) return null;

  return {
    ...scoringContext,
    score: mapLeadScore(latestScore),
  };
}
