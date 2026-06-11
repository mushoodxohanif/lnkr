import {
  normalizeDomain,
  parseEmployeeCountRange,
} from "@/lib/enrichment/domain";
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

const BASE_URL = "https://api.datalayer.sh/v1";

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

function mapDataLayerCompany(
  payload: Record<string, unknown>,
): EnrichedCompanyData | null {
  const company =
    payload.company && typeof payload.company === "object"
      ? (payload.company as Record<string, unknown>)
      : payload;

  const domain = asString(company.domain);
  if (!domain) return null;

  const employeeCount = company.employee_count_range
    ? parseEmployeeCountRange(String(company.employee_count_range))
    : asNumber(company.employee_on_linkedin_count);

  const funding: CompanyFunding = {
    totalAmount: asNumber(company.total_funding_amount),
    lastRoundType: asString(company.last_funding_type),
    lastRoundDate: asString(company.last_funding_date),
    leadInvestors: asStringArray(company.lead_investors),
    revenueRange: asString(company.revenue_range),
  };

  const technologies = [
    asString(company.crm_tech),
    asString(company.cms_tech),
    asString(company.cloud_provider_tech),
    asString(company.analytics_tech),
    asString(company.marketing_automation_tech),
    asString(company.sales_automation_tech),
    asString(company.ecommerce_tech),
    ...(asStringArray(company.development_tech) ?? []),
  ].filter((value): value is string => Boolean(value));

  const techStack: CompanyTechStack = {
    technologies: [...new Set(technologies)],
    crm: asString(company.crm_tech),
    cms: asString(company.cms_tech),
    cloud: asString(company.cloud_provider_tech),
    marketing: asString(company.marketing_automation_tech),
    sales: asString(company.sales_automation_tech),
    analytics: asString(company.analytics_tech),
    development: asStringArray(company.development_tech),
    ecommerce: asString(company.ecommerce_tech),
  };

  const openRoles: Record<string, number> = {};
  const roleFields: Array<[string, string]> = [
    ["engineering", "engineering_open_roles_count"],
    ["sales", "sales_open_roles_count"],
    ["marketing", "marketing_open_roles_count"],
    ["product", "product_open_roles_count"],
    ["operations", "operations_open_roles_count"],
    ["data", "data_open_roles_count"],
  ];

  for (const [key, field] of roleFields) {
    const count = asNumber(company[field]);
    if (count !== undefined && count > 0) {
      openRoles[key] = count;
    }
  }

  const hiringSignals = Object.entries(openRoles)
    .filter(([, count]) => count > 0)
    .map(([department, count]) => `${count} open ${department} roles`);

  const signals: CompanySignals = {
    employeeGrowthRate: asNumber(company.employee_on_linkedin_growth_rate),
    monthlyTraffic: asNumber(company.total_monthly_traffic),
    organicTraffic: asNumber(company.monthly_organic_traffic),
    googleAdSpend: asNumber(company.monthly_google_adspend),
    openRoles: Object.keys(openRoles).length > 0 ? openRoles : undefined,
    hasMobileApp:
      typeof company.has_mobile_app === "boolean"
        ? company.has_mobile_app
        : undefined,
    hasWebApp:
      typeof company.has_web_app === "boolean"
        ? company.has_web_app
        : undefined,
    hiringSignals: hiringSignals.length > 0 ? hiringSignals : undefined,
    headquarters: {
      city: asString(company.headquarters_city),
      state: asString(company.headquarters_state),
      countryCode: asString(company.headquarters_country_code),
    },
    founded: asNumber(company.founded),
    specialties: asStringArray(company.specialties),
  };

  return {
    domain: normalizeDomain(domain),
    companyName: asString(company.name) ?? asString(company.company_name),
    employeeCount: employeeCount ?? undefined,
    industry: asString(company.industry_linkedin),
    funding,
    techStack,
    signals,
    provider: "datalayer",
    raw: company,
  };
}

function mapDataLayerContact(
  payload: Record<string, unknown>,
): EnrichedContactData | null {
  const person =
    payload.person && typeof payload.person === "object"
      ? (payload.person as Record<string, unknown>)
      : payload;

  const linkedInUrl = asString(person.linkedin_url);
  const fullName = asString(person.full_name);
  if (!linkedInUrl && !fullName) return null;

  return {
    fullName,
    email: asString(person.email_address),
    emailStatus: asString(person.email_status),
    title: asString(person.job_title),
    companyName: asString(person.company_name),
    jobLevel: asString(person.job_level),
    jobFunction: asString(person.job_function),
    linkedInUrl,
    skills: asStringArray(person.skills),
    location: {
      city: asString(person.city),
      state: asString(person.state),
      countryCode: asString(person.country_code),
    },
    provider: "datalayer",
    raw: person,
  };
}

export function createDataLayerProvider(apiKey: string): EnrichmentProvider {
  async function request(
    path: string,
    init: RequestInit,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    const body = await parseJsonResponse(response);
    assertEnrichmentResponse(response, body, "DataLayer");

    if (response.status === 404) {
      return {};
    }

    return body;
  }

  return {
    name: "datalayer",

    async enrichCompany(
      input: CompanyEnrichmentInput,
    ): Promise<EnrichedCompanyData | null> {
      const body: Record<string, unknown> = {};
      if (input.domain) body.domain = normalizeDomain(input.domain);
      if (input.companyName) body.company_name = input.companyName;
      if (input.linkedInUrl) body.linkedin_url = input.linkedInUrl;

      if (Object.keys(body).length === 0) return null;

      const response = await request("/enrich/company", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return mapDataLayerCompany(response);
    },

    async enrichContact(
      input: ContactEnrichmentInput,
    ): Promise<EnrichedContactData | null> {
      const body: Record<string, unknown> = {};
      if (input.email) body.email = input.email;
      if (input.linkedInUrl) body.linkedin_url = input.linkedInUrl;
      if (input.firstName) body.first_name = input.firstName;
      if (input.lastName) body.last_name = input.lastName;
      if (input.companyName) body.company_name = input.companyName;
      if (input.title) body.job_title = input.title;

      if (Object.keys(body).length === 0) return null;

      const response = await request("/enrich/person", {
        method: "POST",
        body: JSON.stringify(body),
      });

      return mapDataLayerContact(response);
    },
  };
}
