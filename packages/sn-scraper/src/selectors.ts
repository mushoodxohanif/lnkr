/** LinkedIn Sales Navigator selectors with fallbacks for UI changes. */
export const SELECTORS = {
  // Login detection
  loggedInIndicators: [
    'nav a[href*="/feed/"]',
    'a[data-control-name="nav.settings_and_privacy"]',
    ".global-nav__me",
    'button[aria-label*="Me"]',
    "img.global-nav__me-photo",
  ],

  // CAPTCHA / rate limit
  captchaIndicators: [
    "#captcha-internal",
    'iframe[src*="captcha"]',
    'form[action*="checkpoint"]',
    '[data-test-id="captcha"]',
  ],
  rateLimitIndicators: [
    "text=/unusual activity/i",
    "text=/temporarily restricted/i",
    "text=/verify your identity/i",
    "text=/security verification/i",
  ],

  // SN list page
  listContainer: [
    ".lead-list__results",
    "[data-x--lead-list-results]",
    ".search-results-container",
    "table.artdeco-models-table",
    ".lists-detail__lead-list-results",
    "table.lists-detail__table",
    "table",
  ],
  listRow: [
    "table tbody tr",
    "tr.artdeco-models-table-row",
    ".lead-list__result-row",
    "[data-x--lead-list-result-item]",
    "li.reusable-search__result-container",
    ".search-results__result-item",
  ],
  listRowNameLink: [
    'a[href*="/sales/lead/"]',
    'a[data-control-name="view_lead_panel_via_search_lead_name"]',
    'a[href*="/in/"]',
    ".artdeco-entity-lockup__title a",
    ".result-lockup__name a",
  ],
  listRowTitle: [
    '[data-anonymize="title"]',
    ".artdeco-entity-lockup__subtitle",
    ".result-lockup__highlight-keyword",
    ".horizontal-person-entity-lockup-4 .artdeco-entity-lockup__subtitle",
  ],
  listRowCompany: [
    '[data-anonymize="company-name"]',
    ".result-lockup__position-company a",
    ".artdeco-entity-lockup__caption",
  ],
  listRowLocation: ['[data-anonymize="location"]', ".result-lockup__misc-item"],
  listNextButton: [
    'button[aria-label="Next"]',
    "button.artdeco-pagination__button--next:not([disabled])",
    'button[data-test-pagination-page-btn="next"]:not([disabled])',
  ],
  listResultCount: [
    ".search-results__total",
    ".lists-detail__header-subtitle",
    "[data-x--lead-list-count]",
  ],

  // Profile page
  profileName: [
    "h1.text-heading-xlarge",
    "h1.inline.t-24",
    '[data-anonymize="person-name"]',
    ".pv-text-details__left-panel h1",
  ],
  profileHeadline: [
    ".text-body-medium.break-words",
    '[data-anonymize="headline"]',
    ".pv-text-details__left-panel .text-body-medium",
  ],
  profileLocation: [
    ".text-body-small.inline.t-black--light.break-words",
    '[data-anonymize="location"]',
    ".pv-text-details__left-panel .text-body-small",
  ],
  profileExperience: [
    "#experience",
    'section[data-section="experience"]',
    '[componentkey*="ExperienceTopLevelSection"]',
  ],
  profilePosts: [
    ".feed-shared-update-v2",
    ".update-components-text",
    '[data-urn*="activity"]',
  ],
  profilePostText: [
    ".feed-shared-text",
    ".update-components-text span[dir]",
    ".break-words span[dir]",
  ],
  profileCompanyLink: [
    'a[href*="/company/"]',
    '[data-anonymize="company-name"]',
  ],
} as const;

export async function findFirstVisible(
  page: import("playwright").Page,
  selectors: readonly string[],
): Promise<import("playwright").Locator | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const count = await locator.count();
    if (count > 0) {
      try {
        if (await locator.isVisible({ timeout: 500 })) {
          return locator;
        }
      } catch {
        // try next selector
      }
    }
  }
  return null;
}

export async function findAllMatching(
  page: import("playwright").Page,
  selectors: readonly string[],
): Promise<import("playwright").Locator | null> {
  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count();
    if (count > 0) {
      return locator;
    }
  }
  return null;
}
