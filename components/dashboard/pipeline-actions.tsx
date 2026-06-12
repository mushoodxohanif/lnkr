"use client";

import { useState, useTransition } from "react";
import { ApplicationLimits } from "@/components/dashboard/application-limits";
import { DailyScrapeLimitBanner } from "@/components/dashboard/daily-scrape-limit-banner";
import {
  GitHubSessionSetup,
  LocalSyncGuide,
} from "@/components/dashboard/local-sync-guide";
import { PipelineProgressPanel } from "@/components/dashboard/pipeline-progress";
import {
  buildDailyBatch,
  enrichPendingLeads,
  type PipelineActionState,
  runCompletePipeline,
  scorePendingLeads,
  startLinkedInLogin,
  syncEnabledLists,
} from "@/lib/pipeline/actions";
import { getScrapeLimitStatus } from "@/lib/pipeline/scrape-limit-guidance";
import type { PipelineConfig } from "@/lib/pipeline/status";
import { LOCAL_SYNC_COMMANDS } from "@/lib/runtime/deployment";

type PipelineActionsProps = {
  config: PipelineConfig;
  variant?: "full" | "compact" | "sync-only" | "login-only" | "complete-only";
  showRunAll?: boolean;
};

function SyncProviderHint({ config }: { config: PipelineConfig }) {
  if (config.syncProvider === "github") {
    if (config.sessionConfigured) return null;

    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        LinkedIn session cookies are not configured for GitHub sync. Complete
        session setup in Settings → Safety before syncing.
      </p>
    );
  }

  if (!config.playwrightAvailable) return null;
  if (config.browserProfileExists) return null;

  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
      No LinkedIn session saved yet. Run{" "}
      <code className="font-mono text-xs">{LOCAL_SYNC_COMMANDS.login}</code> on
      your computer, or use Settings → Safety when running locally.
    </p>
  );
}

function PipelineStatusMessage({ status }: { status: PipelineActionState }) {
  const urlMatch = status.message.match(/(https:\/\/github\.com\/\S+)/);

  if (urlMatch && status.success) {
    const url = urlMatch[1];
    const prefix = status.message.slice(0, urlMatch.index).trimEnd();

    return (
      <p
        className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        role="status"
      >
        {prefix ? `${prefix} ` : null}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline hover:text-emerald-900"
        >
          View GitHub Actions run
        </a>
        . GitHub sync takes ~10–30 min — run the cloud pipeline when it
        finishes.
      </p>
    );
  }

  return (
    <p
      className={`rounded-lg px-3 py-2 text-sm ${
        status.success
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-800"
      }`}
      role="status"
    >
      {status.message}
    </p>
  );
}

function PipelineLimitsFooter({ config }: { config: PipelineConfig }) {
  return (
    <ApplicationLimits
      config={config}
      defaultOpen={false}
      showDailyBanner={false}
    />
  );
}

type PipelineStep = {
  id: string;
  label: string;
  description: string;
  action: () => Promise<PipelineActionState>;
  disabled?: boolean;
  disabledReason?: string;
  hidden?: boolean;
};

