"use server";

import { revalidatePath } from "next/cache";
import { logContentActivity } from "@/lib/agent/activity";
import { db } from "@/lib/db";

export type LeadActionState = {
  success: boolean;
  message: string;
};

const SNOOZE_DAYS = 7;

function emptyState(message = ""): LeadActionState {
  return { success: false, message };
}

function revalidateLeadPaths(leadId: string) {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath(`/leads/${leadId}`);
}

async function updateLeadStatus(
  leadId: string,
  status: "SENT" | "SKIPPED" | "SNOOZED",
  options?: { snoozedUntil?: Date | null },
): Promise<LeadActionState> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true, status: true },
  });

  if (!lead) {
    return emptyState("Lead not found.");
  }

  await db.lead.update({
    where: { id: leadId },
    data: {
      status,
      snoozedUntil: options?.snoozedUntil ?? null,
    },
  });

  if (status === "SENT") {
    await db.generatedContent.updateMany({
      where: { leadId },
      data: { status: "SENT" },
    });
  }

  revalidateLeadPaths(leadId);
  return { success: true, message: `${lead.name} updated.` };
}

export async function markLeadSent(leadId: string): Promise<LeadActionState> {
  const result = await updateLeadStatus(leadId, "SENT");

  if (result.success) {
    await logContentActivity("lead_marked_sent", "Lead", leadId);
  }

  return result;
}

export async function skipLead(leadId: string): Promise<LeadActionState> {
  const result = await updateLeadStatus(leadId, "SKIPPED");

  if (result.success) {
    await logContentActivity("lead_skipped", "Lead", leadId);
  }

  return result;
}

export async function snoozeLead(leadId: string): Promise<LeadActionState> {
  const snoozedUntil = new Date();
  snoozedUntil.setUTCDate(snoozedUntil.getUTCDate() + SNOOZE_DAYS);

  const result = await updateLeadStatus(leadId, "SNOOZED", { snoozedUntil });

  if (result.success) {
    await logContentActivity("lead_snoozed", "Lead", leadId, {
      snoozedUntil: snoozedUntil.toISOString(),
      days: SNOOZE_DAYS,
    });
  }

  return {
    ...result,
    message: result.success
      ? `Snoozed for ${SNOOZE_DAYS} days.`
      : result.message,
  };
}
