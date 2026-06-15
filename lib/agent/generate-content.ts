import type { LeadStatus, Prisma } from "@/app/generated/prisma/client";
import { logContentActivity } from "@/lib/agent/activity";
import {
  CONTENT_BATCH_CONCURRENCY,
  DAILY_BATCH_SIZE,
  isContentGenerationConfigured,
} from "@/lib/agent/config";
import {
  generateConnectionNote,
  generateLeadContent,
  generateWarmingComment,
  hasWarmingCommentSource,
} from "@/lib/agent/content-generator";
import { loadContentContext } from "@/lib/agent/context";
import type {
  ContentContext,
  GenerateContentBatchResult,
  GenerateContentResult,
  GeneratedLeadContent,
} from "@/lib/agent/types";
import { db } from "@/lib/db";

export type GenerateContentOptions = {
  forceRegenerate?: boolean;
  /** Generate for any scored lead, not only QUALIFIED. */
  allowAnyStatus?: boolean;
};

type DraftContent = {
  warmingComment: string | null;
  connectionNote: string | null;
  painPoints?: string[];
  personalizationHooks?: string[];
};

function isDraftComplete(
  draft: DraftContent,
  context: Awaited<ReturnType<typeof loadContentContext>>,
): boolean {
  if (!draft.connectionNote) {
    return false;
  }

  if (!draft.warmingComment && context && hasWarmingCommentSource(context)) {
    return false;
  }

  return true;
}

