"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  getScrapeLimitEfficiencyTips,
  getScrapeLimitHeadline,
  getScrapeLimitStatus,
  getScrapeLimitSummary,
} from "@/lib/pipeline/scrape-limit-guidance";
import type { PipelineConfig } from "@/lib/pipeline/status";
import { cn } from "@/lib/utils";

type DailyScrapeLimitBannerProps = {
  config: PipelineConfig;
  compact?: boolean;
};

function statusStyles(status: ReturnType<typeof getScrapeLimitStatus>): {
  alert: string;
  progress: string;
  label: string;
} {
  switch (status) {
    case "exhausted":
      return {
        alert:
          "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
        progress: "[&_[data-slot=progress-indicator]]:bg-amber-500",
        label: "Limit reached",
      };
    case "low":
      return {
        alert:
          "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200",
        progress: "[&_[data-slot=progress-indicator]]:bg-orange-500",
        label: "Running low",
      };
    default:
      return {
        alert:
          "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
        progress: "[&_[data-slot=progress-indicator]]:bg-emerald-500",
        label: "Scrapes available",
      };
  }
}

export function DailyScrapeLimitBanner({
  config,
  compact = false,
}: DailyScrapeLimitBannerProps) {
  const status = getScrapeLimitStatus(config);
  const styles = statusStyles(status);
  const usedPercent = Math.min(
    100,
    Math.round(
      (config.todayScrapeCount / Math.max(config.dailyScrapeLimit, 1)) * 100,
    ),
  );
  const tips = getScrapeLimitEfficiencyTips(config);
  const [tipsOpen, setTipsOpen] = useState(false);

  if (compact) {
    return (
      <Alert className={styles.alert}>
        <AlertTitle>{getScrapeLimitHeadline(config)}</AlertTitle>
        <AlertDescription className="text-xs leading-5 opacity-90">
          {getScrapeLimitSummary(config)}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={styles.alert}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            Daily SN scrape limit · {styles.label}
          </p>
          <AlertTitle className="mt-1">
            {getScrapeLimitHeadline(config)}
          </AlertTitle>
        </div>
        <p className="text-sm tabular-nums font-medium">
          {config.remainingScrapesToday} left
        </p>
      </div>

      <Progress
        value={usedPercent}
        className={cn("mt-3 h-2 bg-background/60", styles.progress)}
        aria-label="Daily profile scrape usage"
      />

      <AlertDescription className="mt-3 leading-6 opacity-90">
        {getScrapeLimitSummary(config)}
      </AlertDescription>

      <Collapsible open={tipsOpen} onOpenChange={setTipsOpen} className="mt-3">
        <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium underline decoration-dotted underline-offset-2">
          How to use today&apos;s limit efficiently
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform",
              tipsOpen && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 opacity-90">
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </Alert>
  );
}
