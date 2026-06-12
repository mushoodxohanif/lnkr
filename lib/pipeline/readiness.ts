import { getTimezone } from "@/lib/agent/config";
import { db } from "@/lib/db";
import {
  canRunPlaywrightSync,
  getSyncProvider,
  isGitHubSessionConfigured,
  isGitHubSyncConfigured,
} from "@/lib/runtime/deployment";
import { getSafetyConfig, getTodayScrapeCount } from "@/lib/safety/config";

function getBatchDate(): Date {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: getTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(`${dateStr}T00:00:00.000Z`);
}

export type PipelineReadiness = {
  pendingEnrich: number;
  pendingScore: number;
  todayBatchExists: boolean;
  todayBatchLeadCount: number;
  todayScrapeCount: number;
  remainingScrapesToday: number;
  enabledListCount: number;
  activeLeadCount: number;
  enrichedCount: number;
  scoredCount: number;
  canSync: boolean;
  willRunSync: boolean;
  willRunEnrich: boolean;
  willRunScore: boolean;
  willRunBatch: boolean;
  skipSyncReason: string | null;
  statusSummary: string;
  isComplete: boolean;
};

async function countPendingScore(): Promise<number> {
  return db.lead.count({
    where: {
      status: "NEW",
      scores: { none: {} },
    },
  });
}

async function hasTodayBatch(): Promise<{
  exists: boolean;
  leadCount: number;
}> {
  const batch = await db.dailyBatch.findUnique({
    where: { date: getBatchDate() },
    select: {
      id: true,
      _count: { select: { leads: true } },
    },
  });

  return {
    exists: batch !== null,
    leadCount: batch?._count.leads ?? 0,
  };
}

async function countActiveLeads(): Promise<number> {
  return db.lead.count({
    where: {
      status: { not: "ARCHIVED" },
      scrapedAt: { not: null },
    },
  });
}

async function countEnrichedActiveLeads(): Promise<number> {
  return db.lead.count({
    where: {
      status: { not: "ARCHIVED" },
      scrapedAt: { not: null },
      companyEnrichmentId: { not: null },
    },
  });
}

async function countScoredActiveLeads(): Promise<number> {
  return db.lead.count({
    where: {
      status: { not: "ARCHIVED" },
      scrapedAt: { not: null },
      scores: { some: {} },
    },
  });
}

async function countPendingEnrichActive(): Promise<number> {
  return db.lead.count({
    where: {
      status: { not: "ARCHIVED" },
      scrapedAt: { not: null },
      companyEnrichmentId: null,
    },
  });
}

function resolveSyncDecision(input: {
  canSync: boolean;
  syncProvider: ReturnType<typeof getSyncProvider>;
  sessionConfigured: boolean;
  enabledListCount: number;
  remainingScrapesToday: number;
  todayScrapeCount: number;
  pendingEnrich: number;
  pendingScore: number;
  todayBatchExists: boolean;
}): { willRunSync: boolean; skipSyncReason: string | null } {
  if (!input.canSync) {
    return { willRunSync: false, skipSyncReason: null };
  }

  if (input.enabledListCount === 0) {
    return {
      willRunSync: false,
      skipSyncReason: "No enabled lists — skipped sync.",
    };
  }

  if (input.syncProvider === "github" && !input.sessionConfigured) {
    return {
      willRunSync: false,
      skipSyncReason:
        "LinkedIn session not configured for GitHub sync — skipped sync.",
    };
  }

  if (input.remainingScrapesToday <= 0) {
    return {
      willRunSync: false,
      skipSyncReason:
        "Daily scrape limit reached — skipped sync, continuing with cloud steps on existing leads.",
    };
  }

  const cloudPending =
    input.pendingEnrich > 0 ||
    input.pendingScore > 0 ||
    !input.todayBatchExists;

  if (input.todayScrapeCount > 0 && cloudPending) {
    return {
      willRunSync: false,
      skipSyncReason: `Sync already ran today (${input.todayScrapeCount} profile${input.todayScrapeCount === 1 ? "" : "s"}) — continuing with enrich, score, and batch.`,
    };
  }

  if (input.todayScrapeCount > 0 && !cloudPending && input.todayBatchExists) {
    return { willRunSync: true, skipSyncReason: null };
  }

  if (input.todayScrapeCount === 0) {
    return { willRunSync: true, skipSyncReason: null };
  }

  return { willRunSync: false, skipSyncReason: null };
}

