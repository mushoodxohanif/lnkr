import type { Page } from "playwright";
import { SELECTORS } from "./selectors";

export class SafetyStopError extends Error {
  constructor(
    public readonly reason: "captcha" | "rate_limit",
    message: string,
  ) {
    super(message);
    this.name = "SafetyStopError";
  }
}

export async function detectCaptchaOrRateLimit(page: Page): Promise<void> {
  for (const selector of SELECTORS.captchaIndicators) {
    const el = page.locator(selector).first();
    if ((await el.count()) > 0) {
      try {
        if (await el.isVisible({ timeout: 500 })) {
          throw new SafetyStopError(
            "captcha",
            "CAPTCHA detected. Complete verification in the browser, then re-run sync.",
          );
        }
      } catch (error) {
        if (error instanceof SafetyStopError) throw error;
      }
    }
  }

  for (const selector of SELECTORS.rateLimitIndicators) {
    const el = page.locator(selector).first();
    if ((await el.count()) > 0) {
      try {
        if (await el.isVisible({ timeout: 500 })) {
          throw new SafetyStopError(
            "rate_limit",
            "LinkedIn rate limit or security check detected. Pause and try again later.",
          );
        }
      } catch (error) {
        if (error instanceof SafetyStopError) throw error;
      }
    }
  }

  const url = page.url();
  if (
    url.includes("/checkpoint/") ||
    url.includes("/authwall") ||
    url.includes("challenge")
  ) {
    throw new SafetyStopError(
      "captcha",
      "LinkedIn security checkpoint detected. Complete verification manually, then re-run sync.",
    );
  }
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  if (
    (url.includes("linkedin.com/feed") ||
      url.includes("linkedin.com/sales/") ||
      url.includes("linkedin.com/mynetwork") ||
      url.includes("linkedin.com/notifications")) &&
    !url.includes("/login") &&
    !url.includes("/checkpoint") &&
    !url.includes("/authwall")
  ) {
    return true;
  }

  const cookies = await page.context().cookies("https://www.linkedin.com");
  if (cookies.some((cookie) => cookie.name === "li_at" && cookie.value)) {
    return true;
  }

  for (const selector of SELECTORS.loggedInIndicators) {
    const el = page.locator(selector).first();
    if ((await el.count()) > 0) {
      try {
        if (await el.isVisible({ timeout: 1000 })) {
          return true;
        }
      } catch {
        // continue
      }
    }
  }
  return false;
}

export async function waitForManualLogin(
  page: Page,
  timeoutMs: number,
): Promise<boolean> {
  const start = Date.now();
  const pollIntervalMs = 5000;

  console.log(
    "Please log in to LinkedIn in the browser window (including 2FA if required).",
  );
  console.log(`Waiting up to ${Math.round(timeoutMs / 60_000)} minutes...`);

  while (Date.now() - start < timeoutMs) {
    await detectCaptchaOrRateLimit(page).catch((error) => {
      if (error instanceof SafetyStopError && error.reason === "captcha") {
        console.log(
          "Security checkpoint active — complete it in the browser to continue.",
        );
      }
    });

    if (await isLoggedIn(page)) {
      console.log("Login detected. Session saved to browser profile.");
      return true;
    }

    await page.waitForTimeout(pollIntervalMs);
  }

  return false;
}
