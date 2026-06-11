import type { LnkrSnApifyInput } from "@/lib/integrations/apify-contract";

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getApifyToken(): string | null {
  const token = process.env.APIFY_TOKEN?.trim();
  return token || null;
}

export function getApifyActorId(): string | null {
  const actorId = process.env.APIFY_ACTOR_ID?.trim();
  return actorId || null;
}

export function isApifyTokenConfigured(): boolean {
  return Boolean(getApifyToken());
}

export function isApifyActorConfigured(): boolean {
  return Boolean(getApifyActorId());
}

export function isApifyFullyConfigured(): boolean {
  return isApifyTokenConfigured() && isApifyActorConfigured();
}

export function toUrlActorId(actorId: string): string {
  return actorId.includes("~") ? actorId : actorId.replace("/", "~");
}

export function getApifyTimeoutSecs(): number {
  return parsePositiveInt(process.env.APIFY_TIMEOUT_SECS, 600);
}

function parseActorInputExtras(): Record<string, unknown> {
  const raw = process.env.APIFY_INPUT_JSON?.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>;
    }
    console.warn("APIFY_INPUT_JSON must be a JSON object — ignoring.");
    return {};
  } catch {
    console.warn("APIFY_INPUT_JSON is invalid JSON — ignoring.");
    return {};
  }
}

export function buildLnkrApifyActorInput(
  listUrl: string,
  maxLeads: number,
): Record<string, unknown> {
  const liAt = process.env.APIFY_LI_AT?.trim();

  const input: LnkrSnApifyInput = {
    listUrl,
    maxLeads,
    minDelayMs: parsePositiveInt(process.env.SCRAPE_MIN_DELAY_MS, 4000),
    maxDelayMs: parsePositiveInt(process.env.SCRAPE_MAX_DELAY_MS, 10000),
    maxPostsPerProfile: parsePositiveInt(process.env.MAX_POSTS_PER_PROFILE, 5),
    headed: process.env.APIFY_HEADLESS !== "true",
    ...(liAt ? { liAt } : {}),
  };

  return {
    ...input,
    ...parseActorInputExtras(),
  };
}
