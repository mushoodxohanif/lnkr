import type {
  CompanyEnrichmentInput,
  ContactEnrichmentInput,
  EnrichedCompanyData,
  EnrichedContactData,
  EnrichmentProviderName,
} from "@/lib/enrichment/types";

export interface EnrichmentProvider {
  readonly name: EnrichmentProviderName;
  enrichCompany(
    input: CompanyEnrichmentInput,
  ): Promise<EnrichedCompanyData | null>;
  enrichContact(
    input: ContactEnrichmentInput,
  ): Promise<EnrichedContactData | null>;
}
