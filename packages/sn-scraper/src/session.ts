import type { Cookie } from "playwright";

export class SessionCookieError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionCookieError";
  }
}

const REQUIRED_COOKIE_NAMES = ["li_at"] as const;

function isCookieShape(value: unknown): value is Cookie {
  if (typeof value !== "object" || value === null) return false;
  const cookie = value as Record<string, unknown>;
  return (
    typeof cookie.name === "string" &&
    typeof cookie.value === "string" &&
    typeof cookie.domain === "string" &&
    typeof cookie.path === "string"
  );
}

export function parseSessionCookies(raw: string): Cookie[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SessionCookieError(
      "LINKEDIN_SESSION_COOKIES must be valid JSON (array of Playwright cookie objects).",
    );
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new SessionCookieError(
      "LINKEDIN_SESSION_COOKIES must be a non-empty JSON array of cookie objects.",
    );
  }

  const cookies: Cookie[] = [];
  for (const item of parsed) {
    if (!isCookieShape(item)) {
      throw new SessionCookieError(
        "Each cookie must include name, value, domain, and path.",
      );
    }
    cookies.push(item);
  }

  for (const required of REQUIRED_COOKIE_NAMES) {
    if (!cookies.some((cookie) => cookie.name === required)) {
      throw new SessionCookieError(
        `LINKEDIN_SESSION_COOKIES is missing required cookie: ${required}`,
      );
    }
  }

  return cookies;
}

export function hasSessionCookiesEnv(): boolean {
  return Boolean(process.env.LINKEDIN_SESSION_COOKIES?.trim());
}
