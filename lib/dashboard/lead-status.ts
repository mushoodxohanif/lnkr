import type { LeadStatus } from "@/app/generated/prisma/client";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  ARCHIVED: "Archived",
  SENT: "Sent",
  SKIPPED: "Skipped",
  SNOOZED: "Snoozed",
};
