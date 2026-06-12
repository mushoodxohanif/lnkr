import type { LeadScore } from "@/app/generated/prisma/client";
import { getTimezone } from "@/lib/agent/config";
import type {
  BatchHistorySummary,
  DailyBatchView,
  GeneratedContentView,
  LeadDetailView,
  LeadScoreView,
  LeadSummaryView,
} from "@/lib/dashboard/types";
import { db } from "@/lib/db";
import { parseCompanyEnrichment } from "@/lib/icp/context";
import type { ScoringLead, ScrapedPost } from "@/lib/icp/types";
import { parseStringArray } from "@/lib/settings/types";

function getBatchDate(timezone = getTimezone()): Date {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(`${dateStr}T00:00:00.000Z`);
}

function parseRecentPosts(value: unknown): ScrapedPost[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is ScrapedPost =>
        typeof item === "object" &&
        item !== null &&
        "text" in item &&
        typeof item.text === "string" &&
        item.text.trim().length > 0,
    )
    .map((item) => ({
      text: item.text.trim(),
      postedAt: item.postedAt,
      url: item.url,
    }));
}

function parseDimensionScores(value: unknown): Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const scores: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number" && Number.isFinite(raw)) {
      scores[key] = raw;
    }
  }

  return scores;
}

function mapLeadScore(score: LeadScore): LeadScoreView {
  return {
    fitPercent: score.fitPercent,
    fitReasons: parseStringArray(score.fitReasons),
    disqualifiers: parseStringArray(score.disqualifiers),
    painPoints: parseStringArray(score.painPoints),
    recommendedOffer: score.recommendedOffer,
    timingSignal: score.timingSignal,
    dimensionScores: parseDimensionScores(score.dimensionScores),
    scoredAt: score.scoredAt,
  };
}

function mapGeneratedContent(
  content: {
    id: string;
    warmingComment: string | null;
    connectionNote: string | null;
    status: GeneratedContentView["status"];
  } | null,
): GeneratedContentView | null {
  if (!content) return null;

  return {
    id: content.id,
    warmingComment: content.warmingComment,
    connectionNote: content.connectionNote,
    status: content.status,
  };
}

type LeadWithRelations = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedInUrl: string;
  headline: string | null;
  recentPosts: ScoringLead["recentPosts"];
  rawProfileSnapshot: ScoringLead["rawProfileSnapshot"];
  status: LeadSummaryView["status"];
  snoozedUntil: Date | null;
  companyEnrichment: Parameters<typeof parseCompanyEnrichment>[0];
  scores: LeadScore[];
  generatedContent: Array<{
    id: string;
    warmingComment: string | null;
    connectionNote: string | null;
    status: GeneratedContentView["status"];
  }>;
};

function mapLeadSummary(
  lead: LeadWithRelations,
  rank: number,
): LeadSummaryView {
  const latestScore = lead.scores[0] ?? null;
  const latestContent = lead.generatedContent[0] ?? null;

  return {
    id: lead.id,
    name: lead.name,
    title: lead.title,
    company: lead.company,
    location: lead.location,
    linkedInUrl: lead.linkedInUrl,
    headline: lead.headline,
    status: lead.status,
    snoozedUntil: lead.snoozedUntil,
    rank,
    score: latestScore ? mapLeadScore(latestScore) : null,
    content: mapGeneratedContent(latestContent),
    enrichment: parseCompanyEnrichment(lead.companyEnrichment, lead),
  };
}

export async function getTodayBatch(): Promise<DailyBatchView | null> {
  const batchDate = getBatchDate();

  const batch = await db.dailyBatch.findUnique({
    where: { date: batchDate },
    include: {
      leads: {
        orderBy: { rank: "asc" },
        include: {
          lead: {
            include: {
              companyEnrichment: true,
              scores: {
                orderBy: { scoredAt: "desc" },
                take: 1,
              },
              generatedContent: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!batch) return null;

  const runMetadata =
    typeof batch.runMetadata === "object" &&
    batch.runMetadata !== null &&
    !Array.isArray(batch.runMetadata)
      ? (batch.runMetadata as Record<string, unknown>)
      : null;

  return {
    id: batch.id,
    date: batch.date.toISOString().slice(0, 10),
    leadCount: batch.leads.length,
    runMetadata,
    leads: batch.leads.map((entry) => mapLeadSummary(entry.lead, entry.rank)),
  };
}

export async function getPastBatches(
  limit = 30,
): Promise<BatchHistorySummary[]> {
  const batches = await db.dailyBatch.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      leads: {
        include: {
          lead: {
            select: { status: true },
          },
        },
      },
    },
  });

  return batches.map((batch) => {
    const actionedCount = batch.leads.filter(
      (entry) =>
        entry.lead.status === "SENT" || entry.lead.status === "SKIPPED",
    ).length;

    return {
      id: batch.id,
      date: batch.date.toISOString().slice(0, 10),
      leadCount: batch.leads.length,
      actionedCount,
      runMetadata:
        typeof batch.runMetadata === "object" &&
        batch.runMetadata !== null &&
        !Array.isArray(batch.runMetadata)
          ? (batch.runMetadata as Record<string, unknown>)
          : null,
    };
  });
}

export async function getBatchByDate(
  date: string,
): Promise<DailyBatchView | null> {
  const batch = await db.dailyBatch.findUnique({
    where: { date: new Date(`${date}T00:00:00.000Z`) },
    include: {
      leads: {
        orderBy: { rank: "asc" },
        include: {
          lead: {
            include: {
              companyEnrichment: true,
              scores: {
                orderBy: { scoredAt: "desc" },
                take: 1,
              },
              generatedContent: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!batch) return null;

  const runMetadata =
    typeof batch.runMetadata === "object" &&
    batch.runMetadata !== null &&
    !Array.isArray(batch.runMetadata)
      ? (batch.runMetadata as Record<string, unknown>)
      : null;

  return {
    id: batch.id,
    date: batch.date.toISOString().slice(0, 10),
    leadCount: batch.leads.length,
    runMetadata,
    leads: batch.leads.map((entry) => mapLeadSummary(entry.lead, entry.rank)),
  };
}

export async function getLeadDetail(
  leadId: string,
): Promise<LeadDetailView | null> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      companyEnrichment: true,
      scores: {
        orderBy: { scoredAt: "desc" },
        take: 1,
      },
      generatedContent: {
        orderBy: { createdAt: "desc" },
      },
      dailyBatchEntries: {
        orderBy: { dailyBatch: { date: "desc" } },
        take: 1,
        include: { dailyBatch: true },
      },
    },
  });

  if (!lead) return null;

  const rank = lead.dailyBatchEntries[0]?.rank ?? 0;
  const summary = mapLeadSummary(lead, rank);

  return {
    ...summary,
    snListSource: lead.snListSource,
    scrapedAt: lead.scrapedAt,
    notes: lead.notes,
    recentPosts: parseRecentPosts(lead.recentPosts),
    allContent: lead.generatedContent.map((content) => ({
      id: content.id,
      warmingComment: content.warmingComment,
      connectionNote: content.connectionNote,
      status: content.status,
    })),
  };
}
