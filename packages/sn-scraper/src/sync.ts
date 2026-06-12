import type { BrowserContext } from "playwright";
import { ensureLoggedIn, launchBrowser } from "./browser";
import { loadConfig } from "./config";
import { scrapeListPage } from "./list-scraper";
import { enrichLeadFromProfile } from "./profile-scraper";
import { SafetyStopError } from "./safety";
import {
  disconnectDb,
  getBlockedUrls,
  getEnabledListUrls,
  getTodayScrapeCount,
  logActivity,
  logSyncSummary,
  markListSynced,
  saveLead,
} from "./storage";
import type {
  ListRowLead,
  ScrapedLead,
  ScraperConfig,
  SyncOptions,
  SyncResult,
} from "./types";
import { humanDelay, humanMouseMove, isSalesNavigatorListUrl } from "./utils";

async function logSafetyStop(error: SafetyStopError): Promise<void> {
  await logActivity(
    error.reason === "captcha" ? "captcha_detected" : "rate_limit_detected",
    "Safety",
    undefined,
    { message: error.message, reason: error.reason },
  );
}

async function resolveListTargets(
  options: SyncOptions,
): Promise<Array<{ name: string; url: string }>> {
  if (options.listUrl) {
    if (!isSalesNavigatorListUrl(options.listUrl)) {
      throw new Error(
        "URL must be a Sales Navigator saved list (linkedin.com/sales/lists/...).",
      );
    }
    return [{ name: "CLI list", url: options.listUrl }];
  }

  if (options.syncAll) {
    const lists = await getEnabledListUrls();
    if (lists.length === 0) {
      throw new Error(
        "No enabled lists found. Add lists in Settings or pass --list-url.",
      );
    }
    return lists.map((list) => ({ name: list.name, url: list.url }));
  }

  throw new Error(
    "Specify --list-url <url> or --all to sync enabled lists from the database.",
  );
}

async function processLead(
  context: BrowserContext,
  listUrl: string,
  rowLead: ListRowLead,
  config: ScraperConfig,
  blockedUrls: Set<string>,
): Promise<"scraped" | "skipped" | "error"> {
  if (blockedUrls.has(rowLead.linkedInUrl)) {
    console.log(`  Skip (blocklist): ${rowLead.name}`);
    return "skipped";
  }

  try {
    let scrapedLead: ScrapedLead = {
      linkedInUrl: rowLead.linkedInUrl,
      name: rowLead.name,
      title: rowLead.title,
      company: rowLead.company,
      location: rowLead.location,
      snListSource: listUrl,
      rawProfileSnapshot: {
        listRow: rowLead,
        scrapedAt: new Date().toISOString(),
      },
    };

    const profilePage = await context.newPage();
    try {
      scrapedLead = await enrichLeadFromProfile(
        profilePage,
        scrapedLead,
        rowLead.profileUrl,
        config.maxPostsPerProfile,
      );
    } finally {
      await profilePage.close();
    }

    const result = await saveLead(scrapedLead);
    console.log(
      `  ${result === "created" ? "Saved" : "Updated"}: ${scrapedLead.name} (${scrapedLead.title ?? "no title"})`,
    );

    await humanDelay(config.minDelayMs, config.maxDelayMs);
    const activePage = context.pages()[0];
    if (activePage) {
      await humanMouseMove(activePage);
    }

    return "scraped";
  } catch (error) {
    if (error instanceof SafetyStopError) throw error;
    console.error(`  Error scraping ${rowLead.name}:`, error);
    return "error";
  }
}

export async function runSync(options: SyncOptions): Promise<SyncResult> {
  const config = loadConfig({
    headed: options.headed,
    dailyScrapeLimit: options.limit,
  });

  const result: SyncResult = {
    scraped: 0,
    skipped: 0,
    errors: 0,
    listsProcessed: [],
  };

  let context: BrowserContext | null = null;

  try {
    context = await launchBrowser(config);

    if (options.loginOnly) {
      const loggedIn = await ensureLoggedIn(context, config.loginTimeoutMs);
      if (!loggedIn) {
        result.stoppedReason = "login_timeout";
      }
      return result;
    }

    const loggedIn = await ensureLoggedIn(context, config.loginTimeoutMs);
    if (!loggedIn) {
      result.stoppedReason = "login_timeout";
      return result;
    }

    const todayCount = await getTodayScrapeCount();
    const dailyLimit = options.limit ?? config.dailyScrapeLimit;
    let remaining = Math.max(0, dailyLimit - todayCount);

    if (remaining === 0) {
      console.log(
        `Daily scrape limit reached (${dailyLimit} profiles today). Try again tomorrow or pass --limit.`,
      );
      result.stoppedReason = "daily_limit";
      return result;
    }

    console.log(
      `Scraping up to ${remaining} profile(s) (${todayCount}/${dailyLimit} used today).`,
    );

    const lists = await resolveListTargets(options);
    const blockedUrls = await getBlockedUrls();
    const browserContext = context;
    const mainPage =
      browserContext.pages()[0] ?? (await browserContext.newPage());

    for (const list of lists) {
      if (remaining <= 0) break;

      console.log(`\nSyncing list: ${list.name}`);
      console.log(`  URL: ${list.url}`);
      result.listsProcessed.push(list.url);

      try {
        const { collected, stoppedEarly } = await scrapeListPage(
          mainPage,
          list.url,
          remaining,
          async (rowLead) => {
            const outcome = await processLead(
              browserContext,
              list.url,
              rowLead,
              config,
              blockedUrls,
            );

            if (outcome === "scraped") {
              result.scraped++;
              remaining--;
            } else if (outcome === "skipped") {
              result.skipped++;
            } else {
              result.errors++;
            }

            return remaining > 0;
          },
        );

        if (collected > 0) {
          await markListSynced(list.url);
        }
        console.log(`  List done: ${collected} profile(s) processed.`);

        if (stoppedEarly) {
          if (remaining <= 0) {
            result.stoppedReason = "daily_limit";
          }
          break;
        }
      } catch (error) {
        if (error instanceof SafetyStopError) {
          result.stoppedReason = error.reason;
          console.error(`\nStopped: ${error.message}`);
          await logSafetyStop(error);
          break;
        }
        throw error;
      }
    }

    await logSyncSummary({
      scraped: result.scraped,
      skipped: result.skipped,
      errors: result.errors,
      stoppedReason: result.stoppedReason,
      listsProcessed: result.listsProcessed,
    });

    return result;
  } finally {
    if (context) {
      await context.close();
    }
    await disconnectDb();
  }
}

export async function runLoginFlow(headed?: boolean): Promise<boolean> {
  const config = loadConfig({ headed });
  const context = await launchBrowser(config);

  try {
    return ensureLoggedIn(context, config.loginTimeoutMs);
  } finally {
    await context.close();
    await disconnectDb();
  }
}
