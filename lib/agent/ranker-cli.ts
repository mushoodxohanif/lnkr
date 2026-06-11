import "dotenv/config";

import { runDailyRanker } from "@/lib/agent/daily-ranker";

function printUsage(): void {
  console.log(`Usage:
  bun run daily:rank [--force] [--no-content]
  bun run daily:rank:cron

Options:
  --force        Rebuild today's batch if it already exists
  --no-content   Rank only; skip warming comment and connection note generation
  --cron         Start the scheduled daily ranker (uses DAILY_CRON and TIMEZONE)
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  if (args.includes("--cron")) {
    await import("@/lib/agent/daily-ranker-cron");
    return;
  }

  const result = await runDailyRanker({
    force: args.includes("--force"),
    generateContent: !args.includes("--no-content"),
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.status === "error") {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
