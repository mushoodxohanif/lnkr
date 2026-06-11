import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { type BrowserContext, chromium } from "playwright";
import type { ScraperConfig } from "./types";

export async function launchBrowser(
  config: ScraperConfig,
): Promise<BrowserContext> {
  await mkdir(dirname(config.browserProfileDir), { recursive: true });

  const launchOptions = {
    headless: !config.headed,
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  };

  try {
    return await chromium.launchPersistentContext(config.browserProfileDir, {
      ...launchOptions,
      channel: "chrome",
    });
  } catch {
    return await chromium.launchPersistentContext(
      config.browserProfileDir,
      launchOptions,
    );
  }
}

export async function ensureLoggedIn(
  context: BrowserContext,
  loginTimeoutMs: number,
): Promise<boolean> {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://www.linkedin.com/feed/", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const { isLoggedIn, waitForManualLogin } = await import("./safety");

  if (await isLoggedIn(page)) {
    return true;
  }

  await page.goto("https://www.linkedin.com/login", {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  return waitForManualLogin(page, loginTimeoutMs);
}
