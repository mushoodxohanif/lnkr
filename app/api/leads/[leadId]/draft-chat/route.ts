import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  initializeDraftChat,
  loadDraftChatState,
  sendDraftChatMessage,
} from "@/lib/agent/draft-chat";

type RouteContext = {
  params: Promise<{ leadId: string }>;
};

function revalidateLeadPaths(leadId: string) {
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function GET(_request: Request, context: RouteContext) {
  const { leadId } = await context.params;
  const existing = await loadDraftChatState(leadId);

  if (existing.messages.length > 0) {
    return NextResponse.json(existing);
  }

  const initialized = await initializeDraftChat(leadId);
  return NextResponse.json(initialized);
}

export async function POST(request: Request, context: RouteContext) {
  const { leadId } = await context.params;
  const body = (await request.json()) as { message?: string };
  const message = body.message ?? "";

  const result = await sendDraftChatMessage(leadId, message);

  if (!result.error) {
    revalidateLeadPaths(leadId);
  }

  return NextResponse.json(result);
}
