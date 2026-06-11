import {
  buildLnkrApifyActorInput,
  getApifyActorId,
  getApifyTimeoutSecs,
  getApifyToken,
  isApifyFullyConfigured,
  toUrlActorId,
} from "@/lib/integrations/apify-config";
import type {
  LnkrSnApifyCompanySnippet,
  LnkrSnApifyLead,
  LnkrSnApifyPost,
} from "@/lib/integrations/apify-contract";

export type ApifyLeadRecord = LnkrSnApifyLead & {
  raw: Record<string, unknown>;
};

export class ApifyError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "not_configured"
      | "auth_error"
      | "timeout"
      | "actor_failed"
      | "invalid_response",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApifyError";
  }
}

function pickString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function normalizeApifyLinkedInUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    const path = parsed.pathname.replace(/\/+$/, "");

    const inMatch = path.match(/^\/in\/([^/]+)/);
    if (inMatch) {
      return `https://www.linkedin.com/in/${inMatch[1]}`;
    }

    const salesLeadMatch = path.match(/^\/sales\/lead\/([^/]+)/);
    if (salesLeadMatch) {
      return `https://www.linkedin.com/sales/lead/${salesLeadMatch[1]}`;
    }

    return `https://www.linkedin.com${path}`;
  } catch {
    return url;
  }
}

function parsePosts(value: unknown): LnkrSnApifyPost[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const posts: LnkrSnApifyPost[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const text = pickString(record, ["text", "content", "postText"]);
    if (!text) continue;
    posts.push({
      text,
      postedAt: pickString(record, ["postedAt", "date", "timestamp"]),
      url: pickString(record, ["url", "postUrl"]),
    });
  }

  return posts.length > 0 ? posts : undefined;
}

function parseCompanySnippet(
  value: unknown,
): LnkrSnApifyCompanySnippet | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  const record = value as Record<string, unknown>;
  const snippet: LnkrSnApifyCompanySnippet = {
    name: pickString(record, ["name", "companyName"]),
    size: pickString(record, ["size", "employeeCount", "companySize"]),
    industry: pickString(record, ["industry"]),
    about: pickString(record, ["about", "description"]),
    url: pickString(record, ["url", "companyUrl"]),
  };

  return Object.values(snippet).some(Boolean) ? snippet : undefined;
}

function parseRawSnapshot(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function mapApifyRecord(
  record: Record<string, unknown>,
): ApifyLeadRecord | null {
  const url =
    pickString(record, ["linkedInUrl", "linkedinUrl", "linkedin_url"]) ??
    pickString(record, [
      "profileUrl",
      "profile_url",
      "url",
      "linkedInProfileUrl",
      "salesNavUrl",
    ]);

  if (!url) return null;

  const name =
    pickString(record, ["name", "fullName", "full_name", "firstName"]) ??
    [
      pickString(record, ["first_name"]),
      pickString(record, ["lastName", "last_name"]),
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  if (!name) return null;

  const recentPosts =
    parsePosts(record.recentPosts) ?? parsePosts(record.posts);
  const companySnippet =
    parseCompanySnippet(record.companySnippet) ??
    parseCompanySnippet(record.company);

  const rawProfileSnapshot =
    parseRawSnapshot(record.rawProfileSnapshot) ??
    (recentPosts || companySnippet
      ? {
          scrapedAt: new Date().toISOString(),
          headline: pickString(record, ["headline", "summary"]),
          title: pickString(record, ["title", "jobTitle", "position"]),
          company: pickString(record, ["company", "companyName"]),
          location: pickString(record, ["location", "geo"]),
        }
      : undefined);

  return {
    linkedInUrl: normalizeApifyLinkedInUrl(url),
    name,
    headline: pickString(record, ["headline", "summary"]),
    title: pickString(record, ["title", "jobTitle", "job_title", "position"]),
    company: pickString(record, [
      "company",
      "companyName",
      "company_name",
      "currentCompany",
    ]),
    location: pickString(record, ["location", "geo", "geoLocation"]),
    recentPosts,
    companySnippet,
    rawProfileSnapshot,
    raw: record,
  };
}

export function isApifyConfigured(): boolean {
  return isApifyFullyConfigured();
}

export async function scrapeSalesNavigatorListViaApify(
  listUrl: string,
  maxLeads: number,
): Promise<ApifyLeadRecord[]> {
  const token = getApifyToken();
  if (!token) {
    throw new ApifyError(
      "APIFY_TOKEN is not configured. Set it in .env to use Apify sync.",
      "not_configured",
    );
  }

  const actorId = getApifyActorId();
  if (!actorId) {
    throw new ApifyError(
      "APIFY_ACTOR_ID is not configured. Set your Crawlee actor ID (e.g. username/lnkr-sn-scraper).",
      "not_configured",
    );
  }

  const urlActorId = toUrlActorId(actorId);
  const timeoutSecs = getApifyTimeoutSecs();
  const actorInput = buildLnkrApifyActorInput(listUrl, maxLeads);

  const response = await fetch(
    `https://api.apify.com/v2/acts/${urlActorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&timeout=${timeoutSecs}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput),
    },
  );

  const bodyText = await response.text();
  let body: unknown = [];

  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      throw new ApifyError(
        `Apify returned invalid JSON (${response.status}).`,
        "invalid_response",
        response.status,
      );
    }
  }

  if (response.status === 401 || response.status === 403) {
    throw new ApifyError(
      "Apify token is invalid or unauthorized.",
      "auth_error",
      response.status,
    );
  }

  if (response.status === 408) {
    throw new ApifyError(
      "Apify actor timed out. Try a lower --limit or increase APIFY_TIMEOUT_SECS.",
      "timeout",
      response.status,
    );
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as Record<string, unknown>).error === "object" &&
      (body as { error?: { message?: string } }).error?.message
        ? (body as { error: { message: string } }).error.message
        : `Apify request failed with status ${response.status}`;
    throw new ApifyError(message, "actor_failed", response.status);
  }

  if (!Array.isArray(body)) {
    throw new ApifyError(
      "Apify returned an unexpected response shape. Your actor should push dataset items matching LnkrSnApifyLead.",
      "invalid_response",
      response.status,
    );
  }

  const leads: ApifyLeadRecord[] = [];
  const seen = new Set<string>();

  for (const item of body) {
    if (typeof item !== "object" || item === null) continue;
    const mapped = mapApifyRecord(item as Record<string, unknown>);
    if (!mapped || seen.has(mapped.linkedInUrl)) continue;
    seen.add(mapped.linkedInUrl);
    leads.push(mapped);
  }

  return leads;
}
