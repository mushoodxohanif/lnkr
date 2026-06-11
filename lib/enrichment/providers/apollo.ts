import { normalizeDomain } from "@/lib/enrichment/domain";
import {
  assertEnrichmentResponse,
  parseJsonResponse,
} from "@/lib/enrichment/providers/http";
import type { EnrichmentProvider } from "@/lib/enrichment/providers/types";
import type {
  CompanyEnrichmentInput,
  CompanyFunding,
  CompanySignals,
  CompanyTechStack,
  ContactEnrichmentInput,
  EnrichedCompanyData,
  EnrichedContactData,
} from "@/lib/enrichment/types";

const BASE_URL = "https://api.apollo.io/api/v1";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && !Number.isNaN(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function mapApolloOrganization(
  organization: Record<string, unknown>,
): EnrichedCompanyData | null {
  const websiteUrl = asString(organization.website_url);
  const domain =
    asString(organization.primary_domain) ??
    asString(organization.domain) ??
    (websiteUrl ? normalizeDomain(websiteUrl) : undefined);

  if (!domain) return null;

  const industries = asStringArray(organization.industries);
  const technologyNames = asStringArray(organization.technology_names) ?? [];

  const fundingEvents = Array.isArray(organization.funding_events)
    ? organization.funding_events
        .filter(
          (event): event is Record<string, unknown> =>
            typeof event === "object" && event !== null,
        )
        .map((event) => ({
          type: asString(event.type),
          date: asString(event.date),
          amount: asString(event.amount),
          investors: asString(event.investors),
        }))
    : undefined;

  const latestFunding = fundingEvents?.[0];

  const funding: CompanyFunding = {
    totalAmount: asNumber(organization.total_funding),
    lastRoundType:
      asString(organization.latest_funding_stage) ?? latestFunding?.type,
    lastRoundDate:
      asString(organization.latest_funding_round_date) ?? latestFunding?.date,
    annualRevenue: asNumber(organization.annual_revenue),
    revenueRange: asString(organization.annual_revenue_printed),
    events: fundingEvents,
  };

  const techStack: CompanyTechStack = {
    technologies: technologyNames,
  };

  const departmentalHeadcount =
    organization.departmental_head_count &&
    typeof organization.departmental_head_count === "object"
      ? (organization.departmental_head_count as Record<string, unknown>)
      : undefined;

  const openRoles: Record<string, number> = {};
  if (departmentalHeadcount) {
    for (const [department, count] of Object.entries(departmentalHeadcount)) {
      const value = asNumber(count);
      if (value !== undefined && value > 0) {
        openRoles[department] = value;
      }
    }
  }

  const orgHeadcountGrowth =
    organization.organization_headcount_growth &&
    typeof organization.organization_headcount_growth === "object"
      ? (organization.organization_headcount_growth as Record<string, unknown>)
      : undefined;

  const signals: CompanySignals = {
    employeeGrowthRate:
      asNumber(orgHeadcountGrowth?.twelve_month_growth) ??
      asNumber(orgHeadcountGrowth?.twenty_four_month_growth),
    openRoles: Object.keys(openRoles).length > 0 ? openRoles : undefined,
    headquarters: {
      city: asString(organization.city),
      state: asString(organization.state),
      countryCode: asString(organization.country),
    },
    founded: asNumber(organization.founded_year),
    specialties: asStringArray(organization.keywords),
  };

  return {
    domain: normalizeDomain(domain),
    companyName: asString(organization.name),
    employeeCount: asNumber(organization.estimated_num_employees),
    industry: industries?.[0],
    funding,
    techStack,
    signals,
    provider: "apollo",
    raw: organization,
  };
}

function mapApolloPerson(person: Record<string, unknown>): EnrichedContactData {
  const organization =
    person.organization && typeof person.organization === "object"
      ? (person.organization as Record<string, unknown>)
      : undefined;

  return {
    fullName: asString(person.name),
    email: asString(person.email),
    title: asString(person.title),
    companyName: asString(organization?.name),
    linkedInUrl: asString(person.linkedin_url),
    provider: "apollo",
    raw: person,
  };
}

export function createApolloProvider(apiKey: string): EnrichmentProvider {
  async function request(
    path: string,
    init: RequestInit,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        ...(init.headers ?? {}),
      },
    });

    const body = await parseJsonResponse(response);
    assertEnrichmentResponse(response, body, "Apollo");

    if (response.status === 404) {
      return {};
    }

    return body;
  }

  return {
    name: "apollo",

    async enrichCompany(
      input: CompanyEnrichmentInput,
    ): Promise<EnrichedCompanyData | null> {
      const params = new URLSearchParams();
      if (input.domain) params.set("domain", normalizeDomain(input.domain));
      if (input.companyName) params.set("name", input.companyName);
      if (input.linkedInUrl) params.set("linkedin_url", input.linkedInUrl);

      if ([...params.keys()].length === 0) return null;

      const response = await request(
        `/organizations/enrich?${params.toString()}`,
        { method: "GET" },
      );

      if (!response.organization || typeof response.organization !== "object") {
        return null;
      }

      return mapApolloOrganization(
        response.organization as Record<string, unknown>,
      );
    },

    async enrichContact(
      input: ContactEnrichmentInput,
    ): Promise<EnrichedContactData | null> {
      const body: Record<string, unknown> = {
        reveal_personal_emails: false,
      };
      if (input.linkedInUrl) body.linkedin_url = input.linkedInUrl;
      if (input.email) body.email = input.email;
      if (input.firstName) body.first_name = input.firstName;
      if (input.lastName) body.last_name = input.lastName;
      if (input.companyName) body.organization_name = input.companyName;
      if (input.title) body.title = input.title;

      if (Object.keys(body).length <= 1) return null;

      const response = await request("/people/match", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!response.person || typeof response.person !== "object") {
        return null;
      }

      return mapApolloPerson(response.person as Record<string, unknown>);
    },
  };
}
