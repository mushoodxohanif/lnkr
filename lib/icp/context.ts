import type { CompanyEnrichment } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { parseEmployeeCountRange } from "@/lib/enrichment/domain";
import type {
  CompanyFunding,
  CompanySignals,
  CompanyTechStack,
} from "@/lib/enrichment/types";
import { getEffectiveICP } from "@/lib/icp/effective-icp";
import type {
  ParsedCompanyEnrichment,
  ScoringContext,
  ScoringLead,
  ScrapedPost,
} from "@/lib/icp/types";
import {
  type ICPCriteriaData,
  parseCaseStudies,
  parseExclusionRules,
  parseStringArray,
  parseWeights,
  type UserProfileData,
} from "@/lib/settings/types";

type CompanySnippet = {
  size?: string;
  industry?: string;
};

type RawProfileSnapshot = {
  companySnippet?: CompanySnippet;
};

function parseRecentPosts(value: unknown): ScrapedPost[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is ScrapedPost =>
        typeof item === "object" &&
        item !== null &&
        "text" in item &&
        typeof item.text === "string" &&
        item.text.trim().length > 0,
    )
    .map((item) => ({
      text: item.text.trim(),
      postedAt: item.postedAt,
      url: item.url,
    }));
}

function parseJsonObject<T>(value: unknown): T | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as T;
}

export function parseCompanyEnrichment(
  record: CompanyEnrichment | null | undefined,
  lead: ScoringLead,
): ParsedCompanyEnrichment | null {
  if (record) {
    return {
      domain: record.domain,
      companyName: record.companyName ?? undefined,
      employeeCount: record.employeeCount ?? undefined,
      industry: record.industry ?? undefined,
      funding: parseJsonObject<CompanyFunding>(record.funding),
      techStack: parseJsonObject<CompanyTechStack>(record.techStack),
      signals: parseJsonObject<CompanySignals>(record.signals),
    };
  }

  const snapshot = lead.rawProfileSnapshot as RawProfileSnapshot | null;
  const snippet = snapshot?.companySnippet;
  if (!snippet && !lead.company) return null;

  const employeeCount = snippet?.size
    ? (parseEmployeeCountRange(snippet.size) ?? undefined)
    : undefined;

  return {
    domain: lead.company?.trim() || "unknown",
    companyName: lead.company?.trim() || undefined,
    employeeCount,
    industry: snippet?.industry?.trim() || undefined,
  };
}

export function mapDbICPCriteria(record: {
  id: string;
  titles: unknown;
  seniorityLevels: unknown;
  companySizeMin: number | null;
  companySizeMax: number | null;
  industries: unknown;
  techStack: unknown;
  geo: unknown;
  exclusionRules: unknown;
  weights: unknown;
  fitThreshold: number;
}): ICPCriteriaData {
  return {
    id: record.id,
    titles: parseStringArray(record.titles),
    seniorityLevels: parseStringArray(record.seniorityLevels),
    companySizeMin: record.companySizeMin,
    companySizeMax: record.companySizeMax,
    industries: parseStringArray(record.industries),
    techStack: parseStringArray(record.techStack),
    geo: parseStringArray(record.geo),
    exclusionRules: parseExclusionRules(record.exclusionRules),
    weights: parseWeights(record.weights),
    fitThreshold: record.fitThreshold,
  };
}

export async function loadICPCriteria(): Promise<ICPCriteriaData | null> {
  const criteria = await db.iCPCriteria.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!criteria) return null;
  return mapDbICPCriteria(criteria);
}

export async function loadUserProfile(): Promise<UserProfileData | null> {
  const profile = await db.userProfile.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    productName: profile.productName,
    valueProps: parseStringArray(profile.valueProps),
    targetIndustries: parseStringArray(profile.targetIndustries),
    targetPersonas: parseStringArray(profile.targetPersonas),
    caseStudies: parseCaseStudies(profile.caseStudies),
    pricingTierHints: profile.pricingTierHints ?? "",
  };
}

export async function loadScoringContext(
  lead: ScoringLead,
): Promise<ScoringContext | null> {
  const [icp, product] = await Promise.all([
    loadICPCriteria(),
    loadUserProfile(),
  ]);

  if (!icp) {
    return null;
  }

  return buildScoringContextFromRecords(lead, icp, product);
}

export function buildScoringContextFromRecords(
  lead: ScoringLead,
  icp: ICPCriteriaData,
  product: UserProfileData | null,
): ScoringContext {
  return {
    lead,
    enrichment: parseCompanyEnrichment(lead.companyEnrichment, lead),
    icp: getEffectiveICP(icp, product),
    product,
    recentPosts: parseRecentPosts(lead.recentPosts),
  };
}
