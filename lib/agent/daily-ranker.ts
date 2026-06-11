import type {
  LeadScore,
  Prisma,
  TimingSignal,
} from "@/app/generated/prisma/client";
import { logContentActivity } from "@/lib/agent/activity";
import {
  DAILY_BATCH_SIZE,
  getTimezone,
  LEAD_LOOKBACK_DAYS,
  MAX_LEADS_PER_COMPANY,
  TIMING_MULTIPLIERS,
} from "@/lib/agent/config";
import { generateContentBatch } from "@/lib/agent/generate-content";
import type {
  DailyRankerResult,
  RankedLeadCandidate,
} from "@/lib/agent/ranker-types";
import { db } from "@/lib/db";
import { isEnrichmentStale } from "@/lib/enrichment/cache";
import { isEnrichmentConfigured } from "@/lib/enrichment/config";
import { enrichLead } from "@/lib/enrichment/enrich-lead";
import { scoreLead } from "@/lib/icp/score-lead";

export type RunDailyRankerOptions = {
  force?: boolean;
  generateContent?: boolean;
  batchSize?: number;
  lookbackDays?: number;
};

function getBatchDate(timezone = getTimezone()): Date {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(`${dateStr}T00:00:00.000Z`);
}

function getLookbackDate(lookbackDays: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - lookbackDays);
  return date;
}

function getCompanyKey(lead: {
  id: string;
  company: string | null;
  companyEnrichment: { domain: string } | null;
}): string {
  if (lead.companyEnrichment?.domain) {
    return lead.companyEnrichment.domain.trim().toLowerCase();
  }

  if (lead.company?.trim()) {
    return lead.company.trim().toLowerCase();
  }

  return `lead:${lead.id}`;
}

export function calculateRankScore(
  fitPercent: number,
  timingSignal: TimingSignal,
): number {
  return fitPercent * TIMING_MULTIPLIERS[timingSignal];
}

export function selectTopLeadsWithDedup(
  candidates: RankedLeadCandidate[],
  batchSize = DAILY_BATCH_SIZE,
  maxPerCompany = MAX_LEADS_PER_COMPANY,
): RankedLeadCandidate[] {
  const sorted = [...candidates].sort((left, right) => {
    if (right.rankScore !== left.rankScore) {
      return right.rankScore - left.rankScore;
    }

    return right.fitPercent - left.fitPercent;
  });

  const companyCounts = new Map<string, number>();
  const selected: RankedLeadCandidate[] = [];

  for (const candidate of sorted) {
    const currentCount = companyCounts.get(candidate.companyKey) ?? 0;
    if (currentCount >= maxPerCompany) {
      continue;
    }

    companyCounts.set(candidate.companyKey, currentCount + 1);
    selected.push(candidate);

    if (selected.length >= batchSize) {
      break;
    }
  }

  return selected;
}

function toRankedCandidate(
  lead: {
    id: string;
    company: string | null;
    companyEnrichment: { domain: string } | null;
  },
  score: Pick<LeadScore, "id" | "fitPercent" | "timingSignal">,
): RankedLeadCandidate {
  const companyKey = getCompanyKey(lead);

  return {
    leadId: lead.id,
    leadScoreId: score.id,
    companyKey,
    fitPercent: score.fitPercent,
    timingSignal: score.timingSignal,
    rankScore: calculateRankScore(score.fitPercent, score.timingSignal),
  };
}

async function loadBlockedLinkedInUrls(): Promise<Set<string>> {
  const entries = await db.doNotContact.findMany({
    where: { linkedInUrl: { not: null } },
    select: { linkedInUrl: true },
  });

  return new Set(
    entries
      .map((entry) => entry.linkedInUrl?.trim().toLowerCase())
      .filter((url): url is string => Boolean(url)),
  );
}

async function findCandidateLeads(lookbackDays: number) {
  const lookbackDate = getLookbackDate(lookbackDays);
  const now = new Date();
  const blockedUrls = await loadBlockedLinkedInUrls();

  const leads = await db.lead.findMany({
    where: {
      status: "QUALIFIED",
      scrapedAt: { gte: lookbackDate },
      dailyBatchEntries: { none: {} },
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
      scores: { some: {} },
    },
    include: {
      companyEnrichment: true,
      scores: {
        orderBy: { scoredAt: "desc" },
        take: 1,
      },
    },
    orderBy: { scrapedAt: "desc" },
  });

  return leads.filter(
    (lead) => !blockedUrls.has(lead.linkedInUrl.trim().toLowerCase()),
  );
}

async function refreshStaleEnrichmentsAndRescore(
  leads: Awaited<ReturnType<typeof findCandidateLeads>>,
): Promise<{ enrichmentsRefreshed: number; rescored: number }> {
  let enrichmentsRefreshed = 0;
  let rescored = 0;

  if (!isEnrichmentConfigured()) {
    return { enrichmentsRefreshed, rescored };
  }

  for (const lead of leads) {
    const enrichment = lead.companyEnrichment;
    if (!enrichment || !isEnrichmentStale(enrichment.enrichedAt)) {
      continue;
    }

    const enrichResult = await enrichLead(lead.id, { forceRefresh: true });
    if (
      enrichResult.status === "enriched" ||
      enrichResult.status === "cached"
    ) {
      enrichmentsRefreshed += 1;
    }

    const scoreResult = await scoreLead(lead.id, { forceRescore: true });
    if (scoreResult.status === "scored" || scoreResult.status === "archived") {
      rescored += 1;
    }
  }

  return { enrichmentsRefreshed, rescored };
}

