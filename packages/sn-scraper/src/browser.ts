import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { type BrowserContext, chromium, type Page } from "playwright";
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

async function getOrCreatePage(context: BrowserContext): Promise<Page> {
  const openPages = context.pages().filter((page) => !page.isClosed());

  if (openPages.length > 0) {
    for (let index = 1; index < openPages.length; index++) {
      await openPages[index].close().catch(() => undefined);
    }
    return openPages[0];
  }

  return context.newPage();
}

export async function ensureLoggedIn(
  context: BrowserContext,
  loginTimeoutMs: number,
): Promise<boolean> {
  let page = await getOrCreatePage(context);

  async function goto(url: string): Promise<void> {
    if (page.isClosed()) {
      page = await getOrCreatePage(context);
    }

    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("ERR_ABORTED") ||
          error.message.includes("frame was detached"))
      ) {
        if (page.isClosed() || context.pages().length === 0) {
          page = await getOrCreatePage(context);
        }
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        });
        return;
      }
      throw error;
    }
  }

  await goto("https://www.linkedin.com/feed/");
  await page.waitForTimeout(2000);

  const { isLoggedIn, waitForManualLogin } = await import("./safety");

  if (await isLoggedIn(page)) {
    return true;
  }

  await goto("https://www.linkedin.com/login");

  return waitForManualLogin(page, loginTimeoutMs);
}
