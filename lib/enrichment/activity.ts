import { logActivity } from "@/lib/activity/log";

export async function logEnrichmentActivity(
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await logActivity({ action, entityType, entityId, metadata });
}
