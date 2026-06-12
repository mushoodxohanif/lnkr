"use server";

import { revalidatePath } from "next/cache";
import { isContentGenerationConfigured } from "@/lib/agent/config";
import { runDailyRanker } from "@/lib/agent/daily-ranker";
import { enrichLeadsBatch, isEnrichmentConfigured } from "@/lib/enrichment";
import { isScoringConfigured, scoreLeadsBatch } from "@/lib/icp";
import {
  canRunPlaywrightSync,
  envConfigHint,
  getPipelineBatchLimit,
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

export async function syncEnabledLists(): Promise<PipelineActionState> {
  if (!canRunPlaywrightSync()) {
    return emptyState(
      `Sync cannot run on Vercel. On your computer: ${LOCAL_SYNC_COMMANDS.envPull} then ${LOCAL_SYNC_COMMANDS.sync}`,
    );
  }

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

    return {
      success: result.errors === 0,
      message: `Enrichment finished · ${result.enriched} enriched · ${result.cached} cached · ${result.skipped} skipped · ${result.errors} errors`,
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
  const enrichResult = await enrichPendingLeads();
  if (!enrichResult.success) {
    return enrichResult;
  }

  const scoreResult = await scorePendingLeads();
  if (!scoreResult.success) {
    return scoreResult;
  }

  const rankResult = await buildDailyBatch(false);
  if (!rankResult.success && rankResult.message.includes("already exists")) {
    return {
      success: true,
      message: `Cloud pipeline finished. ${enrichResult.message} ${scoreResult.message} Today's batch was already built.`,
    };
  }

  return {
    success: rankResult.success,
    message: `${enrichResult.message} ${scoreResult.message} ${rankResult.message}`,
  };
}

export async function runFullPipeline(): Promise<PipelineActionState> {
  if (isVercelDeployment()) {
    return runCloudPipeline();
  }

  const syncResult = await syncEnabledLists();
  if (
    !syncResult.success &&
    !syncResult.message.includes("Daily scrape limit")
  ) {
    return syncResult;
  }

  const enrichResult = await enrichPendingLeads();
  if (!enrichResult.success) {
    return enrichResult;
  }

  const scoreResult = await scorePendingLeads();
  if (!scoreResult.success) {
    return scoreResult;
  }

  const rankResult = await buildDailyBatch(false);
  if (!rankResult.success && rankResult.message.includes("already exists")) {
    return {
      success: true,
      message: `Pipeline finished. ${syncResult.message} ${enrichResult.message} ${scoreResult.message} Today's batch was already built.`,
    };
  }

  return {
    success: rankResult.success,
    message: `${syncResult.message} ${enrichResult.message} ${scoreResult.message} ${rankResult.message}`,
  };
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
    return emptyState(
      error instanceof Error
        ? error.message
        : "Could not open the LinkedIn login browser.",
    );
  }
}
