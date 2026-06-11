import type { Page } from "playwright";
import { detectCaptchaOrRateLimit } from "./safety";
import { findFirstVisible, SELECTORS } from "./selectors";
import type { CompanySnippet, ScrapedLead, ScrapedPost } from "./types";
import { humanDelay, humanMouseMove, humanScroll } from "./utils";

async function extractText(
  page: Page,
  selectors: readonly string[],
): Promise<string | undefined> {
  const el = await findFirstVisible(page, selectors);
  if (!el) return undefined;
  const text = (await el.innerText()).trim();
  return text || undefined;
}

async function extractRecentPosts(
  page: Page,
  maxPosts: number,
): Promise<ScrapedPost[]> {
  const posts: ScrapedPost[] = [];

  for (const containerSelector of SELECTORS.profilePosts) {
    const containers = page.locator(containerSelector);
    const count = await containers.count();
    if (count === 0) continue;

    for (let i = 0; i < Math.min(count, maxPosts); i++) {
      const container = containers.nth(i);
      let text: string | undefined;

      for (const textSelector of SELECTORS.profilePostText) {
        const textEl = container.locator(textSelector).first();
        if ((await textEl.count()) > 0) {
          text = (await textEl.innerText()).trim() || undefined;
          if (text) break;
        }
      }

      if (text) {
        posts.push({ text });
      }
    }

    if (posts.length > 0) break;
  }

  return posts.slice(0, maxPosts);
}

async function extractCompanySnippet(
  page: Page,
): Promise<CompanySnippet | undefined> {
  for (const selector of SELECTORS.profileCompanyLink) {
    const link = page.locator(selector).first();
    if ((await link.count()) === 0) continue;

    const name = (await link.innerText()).trim();
    const href = await link.getAttribute("href");
    if (!name) continue;

    return {
      name,
      url: href
        ? href.startsWith("http")
          ? href
          : `https://www.linkedin.com${href}`
        : undefined,
    };
  }

  return undefined;
}

async function extractTitleFromExperience(
  page: Page,
): Promise<string | undefined> {
  const experience = await findFirstVisible(page, SELECTORS.profileExperience);
  if (!experience) return undefined;

  const firstRole = experience
    .locator(".pvs-entity, .pv-entity__summary-info, li")
    .first();
  if ((await firstRole.count()) === 0) return undefined;

  const roleText = (await firstRole.innerText()).trim();
  const firstLine = roleText.split("\n")[0]?.trim();
  return firstLine || undefined;
}

export async function enrichLeadFromProfile(
  page: Page,
  lead: ScrapedLead,
  profileUrl: string,
  maxPosts: number,
): Promise<ScrapedLead> {
  await page.goto(profileUrl, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await detectCaptchaOrRateLimit(page);
  await humanDelay(1500, 3000);
  await humanScroll(page);
  await humanMouseMove(page);

  const name = (await extractText(page, SELECTORS.profileName)) ?? lead.name;
  const headline =
    (await extractText(page, SELECTORS.profileHeadline)) ?? lead.headline;
  const location =
    (await extractText(page, SELECTORS.profileLocation)) ?? lead.location;
  const title = lead.title ?? (await extractTitleFromExperience(page));
  const recentPosts = await extractRecentPosts(page, maxPosts);
  const companySnippet = await extractCompanySnippet(page);

  const company =
    lead.company ??
    companySnippet?.name ??
    extractCompanyFromHeadline(headline);

  return {
    ...lead,
    name,
    headline,
    title,
    company,
    location,
    recentPosts: recentPosts.length > 0 ? recentPosts : lead.recentPosts,
    companySnippet: companySnippet ?? lead.companySnippet,
    rawProfileSnapshot: {
      pageUrl: page.url(),
      scrapedAt: new Date().toISOString(),
      headline,
      title,
      company,
      location,
      postCount: recentPosts.length,
    },
  };
}

function extractCompanyFromHeadline(headline?: string): string | undefined {
  if (!headline) return undefined;
  const atMatch = headline.match(/\bat\s+(.+?)(?:\s*[|·]|$)/i);
  if (atMatch) return atMatch[1].trim();
  return undefined;
}
