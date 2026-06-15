import type { LeadStatus, Prisma } from "@/app/generated/prisma/client";
import type {
  FinalizedLeadRow,
  FinalizedLeadsFilters,
  FinalizedLeadsResult,
  LeadCountStats,
} from "@/lib/dashboard/finalized-leads-shared";
import { QUALIFIED_STATUSES } from "@/lib/dashboard/finalized-leads-shared";
import { db } from "@/lib/db";

export type {
  FinalizedLeadRow,
  FinalizedLeadsFilters,
  FinalizedLeadsResult,
  LeadCountStats,
  QualificationFilter,
} from "@/lib/dashboard/finalized-leads-shared";
export {
  FINALIZED_LEAD_STATUSES,
  parseFinalizedLeadsFilters,
  QUALIFICATION_LABELS,
  QUALIFIED_STATUSES,
} from "@/lib/dashboard/finalized-leads-shared";

const SCRAPED_WHERE: Prisma.LeadWhereInput = {
  scrapedAt: { not: null },
};

function buildWhere(filters: FinalizedLeadsFilters): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = { ...SCRAPED_WHERE };

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  } else if (filters.qualification && filters.qualification !== "ALL") {
    if (filters.qualification === "QUALIFIED") {
      where.status = { in: QUALIFIED_STATUSES };
    } else if (filters.qualification === "UNQUALIFIED") {
      where.status = "ARCHIVED";
    } else if (filters.qualification === "NEW") {
      where.status = "NEW";
    }
  }

  if (filters.snListSource && filters.snListSource !== "ALL") {
    where.snListSource = filters.snListSource;
  }

  if (filters.search?.trim()) {
    const query = filters.search.trim();
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { company: { contains: query, mode: "insensitive" } },
      { title: { contains: query, mode: "insensitive" } },
      { location: { contains: query, mode: "insensitive" } },
    ];
  }

  if (filters.minFit !== undefined || filters.maxFit !== undefined) {
    where.scores = {
      some: {
        fitPercent: {
          ...(filters.minFit !== undefined ? { gte: filters.minFit } : {}),
          ...(filters.maxFit !== undefined ? { lte: filters.maxFit } : {}),
        },
      },
    };
  }

  return where;
}

function mapLeadRow(lead: {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  linkedInUrl: string;
  status: LeadStatus;
  snListSource: string | null;
  scrapedAt: Date | null;
  notes: string | null;
  scores: Array<{
    fitPercent: number;
    timingSignal: string;
    scoredAt: Date;
  }>;
  generatedContent: Array<{
    connectionNote: string | null;
  }>;
}): FinalizedLeadRow {
  const latestScore = lead.scores[0] ?? null;
  const latestContent = lead.generatedContent[0] ?? null;

  return {
    id: lead.id,
    name: lead.name,
    title: lead.title,
    company: lead.company,
    location: lead.location,
    linkedInUrl: lead.linkedInUrl,
    status: lead.status,
    snListSource: lead.snListSource,
    scrapedAt: lead.scrapedAt,
    notes: lead.notes,
    fitPercent: latestScore?.fitPercent ?? null,
    timingSignal: latestScore?.timingSignal ?? null,
    connectionNote: latestContent?.connectionNote ?? null,
    scoredAt: latestScore?.scoredAt ?? null,
  };
}

const leadInclude = {
  scores: {
    orderBy: { scoredAt: "desc" as const },
    take: 1,
    select: {
      fitPercent: true,
      timingSignal: true,
      scoredAt: true,
    },
  },
  generatedContent: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      connectionNote: true,
    },
  },
};

export async function getLeadCountStats(): Promise<LeadCountStats> {
  const [total, qualified, unqualified, pendingScore] = await Promise.all([
    db.lead.count({ where: SCRAPED_WHERE }),
    db.lead.count({
      where: { ...SCRAPED_WHERE, status: { in: QUALIFIED_STATUSES } },
    }),
    db.lead.count({ where: { ...SCRAPED_WHERE, status: "ARCHIVED" } }),
    db.lead.count({ where: { ...SCRAPED_WHERE, status: "NEW" } }),
  ]);

  return { total, qualified, unqualified, pendingScore };
}

export async function getFinalizedLeads(
  filters: FinalizedLeadsFilters = {},
): Promise<FinalizedLeadsResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 50));
  const where = buildWhere(filters);

  const [total, leads] = await Promise.all([
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      include: leadInclude,
      orderBy: [{ scrapedAt: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    leads: leads.map(mapLeadRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getFinalizedLeadListSources(): Promise<string[]> {
  const rows = await db.lead.findMany({
    where: {
      ...SCRAPED_WHERE,
      snListSource: { not: null },
    },
    select: { snListSource: true },
    distinct: ["snListSource"],
    orderBy: { snListSource: "asc" },
  });

  return rows
    .map((row) => row.snListSource)
    .filter((value): value is string => Boolean(value));
}

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function finalizedLeadsToCsv(leads: FinalizedLeadRow[]): string {
  const headers = [
    "Name",
    "Title",
    "Company",
    "Location",
    "LinkedIn URL",
    "Status",
    "Fit %",
    "Timing",
    "SN List",
    "Scraped At",
    "Scored At",
    "Connection Note",
    "Notes",
  ];

  const rows = leads.map((lead) =>
    [
      lead.name,
      lead.title,
      lead.company,
      lead.location,
      lead.linkedInUrl,
      lead.status,
      lead.fitPercent !== null ? Math.round(lead.fitPercent) : "",
      lead.timingSignal,
      lead.snListSource,
      lead.scrapedAt?.toISOString() ?? "",
      lead.scoredAt?.toISOString() ?? "",
      lead.connectionNote,
      lead.notes,
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export async function exportFinalizedLeadsCsv(
  filters: FinalizedLeadsFilters = {},
): Promise<{ csv: string; filename: string }> {
  const where = buildWhere(filters);
  const leads = await db.lead.findMany({
    where,
    include: leadInclude,
    orderBy: [{ scrapedAt: "desc" }, { name: "asc" }],
  });

  const rows = leads.map(mapLeadRow);
  const date = new Date().toISOString().slice(0, 10);

  return {
    csv: finalizedLeadsToCsv(rows),
    filename: `lnkr-leads-${date}.csv`,
  };
}
