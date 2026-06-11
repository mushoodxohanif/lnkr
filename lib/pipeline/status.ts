import { isContentGenerationConfigured } from "@/lib/agent/config";
import { db } from "@/lib/db";
import { isEnrichmentConfigured } from "@/lib/enrichment/config";
import { isScoringConfigured } from "@/lib/icp/config";
import { isApifyConfigured } from "@/lib/integrations/apify-sn";

export type PipelineConfig = {
  apifyConfigured: boolean;
  enrichmentConfigured: boolean;
  scoringConfigured: boolean;
  contentConfigured: boolean;
  enabledListCount: number;
};

export async function getPipelineConfig(): Promise<PipelineConfig> {
  const enabledListCount = await db.snListConfig.count({
    where: { enabled: true },
  });

  return {
    apifyConfigured: isApifyConfigured(),
    enrichmentConfigured: isEnrichmentConfigured(),
    scoringConfigured: isScoringConfigured(),
    contentConfigured: isContentGenerationConfigured(),
    enabledListCount,
  };
}
