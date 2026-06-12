import { isContentGenerationConfigured } from "@/lib/agent/config";
import { db } from "@/lib/db";
import { isEnrichmentConfigured } from "@/lib/enrichment/config";
import { isScoringConfigured } from "@/lib/icp/config";
import {
  canRunPlaywrightSync,
  getDeploymentPlatform,
  getPipelineBatchLimit,
  getSyncProvider,
  isGitHubSessionConfigured,
  isGitHubSyncConfigured,
} from "@/lib/runtime/deployment";
import { getSafetyConfig } from "@/lib/safety/config";

export type PipelineConfig = {
  browserProfileExists: boolean;
  enrichmentConfigured: boolean;
  scoringConfigured: boolean;
  contentConfigured: boolean;
  enabledListCount: number;
  deploymentPlatform: ReturnType<typeof getDeploymentPlatform>;
  playwrightAvailable: boolean;
  syncProvider: ReturnType<typeof getSyncProvider>;
  githubSyncConfigured: boolean;
  sessionConfigured: boolean;
  batchLimit: number;
};

export async function getPipelineConfig(): Promise<PipelineConfig> {
  const [enabledListCount, safety] = await Promise.all([
    db.snListConfig.count({ where: { enabled: true } }),
    Promise.resolve(getSafetyConfig()),
  ]);

  return {
    browserProfileExists: canRunPlaywrightSync()
      ? safety.browserProfileExists
      : false,
    enrichmentConfigured: isEnrichmentConfigured(),
    scoringConfigured: isScoringConfigured(),
    contentConfigured: isContentGenerationConfigured(),
    enabledListCount,
    deploymentPlatform: getDeploymentPlatform(),
    playwrightAvailable: canRunPlaywrightSync(),
    syncProvider: getSyncProvider(),
    githubSyncConfigured: isGitHubSyncConfigured(),
    sessionConfigured: canRunPlaywrightSync()
      ? safety.browserProfileExists
      : isGitHubSessionConfigured(),
    batchLimit: getPipelineBatchLimit(),
  };
}
