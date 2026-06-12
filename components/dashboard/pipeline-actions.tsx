"use client";

import { useState, useTransition } from "react";
import {
  GitHubSessionSetup,
  LocalSyncGuide,
} from "@/components/dashboard/local-sync-guide";
import {
  buildDailyBatch,
  enrichPendingLeads,
  type PipelineActionState,
  runCompletePipeline,
  scorePendingLeads,
  startLinkedInLogin,
  syncEnabledLists,
} from "@/lib/pipeline/actions";
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
  const isGitHubSync = config.syncProvider === "github";
  const isLocalSync = config.syncProvider === "local";

  const description = isGitHubSync
    ? "Starts GitHub sync, then enriches, scores, and builds today's batch. Re-run after sync finishes if you need new leads in the batch."
    : isLocalSync
      ? "Syncs Sales Navigator lists, then enriches, scores, and builds today's batch."
      : "Enriches, scores, and builds today's batch on leads already in the database.";

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
          {pending && active ? "Running pipeline..." : "Run complete pipeline"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-violet-950">
            Run complete pipeline
          </p>
          <p className="mt-0.5 text-sm text-violet-900/90">{description}</p>
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
          {pending && active ? "Running pipeline..." : "Run complete pipeline"}
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

  const syncDisabled =
    !canSync ||
    config.enabledListCount === 0 ||
    (isGitHubSync && !config.sessionConfigured);

  const syncDisabledReason = !canSync
    ? isVercel
      ? `Configure GitHub sync (GITHUB_SYNC_TOKEN, GITHUB_REPO) or run locally: ${LOCAL_SYNC_COMMANDS.sync}`
      : undefined
    : config.enabledListCount === 0
      ? "Add and enable at least one Sales Navigator list in Settings."
      : isGitHubSync && !config.sessionConfigured
        ? "Complete LinkedIn session setup in Settings → Safety first."
        : undefined;

  const syncLabel = isGitHubSync ? "Sync lists (GitHub)" : "Sync lists";

  const syncDescription = isGitHubSync
    ? "Trigger Sales Navigator sync via GitHub Actions (~10–30 min). Run the cloud pipeline after it completes."
    : config.playwrightAvailable
      ? "Pull leads from enabled Sales Navigator lists using Playwright on this machine."
      : "Runs on your computer with the same DATABASE_URL as this deployment.";

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
        {status ? <PipelineStatusMessage status={status} /> : null}
      </div>
    );
  }

  if (variant === "sync-only") {
    const syncStep = steps[0];
    return (
      <div className="space-y-3">
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
        <CompletePipelineButton
          config={config}
          pending={pending}
          active={activeStep === "complete"}
          disabled={completePipelineDisabled}
          disabledReason={completePipelineDisabledReason}
          compact
          onClick={() => runStep("complete", runCompletePipeline)}
        />
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
        {status ? <PipelineStatusMessage status={status} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {status ? <PipelineStatusMessage status={status} /> : null}
    </div>
  );
}
