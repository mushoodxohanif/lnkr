import type { Page } from "playwright";
import { detectCaptchaOrRateLimit } from "./safety";
import { findAllMatching, findFirstVisible, SELECTORS } from "./selectors";
import type { ListRowLead } from "./types";
import {
  humanDelay,
  humanMouseMove,
  humanScroll,
  normalizeLinkedInUrl,
} from "./utils";

const MAX_PAGES_WITHOUT_NEW_LEADS = 3;

async function extractRowLead(
  _page: Page,
  row: import("playwright").Locator,
): Promise<ListRowLead | null> {
  let nameLink: import("playwright").Locator | null = null;

  for (const selector of SELECTORS.listRowNameLink) {
    const link = row.locator(selector).first();
    if ((await link.count()) > 0) {
      nameLink = link;
      break;
    }
  }

  if (!nameLink) return null;

  const href = await nameLink.getAttribute("href");
  if (!href) return null;

  const profileUrl = href.startsWith("http")
    ? href
    : `https://www.linkedin.com${href}`;

  const name = (await nameLink.innerText()).trim();
  if (!name) return null;

  let title: string | undefined;
  for (const selector of SELECTORS.listRowTitle) {
    const el = row.locator(selector).first();
    if ((await el.count()) > 0) {
      title = (await el.innerText()).trim() || undefined;
      if (title) break;
    }
  }

  let company: string | undefined;
  for (const selector of SELECTORS.listRowCompany) {
    const el = row.locator(selector).first();
    if ((await el.count()) > 0) {
      company = (await el.innerText()).trim() || undefined;
      if (company) break;
    }
  }

  let location: string | undefined;
  for (const selector of SELECTORS.listRowLocation) {
    const el = row.locator(selector).first();
    if ((await el.count()) > 0) {
      location = (await el.innerText()).trim() || undefined;
      if (location) break;
    }
  }

  return {
    linkedInUrl: normalizeLinkedInUrl(profileUrl),
    name,
    title,
    company,
    location,
    profileUrl,
  };
}

async function clickNextPage(page: Page): Promise<boolean> {
  for (const selector of SELECTORS.listNextButton) {
    const button = page.locator(selector).first();
    if ((await button.count()) === 0) continue;

    try {
      const disabled = await button.getAttribute("disabled");
      const ariaDisabled = await button.getAttribute("aria-disabled");
      if (disabled !== null || ariaDisabled === "true") {
        return false;
      }

      if (await button.isVisible({ timeout: 1000 })) {
        await button.click();
        await page.waitForLoadState("domcontentloaded");
        await humanDelay(1500, 3000);
        return true;
      }
    } catch {
      // try next selector
    }
  }

  return false;
}

export async function scrapeListPage(
  page: Page,
  listUrl: string,
  maxLeads: number,
  onLead: (lead: ListRowLead) => Promise<boolean>,
): Promise<{ collected: number; stoppedEarly: boolean }> {
  await page.goto(listUrl, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await detectCaptchaOrRateLimit(page);
  await humanDelay(2000, 4000);

  const seenUrls = new Set<string>();
  let collected = 0;
  let pagesWithoutNewLeads = 0;
  let stoppedEarly = false;

  while (collected < maxLeads) {
    await detectCaptchaOrRateLimit(page);
    await humanScroll(page);
    await humanMouseMove(page);

    const rows = await findAllMatching(page, SELECTORS.listRow);
    if (!rows) {
      console.warn(
        "No list rows found on current page. LinkedIn UI may have changed.",
      );
      break;
    }

    const rowCount = await rows.count();
    let newOnPage = 0;

    for (let i = 0; i < rowCount && collected < maxLeads; i++) {
      const row = rows.nth(i);
      const lead = await extractRowLead(page, row);
      if (!lead) continue;

      if (seenUrls.has(lead.linkedInUrl)) continue;
      seenUrls.add(lead.linkedInUrl);
      newOnPage++;

      const shouldContinue = await onLead(lead);
      collected++;
      if (!shouldContinue) {
        stoppedEarly = true;
        return { collected, stoppedEarly };
      }
    }

    if (newOnPage === 0) {
      pagesWithoutNewLeads++;
      if (pagesWithoutNewLeads >= MAX_PAGES_WITHOUT_NEW_LEADS) {
        break;
      }
    } else {
      pagesWithoutNewLeads = 0;
    }

    if (collected >= maxLeads) break;

    const hasNext = await clickNextPage(page);
    if (!hasNext) break;

    await detectCaptchaOrRateLimit(page);
  }

  return { collected, stoppedEarly };
}

export async function getListResultCount(page: Page): Promise<string | null> {
  const el = await findFirstVisible(page, SELECTORS.listResultCount);
  if (!el) return null;
  return (await el.innerText()).trim() || null;
}
