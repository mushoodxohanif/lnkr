"use server";

import { revalidatePath } from "next/cache";
import { logContentActivity } from "@/lib/agent/activity";
import { generateContentForLead } from "@/lib/agent/generate-content";
import {
  exportFinalizedLeadsCsv,
  type FinalizedLeadsFilters,
} from "@/lib/dashboard/finalized-leads";
import { db } from "@/lib/db";
import { enrichLead } from "@/lib/enrichment/enrich-lead";
import { scoreLead } from "@/lib/icp/score-lead";

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
  revalidatePath("/leads");
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

export async function updateLeadNotes(
  leadId: string,
  notes: string,
): Promise<LeadActionState> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true },
  });

  if (!lead) {
    return emptyState("Lead not found.");
  }

  const trimmed = notes.trim();

  await db.lead.update({
    where: { id: leadId },
    data: {
      notes: trimmed.length > 0 ? trimmed : null,
      notesUpdatedAt: new Date(),
    },
  });

  revalidateLeadPaths(leadId);

  return {
    success: true,
    message: trimmed.length > 0 ? "Notes saved." : "Notes cleared.",
  };
}

export async function exportFinalizedLeadsCsvAction(
  filters: FinalizedLeadsFilters,
): Promise<{ csv: string; filename: string }> {
  return exportFinalizedLeadsCsv(filters);
}

export type UpdateLeadInput = {
  name: string;
  title?: string;
  company?: string;
  location?: string;
  headline?: string;
};

export async function updateLead(
  leadId: string,
  input: UpdateLeadInput,
): Promise<LeadActionState> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true },
  });

  if (!lead) {
    return emptyState("Lead not found.");
  }

  const name = input.name.trim();
  if (!name) {
    return emptyState("Name is required.");
  }

  await db.lead.update({
    where: { id: leadId },
    data: {
      name,
      title: input.title?.trim() || null,
      company: input.company?.trim() || null,
      location: input.location?.trim() || null,
      headline: input.headline?.trim() || null,
    },
  });

  revalidateLeadPaths(leadId);
  return { success: true, message: "Lead updated." };
}

export async function deleteLead(leadId: string): Promise<LeadActionState> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    select: { id: true, name: true },
  });

  if (!lead) {
    return emptyState("Lead not found.");
  }

  await db.lead.delete({ where: { id: leadId } });

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/leads");

  return { success: true, message: `${lead.name} deleted.` };
}

export async function enrichLeadAction(
  leadId: string,
): Promise<LeadActionState> {
  const result = await enrichLead(leadId, { forceRefresh: true });

  revalidateLeadPaths(leadId);

  if (result.status === "skipped") {
    return emptyState(result.message);
  }

  return {
    success: true,
    message:
      result.status === "cached"
        ? "Enrichment already up to date."
        : "Lead enriched.",
  };
}

export async function rescoreLeadAction(
  leadId: string,
): Promise<LeadActionState> {
  const result = await scoreLead(leadId, { forceRescore: true });

  revalidateLeadPaths(leadId);

  if (result.status === "skipped") {
    return emptyState(result.message);
  }

  const fitLabel =
    result.fitPercent !== undefined
      ? ` Fit: ${Math.round(result.fitPercent)}%.`
      : "";

  return {
    success: true,
    message: `Lead re-scored.${fitLabel}`,
  };
}

export async function generateDraftsAction(
  leadId: string,
  options: { forceRegenerate?: boolean } = {},
): Promise<LeadActionState> {
  const result = await generateContentForLead(leadId, {
    forceRegenerate: options.forceRegenerate,
    allowAnyStatus: true,
  });

  revalidateLeadPaths(leadId);

  if (result.status === "skipped" || result.status === "error") {
    return emptyState(result.message ?? "Draft generation failed.");
  }

  return {
    success: true,
    message: options.forceRegenerate
      ? "Drafts regenerated."
      : "Drafts generated.",
  };
}
