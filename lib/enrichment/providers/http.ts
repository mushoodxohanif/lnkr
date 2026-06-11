import { EnrichmentError } from "@/lib/enrichment/types";

export async function parseJsonResponse(
  response: Response,
): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new EnrichmentError(
      `Invalid JSON response (${response.status})`,
      "invalid_response",
      response.status,
    );
  }
}

export function assertEnrichmentResponse(
  response: Response,
  body: Record<string, unknown>,
  provider: string,
): void {
  if (response.status === 404) {
    return;
  }

  if (response.status === 401 || response.status === 403) {
    throw new EnrichmentError(
      `${provider} API key is invalid or unauthorized.`,
      "auth_error",
      response.status,
    );
  }

  if (response.status === 402) {
    throw new EnrichmentError(
      `${provider} account has insufficient credits.`,
      "insufficient_credits",
      response.status,
    );
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    throw new EnrichmentError(
      `${provider} rate limit exceeded${retryAfter ? ` (retry after ${retryAfter}s)` : ""}.`,
      "rate_limit",
      response.status,
    );
  }

  if (!response.ok) {
    const message =
      typeof body.message === "string"
        ? body.message
        : typeof body.error === "string"
          ? body.error
          : `Request failed with status ${response.status}`;
    throw new EnrichmentError(message, "provider_error", response.status);
  }
}
