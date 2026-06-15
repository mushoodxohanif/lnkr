import type { TimingSignal } from "@/app/generated/prisma/client";

export const CONNECTION_NOTE_MAX_CHARS = 300;
export const CONTENT_BATCH_CONCURRENCY = 5;

export const DAILY_BATCH_SIZE = 15;
export const LEAD_LOOKBACK_DAYS = 7;
export const MAX_LEADS_PER_COMPANY = 2;

export const TIMING_MULTIPLIERS: Record<TimingSignal, number> = {
  HOT: 1.2,
  WARM: 1.0,
  COLD: 0.7,
};

const DEFAULT_DAILY_CRON = "0 7 * * *";
const DEFAULT_TIMEZONE = "America/New_York";

export function isContentGenerationConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
}

export function getDailyCronExpression(): string {
  const expression = process.env.DAILY_CRON?.trim();
  return expression && expression.length > 0 ? expression : DEFAULT_DAILY_CRON;
}

export function getTimezone(): string {
  const timezone = process.env.TIMEZONE?.trim();
  return timezone && timezone.length > 0 ? timezone : DEFAULT_TIMEZONE;
}