function ActionButton({
  label,
  description,
  pending,
  disabled,
  disabledReason,
  onClick,
  primary = false,
}: {
  label: string;
  description?: string;
  pending: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-900">{label}</p>
        {description ? (
          <p className="mt-0.5 text-sm text-zinc-600">{description}</p>
        ) : null}
        {disabled && disabledReason ? (
          <p className="mt-1 text-xs text-amber-700">{disabledReason}</p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={pending || disabled}
        onClick={onClick}
        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
          primary
            ? "bg-violet-600 text-white hover:bg-violet-700"
            : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
        }`}
      >
        {pending ? "Running..." : label}
      </button>
    </div>
  );
}

function CompletePipelineButton({
  config,
  pending,
  active,
  disabled,
  disabledReason,
  onClick,
  compact = false,
}: {
  config: PipelineConfig;
  pending: boolean;
  active: boolean;
  disabled: boolean;
  disabledReason?: string;
  onClick: () => void;
  compact?: boolean;
}) {
  const { readiness } = config;
  const isGitHubSync = config.syncProvider === "github";

  const description = readiness.isComplete
    ? readiness.statusSummary
    : readiness.willRunSync && isGitHubSync
      ? `${readiness.statusSummary} GitHub sync takes ~10–30 min; cloud steps run after sync finishes (click again if needed).`
      : readiness.statusSummary;

  const buttonLabel = readiness.isComplete
    ? "Pipeline up to date"
    : pending && active
      ? "Running pipeline..."
      : readiness.willRunSync
        ? "Run complete pipeline"
        : "Continue pipeline";

  if (compact) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {disabled && disabledReason ? (
          <p className="text-xs text-amber-700 sm:mr-auto">{disabledReason}</p>
        ) : null}
        <button
          type="button"
          disabled={pending || disabled}
          onClick={onClick}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {buttonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-950">
            {readiness.isComplete
              ? "Pipeline up to date"
              : "Run complete pipeline"}
          </p>
          <p className="mt-0.5 text-sm text-violet-900/90">{description}</p>
          {!readiness.isComplete ? (
            <ul className="mt-2 space-y-0.5 text-xs text-violet-900/80">
              {readiness.willRunSync ? (
                <li>• Sync Sales Navigator lists</li>
              ) : null}
              {readiness.willRunEnrich ? (
                <li>
                  • Enrich {readiness.pendingEnrich} pending lead
                  {readiness.pendingEnrich === 1 ? "" : "s"}
                </li>
              ) : null}
              {readiness.willRunScore ? (
                <li>
                  • Score {readiness.pendingScore} pending lead
                  {readiness.pendingScore === 1 ? "" : "s"}
                </li>
              ) : null}
              {readiness.willRunBatch ? (
                <li>• Build today&apos;s top-50 batch</li>
              ) : null}
            </ul>
          ) : null}
          {disabled && disabledReason ? (
            <p className="mt-1 text-xs text-amber-800">{disabledReason}</p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={pending || disabled}
          onClick={onClick}
          className="shrink-0 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

export function PipelineActions({
  config,
  variant = "full",
  showRunAll = true,
}: PipelineActionsProps) {
  const [pending, startTransition] = useTransition();
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [status, setStatus] = useState<PipelineActionState | null>(null);
  const isVercel = config.deploymentPlatform === "vercel";
  const isGitHubSync = config.syncProvider === "github";
  const canSync = config.playwrightAvailable || isGitHubSync;
  const envHint = isVercel
    ? "Set this in Vercel → Project → Settings → Environment Variables."
    : "Set this in .env or pull from Vercel with `vercel env pull`.";

  function runStep(stepId: string, action: () => Promise<PipelineActionState>) {
    startTransition(async () => {
      setActiveStep(stepId);
      setStatus(null);
      const result = await action();
      setStatus(result);
      setActiveStep(null);
    });
  }

  const scrapeLimitExhausted = config.remainingScrapesToday <= 0;
  const scrapeLimitLow = getScrapeLimitStatus(config) === "low";

  const syncDisabled =
    !canSync ||
    config.enabledListCount === 0 ||
    (isGitHubSync && !config.sessionConfigured) ||
    scrapeLimitExhausted;

  const syncDisabledReason = scrapeLimitExhausted
    ? `Daily scrape limit reached (${config.todayScrapeCount}/${config.dailyScrapeLimit} today). Run the cloud pipeline on existing leads, or sync again tomorrow.`
    : !canSync
      ? isVercel
        ? `Configure GitHub sync (GITHUB_SYNC_TOKEN, GITHUB_REPO) or run locally: ${LOCAL_SYNC_COMMANDS.sync}`
        : undefined
      : config.enabledListCount === 0
        ? "Add and enable at least one Sales Navigator list in Settings."
        : isGitHubSync && !config.sessionConfigured
          ? "Complete LinkedIn session setup in Settings → Safety first."
          : undefined;

  const syncDescription = scrapeLimitExhausted
    ? "No profile scrapes left today — use Run complete pipeline on leads already in the database."
    : isGitHubSync
      ? scrapeLimitLow
        ? `Trigger GitHub sync (~10–30 min). Only ${config.remainingScrapesToday} scrape${config.remainingScrapesToday === 1 ? "" : "s"} left today — use one run.`
        : "Trigger Sales Navigator sync via GitHub Actions (~10–30 min). Run the cloud pipeline after it completes."
      : config.playwrightAvailable
        ? scrapeLimitLow
          ? `Pull leads from enabled lists. ${config.remainingScrapesToday} scrape${config.remainingScrapesToday === 1 ? "" : "s"} remaining today.`
          : "Pull leads from enabled Sales Navigator lists using Playwright on this machine."
        : "Runs on your computer with the same DATABASE_URL as this deployment.";

  const syncLabel = isGitHubSync ? "Sync lists (GitHub)" : "Sync lists";

  const steps: PipelineStep[] = [
    {
      id: "sync",
      label: syncLabel,
      description: syncDescription,
      action: syncEnabledLists,
      disabled: syncDisabled,
      disabledReason: syncDisabledReason,
      hidden: !canSync,
    },
    {
      id: "enrich",
      label: "Enrich leads",
      description: isVercel
        ? `Fetch company data (up to ${config.batchLimit} leads per run on Vercel).`
        : "Fetch company data for unscored leads.",
      action: enrichPendingLeads,
      disabled: !config.enrichmentConfigured,
      disabledReason: `Set ENRICHMENT_API_KEY first. ${envHint}`,
    },
    {
      id: "score",
      label: "Score leads",
      description: isVercel
        ? `Run ICP fit scoring (up to ${config.batchLimit} leads per run on Vercel).`
        : "Run ICP fit scoring on enriched leads.",
      action: scorePendingLeads,
      disabled: !config.scoringConfigured,
      disabledReason: `Set GOOGLE_GENERATIVE_AI_API_KEY first. ${envHint}`,
    },
    {
      id: "rank",
      label: "Build today's batch",
      description:
        "Rank the top 50 and generate warming comments and connection notes.",
      action: () => buildDailyBatch(false),
      disabled: !config.contentConfigured,
      disabledReason: `Set GOOGLE_GENERATIVE_AI_API_KEY first. ${envHint}`,
    },
  ];

  if (variant === "login-only") {
    return (
      <div className="space-y-3">
        <PipelineProgressPanel config={config} compact polling={pending} />
        <DailyScrapeLimitBanner config={config} />
        {isGitHubSync ? (
          <GitHubSessionSetup />
        ) : isVercel ? (
          <LocalSyncGuide
            syncProvider={config.syncProvider}
            sessionConfigured={config.sessionConfigured}
          />
        ) : (
          <ActionButton
            label="Open LinkedIn login"
            description="Opens a browser window so you can sign in once. Your session is saved locally for Playwright sync."
            pending={pending}
            primary
            onClick={() => runStep("login", startLinkedInLogin)}
          />
        )}
        <PipelineLimitsFooter config={config} />
        {status ? <PipelineStatusMessage status={status} /> : null}
      </div>
    );
  }

  if (variant === "sync-only") {
    const syncStep = steps[0];
    return (
      <div className="space-y-3">
        <PipelineProgressPanel config={config} compact polling={pending} />
        <DailyScrapeLimitBanner config={config} />
        <LocalSyncGuide
          compact={isVercel}
          syncProvider={config.syncProvider}
          sessionConfigured={config.sessionConfigured}
        />
        <SyncProviderHint config={config} />
        {canSync ? (
          <ActionButton
            label={isGitHubSync ? "Sync lists (GitHub)" : "Sync enabled lists"}
            description={syncStep.description}
            pending={pending}
            disabled={syncStep.disabled}
            disabledReason={syncStep.disabledReason}
            primary
            onClick={() => runStep("sync", syncStep.action)}
          />
        ) : null}
        <PipelineLimitsFooter config={config} />
        {status ? <PipelineStatusMessage status={status} /> : null}
      </div>
    );
  }

  const completePipelineDisabled =
    !config.enrichmentConfigured ||
    !config.scoringConfigured ||
    !config.contentConfigured;

  const completePipelineDisabledReason = !config.enrichmentConfigured
    ? `Set ENRICHMENT_API_KEY first. ${envHint}`
    : !config.scoringConfigured || !config.contentConfigured
      ? `Set GOOGLE_GENERATIVE_AI_API_KEY first. ${envHint}`
      : undefined;

  if (variant === "complete-only") {
    return (
      <div className="space-y-3">
        <PipelineProgressPanel config={config} compact polling={pending} />
        <DailyScrapeLimitBanner config={config} compact />
        <CompletePipelineButton
          config={config}
          pending={pending}
          active={activeStep === "complete"}
          disabled={completePipelineDisabled}
          disabledReason={completePipelineDisabledReason}
          compact
          onClick={() => runStep("complete", runCompletePipeline)}
        />
        <details className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-zinc-700">
            Application limits
          </summary>
          <div className="mt-2">
            <ApplicationLimits config={config} compact />
          </div>
        </details>
        {status ? <PipelineStatusMessage status={status} /> : null}
      </div>
    );
  }

  const visibleSteps =
    variant === "compact"
      ? steps.slice(2)
      : steps.filter((step) => !step.hidden);

  if (variant === "compact") {
    return (
      <div className="space-y-4">
        <PipelineProgressPanel config={config} polling={pending} />
        <DailyScrapeLimitBanner config={config} />
        <CompletePipelineButton
          config={config}
          pending={pending}
          active={activeStep === "complete"}
          disabled={completePipelineDisabled}
          disabledReason={completePipelineDisabledReason}
          onClick={() => runStep("complete", runCompletePipeline)}
        />
        <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
          {visibleSteps.map((step) => (
            <div key={step.id} className="p-4">
              <ActionButton
                label={step.label}
                pending={pending && activeStep === step.id}
                disabled={step.disabled}
                disabledReason={step.disabledReason}
                onClick={() => runStep(step.id, step.action)}
              />
            </div>
          ))}
        </div>
        <PipelineLimitsFooter config={config} />
        {status ? <PipelineStatusMessage status={status} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PipelineProgressPanel config={config} polling={pending} />
      <DailyScrapeLimitBanner config={config} />
      {variant === "full" && isVercel ? (
        <LocalSyncGuide
          syncProvider={config.syncProvider}
          sessionConfigured={config.sessionConfigured}
        />
      ) : variant === "full" ? (
        <SyncProviderHint config={config} />
      ) : null}

      {(variant === "full" || showRunAll) && (
        <CompletePipelineButton
          config={config}
          pending={pending}
          active={activeStep === "complete"}
          disabled={completePipelineDisabled}
          disabledReason={completePipelineDisabledReason}
          onClick={() => runStep("complete", runCompletePipeline)}
        />
      )}

      {variant === "full" ? (
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Or run steps individually
        </p>
      ) : null}

      <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {visibleSteps.map((step) => (
          <div key={step.id} className="p-4">
            <ActionButton
              label={step.label}
              description={step.description}
              pending={pending && activeStep === step.id}
              disabled={step.disabled}
              disabledReason={step.disabledReason}
              primary={step.id === "rank"}
              onClick={() => runStep(step.id, step.action)}
            />
          </div>
        ))}
      </div>

      <PipelineLimitsFooter config={config} />

      {status ? <PipelineStatusMessage status={status} /> : null}
    </div>
  );
}
