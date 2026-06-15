"use client";

import { ChevronDownIcon } from "lucide-react";
import { DailyScrapeLimitBanner } from "@/components/dashboard/daily-scrape-limit-banner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getScrapeLimitStatus } from "@/lib/pipeline/scrape-limit-guidance";
import type { PipelineConfig } from "@/lib/pipeline/status";

type ApplicationLimitsProps = {
  config: PipelineConfig;
  compact?: boolean;
  defaultOpen?: boolean;
  showDailyBanner?: boolean;
};

type LimitRow = {
  label: string;
  value: string;
};

function scrapeLimitRowValue(config: PipelineConfig): string {
  const base = `${config.todayScrapeCount} / ${config.dailyScrapeLimit} profiles used today (${config.remainingScrapesToday} remaining)`;
  const status = getScrapeLimitStatus(config);

  if (status === "exhausted") {
    return `${base} — limit reached; sync will not save new profiles until tomorrow`;
  }

  if (status === "low") {
    return `${base} — use one sync run, then run the cloud pipeline`;
  }

  return base;
}

function buildLimitRows(config: PipelineConfig): LimitRow[] {
  const isVercel = config.deploymentPlatform === "vercel";
  const isGitHubSync = config.syncProvider === "github";
  const isLocalSync = config.syncProvider === "local";

  const rows: LimitRow[] = [
    {
      label: "Outreach mode",
      value: "Draft-only — nothing is posted or connected automatically",
    },
    {
      label: "Daily batch",
      value: `Top ${config.dailyBatchSize} qualified leads per day with AI drafts`,
    },
    {
      label: "SN profile sync",
      value: scrapeLimitRowValue(config),
    },
    {
      label: "Posts per profile",
      value: `Up to ${config.maxPostsPerProfile} recent posts read for warming comments`,
    },
  ];

  if (isVercel) {
    rows.push({
      label: "Enrich & score (Vercel)",
      value: `Up to ${config.batchLimit} leads per button click — click again if you have more pending leads`,
    });
  } else {
    rows.push({
      label: "Enrich & score",
      value: `Up to ${config.batchLimit} leads processed per pipeline step`,
    });
  }

  if (isGitHubSync) {
    rows.push({
      label: "GitHub sync",
      value:
        "~10–30 min per run; weekday auto-sync at 11:00 UTC. Complete pipeline runs cloud steps on existing leads while sync finishes in the background",
    });
  } else if (isLocalSync) {
    rows.push({
      label: "Profile visit delay",
      value: `${config.scrapeMinDelaySec}s–${config.scrapeMaxDelaySec}s random delay between profiles (reduces LinkedIn blocks)`,
    });
  }

  rows.push({
    label: "Company cap",
    value: `Max ${config.maxLeadsPerCompany} leads from the same company in one daily batch`,
  });

  return rows;
}

export function ApplicationLimits({
  config,
  compact = false,
  defaultOpen = false,
  showDailyBanner = true,
}: ApplicationLimitsProps) {
  const rows = buildLimitRows(config);

  if (compact) {
    return (
      <ul className="space-y-1.5 text-xs leading-5 text-muted-foreground">
        {rows.map((row) => (
          <li key={row.label}>
            <span className="font-medium text-foreground">{row.label}:</span>
            &nbsp;
            {row.value}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-3">
      {showDailyBanner ? <DailyScrapeLimitBanner config={config} /> : null}
      <Collapsible
        defaultOpen={defaultOpen}
        className="rounded-lg border border-border bg-muted/50 px-4 py-3"
      >
        <CollapsibleTrigger className="group flex w-full items-center justify-between text-sm font-medium text-foreground">
          Application limits
          <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <dl className="mt-3 space-y-3">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="mt-0.5 text-sm leading-6 text-foreground">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Scraper tuning (daily scrape cap, delays) is configured via
            environment variables — see Settings → Safety. Scraping Sales
            Navigator may violate LinkedIn&apos;s Terms of Service; use
            conservative limits.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
