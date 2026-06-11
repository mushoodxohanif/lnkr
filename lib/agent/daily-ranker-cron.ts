import "dotenv/config";

import { getDailyCronExpression, getTimezone } from "@/lib/agent/config";
import { runDailyRanker } from "@/lib/agent/daily-ranker";

type DailyCronSchedule = {
  hour: number;
  minute: number;
};

function parseSimpleDailyCron(cronExpression: string): DailyCronSchedule {
  const parts = cronExpression.trim().split(/\s+/);

  if (parts.length !== 5) {
    throw new Error(
      `DAILY_CRON must use 5 fields (minute hour day month weekday). Got "${cronExpression}".`,
    );
  }

  const [minuteField, hourField, dayOfMonth, month, dayOfWeek] = parts;

  if (
    dayOfMonth !== "*" ||
    month !== "*" ||
    dayOfWeek !== "*" ||
    minuteField.includes("*") ||
    hourField.includes("*")
  ) {
    throw new Error(
      `DAILY_CRON must be a simple daily schedule like "0 7 * * *". Got "${cronExpression}".`,
    );
  }

  const minute = Number(minuteField);
  const hour = Number(hourField);

  if (
    Number.isNaN(minute) ||
    Number.isNaN(hour) ||
    minute < 0 ||
    minute > 59 ||
    hour < 0 ||
    hour > 23
  ) {
    throw new Error(`Invalid DAILY_CRON time in "${cronExpression}".`);
  }

  return { hour, minute };
}

function getLocalTimeParts(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).formatToParts(new Date());

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  return {
    dateKey: `${read("year")}-${read("month")}-${read("day")}`,
    hour: Number(read("hour")),
    minute: Number(read("minute")),
  };
}

const cronExpression = getDailyCronExpression();
const timezone = getTimezone();
const schedule = parseSimpleDailyCron(cronExpression);
let lastRunDateKey: string | null = null;

console.log(
  `Scheduling daily ranker at ${String(schedule.hour).padStart(2, "0")}:${String(schedule.minute).padStart(2, "0")} (${timezone}). Press Ctrl+C to stop.`,
);

async function maybeRunDailyRanker(): Promise<void> {
  const local = getLocalTimeParts(timezone);

  if (
    local.hour !== schedule.hour ||
    local.minute !== schedule.minute ||
    lastRunDateKey === local.dateKey
  ) {
    return;
  }

  lastRunDateKey = local.dateKey;
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] Running daily ranker...`);

  try {
    const result = await runDailyRanker();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    lastRunDateKey = null;
    console.error(
      `[${startedAt}] Daily ranker failed:`,
      error instanceof Error ? error.message : error,
    );
  }
}

Bun.cron("* * * * *", async () => {
  await maybeRunDailyRanker();
});
