import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../../app/generated/prisma/client";
import type { ScrapedLead } from "./types";

let db: PrismaClient | null = null;

function getDb(): PrismaClient {
  if (!db) {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    db = new PrismaClient({ adapter, log: ["error"] });
  }
  return db;
}

export async function disconnectDb(): Promise<void> {
  if (db) {
    await db.$disconnect();
    db = null;
  }
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function getTodayScrapeCount(): Promise<number> {
  const prisma = getDb();
  return prisma.lead.count({
    where: {
      scrapedAt: { gte: startOfToday() },
    },
  });
}

export async function getBlockedUrls(): Promise<Set<string>> {
  const prisma = getDb();
  const blocked = await prisma.doNotContact.findMany({
    where: { linkedInUrl: { not: null } },
    select: { linkedInUrl: true },
  });

  return new Set(
    blocked
      .map((entry) => entry.linkedInUrl)
      .filter((url): url is string => Boolean(url)),
  );
}

export async function getEnabledListUrls(): Promise<
  Array<{ id: string; name: string; url: string }>
> {
  const prisma = getDb();
  const lists = await prisma.snListConfig.findMany({
    where: { enabled: true },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, url: true },
  });
  return lists;
}

export async function markListSynced(listUrl: string): Promise<void> {
  const prisma = getDb();
  await prisma.snListConfig.updateMany({
    where: { url: listUrl },
    data: { lastSyncedAt: new Date() },
  });
}

export async function saveLead(
  lead: ScrapedLead,
): Promise<"created" | "updated"> {
  const prisma = getDb();
  const now = new Date();

  const existing = await prisma.lead.findUnique({
    where: { linkedInUrl: lead.linkedInUrl },
    select: { id: true },
  });

  const data = {
    name: lead.name,
    headline: lead.headline ?? null,
    title: lead.title ?? null,
    company: lead.company ?? null,
    location: lead.location ?? null,
    snListSource: lead.snListSource,
    rawProfileSnapshot: lead.rawProfileSnapshot
      ? (lead.rawProfileSnapshot as Prisma.InputJsonValue)
      : Prisma.JsonNull,
    recentPosts: lead.recentPosts
      ? (lead.recentPosts as Prisma.InputJsonValue)
      : Prisma.JsonNull,
    scrapedAt: now,
  };

  if (existing) {
    await prisma.lead.update({
      where: { id: existing.id },
      data,
    });
    await logActivity("scrape_update", "Lead", existing.id, {
      linkedInUrl: lead.linkedInUrl,
      snListSource: lead.snListSource,
    });
    return "updated";
  }

  const created = await prisma.lead.create({
    data: { linkedInUrl: lead.linkedInUrl, ...data },
  });
  await logActivity("scrape_create", "Lead", created.id, {
    linkedInUrl: lead.linkedInUrl,
    snListSource: lead.snListSource,
  });
  return "created";
}

export async function logActivity(
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const prisma = getDb();
  await prisma.activityLog.create({
    data: {
      action,
      entityType,
      entityId: entityId ?? null,
      metadata: metadata
        ? (metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}

export async function logSyncSummary(
  metadata: Record<string, unknown>,
): Promise<void> {
  await logActivity("sn_sync", "SnListConfig", undefined, metadata);
}
