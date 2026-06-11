import type { ContentContext } from "@/lib/agent/types";

export function formatProductContext(context: ContentContext): string {
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

export function formatEnrichment(context: ContentContext): string {
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

export function formatPainPoints(context: ContentContext): string {
  const painPoints = context.score.painPoints as string[];
  if (painPoints.length === 0) {
    return "No pain points identified.";
  }

  return painPoints.map((point) => `- ${point}`).join("\n");
}

export function formatFitReasons(context: ContentContext): string {
  const fitReasons = context.score.fitReasons as string[];
  if (fitReasons.length === 0) {
    return "No fit reasons available.";
  }

  return fitReasons.map((reason) => `- ${reason}`).join("\n");
}
