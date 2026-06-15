export type CaseStudy = {
  title: string;
  summary: string;
};

export type ExclusionRules = {
  competitors?: string[];
  titles?: string[];
  industries?: string[];
  profileKeywords?: string[];
  agencies?: boolean;
};

export type ICPWeights = {
  title?: number;
  company?: number;
  industry?: number;
  geo?: number;
  techStack?: number;
  signals?: number;
};

export type UserProfileData = {
  id?: string;
  productName: string;
  valueProps: string[];
  targetIndustries: string[];
  targetPersonas: string[];
  caseStudies: CaseStudy[];
  pricingTierHints: string;
};

export type ICPCriteriaData = {
  id?: string;
  titles: string[];
  seniorityLevels: string[];
  companySizeMin: number | null;
  companySizeMax: number | null;
  industries: string[];
  techStack: string[];
  geo: string[];
  exclusionRules: ExclusionRules;
  weights: ICPWeights;
  fitThreshold: number;
};

export type SnListData = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  lastSyncedAt: Date | null;
};

export type DoNotContactEntry = {
  id: string;
  linkedInUrl: string | null;
  email: string | null;
  reason: string | null;
  createdAt: Date;
};

export type SafetyStatusData = {
  dailyScrapeLimit: number;
  minDelayMs: number;
  maxDelayMs: number;
  maxPostsPerProfile: number;
  browserProfileDir: string;
  browserProfileExists: boolean;
  todayScrapeCount: number;
  remainingToday: number;
};

export const DEFAULT_ICP_WEIGHTS: Required<ICPWeights> = {
  title: 25,
  company: 20,
  industry: 15,
  geo: 10,
  techStack: 15,
  signals: 15,
};

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function parseCaseStudies(value: unknown): CaseStudy[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is CaseStudy =>
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        "summary" in item &&
        typeof item.title === "string" &&
        typeof item.summary === "string",
    )
    .map((item) => ({
      title: item.title.trim(),
      summary: item.summary.trim(),
    }))
    .filter((item) => item.title.length > 0);
}

export function parseExclusionRules(value: unknown): ExclusionRules {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const rules = value as Record<string, unknown>;

  return {
    competitors: parseStringArray(rules.competitors),
    titles: parseStringArray(rules.titles),
    industries: parseStringArray(rules.industries),
    profileKeywords: parseStringArray(rules.profileKeywords),
    agencies: typeof rules.agencies === "boolean" ? rules.agencies : false,
  };
}

export function parseWeights(value: unknown): ICPWeights {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_ICP_WEIGHTS };
  }

  const weights = value as Record<string, unknown>;
  const parsed: ICPWeights = {};

  for (const key of Object.keys(DEFAULT_ICP_WEIGHTS) as (keyof ICPWeights)[]) {
    const raw = weights[key];
    parsed[key] =
      typeof raw === "number" && Number.isFinite(raw)
        ? raw
        : DEFAULT_ICP_WEIGHTS[key];
  }

  return parsed;
}
