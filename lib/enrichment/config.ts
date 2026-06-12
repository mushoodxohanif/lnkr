import type { EnrichmentProviderName } from "@/lib/enrichment/types";

const DEFAULT_TTL_DAYS = 7;

export function getEnrichmentProviderName(): EnrichmentProviderName {
  const provider = (process.env.ENRICHMENT_PROVIDER ?? "profile")
    .trim()
    .toLowerCase();

  if (
    provider === "apollo" ||
    provider === "datalayer" ||
    provider === "profile"
  ) {
    return provider;
  }

  throw new Error(
    `Invalid ENRICHMENT_PROVIDER "${provider}". Use "profile", "datalayer", or "apollo".`,
  );
}

export function getEnrichmentApiKey(): string {
  if (getEnrichmentProviderName() === "profile") {
    return "";
  }

  const apiKey = process.env.ENRICHMENT_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "ENRICHMENT_API_KEY is required for paid enrichment. Set ENRICHMENT_PROVIDER=profile to use free scrape-based enrichment instead.",
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
  const provider = (process.env.ENRICHMENT_PROVIDER ?? "profile")
    .trim()
    .toLowerCase();

  if (provider === "profile") {
    return true;
  }

  return Boolean(process.env.ENRICHMENT_API_KEY?.trim());
}

export function isPaidEnrichmentProvider(): boolean {
  const provider = getEnrichmentProviderName();
  return provider === "datalayer" || provider === "apollo";
}
