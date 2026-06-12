import "server-only";

import type { SyncResult } from "../../packages/sn-scraper/src/types";

export async function runPlaywrightSync(): Promise<SyncResult> {
  const { runSync } = await import("../../packages/sn-scraper/src/sync");
  return runSync({ syncAll: true, headed: true });
}

export async function runPlaywrightLogin(): Promise<boolean> {
  const { runLoginFlow } = await import("../../packages/sn-scraper/src/sync");
  return runLoginFlow(true);
}
