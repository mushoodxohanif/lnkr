"use client";

import { useState, useTransition } from "react";
import {
  buildDailyBatch,
  enrichPendingLeads,
  type PipelineActionState,
  runFullPipeline,
  scorePendingLeads,
  startLinkedInLogin,
  syncEnabledLists,
} from "@/lib/pipeline/actions";
import type { PipelineConfig } from "@/lib/pipeline/status";

type PipelineActionsProps = {
  config: PipelineConfig;
  variant?: "full" | "compact" | "sync-only" | "login-only";
  showRunAll?: boolean;
};

type PipelineStep = {
  id: string;
  label: string;
  description: string;
  action: () => Promise<PipelineActionState>;
  disabled?: boolean;
  disabledReason?: string;
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

export function PipelineActions({
  config,
  variant = "full",
  showRunAll = true,
}: PipelineActionsProps) {
  const [pending, startTransition] = useTransition();
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [status, setStatus] = useState<PipelineActionState | null>(null);

  function runStep(stepId: string, action: () => Promise<PipelineActionState>) {
    startTransition(async () => {
      setActiveStep(stepId);
      setStatus(null);
      const result = await action();
      setStatus(result);
      setActiveStep(null);
    });
  }

  const syncDisabled = config.enabledListCount === 0;
  const syncDisabledReason = syncDisabled
    ? "Add and enable at least one Sales Navigator list in Settings."
    : undefined;

  const steps: PipelineStep[] = [
    {
      id: "sync",
      label: "Sync lists",
      description: config.apifyConfigured
        ? "Pull leads from enabled Sales Navigator lists via Apify."
        : "Pull leads from enabled lists using your local Playwright session.",
      action: syncEnabledLists,
      disabled: syncDisabled,
      disabledReason: syncDisabledReason,
    },
    {
      id: "enrich",
      label: "Enrich leads",
      description: "Fetch company data for unscored leads.",
      action: enrichPendingLeads,
      disabled: !config.enrichmentConfigured,
      disabledReason: "Set ENRICHMENT_API_KEY in .env first.",
    },
    {
      id: "score",
      label: "Score leads",
      description: "Run ICP fit scoring on enriched leads.",
      action: scorePendingLeads,
      disabled: !config.scoringConfigured,
      disabledReason: "Set GOOGLE_GENERATIVE_AI_API_KEY in .env first.",
    },
    {
      id: "rank",
      label: "Build today's batch",
      description:
        "Rank the top 50 and generate warming comments and connection notes.",
      action: () => buildDailyBatch(false),
      disabled: !config.contentConfigured,
      disabledReason: "Set GOOGLE_GENERATIVE_AI_API_KEY in .env first.",
    },
  ];

  if (variant === "login-only") {
    return (
      <div className="space-y-3">
        <ActionButton
          label="Open LinkedIn login"
          description="Opens a browser window so you can sign in once. Your session is saved locally for Playwright sync."
          pending={pending}
          primary
          onClick={() => runStep("login", startLinkedInLogin)}
        />
        {status ? (
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
        ) : null}
      </div>
    );
  }

  if (variant === "sync-only") {
    const syncStep = steps[0];
    return (
      <div className="space-y-3">
        <ActionButton
          label="Sync enabled lists"
          description={syncStep.description}
          pending={pending}
          disabled={syncStep.disabled}
          disabledReason={syncStep.disabledReason}
          primary
          onClick={() => runStep("sync", syncStep.action)}
        />
        {status ? (
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
        ) : null}
      </div>
    );
  }

  const visibleSteps = variant === "compact" ? steps.slice(2) : steps;

  return (
    <div className="space-y-4">
      <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {visibleSteps.map((step) => (
          <div key={step.id} className="p-4">
            <ActionButton
              label={step.label}
              description={variant === "compact" ? undefined : step.description}
              pending={pending && activeStep === step.id}
              disabled={step.disabled}
              disabledReason={step.disabledReason}
              primary={step.id === "rank"}
              onClick={() => runStep(step.id, step.action)}
            />
          </div>
        ))}
      </div>

      {showRunAll && variant === "full" ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              Run full pipeline
            </p>
            <p className="mt-0.5 text-sm text-zinc-600">
              Sync, enrich, score, and build today&apos;s batch in one go.
            </p>
          </div>
          <button
            type="button"
            disabled={
              pending ||
              syncDisabled ||
              !config.enrichmentConfigured ||
              !config.scoringConfigured ||
              !config.contentConfigured
            }
            onClick={() => runStep("all", runFullPipeline)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && activeStep === "all"
              ? "Running pipeline..."
              : "Run all"}
          </button>
        </div>
      ) : null}

      {status ? (
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
      ) : null}
    </div>
  );
}
