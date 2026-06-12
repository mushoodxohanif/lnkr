"use server";

import { revalidatePath } from "next/cache";
import { isContentGenerationConfigured } from "@/lib/agent/config";
import { runDailyRanker } from "@/lib/agent/daily-ranker";
import { enrichLeadsBatch, isEnrichmentConfigured } from "@/lib/enrichment";
import {
  formatEnrichmentBatchMessage,
  isEnrichmentBlockingMessage,
} from "@/lib/enrichment/blocking";
import { isScoringConfigured, scoreLeadsBatch } from "@/lib/icp";
import { getPipelineReadiness } from "@/lib/pipeline/readiness";
import {
  canRunPlaywrightSync,
  envConfigHint,
  getPipelineBatchLimit,
  isGitHubSyncConfigured,
  isVercelDeployment,
  LOCAL_SYNC_COMMANDS,
} from "@/lib/runtime/deployment";
import type { SyncResult } from "../../packages/sn-scraper/src/types";

export type PipelineActionState = {
  success: boolean;
  message: string;
};

function emptyState(message: string): PipelineActionState {
  return { success: false, message };
}

function revalidatePipelinePaths() {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/leads");
  revalidatePath("/settings/lists");
  revalidatePath("/settings/safety");
}

function formatSyncResult(result: SyncResult): PipelineActionState {
  revalidatePipelinePaths();

  if (result.stoppedReason === "daily_limit" && result.scraped === 0) {
    return emptyState(
      "Daily scrape limit reached. Try again tomorrow or raise DAILY_SCRAPE_LIMIT in environment variables.",
    );
  }

  if (result.stoppedReason === "login_timeout") {
    return emptyState(
      "LinkedIn login required. Open Settings → Safety and run the login flow first.",
    );
  }

  if (result.scraped === 0) {
    return emptyState(
      "No leads saved. Sign in via Settings → Safety, then sync again.",
    );
  }

  const parts = [
    "Playwright sync finished",
    `${result.scraped} saved`,
    result.skipped > 0 ? `${result.skipped} skipped` : null,
    result.errors > 0 ? `${result.errors} errors` : null,
    result.stoppedReason === "daily_limit" ? "stopped at daily limit" : null,
  ].filter(Boolean);

  return {
    success: result.errors === 0,
    message: parts.join(" · "),
  };
}

