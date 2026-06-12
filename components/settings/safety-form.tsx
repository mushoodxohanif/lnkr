"use client";

import { useActionState } from "react";
import { LocalSyncGuide } from "@/components/dashboard/local-sync-guide";
import { PipelineActions } from "@/components/dashboard/pipeline-actions";
import {
  Field,
  FormMessage,
  FormSection,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/settings/form-primitives";
import type { ActivityLogEntry } from "@/lib/activity/queries";
import type { PipelineConfig } from "@/lib/pipeline/status";
import { addDoNotContact, removeDoNotContact } from "@/lib/settings/actions";
import type { DoNotContactEntry, SafetyStatusData } from "@/lib/settings/types";

const initialState = { success: false, message: "" };

type SafetyFormProps = {
  safety: SafetyStatusData;
  blocklist: DoNotContactEntry[];
  activityLog: ActivityLogEntry[];
  pipelineConfig: PipelineConfig;
};

function formatActionLabel(action: string): string {
  return action.replaceAll("_", " ");
}

function formatMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;

  const record = metadata as Record<string, unknown>;
  const parts: string[] = [];

  if (typeof record.message === "string") {
    parts.push(record.message);
  }

  if (typeof record.scraped === "number") {
    parts.push(`scraped ${record.scraped}`);
  }

  if (typeof record.reason === "string") {
    parts.push(record.reason);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function SafetyForm({
  safety,
  blocklist,
  activityLog,
  pipelineConfig,
}: SafetyFormProps) {
  const [addState, addAction, addPending] = useActionState(
    addDoNotContact,
    initialState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeDoNotContact,
    initialState,
  );

  const statusMessage = addState.message || removeState.message;
  const statusSuccess = addState.success || removeState.success;

  return (
    <div className="space-y-6">
      <FormSection
        title="Scraper safety limits"
        description="Read-only limits for local Playwright sync. Change via Vercel env vars or `.env.local` when syncing from your computer."
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Daily scrape limit
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              {safety.todayScrapeCount} / {safety.dailyScrapeLimit}
            </dd>
            <p className="mt-1 text-xs text-zinc-500">
              {safety.remainingToday} remaining today
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Profile delay
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              {safety.minDelayMs / 1000}s–{safety.maxDelayMs / 1000}s
            </dd>
            <p className="mt-1 text-xs text-zinc-500">
              Random delay between profile visits
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Posts per profile
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              {safety.maxPostsPerProfile}
            </dd>
          </div>
        </dl>
      </FormSection>

      <FormSection
        title="Browser session"
        description={
          pipelineConfig.playwrightAvailable
            ? "Playwright stores your LinkedIn session in a persistent Chrome profile on this machine."
            : "On Vercel, LinkedIn login and sync run on your computer — not in the cloud. Use the commands below with the same DATABASE_URL as production."
        }
      >
        {!pipelineConfig.playwrightAvailable ? <LocalSyncGuide /> : null}
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Sync method
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              Playwright (local machine)
            </dd>
            <p className="mt-1 text-xs text-zinc-500">
              {pipelineConfig.playwrightAvailable
                ? "Sync uses your local browser. Sign in below before your first sync."
                : "Configure lists here on Vercel; run sync from your laptop."}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              LinkedIn session
            </dt>
            <dd
              className={`mt-1 text-lg font-semibold ${
                pipelineConfig.playwrightAvailable &&
                safety.browserProfileExists
                  ? "text-emerald-700"
                  : "text-amber-700"
              }`}
            >
              {pipelineConfig.playwrightAvailable && safety.browserProfileExists
                ? "Profile saved locally"
                : "Sign-in on your computer"}
            </dd>
            <p className="mt-1 text-xs text-zinc-500">
              {pipelineConfig.playwrightAvailable && safety.browserProfileExists
                ? "Session is on this machine — ready to sync."
                : "Run `bun sn:sync --login` locally after `vercel env pull`."}
            </p>
          </div>
        </dl>
        {pipelineConfig.playwrightAvailable ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-sm font-medium text-zinc-900">
              Profile directory
            </p>
            <p className="mt-1 font-mono text-xs text-zinc-600">
              {safety.browserProfileDir}
            </p>
          </div>
        ) : null}
        <PipelineActions config={pipelineConfig} variant="login-only" />
      </FormSection>

      <FormSection
        title="Do-not-contact list"
        description="Blocked leads are skipped during sync. Add LinkedIn profile URLs or emails you never want to outreach."
      >
        {statusMessage ? (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              statusSuccess
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-800"
            }`}
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}

        {blocklist.length === 0 ? (
          <p className="text-sm text-zinc-500">No blocked contacts yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {blocklist.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  {entry.linkedInUrl ? (
                    <a
                      href={entry.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium text-zinc-900 hover:text-zinc-600"
                    >
                      {entry.linkedInUrl}
                    </a>
                  ) : null}
                  {entry.email ? (
                    <p className="text-sm text-zinc-700">{entry.email}</p>
                  ) : null}
                  {entry.reason ? (
                    <p className="mt-1 text-xs text-zinc-500">{entry.reason}</p>
                  ) : null}
                </div>
                <form action={removeAction}>
                  <input type="hidden" name="id" value={entry.id} />
                  <button
                    type="submit"
                    disabled={removePending}
                    className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form
          action={addAction}
          className="space-y-4 border-t border-zinc-100 pt-4"
        >
          <Field
            label="LinkedIn URL"
            hint="e.g. https://www.linkedin.com/in/username"
          >
            <TextInput
              name="linkedInUrl"
              type="url"
              placeholder="https://www.linkedin.com/in/..."
            />
          </Field>
          <Field label="Email (optional)">
            <TextInput
              name="email"
              type="email"
              placeholder="person@company.com"
            />
          </Field>
          <Field label="Reason (optional)">
            <TextArea
              name="reason"
              rows={2}
              placeholder="Competitor, existing customer, etc."
            />
          </Field>
          <SubmitButton label="Add to blocklist" pending={addPending} />
          <FormMessage state={addState} />
        </form>
      </FormSection>

      <FormSection
        title="Activity audit log"
        description="Recent agent actions — scrapes, scores, content generation, safety stops, and outreach tracking."
      >
        {activityLog.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {activityLog.map((entry) => {
              const detail = formatMetadata(entry.metadata);

              return (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900">
                      {formatActionLabel(entry.action)}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                      {entry.entityType}
                    </span>
                    <time
                      className="text-xs text-zinc-400"
                      dateTime={entry.createdAt.toISOString()}
                    >
                      {entry.createdAt.toLocaleString()}
                    </time>
                  </div>
                  {detail ? (
                    <p className="mt-1 text-sm text-zinc-600">{detail}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </FormSection>
    </div>
  );
}
