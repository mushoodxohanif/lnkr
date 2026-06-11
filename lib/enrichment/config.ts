import type { EnrichmentProviderName } from "@/lib/enrichment/types";

const DEFAULT_TTL_DAYS = 7;

export function getEnrichmentProviderName(): EnrichmentProviderName {
  const provider = (process.env.ENRICHMENT_PROVIDER ?? "datalayer")
    .trim()
    .toLowerCase();

  if (provider === "apollo" || provider === "datalayer") {
    return provider;
  }

  throw new Error(
    `Invalid ENRICHMENT_PROVIDER "${provider}". Use "datalayer" or "apollo".`,
  );
}

export function getEnrichmentApiKey(): string {
  const apiKey = process.env.ENRICHMENT_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ENRICHMENT_API_KEY is required for company enrichment. Set it in your environment.",
    );
  }
  return apiKey;
}

export function getEnrichmentTtlMs(): number {
  const raw = process.env.ENRICHMENT_TTL_DAYS?.trim();
  const days = raw ? Number(raw) : DEFAULT_TTL_DAYS;

  if (Number.isNaN(days) || days < 1) {
    return DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000;
  }

  return days * 24 * 60 * 60 * 1000;
}

export function isEnrichmentConfigured(): boolean {
  return Boolean(process.env.ENRICHMENT_API_KEY?.trim());
}
