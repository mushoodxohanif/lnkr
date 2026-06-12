import { enrichCompanyFromProfile } from "@/lib/enrichment/providers/profile";
import type { EnrichmentProvider } from "@/lib/enrichment/providers/types";
import type {
  CompanyEnrichmentInput,
  ContactEnrichmentInput,
  EnrichedCompanyData,
  EnrichedContactData,
} from "@/lib/enrichment/types";

export function createProfileProvider(): EnrichmentProvider {
  return {
    name: "profile",

    async enrichCompany(
      input: CompanyEnrichmentInput,
    ): Promise<EnrichedCompanyData | null> {
      return enrichCompanyFromProfile({
        company: input.companyName ?? null,
        rawProfileSnapshot: input.rawProfileSnapshot,
      });
    },

    async enrichContact(
      _input: ContactEnrichmentInput,
    ): Promise<EnrichedContactData | null> {
      return null;
    },
  };
}
