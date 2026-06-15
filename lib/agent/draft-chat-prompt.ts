import { CONNECTION_NOTE_MAX_CHARS } from "@/lib/agent/config";
import { hasWarmingCommentSource } from "@/lib/agent/content-generator";
import { buildConnectionNotePrompt } from "@/lib/agent/prompts/connection-note";
import { buildWarmingCommentPrompt } from "@/lib/agent/prompts/warming-comment";
import type { ContentContext } from "@/lib/agent/types";

export type DraftSnapshot = {
  warmingComment: string | null;
  connectionNote: string | null;
};

export function formatInitialAssistantMessage(
  leadName: string,
  drafts: DraftSnapshot,
): string {
  const warmingSection = drafts.warmingComment
    ? drafts.warmingComment
    : "No recent LinkedIn activity available — skip the warming comment and send the connection request directly.";

  const noteLength = drafts.connectionNote?.length ?? 0;

  return `Here are outreach drafts for ${leadName}:

**Warming comment**
${warmingSection}

**Connection note** (${noteLength}/${CONNECTION_NOTE_MAX_CHARS})
${drafts.connectionNote ?? "—"}

Tell me what to adjust — tone, length, focus, or specific wording — and I'll update both drafts.`;
}

export function buildDraftChatSystemPrompt(
  context: ContentContext,
  drafts: DraftSnapshot,
): string {
  const warmingRules = hasWarmingCommentSource(context)
    ? buildWarmingCommentPrompt(context)
    : "No recent LinkedIn posts or profile activity are available. Set warmingComment to null.";

  const connectionRules = buildConnectionNotePrompt(context);

  return `You help refine LinkedIn outreach drafts for a single lead. You maintain two artifacts:
1. warmingComment — a 2-3 sentence comment on their recent post (null if no post)
2. connectionNote — a personalized connection request (max ${CONNECTION_NOTE_MAX_CHARS} chars)

## Current drafts
Warming comment:
${drafts.warmingComment ?? "(none — no post to comment on)"}

Connection note (${drafts.connectionNote?.length ?? 0}/${CONNECTION_NOTE_MAX_CHARS}):
${drafts.connectionNote ?? "(not generated yet)"}

## Lead
- Name: ${context.lead.name}
- Title: ${context.lead.title ?? "unknown"}
- Company: ${context.lead.company ?? "unknown"}

## Warming comment rules
${warmingRules}

## Connection note rules
${connectionRules}

## Chat behavior
- Apply the user's requested edits to the drafts
- Keep drafts compliant with all rules above
- connectionNote must stay at or under ${CONNECTION_NOTE_MAX_CHARS} characters
- Return the full updated drafts every time, not partial diffs
- In "message", briefly explain what you changed or answer the question — do not repeat the full drafts there`;
}
