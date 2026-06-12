import {
  isLikelyDomain,
  normalizeDomain,
  parseEmployeeCountRange,
} from "@/lib/enrichment/domain";
import type { EnrichedCompanyData } from "@/lib/enrichment/types";

type CompanySnippet = {
  name?: string;
  size?: string;
  industry?: string;
  url?: string;
};

type RawProfileSnapshot = {
  companySnippet?: CompanySnippet;
};

function parseCompanySnippet(
  rawProfileSnapshot: unknown,
): CompanySnippet | undefined {
  if (!rawProfileSnapshot || typeof rawProfileSnapshot !== "object") {
    return undefined;
  }

  return (rawProfileSnapshot as RawProfileSnapshot).companySnippet;
}

/** Stable pseudo-domain for profile-only enrichment (no external API). */
export function profileDomainFromCompany(companyName: string): string {
  const slug = companyName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug ? `${slug}.profile` : "unknown.profile";
}

type ProfileLeadInput = {
  company?: string | null;
  rawProfileSnapshot?: unknown;
};

/**
 * Build company enrichment from Sales Navigator scrape data already stored on the lead.
 * No API calls — no credits or rate limits.
 */
export function enrichCompanyFromProfile(
  lead: ProfileLeadInput,
): EnrichedCompanyData | null {
  const snippet = parseCompanySnippet(lead.rawProfileSnapshot);
  const companyName = lead.company?.trim() || snippet?.name?.trim();

  if (!companyName) {
    return null;
  }

  const domain =
    companyName && isLikelyDomain(companyName)
      ? normalizeDomain(companyName)
      : profileDomainFromCompany(companyName);

  const employeeCount = snippet?.size
    ? (parseEmployeeCountRange(snippet.size) ?? undefined)
    : undefined;

  return {
    domain,
    companyName,
    employeeCount,
    industry: snippet?.industry?.trim() || undefined,
    provider: "profile",
    signals: snippet?.url
      ? {
          headquarters: {},
        }
      : undefined,
  };
}
