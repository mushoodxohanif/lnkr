"use client";

import { useActionState } from "react";
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
        description="Limits are read from environment variables. Update .env and restart sync jobs to change them."
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
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Apify fallback
            </dt>
            <dd className="mt-1 text-lg font-semibold text-zinc-900">
              {safety.apifyConfigured ? "Configured" : "Not configured"}
            </dd>
            <p className="mt-1 text-xs text-zinc-500">
              {safety.apifyFallbackEnabled
                ? "APIFY_FALLBACK enabled"
                : "Use --fallback-apify or APIFY_FALLBACK=true"}
            </p>
          </div>
        </dl>
      </FormSection>

      <FormSection
        title="Browser session"
        description="Playwright stores your LinkedIn session in a persistent Chrome profile. Sign in once below for local sync."
      >
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <p className="text-sm font-medium text-zinc-900">Profile directory</p>
          <p className="mt-1 font-mono text-xs text-zinc-600">
            {safety.browserProfileDir}
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Status:{" "}
            <span
              className={
                safety.browserProfileExists
                  ? "font-medium text-emerald-700"
                  : "font-medium text-amber-700"
              }
            >
              {safety.browserProfileExists
                ? "Profile found — session may be saved"
                : "No profile yet — sign in below"}
            </span>
          </p>
        </div>
        <PipelineActions config={pipelineConfig} variant="login-only" />
        <p className="text-sm text-zinc-600">
          Apify actor:{" "}
          {safety.apifyActorId ? (
            <span className="font-mono text-xs">{safety.apifyActorId}</span>
          ) : (
            <span className="text-amber-700">
              Set APIFY_ACTOR_ID to your Crawlee actor
            </span>
          )}
        </p>
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
