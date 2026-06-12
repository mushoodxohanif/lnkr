import type { PipelineReadiness } from "@/lib/pipeline/readiness";
import type { PipelineConfig } from "@/lib/pipeline/status";

export type PipelineStepId = "sync" | "enrich" | "score" | "batch";

export type PipelineStepStatus =
  | "complete"
  | "in_progress"
  | "pending"
  | "waiting"
  | "blocked"
  | "skipped";

export type PipelineStepProgress = {
  id: PipelineStepId;
  label: string;
  status: PipelineStepStatus;
  detail: string;
  done: number;
  total: number;
  percent: number;
};

export type PipelineProgress = {
  steps: PipelineStepProgress[];
  overallPercent: number;
  currentStepId: PipelineStepId | null;
  isComplete: boolean;
  headline: string;
};

const STATUS_LABELS: Record<PipelineStepStatus, string> = {
  complete: "Complete",
  in_progress: "In progress",
  pending: "Ready to run",
  waiting: "Waiting",
  blocked: "Blocked",
  skipped: "Skipped",
};

export function getPipelineStepStatusLabel(status: PipelineStepStatus): string {
  return STATUS_LABELS[status];
}

function stepPercent(done: number, total: number): number {
  if (total <= 0) return done > 0 ? 100 : 0;
  return Math.min(100, Math.round((done / total) * 100));
}

function buildSyncStep(
  config: PipelineConfig,
  readiness: PipelineReadiness,
): PipelineStepProgress {
  const { dailyScrapeLimit, todayScrapeCount, remainingScrapesToday } = config;
  const done = todayScrapeCount;
  const total = dailyScrapeLimit;

  if (!readiness.canSync) {
    return {
      id: "sync",
      label: "Sync lists",
      status: "blocked",
      detail: "Sync not configured on this deployment.",
      done,
      total,
      percent: stepPercent(done, total),
    };
  }

  if (config.enabledListCount === 0) {
    return {
      id: "sync",
      label: "Sync lists",
      status: "blocked",
      detail: "Enable at least one Sales Navigator list in Settings.",
      done,
      total,
      percent: stepPercent(done, total),
    };
  }

  if (config.syncProvider === "github" && !config.sessionConfigured) {
    return {
      id: "sync",
      label: "Sync lists",
      status: "blocked",
      detail: "LinkedIn session cookies not set up for GitHub sync.",
      done,
      total,
      percent: stepPercent(done, total),
    };
  }

  if (remainingScrapesToday <= 0 && done > 0) {
    return {
      id: "sync",
      label: "Sync lists",
      status: "complete",
      detail: `${done} profile${done === 1 ? "" : "s"} scraped today (daily cap reached).`,
      done,
      total,
      percent: 100,
    };
  }

  if (done > 0 && !readiness.willRunSync) {
    return {
      id: "sync",
      label: "Sync lists",
      status: "complete",
      detail: `${done} profile${done === 1 ? "" : "s"} scraped today${remainingScrapesToday > 0 ? ` · ${remainingScrapesToday} scrape${remainingScrapesToday === 1 ? "" : "s"} left` : ""}.`,
      done,
      total,
      percent: stepPercent(done, total),
    };
  }

  if (readiness.willRunSync) {
    return {
      id: "sync",
      label: "Sync lists",
      status: done > 0 ? "in_progress" : "pending",
      detail:
        config.syncProvider === "github"
          ? "Run sync via GitHub Actions (~10–30 min)."
          : "Pull leads from enabled Sales Navigator lists.",
      done,
      total,
      percent: stepPercent(done, total),
    };
  }

  return {
    id: "sync",
    label: "Sync lists",
    status: "waiting",
    detail: "No profiles scraped yet today.",
    done,
    total,
    percent: stepPercent(done, total),
  };
}

function buildEnrichStep(
  config: PipelineConfig,
  readiness: PipelineReadiness,
): PipelineStepProgress {
  const { enrichedCount, activeLeadCount } = readiness;
  const pending = readiness.pendingEnrich;
  const done = enrichedCount;
  const total = Math.max(activeLeadCount, done + pending);

  if (!config.enrichmentConfigured) {
    return {
      id: "enrich",
      label: "Enrich leads",
      status: "blocked",
      detail: "Set ENRICHMENT_API_KEY to enable enrichment.",
      done,
      total,
      percent: stepPercent(done, total),
    };
  }

  if (total === 0) {
    return {
      id: "enrich",
      label: "Enrich leads",
      status: "waiting",
      detail: "Waiting for leads from sync.",
      done: 0,
      total: 0,
      percent: 0,
    };
  }

  if (pending === 0) {
    return {
      id: "enrich",
      label: "Enrich leads",
      status: "complete",
      detail: `${done} lead${done === 1 ? "" : "s"} enriched.`,
      done,
      total,
      percent: 100,
    };
  }

  return {
    id: "enrich",
    label: "Enrich leads",
    status: done > 0 ? "in_progress" : "pending",
    detail: `${done} of ${total} enriched · ${pending} remaining.`,
    done,
    total,
    percent: stepPercent(done, total),
  };
}