function buildStatusSummary(input: {
  isComplete: boolean;
  willRunSync: boolean;
  willRunEnrich: boolean;
  willRunScore: boolean;
  willRunBatch: boolean;
  pendingEnrich: number;
  pendingScore: number;
  skipSyncReason: string | null;
}): string {
  if (input.isComplete) {
    return "Today's pipeline is complete — your batch is ready on the home page.";
  }

  const steps: string[] = [];
  if (input.willRunSync) steps.push("sync lists");
  if (input.willRunEnrich) {
    steps.push(
      `enrich ${input.pendingEnrich} lead${input.pendingEnrich === 1 ? "" : "s"}`,
    );
  }
  if (input.willRunScore) {
    steps.push(
      `score ${input.pendingScore} lead${input.pendingScore === 1 ? "" : "s"}`,
    );
  }
  if (input.willRunBatch) steps.push("build today's batch");

  if (steps.length === 0) {
    return input.skipSyncReason ?? "Nothing to run right now.";
  }

  return `Next: ${steps.join(" → ")}.`;
}

export async function getPipelineReadiness(): Promise<PipelineReadiness> {
  const safety = getSafetyConfig();
  const canSyncLocal = canRunPlaywrightSync();
  const canSyncGitHub = isGitHubSyncConfigured();
  const canSync = canSyncLocal || canSyncGitHub;
  const syncProvider = getSyncProvider();
  const sessionConfigured = canSyncLocal
    ? safety.browserProfileExists
    : isGitHubSessionConfigured();

  const [
    enabledListCount,
    todayScrapeCount,
    pendingEnrich,
    pendingScore,
    todayBatch,
    activeLeadCount,
    enrichedCount,
    scoredCount,
  ] = await Promise.all([
    db.snListConfig.count({ where: { enabled: true } }),
    getTodayScrapeCount(),
    countPendingEnrichActive(),
    countPendingScore(),
    hasTodayBatch(),
    countActiveLeads(),
    countEnrichedActiveLeads(),
    countScoredActiveLeads(),
  ]);

  const todayBatchExists = todayBatch.exists;
  const todayBatchLeadCount = todayBatch.leadCount;

  const remainingScrapesToday = Math.max(
    0,
    safety.dailyScrapeLimit - todayScrapeCount,
  );

  const { willRunSync, skipSyncReason } = resolveSyncDecision({
    canSync,
    syncProvider,
    sessionConfigured,
    enabledListCount,
    remainingScrapesToday,
    todayScrapeCount,
    pendingEnrich,
    pendingScore,
    todayBatchExists,
  });

  const willRunEnrich = pendingEnrich > 0;
  const willRunScore = pendingScore > 0;
  const willRunBatch = !todayBatchExists;
  const isComplete =
    !willRunSync && !willRunEnrich && !willRunScore && !willRunBatch;

  return {
    pendingEnrich,
    pendingScore,
    todayBatchExists,
    todayBatchLeadCount,
    todayScrapeCount,
    remainingScrapesToday,
    enabledListCount,
    activeLeadCount,
    enrichedCount,
    scoredCount,
    canSync,
    willRunSync,
    willRunEnrich,
    willRunScore,
    willRunBatch,
    skipSyncReason,
    statusSummary: buildStatusSummary({
      isComplete,
      willRunSync,
      willRunEnrich,
      willRunScore,
      willRunBatch,
      pendingEnrich,
      pendingScore,
      skipSyncReason,
    }),
    isComplete,
  };
}
