import type { CompanyEnrichment } from "@/app/generated/prisma/client";
import { logEnrichmentActivity } from "@/lib/enrichment/activity";
import {
  getCachedCompanyEnrichment,
  isEnrichmentStale,
  upsertCompanyEnrichment,
} from "@/lib/enrichment/cache";
import { normalizeDomain } from "@/lib/enrichment/domain";
import { getEnrichmentProvider } from "@/lib/enrichment/providers";
import type {
  CompanyEnrichmentInput,
  ContactEnrichmentInput,
  EnrichCompanyOptions,
  EnrichContactOptions,
  EnrichedCompanyData,
  EnrichedContactData,
} from "@/lib/enrichment/types";

export async function enrichCompany(
  input: CompanyEnrichmentInput,
  options: EnrichCompanyOptions = {},
): Promise<{
  data: EnrichedCompanyData;
  record: CompanyEnrichment;
  source: "cache" | "provider";
}> {
  const domain = input.domain ? normalizeDomain(input.domain) : undefined;

  if (domain && !options.forceRefresh) {
    const cached = await getCachedCompanyEnrichment(domain);
    if (cached && !isEnrichmentStale(cached.enrichedAt)) {
      return {
        data: mapRecordToEnrichedCompany(cached),
        record: cached,
        source: "cache",
      };
    }
  }

  const provider = getEnrichmentProvider();
  const enriched = await provider.enrichCompany(input);

  if (!enriched) {
    throw new Error(
      domain
        ? `No enrichment data found for domain "${domain}".`
        : "No enrichment data found for the provided company identifiers.",
    );
  }

  const record = await upsertCompanyEnrichment(enriched);

  await logEnrichmentActivity(
    "enrich_company",
    "CompanyEnrichment",
    record.id,
    {
      domain: record.domain,
      provider: enriched.provider,
      employeeCount: record.employeeCount,
      industry: record.industry,
      forceRefresh: options.forceRefresh ?? false,
    },
  );

  return {
    data: enriched,
    record,
    source: "provider",
  };
}

export async function enrichContact(
  input: ContactEnrichmentInput,
  options: EnrichContactOptions = {},
): Promise<EnrichedContactData | null> {
  const provider = getEnrichmentProvider();
  const enriched = await provider.enrichContact(input);

  if (!enriched) return null;

  await logEnrichmentActivity("enrich_contact", "Lead", undefined, {
    linkedInUrl: enriched.linkedInUrl,
    provider: enriched.provider,
    forceRefresh: options.forceRefresh ?? false,
  });

  return enriched;
}

function mapRecordToEnrichedCompany(
  record: CompanyEnrichment,
): EnrichedCompanyData {
  return {
    domain: record.domain,
    companyName: record.companyName ?? undefined,
    employeeCount: record.employeeCount ?? undefined,
    industry: record.industry ?? undefined,
    funding:
      record.funding && typeof record.funding === "object"
        ? (record.funding as EnrichedCompanyData["funding"])
        : undefined,
    techStack:
      record.techStack && typeof record.techStack === "object"
        ? (record.techStack as EnrichedCompanyData["techStack"])
        : undefined,
    signals:
      record.signals && typeof record.signals === "object"
        ? (record.signals as EnrichedCompanyData["signals"])
        : undefined,
    provider: "datalayer",
  };
}
