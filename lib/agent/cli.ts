import "dotenv/config";

import {
  generateContentBatch,
  generateContentForLead,
  isContentGenerationConfigured,
} from "@/lib/agent";

function printUsage(): void {
  console.log(`Usage:
  bun run generate:content [--limit N] [--force]
  bun run generate:content --lead-id <id> [--force]

Options:
  --limit N     Max qualified leads to process (default: 50)
  --force       Regenerate even when a draft already exists
  --lead-id ID  Generate content for a single lead
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  if (!isContentGenerationConfigured()) {
    console.error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env to generate content.",
    );
    process.exit(1);
  }

  const forceRegenerate = args.includes("--force");

  const leadIdIndex = args.indexOf("--lead-id");
  if (leadIdIndex !== -1) {
    const leadId = args[leadIdIndex + 1];
    if (!leadId) {
      console.error("--lead-id requires a value.");
      process.exit(1);
    }

    const result = await generateContentForLead(leadId, { forceRegenerate });
    console.log(JSON.stringify(result, null, 2));

    if (result.status === "error") {
      process.exit(1);
    }

    return;
  }

  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex !== -1 ? Number(args[limitIndex + 1]) : undefined;

  if (limit !== undefined && (Number.isNaN(limit) || limit < 1)) {
    console.error("--limit must be a positive number.");
    process.exit(1);
  }

  const result = await generateContentBatch({ forceRegenerate, limit });

  console.log(
    `Processed ${result.processed}: ${result.generated} generated, ${result.skipped} skipped, ${result.errors} errors.`,
  );

  if (result.errors > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
