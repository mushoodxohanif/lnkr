import "dotenv/config";

import { DAILY_BATCH_SIZE } from "@/lib/agent/config";
import { isScoringConfigured, scoreLead, scoreLeadsBatch } from "@/lib/icp";

function printUsage(): void {
  console.log(`Usage:
  bun run score:leads [--limit N] [--force] [--rules-only]
  bun run score:leads --lead-id <id> [--force] [--rules-only]

Options:
  --limit N       Max leads to process (default: ${DAILY_BATCH_SIZE})
  --force         Re-score leads that already have scores
  --rules-only    Skip LLM evaluation (rule engine only)
  --lead-id ID    Score a single lead by ID
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  const skipLlm = args.includes("--rules-only");
  if (!skipLlm && !isScoringConfigured()) {
    console.error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env or pass --rules-only.",
    );
    process.exit(1);
  }

  const forceRescore = args.includes("--force");

  const leadIdIndex = args.indexOf("--lead-id");
  if (leadIdIndex !== -1) {
    const leadId = args[leadIdIndex + 1];
    if (!leadId) {
      console.error("--lead-id requires a value.");
      process.exit(1);
    }

    const result = await scoreLead(leadId, { skipLlm, forceRescore });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex !== -1 ? Number(args[limitIndex + 1]) : undefined;

  if (limit !== undefined && (Number.isNaN(limit) || limit < 1)) {
    console.error("--limit must be a positive number.");
    process.exit(1);
  }

  const result = await scoreLeadsBatch({
    skipLlm,
    forceRescore,
    limit,
    onlyUnscored: !forceRescore,
  });

  console.log(
    `Processed ${result.processed}: ${result.scored} scored, ${result.archived} archived, ${result.skipped} skipped, ${result.errors} errors.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
