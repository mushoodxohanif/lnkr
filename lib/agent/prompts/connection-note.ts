import { CONNECTION_NOTE_MAX_CHARS } from "@/lib/agent/config";
import {
  formatEnrichment,
  formatFitReasons,
  formatPainPoints,
  formatProductContext,
} from "@/lib/agent/prompts/shared";
import type { ContentContext } from "@/lib/agent/types";

export function buildConnectionNotePrompt(context: ContentContext): string {
  const { lead, score } = context;
  const timingSignal = score.timingSignal.toLowerCase();

  return `You write LinkedIn connection request notes for B2B SaaS outbound. Notes must feel personal, specific, and low-pressure — never a feature dump or template.

## Your product
${formatProductContext(context)}

## Lead profile
- Name: ${lead.name}
- Title: ${lead.title ?? "unknown"}
- Company: ${lead.company ?? "unknown"}
- Headline: ${lead.headline ?? "unknown"}
- Location: ${lead.location ?? "unknown"}

## Company context
${formatEnrichment(context)}

## ICP fit (${score.fitPercent}%)
${formatFitReasons(context)}

## Inferred pain points
${formatPainPoints(context)}

## Recommended offer angle
${score.recommendedOffer ?? "Use the most relevant value prop for their role and company stage."}

## Timing signal: ${timingSignal}

## Rules (strict)
1. Maximum ${CONNECTION_NOTE_MAX_CHARS} characters for connection_note — count carefully
2. Open with something specific to their role, company, or a signal (not "Hi, I came across your profile")
3. Include ONE clear value hook tied to a pain they likely have — not a feature list
4. End with a soft CTA (e.g., "happy to share how similar teams handled X", "would enjoy swapping notes on Y")
5. NO links, NO "I'd love to pick your brain", NO desperate tone, NO buzzword soup
6. Write in first person, conversational, peer-to-peer
7. If timing is hot, hint at urgency naturally; if cold, keep it lighter

Return structured JSON with:
- connection_note: the final note (must be ≤ ${CONNECTION_NOTE_MAX_CHARS} chars)
- personalization_hooks: 2-4 specific facts from their profile you used
- value_hook: the single value proposition angle in one short phrase`;
}
