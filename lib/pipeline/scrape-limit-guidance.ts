import type { PipelineConfig } from "@/lib/pipeline/status";

export type ScrapeLimitStatus = "exhausted" | "low" | "available";

export function getScrapeLimitStatus(
  config: Pick<PipelineConfig, "remainingScrapesToday" | "dailyScrapeLimit">,
): ScrapeLimitStatus {
  if (config.remainingScrapesToday <= 0) {
    return "exhausted";
  }

  const lowThreshold = Math.max(
    5,
    Math.min(10, Math.floor(config.dailyScrapeLimit * 0.2)),
  );

  if (config.remainingScrapesToday <= lowThreshold) {
    return "low";
  }

  return "available";
}

export function getScrapeLimitHeadline(config: PipelineConfig): string {
  const { todayScrapeCount, dailyScrapeLimit, remainingScrapesToday } = config;
  const status = getScrapeLimitStatus(config);

  if (status === "exhausted") {
    return `Daily scrape limit reached (${todayScrapeCount} / ${dailyScrapeLimit} profiles today)`;
  }

  if (status === "low") {
    return `${remainingScrapesToday} profile scrape${remainingScrapesToday === 1 ? "" : "s"} left today (${todayScrapeCount} / ${dailyScrapeLimit} used)`;
  }

  return `${remainingScrapesToday} profile scrapes available today (${todayScrapeCount} / ${dailyScrapeLimit} used)`;
}

export function getScrapeLimitSummary(config: PipelineConfig): string {
  const status = getScrapeLimitStatus(config);

  if (status === "exhausted") {
    return "No new Sales Navigator profiles will be saved until the daily counter resets. You can still enrich, score, and build a batch from leads already in the database.";
  }

  if (status === "low") {
    return "Use your remaining scrapes in one sync run, then run the cloud pipeline — avoid multiple test syncs that waste the cap.";
  }

  return "One sync run per day is usually enough. After sync completes, run the complete pipeline to turn new leads into today's batch.";
}

export function getScrapeLimitEfficiencyTips(config: PipelineConfig): string[] {
  const status = getScrapeLimitStatus(config);
  const isGitHubSync = config.syncProvider === "github";
  const isVercel = config.deploymentPlatform === "vercel";

  if (status === "exhausted") {
    return [
      "Run complete pipeline (or Enrich → Score → Build batch) on leads already synced — sync will not add profiles until tomorrow.",
      isVercel
        ? `On Vercel Hobby, each enrich/score step handles up to ${config.batchLimit} leads — click again until your backlog is processed.`
        : "Process your full backlog in one complete pipeline run locally.",
      isGitHubSync
        ? "Skip extra GitHub sync triggers today — they will finish without saving new profiles and use Actions minutes."
        : "Skip additional sync runs today — they will stop immediately at the daily cap.",
      `Work today's top-${config.dailyBatchSize} batch on the home page; counters reset at midnight (server timezone).`,
      "Need a higher cap? Raise DAILY_SCRAPE_LIMIT in GitHub Variables or env — keep it conservative to reduce LinkedIn risk.",
    ];
  }

  if (status === "low") {
    return [
      `You have ${config.remainingScrapesToday} scrape${config.remainingScrapesToday === 1 ? "" : "s"} left — run one sync, not several small test runs.`,
      isGitHubSync
        ? "Trigger sync once, wait for GitHub Actions (~10–30 min), then run complete pipeline."
        : "Run sync once, then run complete pipeline while profiles are fresh.",
      "Disable low-priority SN lists in Settings → Lists so sync spends remaining scrapes on your best lists first.",
      isVercel
        ? `After sync, run complete pipeline; repeat enrich/score clicks if you have more than ${config.batchLimit} pending leads.`
        : "After sync, run complete pipeline to enrich, score, and build today's batch in one go.",
    ];
  }

  return [
    `Plan for one primary sync per day (${config.dailyScrapeLimit} profiles max) — weekday auto-sync runs at 11:00 UTC if you use GitHub Actions.`,
    isGitHubSync
      ? "Morning: confirm sync finished in GitHub Actions → run complete pipeline on Vercel."
      : "Morning: run complete pipeline once after sync (sync + enrich + score + batch).",
    isVercel
      ? `Vercel processes ${config.batchLimit} leads per enrich/score click — run complete pipeline multiple times if your backlog is large.`
      : `Local runs can process larger batches per step (up to ${config.dailyBatchSize}).`,
    "Enable only your highest-intent SN lists in Settings → Lists so daily scrapes go to the right prospects.",
    `Default cap is ${config.dailyScrapeLimit} profiles/day — enough for a full top-${config.dailyBatchSize} batch without aggressive scraping.`,
  ];
}
