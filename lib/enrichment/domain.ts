import type {
  CompanyEnrichmentInput,
  ContactEnrichmentInput,
} from "@/lib/enrichment/types";

type CompanySnippet = {
  name?: string;
  url?: string;
  size?: string;
  industry?: string;
  about?: string;
};

type RawProfileSnapshot = {
  companySnippet?: CompanySnippet;
};

export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0];
}

export function isLikelyDomain(value: string): boolean {
  const normalized = normalizeDomain(value);
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(
    normalized,
  );
}

function parseCompanySnippet(
  rawProfileSnapshot: unknown,
): CompanySnippet | undefined {
  if (!rawProfileSnapshot || typeof rawProfileSnapshot !== "object") {
    return undefined;
  }

  const snapshot = rawProfileSnapshot as RawProfileSnapshot;
  return snapshot.companySnippet;
}

export function resolveCompanyInputFromLead(lead: {
  company?: string | null;
  rawProfileSnapshot?: unknown;
}): CompanyEnrichmentInput | null {
  const snippet = parseCompanySnippet(lead.rawProfileSnapshot);
  const companyName = lead.company?.trim() || snippet?.name?.trim();

  const linkedInUrl = snippet?.url?.trim();
  if (linkedInUrl?.includes("linkedin.com/company")) {
    return {
      companyName: companyName || undefined,
      linkedInUrl,
    };
  }

  if (companyName && isLikelyDomain(companyName)) {
    return {
      domain: normalizeDomain(companyName),
      companyName,
    };
  }

  if (companyName) {
    return { companyName };
  }

  return null;
}

export function resolveContactInputFromLead(lead: {
  linkedInUrl: string;
  name: string;
  title?: string | null;
  company?: string | null;
}): ContactEnrichmentInput {
  const nameParts = lead.name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName =
    nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

  return {
    linkedInUrl: lead.linkedInUrl,
    firstName,
    lastName,
    title: lead.title?.trim() || undefined,
    companyName: lead.company?.trim() || undefined,
  };
}

export function parseEmployeeCountRange(range: string): number | null {
  const trimmed = range.trim();

  if (trimmed.includes("+")) {
    const min = Number.parseInt(trimmed.replace(/\D/g, ""), 10);
    return Number.isNaN(min) ? null : min;
  }

  const rangeMatch = trimmed.match(/^(\d[\d,]*)-(\d[\d,]*)$/);
  if (rangeMatch) {
    const low = Number.parseInt(rangeMatch[1].replace(/,/g, ""), 10);
    const high = Number.parseInt(rangeMatch[2].replace(/,/g, ""), 10);
    if (!Number.isNaN(low) && !Number.isNaN(high)) {
      return Math.round((low + high) / 2);
    }
  }

  const exact = Number.parseInt(trimmed.replace(/,/g, ""), 10);
  return Number.isNaN(exact) ? null : exact;
}