async function persistGeneratedContent(
  leadId: string,
  content: DraftContent,
  existingDraftId?: string | null,
): Promise<string> {
  const connectionNote = content.connectionNote ?? null;
  const data = {
    warmingComment: content.warmingComment,
    connectionNote,
    ...(content.painPoints
      ? { painPoints: content.painPoints as Prisma.InputJsonValue }
      : {}),
    ...(content.personalizationHooks
      ? {
          personalizationHooks:
            content.personalizationHooks as Prisma.InputJsonValue,
        }
      : {}),
    status: "DRAFT" as const,
  };

  if (existingDraftId) {
    await db.generatedContent.update({
      where: { id: existingDraftId },
      data,
    });
    return existingDraftId;
  }

  const existingDraft = await db.generatedContent.findFirst({
    where: { leadId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (existingDraft) {
    await db.generatedContent.update({
      where: { id: existingDraft.id },
      data,
    });
    return existingDraft.id;
  }

  const record = await db.generatedContent.create({
    data: {
      leadId,
      ...data,
      painPoints: (content.painPoints ?? []) as Prisma.InputJsonValue,
      personalizationHooks: (content.personalizationHooks ??
        []) as Prisma.InputJsonValue,
    },
  });

  return record.id;
}

async function backfillDraftContent(
  context: ContentContext,
  existing: DraftContent,
): Promise<GeneratedLeadContent> {
  let warmingComment = existing.warmingComment;
  let connectionNote = existing.connectionNote ?? "";
  let personalizationHooks: string[] = existing.personalizationHooks ?? [];
  let referencedPostDetail: string | undefined;
  let insightHook: string | undefined;

  if (!connectionNote) {
    const connectionResult = await generateConnectionNote(context);
    connectionNote = connectionResult.connection_note;
    personalizationHooks = connectionResult.personalization_hooks;
    insightHook = connectionResult.insight_hook;
  }

  if (!warmingComment && hasWarmingCommentSource(context)) {
    const warmingResult = await generateWarmingComment(context);
    warmingComment = warmingResult?.comment ?? null;
    referencedPostDetail = warmingResult?.referenced_detail;
  }

  const painPoints = (context.score.painPoints as string[]).filter(
    (point) => point.trim().length > 0,
  );

  return {
    warmingComment,
    connectionNote,
    painPoints,
    personalizationHooks,
    referencedPostDetail,
    insightHook,
  };
}

export async function generateContentForLead(
  leadId: string,
  options: GenerateContentOptions = {},
): Promise<GenerateContentResult> {
  if (!isContentGenerationConfigured()) {
    return {
      leadId,
      status: "skipped",
      message:
        "GOOGLE_GENERATIVE_AI_API_KEY is not configured. Add it to .env to generate content.",
    };
  }

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true, status: true },
  });

  if (!lead) {
    return {
      leadId,
      status: "skipped",
      message: "Lead not found.",
    };
  }

  if (lead.status !== "QUALIFIED" && !options.allowAnyStatus) {
    return {
      leadId,
      status: "skipped",
      message: `Lead status is ${lead.status}. Only QUALIFIED leads get content drafts.`,
    };
  }

  const context = await loadContentContext(leadId);
  if (!context) {
    return {
      leadId,
      status: "skipped",
      message:
        "Missing scoring context. Configure ICP settings and score the lead first.",
    };
  }

  const existingDraft = await db.generatedContent.findFirst({
    where: { leadId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });

  if (existingDraft && !options.forceRegenerate) {
    const existingContent: DraftContent = {
      warmingComment: existingDraft.warmingComment,
      connectionNote: existingDraft.connectionNote,
      painPoints: existingDraft.painPoints as string[] | undefined,
      personalizationHooks: existingDraft.personalizationHooks as
        | string[]
        | undefined,
    };

    if (isDraftComplete(existingContent, context)) {
      return {
        leadId,
        status: "skipped",
        generatedContentId: existingDraft.id,
        message: "Draft content is already complete.",
      };
    }
  }

  try {
    const content =
      existingDraft && !options.forceRegenerate
        ? await backfillDraftContent(context, {
            warmingComment: existingDraft.warmingComment,
            connectionNote: existingDraft.connectionNote,
            painPoints: existingDraft.painPoints as string[] | undefined,
            personalizationHooks: existingDraft.personalizationHooks as
              | string[]
              | undefined,
          })
        : await generateLeadContent(context);

    const generatedContentId = await persistGeneratedContent(
      leadId,
      content,
      options.forceRegenerate ? null : existingDraft?.id,
    );

    await logContentActivity(
      "generate_content",
      "GeneratedContent",
      generatedContentId,
      {
        leadId,
        hasWarmingComment: content.warmingComment !== null,
        connectionNoteLength: content.connectionNote.length,
        painPointCount: content.painPoints.length,
        hookCount: content.personalizationHooks.length,
      },
    );

    return {
      leadId,
      status: "generated",
      generatedContentId,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown content generation error";

    await logContentActivity("generate_content_error", "Lead", leadId, {
      message,
    });

    return {
      leadId,
      status: "error",
      message,
    };
  }
}

export type GenerateContentBatchOptions = {
  forceRegenerate?: boolean;
  limit?: number;
  statuses?: LeadStatus[];
  leadIds?: string[];
  /** Process all scored leads regardless of status. */
  allowAnyStatus?: boolean;
  /** Process every scored lead (no default batch size cap). */
  all?: boolean;
};

async function processBatch(
  leadIds: string[],
  options: GenerateContentOptions,
): Promise<GenerateContentResult[]> {
  const results: GenerateContentResult[] = [];

  for (
    let index = 0;
    index < leadIds.length;
    index += CONTENT_BATCH_CONCURRENCY
  ) {
    const chunk = leadIds.slice(index, index + CONTENT_BATCH_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((leadId) => generateContentForLead(leadId, options)),
    );
    results.push(...chunkResults);
  }

  return results;
}

export async function generateContentBatch(
  options: GenerateContentBatchOptions = {},
): Promise<GenerateContentBatchResult> {
  if (options.leadIds?.length) {
    const results = await processBatch(options.leadIds, {
      forceRegenerate: options.forceRegenerate,
      allowAnyStatus: options.allowAnyStatus,
    });

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const result of results) {
      switch (result.status) {
        case "generated":
          generated += 1;
          break;
        case "skipped":
          skipped += 1;
          break;
        case "error":
          errors += 1;
          break;
      }
    }

    const summary: GenerateContentBatchResult = {
      processed: options.leadIds.length,
      generated,
      skipped,
      errors,
      results,
    };

    await logContentActivity(
      "generate_content_batch",
      "Lead",
      undefined,
      summary,
    );

    return summary;
  }

  const statuses = options.statuses ?? ["QUALIFIED"];

  const leads = await db.lead.findMany({
    where: {
      ...(options.allowAnyStatus ? {} : { status: { in: statuses } }),
      scores: { some: {} },
    },
    orderBy: { scrapedAt: "desc" },
    ...(options.all || options.limit
      ? { take: options.all ? undefined : options.limit }
      : { take: DAILY_BATCH_SIZE }),
    select: { id: true },
  });

  const results = await processBatch(
    leads.map((lead) => lead.id),
    {
      forceRegenerate: options.forceRegenerate,
      allowAnyStatus: options.allowAnyStatus,
    },
  );

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const result of results) {
    switch (result.status) {
      case "generated":
        generated += 1;
        break;
      case "skipped":
        skipped += 1;
        break;
      case "error":
        errors += 1;
        break;
    }
  }

  const summary: GenerateContentBatchResult = {
    processed: leads.length,
    generated,
    skipped,
    errors,
    results,
  };

  await logContentActivity(
    "generate_content_batch",
    "Lead",
    undefined,
    summary,
  );

  return summary;
}
