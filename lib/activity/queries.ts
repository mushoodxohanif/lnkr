import { db } from "@/lib/db";

export type ActivityLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
};

export async function getRecentActivityLogs(
  limit = 50,
): Promise<ActivityLogEntry[]> {
  return db.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
    },
  });
}
