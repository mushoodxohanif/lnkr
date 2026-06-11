import { Prisma } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";

export type ActivityLogInput = {
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(input: ActivityLogInput): Promise<void> {
  await db.activityLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}

export async function logSafetyEvent(
  action: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await logActivity({
    action,
    entityType: "Safety",
    metadata,
  });
}