function buildScoreStep(
  config: PipelineConfig,
  readiness: PipelineReadiness,
): PipelineStepProgress {
  const { scoredCount, enrichedCount } = readiness;
  const pending = readiness.pendingScore;
  const total = Math.max(enrichedCount, scoredCount + pending);
  const done = scoredCount;

  if (!config.scoringConfigured) {
    return {
      id: "score",
      label: "Score leads",
      status: "blocked",
      detail: "Set GOOGLE_GENERATIVE_AI_API_KEY to enable scoring.",
      done,
      total,
      percent: stepPercent(done, total),
    };
  }

  if (enrichedCount === 0 && pending === 0) {
    return {
      id: "score",
      label: "Score leads",
      status: "waiting",
      detail: "Waiting for enriched leads.",
      done: 0,
      total: 0,
      percent: 0,
    };
  }

  if (pending === 0 && done > 0) {
    return {
      id: "score",
      label: "Score leads",
      status: "complete",
      detail: `${done} lead${done === 1 ? "" : "s"} scored.`,
      done,
      total,
      percent: 100,
    };
  }

  return {
    id: "score",
    label: "Score leads",
    status: done > 0 ? "in_progress" : "pending",
    detail: `${done} of ${total} scored · ${pending} remaining.`,
    done,
    total,
    percent: stepPercent(done, total),
  };
}

function buildBatchStep(
  config: PipelineConfig,
  readiness: PipelineReadiness,
): PipelineStepProgress {
  const done = readiness.todayBatchExists ? 1 : 0;
  const total = 1;
  const batchDetail =
    readiness.todayBatchLeadCount > 0
      ? `Today's top ${readiness.todayBatchLeadCount} ready on the home page.`
      : "Rank top leads and generate outreach drafts.";

  if (!config.contentConfigured) {
    return {
      id: "batch",
      label: "Build batch",
      status: "blocked",
      detail: "Set GOOGLE_GENERATIVE_AI_API_KEY to build today's batch.",
      done,
      total,
      percent: 0,
    };
  }

  if (readiness.todayBatchExists) {
    return {
      id: "batch",
      label: "Build batch",
      status: "complete",
      detail: batchDetail,
      done: 1,
      total: 1,
      percent: 100,
    };
  }

  if (readiness.pendingEnrich > 0 || readiness.pendingScore > 0) {
    return {
      id: "batch",
      label: "Build batch",
      status: "waiting",
      detail: "Complete enrich and score first.",
      done: 0,
      total: 1,
      percent: 0,
    };
  }

  if (readiness.scoredCount === 0) {
    return {
      id: "batch",
      label: "Build batch",
      status: "waiting",
      detail: "Waiting for scored leads.",
      done: 0,
      total: 1,
      percent: 0,
    };
  }

  return {
    id: "batch",
    label: "Build batch",
    status: "pending",
    detail: batchDetail,
    done: 0,
    total: 1,
    percent: 0,
  };
}

function findCurrentStep(steps: PipelineStepProgress[]): PipelineStepId | null {
  const order: PipelineStepId[] = ["sync", "enrich", "score", "batch"];

  for (const id of order) {
    const step = steps.find((item) => item.id === id);
    if (!step) continue;
    if (
      step.status === "pending" ||
      step.status === "in_progress" ||
      step.status === "waiting"
    ) {
      return id;
    }
  }

  return null;
}

export function buildPipelineProgress(
  config: PipelineConfig,
  readiness: PipelineReadiness,
): PipelineProgress {
  const steps = [
    buildSyncStep(config, readiness),
    buildEnrichStep(config, readiness),
    buildScoreStep(config, readiness),
    buildBatchStep(config, readiness),
  ];

  const overallPercent = Math.round(
    steps.reduce((sum, step) => sum + step.percent, 0) / steps.length,
  );
  const isComplete = readiness.isComplete;
  const currentStepId = isComplete ? null : findCurrentStep(steps);

  const headline = isComplete
    ? "Pipeline complete for today"
    : currentStepId
      ? `Current step: ${steps.find((s) => s.id === currentStepId)?.label ?? "Pipeline"}`
      : readiness.statusSummary;

  return {
    steps,
    overallPercent,
    currentStepId,
    isComplete,
    headline,
  };
}
