import type { LeadStatus } from "@/app/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/dashboard/lead-status";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  QUALIFIED:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  ARCHIVED: "bg-muted text-muted-foreground",
  SENT: "bg-primary/10 text-primary",
  SKIPPED: "bg-muted text-muted-foreground",
  SNOOZED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function StatusBadge({
  status,
  alwaysShow = false,
}: {
  status: LeadStatus;
  alwaysShow?: boolean;
}) {
  if (!alwaysShow && (status === "QUALIFIED" || status === "NEW")) return null;

  return (
    <Badge variant="secondary" className={cn(STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
