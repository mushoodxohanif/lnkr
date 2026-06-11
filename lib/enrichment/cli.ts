import "dotenv/config";

import {
  enrichLead,
  enrichLeadsBatch,
  isEnrichmentConfigured,
} from "@/lib/enrichment";

function printUsage(): void {
  console.log(`Usage:
  bun run enrich:leads [--limit N] [--force] [--contact] [--all]
  bun run enrich:leads --lead-id <id> [--force] [--contact]

Options:
  --limit N     Max leads to process (default: 50)
  --force       Bypass 7-day cache TTL
  --contact     Also enrich contact data via provider
  --all         Include leads that already have enrichment
  --lead-id ID  Enrich a single lead by ID
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  if (!isEnrichmentConfigured()) {
    console.error(
      "ENRICHMENT_API_KEY is not set. Add it to your .env file to run enrichment.",
    );
    process.exit(1);
  }

  const forceRefresh = args.includes("--force");
  const enrichContactData = args.includes("--contact");
  const onlyUnenriched = !args.includes("--all");

  const leadIdIndex = args.indexOf("--lead-id");
  if (leadIdIndex !== -1) {
    const leadId = args[leadIdIndex + 1];
    if (!leadId) {
      console.error("--lead-id requires a value.");
      process.exit(1);
    }

    const result = await enrichLead(leadId, {
      forceRefresh,
      enrichContact: enrichContactData,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex !== -1 ? Number(args[limitIndex + 1]) : undefined;

  if (limit !== undefined && (Number.isNaN(limit) || limit < 1)) {
    console.error("--limit must be a positive number.");
    process.exit(1);
  }

  const result = await enrichLeadsBatch({
    forceRefresh,
    enrichContact: enrichContactData,
    onlyUnenriched,
    limit,
  });

  console.log(
    `Processed ${result.processed}: ${result.enriched} enriched, ${result.cached} cached, ${result.notFound} not found, ${result.skipped} skipped, ${result.errors} errors.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
