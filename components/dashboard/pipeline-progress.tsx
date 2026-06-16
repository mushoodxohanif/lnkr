"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import {
  buildPipelineProgress,
  getPipelineStepStatusLabel,
  type PipelineStepProgress,
  type PipelineStepStatus,
} from "@/lib/pipeline/progress";
import type { PipelineConfig } from "@/lib/pipeline/status";
import { cn } from "@/lib/utils";

type PipelineProgressPanelProps = {
  config: PipelineConfig;
  className?: string;
  compact?: boolean;
  /** Poll for updates while a pipeline action is running */
  polling?: boolean;
};

const STATUS_STYLES: Record<PipelineStepStatus, string> = {
  complete:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  in_progress: "border-primary/30 bg-primary/5 text-primary",
  pending:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  waiting: "border-border bg-muted text-muted-foreground",
  blocked: "border-destructive/30 bg-destructive/5 text-destructive",
  skipped: "border-border bg-muted/80 text-muted-foreground",
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
      className={cn(
        "min-w-0 rounded-lg border px-3 py-2.5",
        STATUS_STYLES[step.status],
      )}
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
          <Progress
            value={step.percent}
            className="h-1.5 bg-background/70"
            aria-label={`${step.label} progress`}
          />
        </div>
      ) : compact ? (
        <p className="mt-1 text-xs leading-5 opacity-90">{step.detail}</p>
      ) : null}
    </div>
  );
}

export function PipelineProgressPanel({
  config,
  className,
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
    <section
      className={cn(
        "w-full rounded-xl border border-border bg-card text-sm text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pipeline progress
          </p>
          <p className="mt-1 text-sm font-medium">{progress.headline}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {progress.overallPercent}%
          </p>
          <p className="text-xs text-muted-foreground">overall</p>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <Progress
          value={progress.overallPercent}
          className={cn(
            "h-2",
            progress.isComplete &&
              "**:data-[slot=progress-indicator]:bg-emerald-500",
          )}
          aria-label="Overall pipeline progress"
        />

        <div
          className={
            compact
              ? "grid grid-cols-1 gap-2 sm:grid-cols-2"
              : "grid grid-cols-1 gap-2"
          }
        >
          {progress.steps.map((step) => (
            <StepRow key={step.id} step={step} compact={compact} />
          ))}
        </div>
      </div>
    </section>
  );
}
