import {
  DAILY_BATCH_SIZE,
  isContentGenerationConfigured,
  MAX_LEADS_PER_COMPANY,
} from "@/lib/agent/config";
import { db } from "@/lib/db";
import {
  getEnrichmentProviderName,
  isEnrichmentConfigured,
} from "@/lib/enrichment/config";
import { isScoringConfigured } from "@/lib/icp/config";
import {
  getPipelineReadiness,
  type PipelineReadiness,
} from "@/lib/pipeline/readiness";
import {
  canRunPlaywrightSync,
  getDeploymentPlatform,
  getPipelineBatchLimit,
  getSyncProvider,
  isGitHubSessionConfigured,
  isGitHubSyncConfigured,
} from "@/lib/runtime/deployment";
import { getSafetyConfig } from "@/lib/safety/config";

export type { PipelineReadiness };

export type PipelineConfig = {
  browserProfileExists: boolean;
  enrichmentConfigured: boolean;
  enrichmentProvider: ReturnType<typeof getEnrichmentProviderName>;
  scoringConfigured: boolean;
  contentConfigured: boolean;
  enabledListCount: number;
  deploymentPlatform: ReturnType<typeof getDeploymentPlatform>;
  playwrightAvailable: boolean;
  syncProvider: ReturnType<typeof getSyncProvider>;
  githubSyncConfigured: boolean;
  sessionConfigured: boolean;
  batchLimit: number;
  dailyBatchSize: number;
  dailyScrapeLimit: number;
  todayScrapeCount: number;
  remainingScrapesToday: number;
  maxPostsPerProfile: number;
  scrapeMinDelaySec: number;
  scrapeMaxDelaySec: number;
  maxLeadsPerCompany: number;
  readiness: PipelineReadiness;
};

export async function getPipelineConfig(): Promise<PipelineConfig> {
  const safety = getSafetyConfig();
  const [enabledListCount, readiness] = await Promise.all([
    db.snListConfig.count({ where: { enabled: true } }),
    getPipelineReadiness(),
  ]);

  return {
    browserProfileExists: canRunPlaywrightSync()
      ? safety.browserProfileExists
      : false,
    enrichmentConfigured: isEnrichmentConfigured(),
    enrichmentProvider: getEnrichmentProviderName(),
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
    dailyBatchSize: DAILY_BATCH_SIZE,
    dailyScrapeLimit: safety.dailyScrapeLimit,
    todayScrapeCount: readiness.todayScrapeCount,
    remainingScrapesToday: readiness.remainingScrapesToday,
    maxPostsPerProfile: safety.maxPostsPerProfile,
    scrapeMinDelaySec: Math.round(safety.minDelayMs / 1000),
    scrapeMaxDelaySec: Math.round(safety.maxDelayMs / 1000),
    maxLeadsPerCompany: MAX_LEADS_PER_COMPANY,
    readiness,
  };
}
