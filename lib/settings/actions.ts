"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import { getRecentActivityLogs } from "@/lib/activity/queries";
import { db } from "@/lib/db";
import { PROMPT_TEMPLATE_KEYS, savePromptTemplate } from "@/lib/prompts/store";
import { getSafetyConfig, getTodayScrapeCount } from "@/lib/safety/config";
import { DEFAULT_FIT_THRESHOLD } from "@/lib/settings/defaults";
import { normalizeTagList } from "@/lib/settings/normalize-tags";
import {
  type DoNotContactEntry,
  type ICPCriteriaData,
  parseCaseStudies,
  parseExclusionRules,
  parseStringArray,
  parseWeights,
  type SafetyStatusData,
  type SnListData,
  type UserProfileData,
} from "@/lib/settings/types";

export type ActionState = {
  success: boolean;
  message: string;
};

const SETTINGS_PATHS = [
  "/settings/product",
  "/settings/icp",
  "/settings/lists",
  "/settings/prompts",
  "/settings/safety",
] as const;

function revalidateSettings() {
  for (const path of SETTINGS_PATHS) {
    revalidatePath(path);
  }
}

function emptyActionState(message = ""): ActionState {
  return { success: false, message };
}

export async function getUserProfile(): Promise<UserProfileData | null> {
  const profile = await db.userProfile.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    productName: profile.productName,
    valueProps: parseStringArray(profile.valueProps),
    targetIndustries: parseStringArray(profile.targetIndustries),
    targetPersonas: parseStringArray(profile.targetPersonas),
    caseStudies: parseCaseStudies(profile.caseStudies),
    pricingTierHints: profile.pricingTierHints ?? "",
  };
}

export async function saveUserProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const productName = String(formData.get("productName") ?? "").trim();
  const valueProps = normalizeTagList(
    parseStringArray(JSON.parse(String(formData.get("valueProps") ?? "[]"))),
  );
  const targetIndustries = normalizeTagList(
    parseStringArray(
      JSON.parse(String(formData.get("targetIndustries") ?? "[]")),
    ),
  );
  const targetPersonas = normalizeTagList(
    parseStringArray(
      JSON.parse(String(formData.get("targetPersonas") ?? "[]")),
    ),
  );
  const caseStudies = parseCaseStudies(
    JSON.parse(String(formData.get("caseStudies") ?? "[]")),
  );
  const pricingTierHints =
    String(formData.get("pricingTierHints") ?? "").trim() || null;
  const id = String(formData.get("id") ?? "").trim() || undefined;

  if (!productName) {
    return { success: false, message: "Product name is required." };
  }

  if (valueProps.length === 0) {
    return { success: false, message: "Add at least one value proposition." };
  }

  const data = {
    productName,
    valueProps,
    targetIndustries,
    targetPersonas,
    caseStudies,
    pricingTierHints,
  };

  if (id) {
    await db.userProfile.update({ where: { id }, data });
  } else {
    const existing = await db.userProfile.findFirst();
    if (existing) {
      await db.userProfile.update({ where: { id: existing.id }, data });
    } else {
      await db.userProfile.create({ data });
    }
  }

  revalidateSettings();
  return { success: true, message: "Product profile saved." };
}

export async function getICPCriteria(): Promise<ICPCriteriaData | null> {
  const criteria = await db.iCPCriteria.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (!criteria) return null;

  return {
    id: criteria.id,
    titles: parseStringArray(criteria.titles),
    seniorityLevels: parseStringArray(criteria.seniorityLevels),
    companySizeMin: criteria.companySizeMin,
    companySizeMax: criteria.companySizeMax,
    industries: parseStringArray(criteria.industries),
    techStack: parseStringArray(criteria.techStack),
    geo: parseStringArray(criteria.geo),
    exclusionRules: parseExclusionRules(criteria.exclusionRules),
    weights: parseWeights(criteria.weights),
    fitThreshold: criteria.fitThreshold,
  };
}

