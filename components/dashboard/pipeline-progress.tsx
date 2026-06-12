"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  buildPipelineProgress,
  getPipelineStepStatusLabel,
  type PipelineStepProgress,
  type PipelineStepStatus,
} from "@/lib/pipeline/progress";
import type { PipelineConfig } from "@/lib/pipeline/status";

type PipelineProgressPanelProps = {
  config: PipelineConfig;
  compact?: boolean;
  /** Poll for updates while a pipeline action is running */
  polling?: boolean;
};

const STATUS_STYLES: Record<PipelineStepStatus, string> = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-800",
  in_progress: "border-violet-200 bg-violet-50 text-violet-800",
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  waiting: "border-zinc-200 bg-zinc-50 text-zinc-600",
  blocked: "border-red-200 bg-red-50 text-red-800",
  skipped: "border-zinc-200 bg-zinc-100 text-zinc-500",
};

const BAR_STYLES: Record<PipelineStepStatus, string> = {
  complete: "bg-emerald-500",
  in_progress: "bg-violet-500",
  pending: "bg-amber-500",
  waiting: "bg-zinc-300",
  blocked: "bg-red-400",
  skipped: "bg-zinc-300",
};

function StepRow({
  step,
  compact,
}: {
  step: PipelineStepProgress;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${STATUS_STYLES[step.status]}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{step.label}</p>
          {!compact ? (
            <p className="mt-0.5 text-xs leading-5 opacity-90">{step.detail}</p>
          ) : null}
        </div>
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide opacity-80">
          {getPipelineStepStatusLabel(step.status)}
        </span>
      </div>
      {step.total > 0 ? (
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-[11px] tabular-nums opacity-80">
            <span>
              {step.done} / {step.total}
            </span>
            <span>{step.percent}%</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/70"
            role="progressbar"
            aria-valuenow={step.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${step.label} progress`}
          >
            <div
              className={`h-full rounded-full transition-all ${BAR_STYLES[step.status]}`}
              style={{ width: `${step.percent}%` }}
            />
          </div>
        </div>
      ) : compact ? (
        <p className="mt-1 text-xs leading-5 opacity-90">{step.detail}</p>
      ) : null}
    </div>
  );
}

export function PipelineProgressPanel({
  config,
  compact = false,
  polling = false,
}: PipelineProgressPanelProps) {
  const router = useRouter();
  const progress = buildPipelineProgress(config, config.readiness);

  useEffect(() => {
    if (!polling) return undefined;

    const interval = window.setInterval(() => {
      router.refresh();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [polling, router]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Pipeline progress
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {progress.headline}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-zinc-900">
            {progress.overallPercent}%
          </p>
          <p className="text-xs text-zinc-500">overall</p>
        </div>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100"
        role="progressbar"
        aria-valuenow={progress.overallPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Overall pipeline progress"
      >
        <div
          className={`h-full rounded-full transition-all ${
            progress.isComplete ? "bg-emerald-500" : "bg-violet-500"
          }`}
          style={{ width: `${progress.overallPercent}%` }}
        />
      </div>

      <div
        className={
          compact
            ? "mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
            : "mt-4 space-y-2"
        }
      >
        {progress.steps.map((step) => (
          <StepRow key={step.id} step={step} compact={compact} />
        ))}
      </div>
    </div>
  );
}
