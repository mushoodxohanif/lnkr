import { homedir } from "node:os";
import { join } from "node:path";
import { parseSessionCookies } from "./session";
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

  const cookiesRaw = process.env.LINKEDIN_SESSION_COOKIES;

  const config = {
    browserProfileDir,
    dailyScrapeLimit: parsePositiveInt(process.env.DAILY_SCRAPE_LIMIT, 10),
    minDelayMs: parsePositiveInt(process.env.SCRAPE_MIN_DELAY_MS, 4000),
    maxDelayMs: parsePositiveInt(process.env.SCRAPE_MAX_DELAY_MS, 10000),
    headed: process.env.SCRAPE_HEADLESS !== "true",
    loginTimeoutMs: parsePositiveInt(process.env.LOGIN_TIMEOUT_MS, 600_000),
    maxPostsPerProfile: parsePositiveInt(process.env.MAX_POSTS_PER_PROFILE, 5),
    sessionMode: cookiesRaw?.trim()
      ? ("cookies" as const)
      : ("profile" as const),
    ...withoutUndefined(overrides ?? {}),
  } as ScraperConfig;

  if (config.sessionMode === "cookies") {
    config.sessionCookies =
      overrides?.sessionCookies ??
      (cookiesRaw?.trim() ? parseSessionCookies(cookiesRaw) : undefined);

    if (!config.sessionCookies?.length) {
      throw new Error(
        "sessionMode is cookies but LINKEDIN_SESSION_COOKIES is missing or empty.",
      );
    }
  } else {
    config.sessionCookies = undefined;
  }

  return config;
}
