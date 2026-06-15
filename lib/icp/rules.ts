import type {
  ParsedCompanyEnrichment,
  RuleDimensionScores,
  RuleScoreResult,
  ScoringContext,
  ScoringLead,
} from "@/lib/icp/types";
import { DEFAULT_ICP_WEIGHTS, type ICPWeights } from "@/lib/settings/types";

const AGENCY_KEYWORDS = [
  "agency",
  "consulting",
  "consultancy",
  "recruiting",
  "staffing",
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function containsAny(text: string, needles: string[]): boolean {
  const haystack = normalize(text);
  return needles.some((needle) => haystack.includes(normalize(needle)));
}

function matchesAny(text: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  const haystack = normalize(text);
  return patterns.some((pattern) => haystack.includes(normalize(pattern)));
}

function scoreTitleMatch(titleText: string, icpTitles: string[]): number {
  if (icpTitles.length === 0) return 50;
  return matchesAny(titleText, icpTitles) ? 100 : 20;
}

function scoreSeniorityMatch(
  titleText: string,
  seniorityLevels: string[],
): number {
  if (seniorityLevels.length === 0) return 100;
  return matchesAny(titleText, seniorityLevels) ? 100 : 25;
}

function scoreTitleDimension(context: ScoringContext): {
  score: number;
  reasons: string[];
} {
  const titleText = [
    context.lead.title,
    context.lead.headline,
    context.lead.name,
  ]
    .filter(Boolean)
    .join(" ");

  const titleMatch = scoreTitleMatch(titleText, context.icp.titles);
  const seniorityMatch = scoreSeniorityMatch(
    titleText,
    context.icp.seniorityLevels,
  );
  const score = Math.round((titleMatch + seniorityMatch) / 2);
  const reasons: string[] = [];

  if (titleMatch >= 100) {
    reasons.push(
      `Title aligns with target roles (${context.lead.title ?? context.lead.headline}).`,
    );
  }

  if (seniorityMatch >= 100 && context.icp.seniorityLevels.length > 0) {
    reasons.push("Seniority level matches your ICP.");
  }

  return { score, reasons };
}

function resolveEmployeeCount(
  enrichment: ParsedCompanyEnrichment | null,
): number | null {
  return enrichment?.employeeCount ?? null;
}

function scoreCompanyDimension(context: ScoringContext): {
  score: number;
  reasons: string[];
} {
  const { companySizeMin, companySizeMax } = context.icp;
  const employeeCount = resolveEmployeeCount(context.enrichment);

  if (companySizeMin === null && companySizeMax === null) {
    return { score: 70, reasons: [] };
  }

  if (employeeCount === null) {
    return {
      score: 45,
      reasons: ["Company size is unknown — partial credit applied."],
    };
  }

  const min = companySizeMin ?? 0;
  const max = companySizeMax ?? Number.MAX_SAFE_INTEGER;

  if (employeeCount >= min && employeeCount <= max) {
    return {
      score: 100,
      reasons: [
        `Company size (~${employeeCount} employees) fits your ${min}-${max} target band.`,
      ],
    };
  }

  const distance =
    employeeCount < min ? min - employeeCount : employeeCount - max;

  const score = Math.max(0, 100 - Math.round((distance / max) * 100));

  return {
    score,
    reasons: [
      `Company size (~${employeeCount} employees) is outside your preferred ${min}-${max} range.`,
    ],
  };
}

function scoreIndustryDimension(context: ScoringContext): {
  score: number;
  reasons: string[];
} {
  const targetIndustries = context.icp.industries;
  if (targetIndustries.length === 0) {
    return { score: 70, reasons: [] };
  }

  const industryText = [
    context.enrichment?.industry,
    context.lead.company,
    context.product?.targetIndustries.join(" "),
  ]
    .filter(Boolean)
    .join(" ");

  if (!industryText.trim()) {
    return { score: 40, reasons: ["Industry could not be determined."] };
  }

  if (matchesAny(industryText, targetIndustries)) {
    return {
      score: 100,
      reasons: [
        `Industry match: ${context.enrichment?.industry ?? context.lead.company}.`,
      ],
    };
  }

  return {
    score: 15,
    reasons: ["Industry does not match your configured target verticals."],
  };
}

function scoreGeoDimension(context: ScoringContext): {
  score: number;
  reasons: string[];
} {
  const targetGeo = context.icp.geo;
  if (targetGeo.length === 0) {
    return { score: 100, reasons: [] };
  }

  const location = context.lead.location ?? "";
  if (!location.trim()) {
    return { score: 50, reasons: ["Lead location is unknown."] };
  }

  if (matchesAny(location, targetGeo)) {
    return { score: 100, reasons: [`Location match: ${location}.`] };
  }

  return {
    score: 10,
    reasons: [`Location (${location}) is outside target geos.`],
  };
}

function collectTechNames(
  enrichment: ParsedCompanyEnrichment | null,
): string[] {
  const technologies = enrichment?.techStack?.technologies ?? [];
  const extras = [
    enrichment?.techStack?.crm,
    enrichment?.techStack?.cloud,
    enrichment?.techStack?.analytics,
    enrichment?.techStack?.marketing,
    enrichment?.techStack?.sales,
    enrichment?.techStack?.cms,
    enrichment?.techStack?.ecommerce,
    ...(enrichment?.techStack?.development ?? []),
  ].filter((value): value is string => Boolean(value));

  return [...technologies, ...extras];
}

function scoreTechStackDimension(context: ScoringContext): {
  score: number;
  reasons: string[];
} {
  const targetStack = context.icp.techStack;
  if (targetStack.length === 0) {
    return { score: 70, reasons: [] };
  }

  const companyTech = collectTechNames(context.enrichment);
  if (companyTech.length === 0) {
    return {
      score: 40,
      reasons: ["Tech stack data unavailable for overlap check."],
    };
  }

  const normalizedCompanyTech = companyTech.map(normalize);
  const matches = targetStack.filter((tech) =>
    normalizedCompanyTech.some(
      (companyTechName) =>
        companyTechName.includes(normalize(tech)) ||
        normalize(tech).includes(companyTechName),
    ),
  );

  if (matches.length === 0) {
    return {
      score: 20,
      reasons: ["No configured tech stack overlap detected."],
    };
  }

  const overlapRatio = matches.length / targetStack.length;
  const score = Math.round(Math.min(100, 50 + overlapRatio * 50));

  return {
    score,
    reasons: [`Tech stack overlap: ${matches.join(", ")}.`],
  };
}

function scoreSignalsDimension(context: ScoringContext): {
  score: number;
  reasons: string[];
} {
  const signals = context.enrichment?.signals;
  const funding = context.enrichment?.funding;
  let score = 40;
  const reasons: string[] = [];

  if (funding?.lastRoundType || funding?.totalAmount) {
    score += 25;
    reasons.push(
      funding.lastRoundType
        ? `Recent funding signal: ${funding.lastRoundType}.`
        : "Funding data indicates growth potential.",
    );
  }

  const hiringSignals = signals?.hiringSignals ?? [];
  if (hiringSignals.length > 0) {
    score += 20;
    reasons.push(`Hiring signals: ${hiringSignals.slice(0, 2).join("; ")}.`);
  }

  if (
    signals?.employeeGrowthRate !== undefined &&
    signals.employeeGrowthRate > 0
  ) {
    score += 15;
    reasons.push(
      `Employee growth rate ~${Math.round(signals.employeeGrowthRate * 100)}%.`,
    );
  }

  const openRoles = signals?.openRoles;
  if (openRoles && Object.keys(openRoles).length > 0) {
    score += 10;
    reasons.push("Active job openings suggest expansion.");
  }

  return { score: Math.min(100, score), reasons };
}

type RawProfileSnapshot = {
  about?: string;
  description?: string;
};

function getProfileAboutAndDescriptionText(lead: ScoringLead): string {
  if (!lead.rawProfileSnapshot || typeof lead.rawProfileSnapshot !== "object") {
    return "";
  }

  const snapshot = lead.rawProfileSnapshot as RawProfileSnapshot;
  return [snapshot.about, snapshot.description].filter(Boolean).join(" ");
}

function applyExclusions(context: ScoringContext): {
  disqualifiers: string[];
  hardDisqualified: boolean;
} {
  const rules = context.icp.exclusionRules;
  const disqualifiers: string[] = [];
  const profileText = getProfileAboutAndDescriptionText(context.lead);
  const companyText = [
    context.lead.company,
    context.enrichment?.companyName,
    context.enrichment?.industry,
  ]
    .filter(Boolean)
    .join(" ");
  const titleText = [context.lead.title, context.lead.headline]
    .filter(Boolean)
    .join(" ");

  for (const competitor of rules.competitors ?? []) {
    if (companyText && containsAny(companyText, [competitor])) {
      disqualifiers.push(
        `Company matches competitor exclusion: ${competitor}.`,
      );
    }
  }

  for (const excludedTitle of rules.titles ?? []) {
    if (titleText && containsAny(titleText, [excludedTitle])) {
      disqualifiers.push(`Title matches exclusion rule: ${excludedTitle}.`);
    }
  }

  for (const excludedIndustry of rules.industries ?? []) {
    if (companyText && containsAny(companyText, [excludedIndustry])) {
      disqualifiers.push(
        `Industry matches exclusion rule: ${excludedIndustry}.`,
      );
    }
  }

  if (rules.agencies && companyText) {
    if (containsAny(companyText, AGENCY_KEYWORDS)) {
      disqualifiers.push("Company appears to be an agency/consultancy.");
    }
  }

  for (const keyword of rules.profileKeywords ?? []) {
    if (profileText && containsAny(profileText, [keyword])) {
      disqualifiers.push(
        `Profile About/Description matches exclusion keyword: ${keyword}.`,
      );
    }
  }

  return {
    disqualifiers,
    hardDisqualified: disqualifiers.length > 0,
  };
}

function weightedAverage(
  scores: RuleDimensionScores,
  weights: ICPWeights,
): number {
  const resolvedWeights = { ...DEFAULT_ICP_WEIGHTS, ...weights };
  const entries = Object.entries(resolvedWeights) as [
    keyof RuleDimensionScores,
    number,
  ][];

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [key, weight] of entries) {
    if (weight <= 0) continue;
    totalWeight += weight;
    weightedSum += scores[key] * weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

export function scoreLeadWithRules(context: ScoringContext): RuleScoreResult {
  const title = scoreTitleDimension(context);
  const company = scoreCompanyDimension(context);
  const industry = scoreIndustryDimension(context);
  const geo = scoreGeoDimension(context);
  const techStack = scoreTechStackDimension(context);
  const signals = scoreSignalsDimension(context);

  const dimensionScores: RuleDimensionScores = {
    title: title.score,
    company: company.score,
    industry: industry.score,
    geo: geo.score,
    techStack: techStack.score,
    signals: signals.score,
  };

  const exclusions = applyExclusions(context);
  const fitReasons = [
    ...title.reasons,
    ...company.reasons,
    ...industry.reasons,
    ...geo.reasons,
    ...techStack.reasons,
    ...signals.reasons,
  ].slice(0, 6);

  let fitPercent = weightedAverage(dimensionScores, context.icp.weights);

  if (exclusions.hardDisqualified) {
    fitPercent = Math.min(fitPercent, 15);
  }

  return {
    dimensionScores,
    fitPercent,
    fitReasons,
    disqualifiers: exclusions.disqualifiers,
    hardDisqualified: exclusions.hardDisqualified,
  };
}
