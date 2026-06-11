import { logActivity } from "@/lib/activity/log";
import {
  ApifyError,
  isApifyConfigured,
  scrapeSalesNavigatorListViaApify,
} from "@/lib/integrations/apify-sn";
import { loadConfig } from "../../packages/sn-scraper/src/config";
import {
  disconnectDb,
  getBlockedUrls,
  getEnabledListUrls,
  getTodayScrapeCount,
  logSyncSummary,
  markListSynced,
  saveLead,
} from "../../packages/sn-scraper/src/storage";
import type {
  ScrapedLead,
  SyncOptions,
  SyncResult,
} from "../../packages/sn-scraper/src/types";
import { isSalesNavigatorListUrl } from "../../packages/sn-scraper/src/utils";

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

function toScrapedLead(
  record: Awaited<ReturnType<typeof scrapeSalesNavigatorListViaApify>>[number],
  listUrl: string,
): ScrapedLead {
  return {
    linkedInUrl: record.linkedInUrl,
    name: record.name,
    headline: record.headline,
    title: record.title,
    company: record.company,
    location: record.location,
    snListSource: listUrl,
    recentPosts: record.recentPosts,
    companySnippet: record.companySnippet,
    rawProfileSnapshot: record.rawProfileSnapshot ?? {
      source: "apify",
      scrapedAt: new Date().toISOString(),
    },
  };
}

export async function importApifyLeadsForList(
  listUrl: string,
  maxResults: number,
  blockedUrls: Set<string>,
): Promise<Pick<SyncResult, "scraped" | "skipped" | "errors">> {
  const result = { scraped: 0, skipped: 0, errors: 0 };
  const records = await scrapeSalesNavigatorListViaApify(listUrl, maxResults);

  for (const record of records) {
    if (blockedUrls.has(record.linkedInUrl)) {
      result.skipped++;
      continue;
    }

    try {
      await saveLead(toScrapedLead(record, listUrl));
      result.scraped++;
    } catch {
      result.errors++;
    }
  }

  return result;
}

export async function runApifySync(options: SyncOptions): Promise<SyncResult> {
  if (!isApifyConfigured()) {
    throw new ApifyError(
      "APIFY_TOKEN is not configured. Set it in .env to use Apify sync.",
      "not_configured",
    );
  }

  const config = loadConfig({
    dailyScrapeLimit: options.limit,
  });

  const result: SyncResult = {
    scraped: 0,
    skipped: 0,
    errors: 0,
    listsProcessed: [],
  };

  try {
    const todayCount = await getTodayScrapeCount();
    const dailyLimit = options.limit ?? config.dailyScrapeLimit;
    let remaining = Math.max(0, dailyLimit - todayCount);

    if (remaining === 0) {
      result.stoppedReason = "daily_limit";
      await logActivity({
        action: "apify_sync_daily_limit",
        entityType: "Safety",
        metadata: { dailyLimit, todayCount },
      });
      return result;
    }

    const lists = await resolveListTargets(options);
    const blockedUrls = await getBlockedUrls();

    await logActivity({
      action: "apify_sync_started",
      entityType: "SnListConfig",
      metadata: {
        listCount: lists.length,
        remaining,
        dailyLimit,
        todayCount,
      },
    });

    for (const list of lists) {
      if (remaining <= 0) break;

      console.log(`\nApify sync: ${list.name}`);
      console.log(`  URL: ${list.url}`);
      result.listsProcessed.push(list.url);

      try {
        const records = await scrapeSalesNavigatorListViaApify(
          list.url,
          remaining,
        );

        for (const record of records) {
          if (remaining <= 0) break;

          if (blockedUrls.has(record.linkedInUrl)) {
            result.skipped++;
            continue;
          }

          try {
            const scrapedLead = toScrapedLead(record, list.url);
            const saveResult = await saveLead(scrapedLead);
            console.log(
              `  ${saveResult === "created" ? "Saved" : "Updated"}: ${scrapedLead.name}`,
            );
            result.scraped++;
            remaining--;
          } catch (error) {
            result.errors++;
            console.error(`  Error saving ${record.name}:`, error);
          }
        }

        await markListSynced(list.url);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown Apify error";

        await logActivity({
          action: "apify_sync_error",
          entityType: "SnListConfig",
          metadata: { listUrl: list.url, message },
        });

        if (error instanceof ApifyError) {
          console.error(`  Apify error: ${message}`);
          result.errors++;
          continue;
        }

        throw error;
      }
    }

    if (remaining <= 0 && result.scraped > 0) {
      result.stoppedReason = "daily_limit";
    }

    await logSyncSummary({
      provider: "apify",
      scraped: result.scraped,
      skipped: result.skipped,
      errors: result.errors,
      stoppedReason: result.stoppedReason,
      listsProcessed: result.listsProcessed,
    });

    await logActivity({
      action: "apify_sync_completed",
      entityType: "SnListConfig",
      metadata: {
        scraped: result.scraped,
        skipped: result.skipped,
        errors: result.errors,
        stoppedReason: result.stoppedReason,
      },
    });

    return result;
  } finally {
    await disconnectDb();
  }
}
