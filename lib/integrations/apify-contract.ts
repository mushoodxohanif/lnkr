/**
 * Contract between lnkr and your custom Apify actor (Crawlee + Playwright + Chrome).
 *
 * Implement this in your actor's `main.ts` input schema and dataset push shape.
 */

export type LnkrSnApifyPost = {
  text: string;
  postedAt?: string;
  url?: string;
};

export type LnkrSnApifyCompanySnippet = {
  name?: string;
  size?: string;
  industry?: string;
  about?: string;
  url?: string;
};

/** Actor input — lnkr sends this when triggering a run. */
export type LnkrSnApifyInput = {
  /** Sales Navigator saved list URL (linkedin.com/sales/lists/...) */
  listUrl: string;
  /** Max profiles to scrape in this run */
  maxLeads: number;
  /** Random delay between profile visits (ms) */
  minDelayMs: number;
  maxDelayMs: number;
  /** Max recent posts to read per profile */
  maxPostsPerProfile: number;
  /** Run a visible Chrome window on Apify (recommended for session-based auth) */
  headed: boolean;
  /**
   * Optional LinkedIn `li_at` cookie. Your actor should inject this into the
   * Playwright context before navigating to Sales Navigator.
   */
  liAt?: string;
};

/**
 * Dataset item — push one record per lead from your actor.
 * Field names match lnkr's local Playwright scraper (`ScrapedLead`).
 */
export type LnkrSnApifyLead = {
  linkedInUrl: string;
  name: string;
  headline?: string;
  title?: string;
  company?: string;
  location?: string;
  recentPosts?: LnkrSnApifyPost[];
  companySnippet?: LnkrSnApifyCompanySnippet;
  rawProfileSnapshot?: Record<string, unknown>;
};
