import { generateObject } from "ai";
import type { DraftChatRole } from "@/app/generated/prisma/client";
import { logContentActivity } from "@/lib/agent/activity";
import { isContentGenerationConfigured } from "@/lib/agent/config";
import {
  enforceConnectionNoteLimit,
  generateLeadContent,
  generateWarmingComment,
  hasWarmingCommentSource,
} from "@/lib/agent/content-generator";
import { loadContentContext } from "@/lib/agent/context";
import {
  buildDraftChatSystemPrompt,
  type DraftSnapshot,
  formatInitialAssistantMessage,
} from "@/lib/agent/draft-chat-prompt";
import { draftChatResponseSchema } from "@/lib/agent/draft-chat-schema";
import { proModel } from "@/lib/ai/models";
import { db } from "@/lib/db";

export type DraftChatMessageView = {
  id: string;
  role: DraftChatRole;
  content: string;
  createdAt: string;
};

export type DraftChatState = {
  chatId: string;
  warmingComment: string | null;
  connectionNote: string | null;
  messages: DraftChatMessageView[];
  error?: string;
};

function mapMessage(message: {
  id: string;
  role: DraftChatRole;
  content: string;
  createdAt: Date;
}): DraftChatMessageView {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

async function getOrCreateDraftChat(leadId: string) {
  return db.draftChat.upsert({
    where: { leadId },
    create: { leadId },
    update: {},
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

async function upsertGeneratedContentDraft(
  leadId: string,
  drafts: DraftSnapshot,
  existingContentId?: string | null,
): Promise<string> {
  const connectionNote = drafts.connectionNote
    ? enforceConnectionNoteLimit(drafts.connectionNote)
    : null;

  if (existingContentId) {
    await db.generatedContent.update({
      where: { id: existingContentId },
      data: {
        warmingComment: drafts.warmingComment,
        connectionNote,
        status: "DRAFT",
      },
    });
    return existingContentId;
  }

  const existingDraft = await db.generatedContent.findFirst({
    where: { leadId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (existingDraft) {
    await db.generatedContent.update({
      where: { id: existingDraft.id },
      data: {
        warmingComment: drafts.warmingComment,
        connectionNote,
      },
    });
    return existingDraft.id;
  }

  const created = await db.generatedContent.create({
    data: {
      leadId,
      warmingComment: drafts.warmingComment,
      connectionNote,
      status: "DRAFT",
    },
  });

  return created.id;
}

async function saveDrafts(
  chatId: string,
  leadId: string,
  drafts: DraftSnapshot,
  existingContentId?: string | null,
): Promise<string> {
  const connectionNote = drafts.connectionNote
    ? enforceConnectionNoteLimit(drafts.connectionNote)
    : null;

  const generatedContentId = await upsertGeneratedContentDraft(
    leadId,
    {
      warmingComment: drafts.warmingComment,
      connectionNote,
    },
    existingContentId,
  );

  await db.draftChat.update({
    where: { id: chatId },
    data: {
      warmingComment: drafts.warmingComment,
      connectionNote,
      generatedContentId,
    },
  });

  return generatedContentId;
}

function toChatState(chat: {
  id: string;
  warmingComment: string | null;
  connectionNote: string | null;
  messages: Array<{
    id: string;
    role: DraftChatRole;
    content: string;
    createdAt: Date;
  }>;
}): DraftChatState {
  return {
    chatId: chat.id,
    warmingComment: chat.warmingComment,
    connectionNote: chat.connectionNote,
    messages: chat.messages.map(mapMessage),
  };
}

async function ensureWarmingComment(
  context: NonNullable<Awaited<ReturnType<typeof loadContentContext>>>,
  existing: string | null,
): Promise<string | null> {
  if (existing || !hasWarmingCommentSource(context)) {
    return existing;
  }

  const warming = await generateWarmingComment(context);
  return warming?.comment ?? null;
}

async function createInitialAssistantMessage(
  chatId: string,
  leadName: string,
  drafts: DraftSnapshot,
): Promise<void> {
  await db.draftChatMessage.create({
    data: {
      chatId,
      role: "ASSISTANT",
      content: formatInitialAssistantMessage(leadName, drafts),
    },
  });
}

async function hydrateDraftsFromGeneratedContent(
  leadId: string,
  chat: Awaited<ReturnType<typeof getOrCreateDraftChat>>,
): Promise<Awaited<ReturnType<typeof getOrCreateDraftChat>>> {
  if (chat.warmingComment || chat.connectionNote) {
    return chat;
  }

  const existingContent = await db.generatedContent.findFirst({
    where: { leadId, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });

  if (!existingContent) {
    return chat;
  }

  return db.draftChat.update({
    where: { id: chat.id },
    data: {
      warmingComment: existingContent.warmingComment,
      connectionNote: existingContent.connectionNote,
      generatedContentId: existingContent.id,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function loadDraftChatState(
  leadId: string,
): Promise<DraftChatState> {
  const chat = await getOrCreateDraftChat(leadId);
  const hydrated = await hydrateDraftsFromGeneratedContent(leadId, chat);
  return toChatState(hydrated);
}

export async function initializeDraftChat(
  leadId: string,
): Promise<DraftChatState> {
  if (!isContentGenerationConfigured()) {
    return {
      chatId: "",
      warmingComment: null,
      connectionNote: null,
      messages: [],
      error:
        "GOOGLE_GENERATIVE_AI_API_KEY is not configured. Add it to .env to generate drafts.",
    };
  }

  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true, status: true },
  });

  if (!lead) {
    return {
      chatId: "",
      warmingComment: null,
      connectionNote: null,
      messages: [],
      error: "Lead not found.",
    };
  }

  let chat = await getOrCreateDraftChat(leadId);
  chat = await hydrateDraftsFromGeneratedContent(leadId, chat);

  if (chat.messages.length > 0) {
    return toChatState(chat);
  }

  const context = await loadContentContext(leadId);
  if (!context) {
    return {
      ...toChatState(chat),
      error:
        "Missing scoring context. Configure ICP settings and score the lead first.",
    };
  }

  if (chat.connectionNote) {
    const warmingComment = await ensureWarmingComment(
      context,
      chat.warmingComment,
    );
    const drafts: DraftSnapshot = {
      warmingComment,
      connectionNote: chat.connectionNote,
    };

    if (warmingComment !== chat.warmingComment) {
      await saveDrafts(chat.id, leadId, drafts, chat.generatedContentId);
    }

    await createInitialAssistantMessage(chat.id, lead.name, drafts);

    const refreshed = await db.draftChat.findUniqueOrThrow({
      where: { id: chat.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return toChatState(refreshed);
  }

  try {
    chat = await getOrCreateDraftChat(leadId);
    if (chat.messages.length > 0) {
      return toChatState(chat);
    }

    const content = await generateLeadContent(context);
    const warmingComment = await ensureWarmingComment(
      context,
      content.warmingComment,
    );
    const drafts: DraftSnapshot = {
      warmingComment,
      connectionNote: content.connectionNote,
    };

    const generatedContentId = await saveDrafts(
      chat.id,
      leadId,
      drafts,
      chat.generatedContentId,
    );

    await createInitialAssistantMessage(chat.id, lead.name, drafts);

    await logContentActivity("draft_chat_initialized", "DraftChat", chat.id, {
      leadId,
      generatedContentId,
      hasWarmingComment: drafts.warmingComment !== null,
      connectionNoteLength: drafts.connectionNote?.length ?? 0,
    });

    const refreshed = await db.draftChat.findUniqueOrThrow({
      where: { id: chat.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return toChatState(refreshed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown draft generation error";

    await logContentActivity("draft_chat_init_error", "Lead", leadId, {
      message,
    });

    return {
      ...toChatState(chat),
      error: message,
    };
  }
}

export async function sendDraftChatMessage(
  leadId: string,
  userMessage: string,
): Promise<DraftChatState> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return loadDraftChatState(leadId);
  }

  if (!isContentGenerationConfigured()) {
    return {
      chatId: "",
      warmingComment: null,
      connectionNote: null,
      messages: [],
      error:
        "GOOGLE_GENERATIVE_AI_API_KEY is not configured. Add it to .env to generate drafts.",
    };
  }

  const context = await loadContentContext(leadId);
  if (!context) {
    const chat = await getOrCreateDraftChat(leadId);
    return {
      ...toChatState(chat),
      error:
        "Missing scoring context. Configure ICP settings and score the lead first.",
    };
  }

  const chat = await getOrCreateDraftChat(leadId);

  if (chat.messages.length === 0) {
    return initializeDraftChat(leadId);
  }

  await db.draftChatMessage.create({
    data: {
      chatId: chat.id,
      role: "USER",
      content: trimmed,
    },
  });

  const history = [
    ...chat.messages.map((message) => ({
      role:
        message.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: message.content,
    })),
    { role: "user" as const, content: trimmed },
  ];

  const currentDrafts: DraftSnapshot = {
    warmingComment: chat.warmingComment,
    connectionNote: chat.connectionNote,
  };

  try {
    const { object } = await generateObject({
      model: proModel,
      schema: draftChatResponseSchema,
      system: buildDraftChatSystemPrompt(context, currentDrafts),
      messages: history,
    });

    const drafts: DraftSnapshot = {
      warmingComment: object.warmingComment,
      connectionNote: enforceConnectionNoteLimit(object.connectionNote),
    };

    await saveDrafts(chat.id, leadId, drafts, chat.generatedContentId);

    await db.draftChatMessage.create({
      data: {
        chatId: chat.id,
        role: "ASSISTANT",
        content: object.message,
      },
    });

    await logContentActivity("draft_chat_message", "DraftChat", chat.id, {
      leadId,
      userMessageLength: trimmed.length,
      connectionNoteLength: drafts.connectionNote?.length ?? 0,
    });

    const refreshed = await db.draftChat.findUniqueOrThrow({
      where: { id: chat.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return toChatState(refreshed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown draft chat error";

    await logContentActivity("draft_chat_message_error", "DraftChat", chat.id, {
      leadId,
      message,
    });

    const refreshed = await db.draftChat.findUniqueOrThrow({
      where: { id: chat.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return {
      ...toChatState(refreshed),
      error: message,
    };
  }
}

export type { DraftSnapshot };
