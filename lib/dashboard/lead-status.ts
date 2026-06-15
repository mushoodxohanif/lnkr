import type { LeadStatus } from "@/app/generated/prisma/client";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  ARCHIVED: "Unqualified",
  SENT: "Sent",
  SKIPPED: "Skipped",
  SNOOZED: "Snoozed",
};
