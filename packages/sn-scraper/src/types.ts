export type ScrapedPost = {
  text: string;
  postedAt?: string;
  url?: string;
};

export type CompanySnippet = {
  name?: string;
  size?: string;
  industry?: string;
  about?: string;
  url?: string;
};

export type ScrapedLead = {
  linkedInUrl: string;
  name: string;
  headline?: string;
  title?: string;
  company?: string;
  location?: string;
  snListSource: string;
  recentPosts?: ScrapedPost[];
  companySnippet?: CompanySnippet;
  rawProfileSnapshot?: Record<string, unknown>;
};

export type ScraperConfig = {
  browserProfileDir: string;
  dailyScrapeLimit: number;
  minDelayMs: number;
  maxDelayMs: number;
  headed: boolean;
  loginTimeoutMs: number;
  maxPostsPerProfile: number;
};

export type SyncOptions = {
  listUrl?: string;
  syncAll?: boolean;
  loginOnly?: boolean;
  limit?: number;
  headed?: boolean;
  useApify?: boolean;
  fallbackApify?: boolean;
};

export type SyncResult = {
  scraped: number;
  skipped: number;
  errors: number;
  stoppedReason?: "daily_limit" | "captcha" | "rate_limit" | "login_timeout";
  listsProcessed: string[];
};

export type ListRowLead = {
  linkedInUrl: string;
  name: string;
  title?: string;
  company?: string;
  location?: string;
  profileUrl: string;
};
