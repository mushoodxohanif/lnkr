import type { LeadStatus } from "@/app/generated/prisma/client";

export const FINALIZED_LEAD_STATUSES: LeadStatus[] = [
  "QUALIFIED",
  "SENT",
  "SKIPPED",
  "SNOOZED",
];

export type FinalizedLeadsFilters = {
  search?: string;
  status?: LeadStatus | "ALL";
  snListSource?: string;
  minFit?: number;
  maxFit?: number;
  page?: number;
  pageSize?: number;
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
  const minFitRaw = get("minFit");
  const maxFitRaw = get("maxFit");
  const pageRaw = get("page");

  return {
    search: get("search")?.trim() || undefined,
    status:
      status &&
      (FINALIZED_LEAD_STATUSES.includes(status as LeadStatus) ||
        status === "ALL")
        ? (status as LeadStatus | "ALL")
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
