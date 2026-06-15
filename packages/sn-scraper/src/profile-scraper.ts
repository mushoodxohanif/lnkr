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

async function expandSeeMoreInSection(
  _page: Page,
  section: import("playwright").Locator,
): Promise<void> {
  const seeMore = section
    .locator(
      'button:has-text("see more"), button:has-text("…see more"), button.inline-show-more-text__button',
    )
    .first();

  if ((await seeMore.count()) === 0) return;

  try {
    await seeMore.click({ timeout: 1000 });
    await humanDelay(300, 600);
  } catch {
    // best-effort expand
  }
}

async function extractSectionByHeading(
  page: Page,
  headings: string[],
): Promise<string | undefined> {
  const text = await page.evaluate((labels) => {
    const normalizedLabels = labels.map((label) => label.toLowerCase());

    for (const heading of document.querySelectorAll("h2, h3, span, div")) {
      const label = heading.textContent?.trim().toLowerCase();
      if (!label || !normalizedLabels.includes(label)) continue;

      const section =
        heading.closest("section") ??
        heading.parentElement?.parentElement ??
        heading.parentElement;
      if (!section) continue;

      const body = section.textContent?.trim();
      if (!body || body.length <= label.length + 5) continue;

      return body.slice(label.length).trim();
    }

    return undefined;
  }, headings);

  return text || undefined;
}

async function extractProfileAbout(page: Page): Promise<string | undefined> {
  for (const selector of SELECTORS.profileAboutText) {
    const textEl = page.locator(selector).first();
    if ((await textEl.count()) === 0) continue;

    const text = (await textEl.innerText()).trim();
    if (text) return text;
  }

  const aboutSection = await findFirstVisible(
    page,
    SELECTORS.profileAboutSection,
  );
  if (aboutSection) {
    await expandSeeMoreInSection(page, aboutSection);

    for (const selector of SELECTORS.profileAboutText) {
      const textEl = aboutSection.locator(selector).first();
      if ((await textEl.count()) === 0) continue;

      const text = (await textEl.innerText()).trim();
      if (text) return text;
    }

    const fallback = (await aboutSection.innerText()).trim();
    if (fallback) return fallback;
  }

  return extractSectionByHeading(page, ["About", "Summary"]);
}

async function extractExperienceDescriptions(
  page: Page,
): Promise<string | undefined> {
  const experience = await findFirstVisible(page, SELECTORS.profileExperience);
  if (!experience) return undefined;

  await expandSeeMoreInSection(page, experience);

  const descriptions: string[] = [];

  for (const selector of SELECTORS.profileExperienceDescription) {
    const items = experience.locator(selector);
    const count = await items.count();
    if (count === 0) continue;

    for (let i = 0; i < count; i++) {
      const text = (await items.nth(i).innerText()).trim();
      if (text.length > 20) {
        descriptions.push(text);
      }
    }

    if (descriptions.length > 0) break;
  }

  return descriptions.length > 0 ? descriptions.join("\n\n") : undefined;
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
  const about = await extractProfileAbout(page);
  const description = await extractExperienceDescriptions(page);

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
      about,
      description,
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