export async function syncEnabledLists(
  limit?: number,
): Promise<PipelineActionState> {
  if (canRunPlaywrightSync()) {
    try {
      const { runPlaywrightSync } = await import(
        "@/lib/pipeline/playwright-local"
      );
      const result = await runPlaywrightSync();
      return formatSyncResult(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Sync failed unexpectedly.";

      if (message.includes("No enabled lists")) {
        return emptyState(
          "No enabled lists found. Add Sales Navigator lists in Settings first.",
        );
      }

      return emptyState(message);
    }
  }

  if (isGitHubSyncConfigured()) {
    try {
      const { triggerGitHubSync } = await import("@/lib/github/trigger-sync");
      const result = await triggerGitHubSync({ limit });

      revalidatePipelinePaths();

      return {
        success: true,
        message: result.runUrl
          ? `GitHub sync started. Track progress: ${result.runUrl}`
          : "GitHub sync workflow started. Check the Actions tab in your repository, then run the cloud pipeline when it finishes.",
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to trigger GitHub sync workflow.";

      return emptyState(message);
    }
  }

  return emptyState(
    `Sync cannot run on Vercel. On your computer: ${LOCAL_SYNC_COMMANDS.envPull} then ${LOCAL_SYNC_COMMANDS.sync}`,
  );
}

export async function enrichPendingLeads(): Promise<PipelineActionState> {
  if (!isEnrichmentConfigured()) {
    return emptyState(`ENRICHMENT_API_KEY is not set. ${envConfigHint()}`);
  }

  try {
    const result = await enrichLeadsBatch({
      onlyUnenriched: true,
      limit: getPipelineBatchLimit(),
    });

    revalidatePipelinePaths();

    const madeProgress = result.enriched > 0 || result.cached > 0;
    const blockingOnly =
      Boolean(result.blockingError) && !madeProgress && result.errors > 0;

    return {
      success: result.errors === 0 || madeProgress || blockingOnly,
      message: formatEnrichmentBatchMessage(result),
    };
  } catch (error) {
    return emptyState(
      error instanceof Error
        ? error.message
        : "Enrichment failed unexpectedly.",
    );
  }
}

export async function scorePendingLeads(): Promise<PipelineActionState> {
  if (!isScoringConfigured()) {
    return emptyState(
      `GOOGLE_GENERATIVE_AI_API_KEY is not set. ${envConfigHint()}`,
    );
  }

  try {
    const result = await scoreLeadsBatch({
      onlyUnscored: true,
      limit: getPipelineBatchLimit(),
    });

    revalidatePipelinePaths();

    return {
      success: result.errors === 0,
      message: `Scoring finished · ${result.scored} scored · ${result.archived} archived · ${result.skipped} skipped · ${result.errors} errors`,
    };
  } catch (error) {
    return emptyState(
      error instanceof Error ? error.message : "Scoring failed unexpectedly.",
    );
  }
}

export async function buildDailyBatch(
  force = false,
): Promise<PipelineActionState> {
  if (!isContentGenerationConfigured()) {
    return emptyState(
      `GOOGLE_GENERATIVE_AI_API_KEY is not set. ${envConfigHint()}`,
    );
  }

  try {
    const result = await runDailyRanker({
      force,
      generateContent: true,
    });

    revalidatePipelinePaths();

    if (result.status === "skipped") {
      return emptyState(
        result.message ??
          "Today's batch already exists. Use rebuild to replace it.",
      );
    }

    if (result.status === "error") {
      return emptyState(result.message ?? "Daily ranker failed.");
    }

    if (result.selectedCount === 0) {
      return {
        success: true,
        message:
          result.message ??
          "Ranker finished, but no qualified leads were available for today's batch.",
      };
    }

    const draftSummary =
      result.contentGenerated !== undefined
        ? ` · ${result.contentGenerated} drafts generated`
        : "";

    return {
      success: true,
      message: `Today's top ${result.selectedCount} ready (${result.candidateCount} candidates reviewed${draftSummary}).`,
    };
  } catch (error) {
    return emptyState(
      error instanceof Error
        ? error.message
        : "Daily ranker failed unexpectedly.",
    );
  }
}

export async function runCloudPipeline(): Promise<PipelineActionState> {
  const messages: string[] = [];
  const maxRounds = 50;
  let enrichmentBypass = false;

  for (let round = 0; round < maxRounds; round += 1) {
    let readiness = await getPipelineReadiness();

    if (readiness.isComplete) {
      break;
    }

    if (readiness.pendingEnrich > 0 && !enrichmentBypass) {
      const previousPending = readiness.pendingEnrich;
      const enrichResult = await enrichPendingLeads();
      messages.push(enrichResult.message);

      if (
        !enrichResult.success &&
        !isEnrichmentBlockingMessage(enrichResult.message)
      ) {
        return enrichResult;
      }

      readiness = await getPipelineReadiness();

      if (readiness.pendingEnrich >= previousPending) {
        if (isEnrichmentBlockingMessage(enrichResult.message)) {
          enrichmentBypass = true;
          messages.push(
            "Enrichment unavailable — scoring leads using LinkedIn profile data only.",
          );
        } else {
          messages.push(
            `Enrichment paused with ${readiness.pendingEnrich} lead${readiness.pendingEnrich === 1 ? "" : "s"} still unenriched.`,
          );
          break;
        }
      } else {
        continue;
      }
    }

    readiness = await getPipelineReadiness();

    if (readiness.pendingScore > 0) {
      const previousPending = readiness.pendingScore;
      const scoreResult = await scorePendingLeads();
      if (!scoreResult.success) {
        return scoreResult;
      }
      messages.push(scoreResult.message);

      readiness = await getPipelineReadiness();
      if (readiness.pendingScore >= previousPending) {
        messages.push(
          `Scoring paused with ${readiness.pendingScore} lead${readiness.pendingScore === 1 ? "" : "s"} still unscored.`,
        );
        break;
      }

      continue;
    }

    if (!readiness.todayBatchExists) {
      const rankResult = await buildDailyBatch(false);
      if (
        !rankResult.success &&
        rankResult.message.includes("already exists")
      ) {
        messages.push("Today's batch was already built.");
        break;
      }

      if (!rankResult.success) {
        return rankResult;
      }

      messages.push(rankResult.message);
      break;
    }

    if (
      readiness.todayBatchExists &&
      readiness.qualifiedCount > readiness.todayBatchLeadCount
    ) {
      const rankResult = await buildDailyBatch(true);
      if (!rankResult.success) {
        return rankResult;
      }
      messages.push(rankResult.message);
      break;
    }

    break;
  }

  const finalReadiness = await getPipelineReadiness();
  if (messages.length === 0) {
    if (finalReadiness.isComplete) {
      return {
        success: true,
        message: finalReadiness.statusSummary,
      };
    }

    return emptyState("No cloud pipeline steps were run.");
  }

  if (finalReadiness.isComplete) {
    return {
      success: true,
      message: `${messages.join(" ")} ${finalReadiness.statusSummary}`,
    };
  }

  const remaining: string[] = [];
  if (finalReadiness.pendingEnrich > 0) {
    remaining.push(`${finalReadiness.pendingEnrich} still need enrichment`);
  }
  if (finalReadiness.pendingScore > 0) {
    remaining.push(`${finalReadiness.pendingScore} still need scoring`);
  }
  if (!finalReadiness.todayBatchExists) {
    remaining.push("today's batch not built yet");
  }

  return {
    success: true,
    message: `${messages.join(" ")} Partial run — ${remaining.join(", ")}. Click again to continue.`,
  };
}

function shouldContinueAfterSync(
  syncResult: PipelineActionState,
  usedGitHubSync: boolean,
): boolean {
  if (syncResult.success) {
    return true;
  }

  if (syncResult.message.includes("Daily scrape limit")) {
    return true;
  }

  if (usedGitHubSync && syncResult.message.includes("GitHub sync")) {
    return true;
  }

  return false;
}

/** Sync (when needed) + enrich + score + build batch in one action. */
export async function runCompletePipeline(): Promise<PipelineActionState> {
  const messages: string[] = [];
  const readiness = await getPipelineReadiness();

  if (readiness.isComplete) {
    return {
      success: true,
      message: readiness.statusSummary,
    };
  }

  if (readiness.willRunSync) {
    const syncResult = await syncEnabledLists();
    const canSyncGitHub = isGitHubSyncConfigured();

    if (!shouldContinueAfterSync(syncResult, canSyncGitHub)) {
      return syncResult;
    }

    messages.push(syncResult.message);

    if (canSyncGitHub && syncResult.success) {
      const afterSync = await getPipelineReadiness();
      if (
        afterSync.willRunEnrich ||
        afterSync.willRunScore ||
        afterSync.willRunBatch
      ) {
        return {
          success: true,
          message: `${messages.join(" ")} GitHub sync runs in the background (~10–30 min). Click Run complete pipeline again after it finishes to enrich, score, and build today's batch.`,
        };
      }
    }
  } else if (readiness.skipSyncReason) {
    messages.push(readiness.skipSyncReason);
  }

  const cloudResult = await runCloudPipeline();

  if (messages.length === 0) {
    return cloudResult;
  }

  return {
    success: cloudResult.success,
    message: `${messages.join(" ")} ${cloudResult.message}`,
  };
}

export async function runFullPipeline(): Promise<PipelineActionState> {
  return runCompletePipeline();
}

export async function startLinkedInLogin(): Promise<PipelineActionState> {
  if (!canRunPlaywrightSync() || isVercelDeployment()) {
    return emptyState(
      `LinkedIn login must run on your computer: ${LOCAL_SYNC_COMMANDS.envPull} then ${LOCAL_SYNC_COMMANDS.login}`,
    );
  }

  try {
    const { runPlaywrightLogin } = await import(
      "@/lib/pipeline/playwright-local"
    );
    const loggedIn = await runPlaywrightLogin();

    revalidatePath("/settings/safety");

    return {
      success: loggedIn,
      message: loggedIn
        ? "LinkedIn session saved. You can sync lists from Settings or the dashboard."
        : "Login timed out. Complete sign-in in the browser window and try again.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not open the LinkedIn login browser.";

    if (
      message.includes("Target.createTarget") ||
      message.includes("Target page, context or browser has been closed")
    ) {
      return emptyState(
        "Could not open a browser tab. Close any Chrome window opened by a previous lnkr login, then try again. If it keeps failing, delete your browser profile folder and sign in again.",
      );
    }

    return emptyState(message);
  }
}