export async function saveICPCriteria(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const titles = normalizeTagList(
    parseStringArray(JSON.parse(String(formData.get("titles") ?? "[]"))),
  );
  const seniorityLevels = normalizeTagList(
    parseStringArray(
      JSON.parse(String(formData.get("seniorityLevels") ?? "[]")),
    ),
  );
  const industries = normalizeTagList(
    parseStringArray(JSON.parse(String(formData.get("industries") ?? "[]"))),
  );
  const techStack = normalizeTagList(
    parseStringArray(JSON.parse(String(formData.get("techStack") ?? "[]"))),
  );
  const geo = normalizeTagList(
    parseStringArray(JSON.parse(String(formData.get("geo") ?? "[]"))),
  );
  const exclusionRulesRaw = parseExclusionRules(
    JSON.parse(String(formData.get("exclusionRules") ?? "{}")),
  );
  const exclusionRules = {
    ...exclusionRulesRaw,
    competitors: normalizeTagList(exclusionRulesRaw.competitors ?? []),
    titles: normalizeTagList(exclusionRulesRaw.titles ?? []),
    industries: normalizeTagList(exclusionRulesRaw.industries ?? []),
  };
  const weights = parseWeights(
    JSON.parse(String(formData.get("weights") ?? "{}")),
  );

  const companySizeMinRaw = String(formData.get("companySizeMin") ?? "").trim();
  const companySizeMaxRaw = String(formData.get("companySizeMax") ?? "").trim();
  const fitThresholdRaw = String(
    formData.get("fitThreshold") ?? String(DEFAULT_FIT_THRESHOLD),
  ).trim();
  const id = String(formData.get("id") ?? "").trim() || undefined;

  const companySizeMin = companySizeMinRaw ? Number(companySizeMinRaw) : null;
  const companySizeMax = companySizeMaxRaw ? Number(companySizeMaxRaw) : null;
  const fitThreshold = Number(fitThresholdRaw);

  if (
    companySizeMin !== null &&
    (Number.isNaN(companySizeMin) || companySizeMin < 1)
  ) {
    return {
      success: false,
      message: "Minimum company size must be a positive number.",
    };
  }

  if (
    companySizeMax !== null &&
    (Number.isNaN(companySizeMax) || companySizeMax < 1)
  ) {
    return {
      success: false,
      message: "Maximum company size must be a positive number.",
    };
  }

  if (
    companySizeMin !== null &&
    companySizeMax !== null &&
    companySizeMin > companySizeMax
  ) {
    return {
      success: false,
      message: "Minimum company size cannot exceed maximum.",
    };
  }

  if (Number.isNaN(fitThreshold) || fitThreshold < 0 || fitThreshold > 100) {
    return {
      success: false,
      message: "Fit threshold must be between 0 and 100.",
    };
  }

  const data = {
    titles,
    seniorityLevels,
    companySizeMin,
    companySizeMax,
    industries,
    techStack,
    geo,
    exclusionRules,
    weights,
    fitThreshold,
  };

  if (id) {
    await db.iCPCriteria.update({ where: { id }, data });
  } else {
    const existing = await db.iCPCriteria.findFirst();
    if (existing) {
      await db.iCPCriteria.update({ where: { id: existing.id }, data });
    } else {
      await db.iCPCriteria.create({ data });
    }
  }

  revalidateSettings();
  return { success: true, message: "ICP criteria saved." };
}

export async function getSnLists(): Promise<SnListData[]> {
  const lists = await db.snListConfig.findMany({
    orderBy: { createdAt: "asc" },
  });

  return lists.map((list) => ({
    id: list.id,
    name: list.name,
    url: list.url,
    enabled: list.enabled,
    lastSyncedAt: list.lastSyncedAt,
  }));
}

export async function saveSnList(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const enabled = formData.get("enabled") === "true";
  const id = String(formData.get("id") ?? "").trim() || undefined;

  if (!name) {
    return { success: false, message: "List name is required." };
  }

  if (!url) {
    return { success: false, message: "List URL is required." };
  }

  if (!url.includes("linkedin.com/sales/lists")) {
    return {
      success: false,
      message:
        "URL must be a Sales Navigator saved list (linkedin.com/sales/lists/...).",
    };
  }

  try {
    if (id) {
      await db.snListConfig.update({
        where: { id },
        data: { name, url, enabled },
      });
    } else {
      await db.snListConfig.create({
        data: { name, url, enabled },
      });
    }
  } catch {
    return {
      success: false,
      message: "A list with this URL already exists.",
    };
  }

  revalidateSettings();
  return { success: true, message: id ? "List updated." : "List added." };
}

