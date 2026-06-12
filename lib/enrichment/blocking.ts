import { EnrichmentError } from "@/lib/enrichment/types";

const BLOCKING_CODES = new Set([
  "auth_error",
  "insufficient_credits",
  "rate_limit",
]);

export function isEnrichmentBlockingError(error: unknown): boolean {
  if (error instanceof EnrichmentError) {
    return BLOCKING_CODES.has(error.code);
  }

  if (error instanceof Error) {
    return isEnrichmentBlockingMessage(error.message);
  }

  return false;
}

export function isEnrichmentBlockingMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("insufficient credits") ||
    lower.includes("invalid or unauthorized") ||
    lower.includes("rate limit exceeded") ||
    lower.includes("enrichment_api_key is not configured")
  );
}

export function formatEnrichmentBatchMessage(result: {
  enriched: number;
  cached: number;
  skipped: number;
  notFound: number;
  errors: number;
  blockingError?: string;
}): string {
  const parts = [
    "Enrichment finished",
    `${result.enriched} enriched`,
    `${result.cached} cached`,
    `${result.skipped} skipped`,
    result.notFound > 0 ? `${result.notFound} not found` : null,
    result.errors > 0 ? `${result.errors} errors` : null,
  ].filter(Boolean);

  if (result.blockingError) {
    return `${parts.join(" · ")} · ${result.blockingError}`;
  }

  return parts.join(" · ");
}
