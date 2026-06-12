import {
  getEnrichmentApiKey,
  getEnrichmentProviderName,
} from "@/lib/enrichment/config";
import { createApolloProvider } from "@/lib/enrichment/providers/apollo";
import { createDataLayerProvider } from "@/lib/enrichment/providers/datalayer";
import { createProfileProvider } from "@/lib/enrichment/providers/profile-provider";
import type { EnrichmentProvider } from "@/lib/enrichment/providers/types";

let cachedProvider: EnrichmentProvider | null = null;

export function getEnrichmentProvider(): EnrichmentProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = getEnrichmentProviderName();

  if (providerName === "profile") {
    cachedProvider = createProfileProvider();
    return cachedProvider;
  }

  const apiKey = getEnrichmentApiKey();

  cachedProvider =
    providerName === "apollo"
      ? createApolloProvider(apiKey)
      : createDataLayerProvider(apiKey);

  return cachedProvider;
}

export function resetEnrichmentProvider(): void {
  cachedProvider = null;
}
