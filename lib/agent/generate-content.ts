import type { LeadStatus, Prisma } from "@/app/generated/prisma/client";
import { logContentActivity } from "@/lib/agent/activity";
import {
  CONTENT_BATCH_CONCURRENCY,
  DAILY_BATCH_SIZE,
  isContentGenerationConfigured,
} from "@/lib/agent/config";
import { generateLeadContent } from "@/lib/agent/content-generator";
import { loadContentContext } from "@/lib/agent/context";
import type {
  GenerateContentBatchResult,
  GenerateContentResult,
} from "@/lib/agent/types";
import { db } from "@/lib/db";

export type GenerateContentOptions = {
  forceRegenerate?: boolean;
};

async function persistGeneratedContent(
  leadId: string,
  content: Awaited<ReturnType<typeof generateLeadContent>>,
): Promise<string> {
  const record = await db.generatedContent.create({
    data: {
      leadId,
      warmingComment: content.warmingComment,
      connectionNote: content.connectionNote,
      painPoints: content.painPoints as Prisma.InputJsonValue,
      personalizationHooks:
        content.personalizationHooks as Prisma.InputJsonValue,
      status: "DRAFT",
    },
  });

  return record.id;
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

  if (lead.status !== "QUALIFIED") {
    return {
      leadId,
      status: "skipped",
      message: `Lead status is ${lead.status}. Only QUALIFIED leads get content drafts.`,
    };
  }

  if (!options.forceRegenerate) {
    const existingDraft = await db.generatedContent.findFirst({
      where: { leadId, status: "DRAFT" },
      orderBy: { createdAt: "desc" },
    });

    if (existingDraft) {
      return {
        leadId,
        status: "skipped",
        generatedContentId: existingDraft.id,
        message:
          "Draft content already exists. Use forceRegenerate to replace.",
      };
    }
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

  try {
    const content = await generateLeadContent(context);
    const generatedContentId = await persistGeneratedContent(leadId, content);

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
      status: { in: statuses },
      ...(options.forceRegenerate
        ? {}
        : {
            generatedContent: {
              none: { status: "DRAFT" },
            },
          }),
      scores: { some: {} },
    },
    orderBy: { scrapedAt: "desc" },
    take: options.limit ?? DAILY_BATCH_SIZE,
    select: { id: true },
  });

  const results = await processBatch(
    leads.map((lead) => lead.id),
    { forceRegenerate: options.forceRegenerate },
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