export async function deleteSnList(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return emptyActionState("List not found.");
  }

  await db.snListConfig.delete({ where: { id } });
  revalidateSettings();
  return { success: true, message: "List removed." };
}

export async function toggleSnList(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();
  const enabled = formData.get("enabled") === "true";

  if (!id) {
    return emptyActionState("List not found.");
  }

  await db.snListConfig.update({
    where: { id },
    data: { enabled },
  });

  revalidateSettings();
  return {
    success: true,
    message: enabled ? "List enabled for sync." : "List disabled.",
  };
}

export async function getSafetyStatus(): Promise<SafetyStatusData> {
  const config = getSafetyConfig();
  const todayScrapeCount = await getTodayScrapeCount();

  return {
    dailyScrapeLimit: config.dailyScrapeLimit,
    minDelayMs: config.minDelayMs,
    maxDelayMs: config.maxDelayMs,
    maxPostsPerProfile: config.maxPostsPerProfile,
    browserProfileDir: config.browserProfileDir,
    browserProfileExists: config.browserProfileExists,
    todayScrapeCount,
    remainingToday: Math.max(0, config.dailyScrapeLimit - todayScrapeCount),
  };
}

export async function getDoNotContactList(): Promise<DoNotContactEntry[]> {
  const entries = await db.doNotContact.findMany({
    orderBy: { createdAt: "desc" },
  });

  return entries.map((entry) => ({
    id: entry.id,
    linkedInUrl: entry.linkedInUrl,
    email: entry.email,
    reason: entry.reason,
    createdAt: entry.createdAt,
  }));
}

export async function getActivityLogForSettings(limit = 40) {
  return getRecentActivityLogs(limit);
}

export async function addDoNotContact(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const linkedInUrl = String(formData.get("linkedInUrl") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!linkedInUrl && !email) {
    return {
      success: false,
      message: "Provide a LinkedIn URL or email to block.",
    };
  }

  if (linkedInUrl && !linkedInUrl.includes("linkedin.com")) {
    return {
      success: false,
      message: "LinkedIn URL must be a linkedin.com profile URL.",
    };
  }

  try {
    const entry = await db.doNotContact.create({
      data: { linkedInUrl, email, reason },
    });

    await logActivity({
      action: "blocklist_add",
      entityType: "DoNotContact",
      entityId: entry.id,
      metadata: { linkedInUrl, email, reason },
    });
  } catch {
    return {
      success: false,
      message: "This URL or email is already on the blocklist.",
    };
  }

  revalidateSettings();
  return { success: true, message: "Added to do-not-contact list." };
}

export async function removeDoNotContact(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return emptyActionState("Entry not found.");
  }

  const entry = await db.doNotContact.findUnique({
    where: { id },
    select: { id: true, linkedInUrl: true, email: true },
  });

  if (!entry) {
    return emptyActionState("Entry not found.");
  }

  await db.doNotContact.delete({ where: { id } });

  await logActivity({
    action: "blocklist_remove",
    entityType: "DoNotContact",
    entityId: id,
    metadata: {
      linkedInUrl: entry.linkedInUrl,
      email: entry.email,
    },
  });

  revalidateSettings();
  return { success: true, message: "Removed from blocklist." };
}

export async function savePromptTemplates(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    for (const key of PROMPT_TEMPLATE_KEYS) {
      const instructions = String(
        formData.get(`instructions_${key}`) ?? "",
      ).trim();
      await savePromptTemplate(key, instructions);
    }

    await logActivity({
      action: "prompt_templates_saved",
      entityType: "PromptTemplate",
      metadata: { keys: [...PROMPT_TEMPLATE_KEYS] },
    });

    revalidateSettings();
    return {
      success: true,
      message: "Prompt templates saved.",
    };
  } catch (error) {
    return emptyActionState(
      error instanceof Error
        ? error.message
        : "Failed to save prompt templates.",
    );
  }
}
