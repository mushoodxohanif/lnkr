"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { ApplicationLimits } from "@/components/dashboard/application-limits";
import { DailyScrapeLimitBanner } from "@/components/dashboard/daily-scrape-limit-banner";
import {
  GitHubSessionSetup,
  LocalSyncGuide,
} from "@/components/dashboard/local-sync-guide";
import { PipelineProgressPanel } from "@/components/dashboard/pipeline-progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
      <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <AlertDescription>
          LinkedIn session cookies are not configured for GitHub sync. Complete
          session setup in Settings → Safety before syncing.
        </AlertDescription>
      </Alert>
    );
  }

  if (!config.playwrightAvailable) return null;
  if (config.browserProfileExists) return null;

  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <AlertDescription>
        No LinkedIn session saved yet. Run{" "}
        <code className="font-mono text-xs">{LOCAL_SYNC_COMMANDS.login}</code>{" "}
        on your computer, or use Settings → Safety when running locally.
      </AlertDescription>
    </Alert>
  );
}

function PipelineStatusMessage({ status }: { status: PipelineActionState }) {
  const urlMatch = status.message.match(/(https:\/\/github\.com\/\S+)/);

  if (urlMatch && status.success) {
    const url = urlMatch[1];
    const prefix = status.message.slice(0, urlMatch.index).trimEnd();

    return (
      <Alert
        className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        role="status"
      >
        <AlertDescription>
          {prefix ? `${prefix} ` : null}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline hover:text-foreground"
          >
            View GitHub Actions run
          </a>
          . GitHub sync takes ~10–30 min — run the cloud pipeline when it
          finishes.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert
      variant={status.success ? "default" : "destructive"}
      className={
        status.success
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : undefined
      }
      role="status"
    >
      <AlertDescription>{status.message}</AlertDescription>
    </Alert>
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
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
        {disabled && disabledReason ? (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            {disabledReason}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant={primary ? "default" : "outline"}
        disabled={pending || disabled}
        onClick={onClick}
        className="shrink-0"
      >
        {pending ? "Running..." : label}
      </Button>
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
          <p className="text-xs text-amber-700 dark:text-amber-400 sm:mr-auto">
            {disabledReason}
          </p>
        ) : null}
        <Button type="button" disabled={pending || disabled} onClick={onClick}>
          {buttonLabel}
        </Button>
      </div>
    );
  }

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <AlertTitle>
            {readiness.isComplete
              ? "Pipeline up to date"
              : "Run complete pipeline"}
          </AlertTitle>
          <AlertDescription className="mt-0.5">{description}</AlertDescription>
          {!readiness.isComplete ? (
            <ul className="mt-2 space-y-0.5 text-xs opacity-80">
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
                <li>• Build today&apos;s top-{config.dailyBatchSize} batch</li>
              ) : null}
            </ul>
          ) : null}
          {disabled && disabledReason ? (
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-400">
              {disabledReason}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          disabled={pending || disabled}
          onClick={onClick}
          className="shrink-0"
        >
          {buttonLabel}
        </Button>
      </div>
    </Alert>
  );
}

function ApplicationLimitsCollapsible({ config }: { config: PipelineConfig }) {
  return (
    <Collapsible className="rounded-lg border border-border bg-muted/50 px-3 py-2">
      <CollapsibleTrigger className="group flex w-full items-center justify-between text-xs font-medium text-foreground">
        Application limits
        <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <ApplicationLimits config={config} compact />
      </CollapsibleContent>
    </Collapsible>
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
      description: `Rank the top ${config.dailyBatchSize} and generate warming comments and connection notes.`,
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
        <ApplicationLimitsCollapsible config={config} />
        {status ? <PipelineStatusMessage status={status} /> : null}
      </div>
    );
  }

  const visibleSteps =
    variant === "compact"
      ? steps.slice(2)
      : steps.filter((step) => !step.hidden);

  const stepsCard = (
    <Card>
      {visibleSteps.map((step, index) => (
        <CardContent
          key={step.id}
          className={index > 0 ? "border-t border-border pt-4" : undefined}
        >
          <ActionButton
            label={step.label}
            description={variant === "full" ? step.description : undefined}
            pending={pending && activeStep === step.id}
            disabled={step.disabled}
            disabledReason={step.disabledReason}
            primary={step.id === "rank"}
            onClick={() => runStep(step.id, step.action)}
          />
        </CardContent>
      ))}
    </Card>
  );

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
        {stepsCard}
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
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Or run steps individually
        </p>
      ) : null}

      {stepsCard}

      <PipelineLimitsFooter config={config} />

      {status ? <PipelineStatusMessage status={status} /> : null}
    </div>
  );
}
