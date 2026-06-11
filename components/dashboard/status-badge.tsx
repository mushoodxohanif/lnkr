import type { LeadStatus } from "@/app/generated/prisma/client";

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-blue-50 text-blue-700",
  QUALIFIED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-zinc-100 text-zinc-600",
  SENT: "bg-violet-50 text-violet-700",
  SKIPPED: "bg-zinc-100 text-zinc-500",
  SNOOZED: "bg-amber-50 text-amber-700",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  ARCHIVED: "Archived",
  SENT: "Sent",
  SKIPPED: "Skipped",
  SNOOZED: "Snoozed",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  if (status === "QUALIFIED" || status === "NEW") return null;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
