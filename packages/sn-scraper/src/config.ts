import { homedir } from "node:os";
import { join } from "node:path";
import type { ScraperConfig } from "./types";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function withoutUndefined<T extends Record<string, unknown>>(
  values: Partial<T>,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export function loadConfig(overrides?: Partial<ScraperConfig>): ScraperConfig {
  const browserProfileDir =
    process.env.BROWSER_PROFILE_DIR ??
    join(homedir(), ".lnkr", "browser-profile");

  return {
    browserProfileDir,
    dailyScrapeLimit: parsePositiveInt(process.env.DAILY_SCRAPE_LIMIT, 50),
    minDelayMs: parsePositiveInt(process.env.SCRAPE_MIN_DELAY_MS, 4000),
    maxDelayMs: parsePositiveInt(process.env.SCRAPE_MAX_DELAY_MS, 10000),
    headed: process.env.SCRAPE_HEADLESS !== "true",
    loginTimeoutMs: parsePositiveInt(process.env.LOGIN_TIMEOUT_MS, 600_000),
    maxPostsPerProfile: parsePositiveInt(process.env.MAX_POSTS_PER_PROFILE, 5),
    ...withoutUndefined(overrides ?? {}),
  };
}
