import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { runLoginFlow, runSync } from "./sync";
import { parseCliArgs } from "./utils";

const packageRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
loadEnv({ path: resolve(packageRoot, "../../.env.local"), quiet: true });
loadEnv({ path: resolve(packageRoot, "../../.env"), quiet: true });

function printHelp(): void {
  console.log(`
lnkr SN Scraper — sync leads from Sales Navigator saved lists

Usage:
  bun sn:sync --list-url <url>     Sync a specific SN list
  bun sn:sync --all                Sync all enabled lists from Settings
  bun sn:sync --login              Open browser for manual LinkedIn login

Options:
  --list-url <url>   Sales Navigator saved list URL
  --all              Sync all enabled lists configured in the app
  --login            Launch browser and wait for manual login (saves session)
  --limit <n>        Override daily scrape limit for this run
  --headed           Run with visible browser (default)
  --headless         Run without visible browser
  --help, -h         Show this help

Environment:
  BROWSER_PROFILE_DIR        Persistent Chrome profile (default: ~/.lnkr/browser-profile)
  LINKEDIN_SESSION_COOKIES   JSON cookie array for headless/CI sync (see bun sn:export-cookies)
  DAILY_SCRAPE_LIMIT         Max profiles per day (default: 50)
  SCRAPE_MIN_DELAY_MS        Min delay between profiles (default: 4000)
  SCRAPE_MAX_DELAY_MS        Max delay between profiles (default: 10000)
  SCRAPE_HEADLESS            Set to true for headless mode (default: headed locally)
  DATABASE_URL               PostgreSQL connection string (required for --all)

Export session for CI:
  bun sn:export-cookies        Dump LinkedIn cookies from local profile to stdout (JSON)

Safety:
  - Never automates LinkedIn login — you log in manually once
  - Random 4–10s delays between profile visits
  - Stops on CAPTCHA or rate-limit detection
  - Respects do-not-contact blocklist
`);
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (!process.env.DATABASE_URL && (args.syncAll || !args.loginOnly)) {
    console.error(
      "DATABASE_URL is required. Set it in .env or export it before running sync.",
    );
    process.exit(1);
  }

  if (args.loginOnly) {
    console.log("Opening browser for manual LinkedIn login...");
    const loggedIn = await runLoginFlow(args.headed);
    process.exit(loggedIn ? 0 : 1);
    return;
  }

  if (!args.listUrl && !args.syncAll) {
    printHelp();
    process.exit(1);
    return;
  }

  console.log("Starting SN list sync...");

  const result = await runSync({
    listUrl: args.listUrl,
    syncAll: args.syncAll,
    limit: args.limit,
    headed: args.headed,
  });

  console.log("\n--- Sync complete ---");
  console.log(`Scraped:  ${result.scraped}`);
  console.log(`Skipped:  ${result.skipped}`);
  console.log(`Errors:   ${result.errors}`);
  if (result.listsProcessed.length > 0) {
    console.log(`Lists:    ${result.listsProcessed.length}`);
  }
  if (result.stoppedReason) {
    console.log(`Stopped:  ${result.stoppedReason}`);
  }

  const exitCode =
    result.stoppedReason === "captcha" ||
    result.stoppedReason === "rate_limit" ||
    result.stoppedReason === "login_timeout" ||
    result.scraped === 0
      ? 1
      : 0;

  process.exit(exitCode);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
