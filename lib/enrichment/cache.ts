import type { CompanyEnrichment } from "@/app/generated/prisma/client";
import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import { getEnrichmentTtlMs } from "@/lib/enrichment/config";
import { normalizeDomain } from "@/lib/enrichment/domain";
import type { EnrichedCompanyData } from "@/lib/enrichment/types";

export function isEnrichmentStale(
  enrichedAt: Date,
  ttlMs = getEnrichmentTtlMs(),
): boolean {
  return Date.now() - enrichedAt.getTime() > ttlMs;
}

export async function getCachedCompanyEnrichment(
  domain: string,
): Promise<CompanyEnrichment | null> {
  return db.companyEnrichment.findUnique({
    where: { domain: normalizeDomain(domain) },
  });
}

export async function upsertCompanyEnrichment(
  data: EnrichedCompanyData,
): Promise<CompanyEnrichment> {
  const domain = normalizeDomain(data.domain);

  return db.companyEnrichment.upsert({
    where: { domain },
    create: {
      domain,
      companyName: data.companyName ?? null,
      employeeCount: data.employeeCount ?? null,
      industry: data.industry ?? null,
      funding: data.funding
        ? (data.funding as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      techStack: data.techStack
        ? (data.techStack as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      signals: data.signals
        ? (data.signals as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      enrichedAt: new Date(),
    },
    update: {
      companyName: data.companyName ?? null,
      employeeCount: data.employeeCount ?? null,
      industry: data.industry ?? null,
      funding: data.funding
        ? (data.funding as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      techStack: data.techStack
        ? (data.techStack as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      signals: data.signals
        ? (data.signals as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      enrichedAt: new Date(),
    },
  });
}

export async function linkLeadToCompanyEnrichment(
  leadId: string,
  companyEnrichmentId: string,
): Promise<void> {
  await db.lead.update({
    where: { id: leadId },
    data: { companyEnrichmentId },
  });
}
