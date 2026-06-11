import type { Page } from "playwright";

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function humanDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = randomBetween(minMs, maxMs);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function humanScroll(page: Page): Promise<void> {
  const scrollAmount = randomBetween(200, 600);
  await page.mouse.wheel(0, scrollAmount);
  await humanDelay(300, 800);
}

export async function humanMouseMove(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) return;

  const x = randomBetween(100, Math.max(100, viewport.width - 100));
  const y = randomBetween(100, Math.max(100, viewport.height - 100));
  await page.mouse.move(x, y, { steps: randomBetween(5, 15) });
}

export function normalizeLinkedInUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    const path = parsed.pathname.replace(/\/+$/, "");

    if (path.startsWith("/sales/lead/")) {
      return `https://www.linkedin.com${path}`;
    }

    const inMatch = path.match(/^\/in\/([^/]+)/);
    if (inMatch) {
      return `https://www.linkedin.com/in/${inMatch[1]}`;
    }

    return `https://www.linkedin.com${path}`;
  } catch {
    return url;
  }
}

export function isSalesNavigatorListUrl(url: string): boolean {
  return url.includes("linkedin.com/sales/lists");
}

export function parseCliArgs(argv: string[]): {
  listUrl?: string;
  syncAll: boolean;
  loginOnly: boolean;
  limit?: number;
  headed?: boolean;
  useApify: boolean;
  fallbackApify: boolean;
  help: boolean;
} {
  const result = {
    listUrl: undefined as string | undefined,
    syncAll: false,
    loginOnly: false,
    limit: undefined as number | undefined,
    headed: undefined as boolean | undefined,
    useApify: false,
    fallbackApify: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
      continue;
    }

    if (arg === "--all") {
      result.syncAll = true;
      continue;
    }

    if (arg === "--login") {
      result.loginOnly = true;
      continue;
    }

    if (arg === "--list-url" && argv[i + 1]) {
      result.listUrl = argv[++i];
      continue;
    }

    if (arg === "--limit" && argv[i + 1]) {
      const parsed = Number.parseInt(argv[++i], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        result.limit = parsed;
      }
      continue;
    }

    if (arg === "--headed") {
      result.headed = true;
      continue;
    }

    if (arg === "--headless") {
      result.headed = false;
      continue;
    }

    if (arg === "--apify") {
      result.useApify = true;
      continue;
    }

    if (arg === "--fallback-apify") {
      result.fallbackApify = true;
    }
  }

  return result;
}