async function buildRankedCandidates(
  leadIds: string[],
): Promise<RankedLeadCandidate[]> {
  if (leadIds.length === 0) {
    return [];
  }

  const leads = await db.lead.findMany({
    where: {
      id: { in: leadIds },
      status: "QUALIFIED",
    },
    include: {
      companyEnrichment: true,
      scores: {
        orderBy: { scoredAt: "desc" },
        take: 1,
      },
    },
  });

  const candidates: RankedLeadCandidate[] = [];

  for (const lead of leads) {
    const latestScore = lead.scores[0];
    if (!latestScore) {
      continue;
    }

    candidates.push(toRankedCandidate(lead, latestScore));
  }

  return candidates;
}

async function persistDailyBatch(
  batchDate: Date,
  selected: RankedLeadCandidate[],
  runMetadata: Prisma.InputJsonValue,
): Promise<string> {
  const batch = await db.dailyBatch.create({
    data: {
      date: batchDate,
      top50LeadIds: selected.map((item) => item.leadId),
      runMetadata,
      leads: {
        create: selected.map((item, index) => ({
          leadId: item.leadId,
          rank: index + 1,
        })),
      },
    },
  });

  for (const [index, item] of selected.entries()) {
    await db.leadScore.update({
      where: { id: item.leadScoreId },
      data: { priorityRank: index + 1 },
    });
  }

  return batch.id;
}

export async function runDailyRanker(
  options: RunDailyRankerOptions = {},
): Promise<DailyRankerResult> {
  const batchSize = options.batchSize ?? DAILY_BATCH_SIZE;
  const lookbackDays = options.lookbackDays ?? LEAD_LOOKBACK_DAYS;
  const batchDate = getBatchDate();
  const batchDateLabel = batchDate.toISOString().slice(0, 10);

  const existingBatch = await db.dailyBatch.findUnique({
    where: { date: batchDate },
    select: { id: true },
  });

  if (existingBatch && !options.force) {
    const result: DailyRankerResult = {
      status: "skipped",
      batchDate: batchDateLabel,
      candidateCount: 0,
      selectedCount: 0,
      enrichmentsRefreshed: 0,
      rescored: 0,
      message: "Daily batch already exists for today. Pass force to rebuild.",
    };

    await logContentActivity(
      "daily_ranker_skipped",
      "DailyBatch",
      existingBatch.id,
      result,
    );
    return result;
  }

  if (existingBatch && options.force) {
    await db.dailyBatch.delete({ where: { id: existingBatch.id } });
  }

  const candidateLeads = await findCandidateLeads(lookbackDays);
  const candidateLeadIds = candidateLeads.map((lead) => lead.id);
  const refreshStats = await refreshStaleEnrichmentsAndRescore(candidateLeads);
  const rankedCandidates = await buildRankedCandidates(candidateLeadIds);
  const selected = selectTopLeadsWithDedup(rankedCandidates, batchSize);

  if (selected.length === 0) {
    const result: DailyRankerResult = {
      status: "completed",
      batchDate: batchDateLabel,
      candidateCount: rankedCandidates.length,
      selectedCount: 0,
      enrichmentsRefreshed: refreshStats.enrichmentsRefreshed,
      rescored: refreshStats.rescored,
      message: "No qualified leads available for today's batch.",
      runMetadata: {
        lookbackDays,
        batchSize,
        companyDedupLimit: MAX_LEADS_PER_COMPANY,
      },
    };

    await logContentActivity(
      "daily_ranker_empty",
      "DailyBatch",
      undefined,
      result,
    );
    return result;
  }

  const runMetadata = {
    lookbackDays,
    batchSize,
    companyDedupLimit: MAX_LEADS_PER_COMPANY,
    candidateCount: rankedCandidates.length,
    selectedCount: selected.length,
    enrichmentsRefreshed: refreshStats.enrichmentsRefreshed,
    rescored: refreshStats.rescored,
    timingMultipliers: TIMING_MULTIPLIERS,
    topLeadIds: selected.map((item) => item.leadId),
  } satisfies Record<string, unknown>;

  const batchId = await persistDailyBatch(
    batchDate,
    selected,
    runMetadata as Prisma.InputJsonValue,
  );

  let contentGenerated = 0;
  let contentSkipped = 0;
  let contentErrors = 0;

  if (options.generateContent !== false) {
    const contentResult = await generateContentBatch({
      leadIds: selected.map((item) => item.leadId),
      statuses: ["QUALIFIED"],
    });

    contentGenerated = contentResult.generated;
    contentSkipped = contentResult.skipped;
    contentErrors = contentResult.errors;
  }

  const result: DailyRankerResult = {
    status: "completed",
    batchId,
    batchDate: batchDateLabel,
    candidateCount: rankedCandidates.length,
    selectedCount: selected.length,
    enrichmentsRefreshed: refreshStats.enrichmentsRefreshed,
    rescored: refreshStats.rescored,
    contentGenerated,
    contentSkipped,
    contentErrors,
    runMetadata,
  };

  await logContentActivity(
    "daily_ranker_completed",
    "DailyBatch",
    batchId,
    result,
  );

  return result;
}
