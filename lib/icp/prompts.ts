import type { ScoringContext } from "@/lib/icp/types";

function formatRecentPosts(context: ScoringContext): string {
  if (context.recentPosts.length === 0) {
    return "No recent posts available.";
  }

  return context.recentPosts
    .slice(0, 5)
    .map((post, index) => {
      const postedAt = post.postedAt ? ` (${post.postedAt})` : "";
      return `${index + 1}. ${post.text}${postedAt}`;
    })
    .join("\n");
}

function formatProductContext(context: ScoringContext): string {
  if (!context.product) {
    return "Product profile not configured.";
  }

  const caseStudies = context.product.caseStudies
    .map((study) => `- ${study.title}: ${study.summary}`)
    .join("\n");

  return [
    `Product: ${context.product.productName}`,
    `Value props: ${context.product.valueProps.join("; ")}`,
    `Target personas: ${context.product.targetPersonas.join("; ")}`,
    `Target industries: ${context.product.targetIndustries.join("; ")}`,
    context.product.pricingTierHints
      ? `Pricing hints: ${context.product.pricingTierHints}`
      : null,
    caseStudies ? `Case studies:\n${caseStudies}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatEnrichment(context: ScoringContext): string {
  const enrichment = context.enrichment;
  if (!enrichment) {
    return "No company enrichment available.";
  }

  const techStack = enrichment.techStack?.technologies?.join(", ") || "unknown";
  const hiringSignals =
    enrichment.signals?.hiringSignals?.join("; ") || "none detected";
  const funding = enrichment.funding?.lastRoundType
    ? `${enrichment.funding.lastRoundType}${
        enrichment.funding.lastRoundDate
          ? ` (${enrichment.funding.lastRoundDate})`
          : ""
      }`
    : "unknown";

  return [
    `Company: ${enrichment.companyName ?? context.lead.company ?? "unknown"}`,
    `Domain: ${enrichment.domain}`,
    `Employees: ${enrichment.employeeCount ?? "unknown"}`,
    `Industry: ${enrichment.industry ?? "unknown"}`,
    `Tech stack: ${techStack}`,
    `Funding: ${funding}`,
    `Hiring signals: ${hiringSignals}`,
  ].join("\n");
}

export function buildScoringPrompt(context: ScoringContext): string {
  const icp = context.icp;

  return `You are an expert B2B SaaS sales development analyst. Evaluate how well this lead fits the seller's ideal customer profile (ICP).

## Seller context
${formatProductContext(context)}

## ICP criteria
- Target titles: ${icp.titles.join(", ")}
- Seniority levels: ${icp.seniorityLevels.join(", ") || "any"}
- Company size: ${icp.companySizeMin ?? "any"} to ${icp.companySizeMax ?? "any"} employees
- Industries: ${icp.industries.join(", ") || "any"}
- Tech stack signals: ${icp.techStack.join(", ") || "any"}
- Geography: ${icp.geo.join(", ") || "any"}
- Fit threshold: ${icp.fitThreshold}%

## Lead profile
- Name: ${context.lead.name}
- Title: ${context.lead.title ?? "unknown"}
- Headline: ${context.lead.headline ?? "unknown"}
- Company: ${context.lead.company ?? "unknown"}
- Location: ${context.lead.location ?? "unknown"}
- LinkedIn: ${context.lead.linkedInUrl}

## Company enrichment
${formatEnrichment(context)}

## Recent LinkedIn activity
${formatRecentPosts(context)}

## Instructions
Return structured JSON scoring this lead for outbound SaaS outreach.
- fit_percent: overall ICP fit from 0-100 based on role authority, company fit, and timing signals
- dimension_scores: score title, company, signals, and timing each from 0-100
- fit_reasons: 2-4 concise bullets explaining why they fit (reference specific facts)
- disqualifiers: list hard mismatches only (empty array if none)
- pain_points: 2-4 inferred pains relevant to the seller's product
- recommended_offer: one sentence tying a specific value prop to this lead's context
- timing_signal: hot (strong intent/growth signals), warm (reasonable fit), or cold (weak timing)

Be specific and grounded in the provided data. Do not invent facts not supported by the profile.`;
}
