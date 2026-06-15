import { generateObject } from "ai";
import { CONNECTION_NOTE_MAX_CHARS } from "@/lib/agent/config";
import { buildConnectionNotePrompt } from "@/lib/agent/prompts/connection-note";
import { buildWarmingCommentPrompt } from "@/lib/agent/prompts/warming-comment";
import {
  type ConnectionNoteOutput,
  connectionNoteSchema,
  type WarmingCommentOutput,
  warmingCommentSchema,
} from "@/lib/agent/schema";
import type { ContentContext, GeneratedLeadContent } from "@/lib/agent/types";
import { proModel } from "@/lib/ai/models";
import { appendCustomInstructions } from "@/lib/prompts/store";

export function enforceConnectionNoteLimit(note: string): string {
  const trimmed = note.trim();
  if (trimmed.length <= CONNECTION_NOTE_MAX_CHARS) {
    return trimmed;
  }

  const truncated = trimmed.slice(0, CONNECTION_NOTE_MAX_CHARS).trim();
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("!"),
    truncated.lastIndexOf("?"),
  );

  if (lastSentenceEnd >= CONNECTION_NOTE_MAX_CHARS * 0.6) {
    return truncated.slice(0, lastSentenceEnd + 1).trim();
  }

  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > CONNECTION_NOTE_MAX_CHARS * 0.75) {
    return `${truncated.slice(0, lastSpace).trim()}…`;
  }

  return `${truncated.trim()}…`;
}

export function hasWarmingCommentSource(context: ContentContext): boolean {
  if (context.recentPosts.length > 0) {
    return true;
  }

  const snapshot = context.lead.rawProfileSnapshot as {
    about?: string;
    description?: string;
  } | null;

  const fallbackText =
    snapshot?.about?.trim() || snapshot?.description?.trim() || "";

  return fallbackText.length >= 20;
}

function getWarmingCommentContext(context: ContentContext): ContentContext {
  if (context.recentPosts.length > 0) {
    return context;
  }

  const snapshot = context.lead.rawProfileSnapshot as {
    about?: string;
    description?: string;
  } | null;

  const fallbackText =
    snapshot?.about?.trim() || snapshot?.description?.trim() || "";

  if (fallbackText.length < 20) {
    return context;
  }

  return {
    ...context,
    recentPosts: [{ text: fallbackText }],
  };
}

export async function generateWarmingComment(
  context: ContentContext,
): Promise<WarmingCommentOutput | null> {
  const warmingContext = getWarmingCommentContext(context);
  if (warmingContext.recentPosts.length === 0) {
    return null;
  }

  const prompt = await appendCustomInstructions(
    buildWarmingCommentPrompt(warmingContext),
    "warming_comment",
  );

  const { object } = await generateObject({
    model: proModel,
    schema: warmingCommentSchema,
    prompt,
  });

  return object;
}

export async function generateConnectionNote(
  context: ContentContext,
): Promise<ConnectionNoteOutput> {
  const prompt = await appendCustomInstructions(
    buildConnectionNotePrompt(context),
    "connection_note",
  );

  const { object } = await generateObject({
    model: proModel,
    schema: connectionNoteSchema,
    prompt,
  });

  return {
    ...object,
    connection_note: enforceConnectionNoteLimit(object.connection_note),
  };
}

export async function generateLeadContent(
  context: ContentContext,
): Promise<GeneratedLeadContent> {
  const [warmingResult, connectionResult] = await Promise.all([
    generateWarmingComment(context),
    generateConnectionNote(context),
  ]);

  const painPoints = (context.score.painPoints as string[]).filter(
    (point) => point.trim().length > 0,
  );

  return {
    warmingComment: warmingResult?.comment ?? null,
    connectionNote: connectionResult.connection_note,
    painPoints,
    personalizationHooks: connectionResult.personalization_hooks,
    referencedPostDetail: warmingResult?.referenced_detail,
    insightHook: connectionResult.insight_hook,
  };
}
