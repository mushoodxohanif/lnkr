import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { db } from "@/lib/db";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getBrowserProfileDir(): string {
  return (
    process.env.BROWSER_PROFILE_DIR ??
    join(homedir(), ".lnkr", "browser-profile")
  );
}

export function getSafetyConfig() {
  const browserProfileDir = getBrowserProfileDir();

  return {
    dailyScrapeLimit: parsePositiveInt(process.env.DAILY_SCRAPE_LIMIT, 50),
    minDelayMs: parsePositiveInt(process.env.SCRAPE_MIN_DELAY_MS, 4000),
    maxDelayMs: parsePositiveInt(process.env.SCRAPE_MAX_DELAY_MS, 10000),
    maxPostsPerProfile: parsePositiveInt(process.env.MAX_POSTS_PER_PROFILE, 5),
    browserProfileDir,
    browserProfileExists: existsSync(browserProfileDir),
    apifyConfigured:
      Boolean(process.env.APIFY_TOKEN?.trim()) &&
      Boolean(process.env.APIFY_ACTOR_ID?.trim()),
    apifyActorId: process.env.APIFY_ACTOR_ID?.trim() ?? "",
    apifyFallbackEnabled: process.env.APIFY_FALLBACK === "true",
  };
}

export async function getTodayScrapeCount(): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return db.lead.count({
    where: {
      scrapedAt: { gte: startOfToday },
    },
  });
}
