import type { LeadStatus } from "@/app/generated/prisma/client";

export const FINALIZED_LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "QUALIFIED",
  "ARCHIVED",
  "SENT",
  "SKIPPED",
  "SNOOZED",
];

export const QUALIFIED_STATUSES: LeadStatus[] = [
  "QUALIFIED",
  "SENT",
  "SKIPPED",
  "SNOOZED",
];

export type QualificationFilter = "ALL" | "QUALIFIED" | "UNQUALIFIED" | "NEW";

export const QUALIFICATION_LABELS: Record<QualificationFilter, string> = {
  ALL: "All leads",
  QUALIFIED: "Qualified",
  UNQUALIFIED: "Unqualified",
  NEW: "Pending score",
};

export type FinalizedLeadsFilters = {
  search?: string;
  status?: LeadStatus | "ALL";
  qualification?: QualificationFilter;
  snListSource?: string;
  minFit?: number;
  maxFit?: number;
  page?: number;
  pageSize?: number;
};

export type LeadCountStats = {
  total: number;
  qualified: number;
  unqualified: number;
  pendingScore: number;
};

export type FinalizedLeadRow = {
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
  fitPercent: number | null;
  timingSignal: string | null;
  connectionNote: string | null;
  scoredAt: Date | null;
};

export type FinalizedLeadsResult = {
  leads: FinalizedLeadRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function parseFinalizedLeadsFilters(
  params: Record<string, string | string[] | undefined>,
): FinalizedLeadsFilters {
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const status = get("status");
  const qualification = get("qualification");
  const minFitRaw = get("minFit");
  const maxFitRaw = get("maxFit");
  const pageRaw = get("page");

  const qualificationValues: QualificationFilter[] = [
    "ALL",
    "QUALIFIED",
    "UNQUALIFIED",
    "NEW",
  ];

  return {
    search: get("search")?.trim() || undefined,
    status:
      status &&
      (FINALIZED_LEAD_STATUSES.includes(status as LeadStatus) ||
        status === "ALL")
        ? (status as LeadStatus | "ALL")
        : "ALL",
    qualification:
      qualification &&
      qualificationValues.includes(qualification as QualificationFilter)
        ? (qualification as QualificationFilter)
        : "ALL",
    snListSource: get("list") || "ALL",
    minFit:
      minFitRaw !== undefined && minFitRaw !== ""
        ? Number.parseFloat(minFitRaw)
        : undefined,
    maxFit:
      maxFitRaw !== undefined && maxFitRaw !== ""
        ? Number.parseFloat(maxFitRaw)
        : undefined,
    page:
      pageRaw !== undefined && pageRaw !== ""
        ? Number.parseInt(pageRaw, 10)
        : 1,
  };
}
