import {
  getScrapeLimitEfficiencyTips,
  getScrapeLimitHeadline,
  getScrapeLimitStatus,
  getScrapeLimitSummary,
} from "@/lib/pipeline/scrape-limit-guidance";
import type { PipelineConfig } from "@/lib/pipeline/status";

type DailyScrapeLimitBannerProps = {
  config: PipelineConfig;
  compact?: boolean;
};

function statusStyles(status: ReturnType<typeof getScrapeLimitStatus>): {
  container: string;
  bar: string;
  label: string;
} {
  switch (status) {
    case "exhausted":
      return {
        container: "border-amber-300 bg-amber-50 text-amber-950",
        bar: "bg-amber-500",
        label: "Limit reached",
      };
    case "low":
      return {
        container: "border-orange-200 bg-orange-50 text-orange-950",
        bar: "bg-orange-500",
        label: "Running low",
      };
    default:
      return {
        container: "border-emerald-200 bg-emerald-50 text-emerald-950",
        bar: "bg-emerald-500",
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

  if (compact) {
    return (
      <div
        className={`rounded-lg border px-3 py-2 text-sm ${styles.container}`}
      >
        <p className="font-medium">{getScrapeLimitHeadline(config)}</p>
        <p className="mt-1 text-xs leading-5 opacity-90">
          {getScrapeLimitSummary(config)}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-4 py-3 ${styles.container}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
            Daily SN scrape limit · {styles.label}
          </p>
          <p className="mt-1 text-sm font-semibold">
            {getScrapeLimitHeadline(config)}
          </p>
        </div>
        <p className="text-sm tabular-nums font-medium">
          {config.remainingScrapesToday} left
        </p>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-white/60"
        role="progressbar"
        aria-valuenow={config.todayScrapeCount}
        aria-valuemin={0}
        aria-valuemax={config.dailyScrapeLimit}
        aria-label="Daily profile scrape usage"
      >
        <div
          className={`h-full rounded-full transition-all ${styles.bar}`}
          style={{ width: `${usedPercent}%` }}
        />
      </div>

      <p className="mt-3 text-sm leading-6 opacity-90">
        {getScrapeLimitSummary(config)}
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium underline decoration-dotted underline-offset-2">
          How to use today&apos;s limit efficiently
        </summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 opacity-90">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
