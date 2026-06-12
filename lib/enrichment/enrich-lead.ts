import { db } from "@/lib/db";
import { logEnrichmentActivity } from "@/lib/enrichment/activity";
import { isEnrichmentBlockingError } from "@/lib/enrichment/blocking";
import {
  getCachedCompanyEnrichment,
  isEnrichmentStale,
  linkLeadToCompanyEnrichment,
  upsertCompanyEnrichment,
} from "@/lib/enrichment/cache";
import {
  getEnrichmentProviderName,
  isEnrichmentConfigured,
} from "@/lib/enrichment/config";
import {
  resolveCompanyInputFromLead,
  resolveContactInputFromLead,
} from "@/lib/enrichment/domain";
import { getEnrichmentProvider } from "@/lib/enrichment/providers";
import {
  enrichCompanyFromProfile,
  profileDomainFromCompany,
} from "@/lib/enrichment/providers/profile";
import { enrichContact } from "@/lib/enrichment/service";
import type {
  EnrichLeadResult,
  EnrichLeadsBatchResult,
} from "@/lib/enrichment/types";

export type EnrichLeadOptions = {
  forceRefresh?: boolean;
  enrichContact?: boolean;
};

export async function enrichLead(
  leadId: string,
  options: EnrichLeadOptions = {},
): Promise<EnrichLeadResult> {
  if (!isEnrichmentConfigured()) {
    return {
      leadId,
      status: "skipped",
      message:
        "Enrichment is not configured. Set ENRICHMENT_PROVIDER=profile or add ENRICHMENT_API_KEY.",
    };
  }

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: { companyEnrichment: true },
  });

  if (!lead) {
    return {
      leadId,
      status: "skipped",
      message: "Lead not found.",
    };
  }

  const companyInput = resolveCompanyInputFromLead(lead);
  if (!companyInput) {
    return {
      leadId,
      status: "skipped",
      message: "Lead has no company name or LinkedIn company URL to enrich.",
    };
  }

  if (
    lead.companyEnrichment &&
    !options.forceRefresh &&
    !isEnrichmentStale(lead.companyEnrichment.enrichedAt)
  ) {
    return {
      leadId,
      status: "cached",
      domain: lead.companyEnrichment.domain,
      companyEnrichmentId: lead.companyEnrichment.id,
    };
  }

  const cacheDomain =
    companyInput.domain ??
    (companyInput.companyName
      ? profileDomainFromCompany(companyInput.companyName)
      : undefined);

  if (cacheDomain && !options.forceRefresh) {
    const cached = await getCachedCompanyEnrichment(cacheDomain);
    if (cached && !isEnrichmentStale(cached.enrichedAt)) {
      await linkLeadToCompanyEnrichment(leadId, cached.id);
      return {
        leadId,
        status: "cached",
        domain: cached.domain,
        companyEnrichmentId: cached.id,
      };
    }
  }

  try {
    const enriched =
      getEnrichmentProviderName() === "profile"
        ? enrichCompanyFromProfile(lead)
        : await getEnrichmentProvider().enrichCompany({
            ...companyInput,
            rawProfileSnapshot: lead.rawProfileSnapshot,
          });

    if (!enriched) {
      await logEnrichmentActivity("enrich_company_not_found", "Lead", leadId, {
        companyInput,
      });
      return {
        leadId,
        status: "not_found",
        message: "No company match found in enrichment provider.",
      };
    }

    const record = await upsertCompanyEnrichment(enriched);
    await linkLeadToCompanyEnrichment(leadId, record.id);

    await logEnrichmentActivity(
      "enrich_company",
      "CompanyEnrichment",
      record.id,
      {
        leadId,
        domain: record.domain,
        provider: enriched.provider,
        employeeCount: record.employeeCount,
        industry: record.industry,
        forceRefresh: options.forceRefresh ?? false,
      },
    );

    if (options.enrichContact && getEnrichmentProviderName() !== "profile") {
      const contactInput = resolveContactInputFromLead(lead);
      await enrichContact(contactInput, {
        forceRefresh: options.forceRefresh,
      });
    }

    return {
      leadId,
      status: "enriched",
      domain: record.domain,
      companyEnrichmentId: record.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown enrichment error";

    await logEnrichmentActivity("enrich_company_error", "Lead", leadId, {
      companyInput,
      message,
    });

    throw error;
  }
}

export type EnrichLeadsBatchOptions = {
  forceRefresh?: boolean;
  enrichContact?: boolean;
  limit?: number;
  onlyUnenriched?: boolean;
};

export async function enrichLeadsBatch(
  options: EnrichLeadsBatchOptions = {},
): Promise<EnrichLeadsBatchResult> {
  const leads = await db.lead.findMany({
    where: options.onlyUnenriched
      ? {
          companyEnrichmentId: null,
          status: { not: "ARCHIVED" },
          scrapedAt: { not: null },
        }
      : {
          status: { not: "ARCHIVED" },
          scrapedAt: { not: null },
        },
    orderBy: { scrapedAt: "desc" },
    take: options.limit ?? 50,
    select: { id: true },
  });

  const results: EnrichLeadResult[] = [];
  let enriched = 0;
  let cached = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;
  let blockingError: string | undefined;

  for (const lead of leads) {
    try {
      const result = await enrichLead(lead.id, {
        forceRefresh: options.forceRefresh,
        enrichContact: options.enrichContact,
      });
      results.push(result);

      switch (result.status) {
        case "enriched":
          enriched += 1;
          break;
        case "cached":
          cached += 1;
          break;
        case "skipped":
          skipped += 1;
          break;
        case "not_found":
          notFound += 1;
          break;
      }
    } catch (error) {
      errors += 1;
      const message =
        error instanceof Error ? error.message : "Unknown enrichment error";

      if (!blockingError && isEnrichmentBlockingError(error)) {
        blockingError = message;
      }

      results.push({
        leadId: lead.id,
        status: "skipped",
        message,
      });
    }
  }

  const summary: EnrichLeadsBatchResult = {
    processed: leads.length,
    enriched,
    cached,
    skipped,
    notFound,
    errors,
    blockingError,
    results,
  };

  await logEnrichmentActivity("enrich_batch", "Lead", undefined, summary);

  return summary;
}
