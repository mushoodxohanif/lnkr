"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";
import { ApplicationLimits } from "@/components/dashboard/application-limits";
import { GitHubSessionSetup } from "@/components/dashboard/local-sync-guide";
import { PipelineActions } from "@/components/dashboard/pipeline-actions";
import {
  Field,
  FormMessage,
  FormSection,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/settings/form-primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ActivityLogEntry } from "@/lib/activity/queries";
import type { PipelineConfig } from "@/lib/pipeline/status";
import { addDoNotContact, removeDoNotContact } from "@/lib/settings/actions";
import type { DoNotContactEntry, SafetyStatusData } from "@/lib/settings/types";
import { cn } from "@/lib/utils";

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

function StatCard({
  label,
  value,
  hint,
  className,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <Card size="sm" className={cn("bg-muted/50", className)}>
      <CardContent>
        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd
          className={cn(
            "mt-1 text-lg font-semibold text-foreground",
            valueClassName,
          )}
        >
          {value}
        </dd>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
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
  const isGitHubSync = pipelineConfig.syncProvider === "github";
  const isLocalSync = pipelineConfig.syncProvider === "local";

  const scrapeCardClass =
    safety.remainingToday <= 0
      ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50"
      : safety.remainingToday <= 10
        ? "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/50"
        : undefined;

  return (
    <div className="space-y-6">
      <FormSection
        title="Application limits"
        description="How lnkr caps sync volume, batch size, and cloud processing. Tune scraper settings via environment variables (see GitHub Secrets or .env.local)."
      >
        <ApplicationLimits config={pipelineConfig} defaultOpen />
      </FormSection>

      <FormSection
        title="Scraper safety limits"
        description="Live usage against your configured scrape caps. Change limits via Vercel env vars, GitHub Actions Variables, or `.env.local`."
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Daily scrape limit"
            value={`${safety.todayScrapeCount} / ${safety.dailyScrapeLimit}`}
            hint={
              safety.remainingToday <= 0
                ? "Limit reached — sync won't save new profiles until tomorrow"
                : `${safety.remainingToday} remaining today`
            }
            className={scrapeCardClass}
          />
          <StatCard
            label="Profile delay"
            value={`${safety.minDelayMs / 1000}s–${safety.maxDelayMs / 1000}s`}
            hint="Random delay between profile visits"
          />
          <StatCard
            label="Posts per profile"
            value={safety.maxPostsPerProfile}
          />
        </dl>
      </FormSection>

      <FormSection
        title="Browser session"
        description={
          isLocalSync
            ? "Playwright stores your LinkedIn session in a persistent Chrome profile on this machine."
            : isGitHubSync
              ? "LinkedIn session cookies live in GitHub Secrets and are used by the sn-sync workflow. Re-export when sync fails with a login timeout."
              : "On Vercel, LinkedIn login and sync run on your computer — not in the cloud. Use the commands below with the same DATABASE_URL as production."
        }
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Sync method"
            value={
              isGitHubSync
                ? "GitHub Actions"
                : isLocalSync
                  ? "Playwright (local machine)"
                  : "Local CLI (fallback)"
            }
            hint={
              isGitHubSync
                ? "Trigger sync from the dashboard — scraping runs in GitHub Actions."
                : isLocalSync
                  ? "Sync uses your local browser. Sign in below before your first sync."
                  : "Configure lists here on Vercel; run sync from your laptop."
            }
          />
          <StatCard
            label="LinkedIn session"
            value={
              isGitHubSync
                ? pipelineConfig.sessionConfigured
                  ? "Cookies configured"
                  : "Session setup required"
                : isLocalSync && safety.browserProfileExists
                  ? "Profile saved locally"
                  : "Sign-in on your computer"
            }
            valueClassName={
              (isLocalSync && safety.browserProfileExists) ||
              (isGitHubSync && pipelineConfig.sessionConfigured)
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-amber-700 dark:text-amber-400"
            }
            hint={
              isGitHubSync
                ? pipelineConfig.sessionConfigured
                  ? "GitHub Secrets has LinkedIn cookies — ready to sync from the dashboard."
                  : "Admin must export cookies to LINKEDIN_SESSION_COOKIES in GitHub Secrets."
                : isLocalSync && safety.browserProfileExists
                  ? "Session is on this machine — ready to sync."
                  : "Run `bun sn:sync --login` locally after `vercel env pull`."
            }
          />
        </dl>
        {isLocalSync ? (
          <Card size="sm" className="mt-4 bg-muted/50">
            <CardContent>
              <p className="text-sm font-medium text-foreground">
                Profile directory
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {safety.browserProfileDir}
              </p>
            </CardContent>
          </Card>
        ) : null}
        {isGitHubSync ? (
          <GitHubSessionSetup />
        ) : (
          <PipelineActions config={pipelineConfig} variant="login-only" />
        )}
      </FormSection>

      <FormSection
        title="Do-not-contact list"
        description="Blocked leads are skipped during sync. Add LinkedIn profile URLs or emails you never want to outreach."
      >
        {statusMessage ? (
          <FormMessage
            state={{ success: statusSuccess, message: statusMessage }}
          />
        ) : null}

        {blocklist.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No blocked contacts yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
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
                      className="block truncate text-sm font-medium text-foreground hover:text-muted-foreground"
                    >
                      {entry.linkedInUrl}
                    </a>
                  ) : null}
                  {entry.email ? (
                    <p className="text-sm text-muted-foreground">
                      {entry.email}
                    </p>
                  ) : null}
                  {entry.reason ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {entry.reason}
                    </p>
                  ) : null}
                </div>
                <form action={removeAction}>
                  <input type="hidden" name="id" value={entry.id} />
                  <Button
                    type="submit"
                    variant="link"
                    size="sm"
                    disabled={removePending}
                    className="h-auto p-0 text-destructive"
                  >
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addAction} className="space-y-4">
          <Separator />
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
          <p className="text-sm text-muted-foreground">
            No activity recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {activityLog.map((entry) => {
              const detail = formatMetadata(entry.metadata);

              return (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {formatActionLabel(entry.action)}
                    </span>
                    <Badge variant="secondary">{entry.entityType}</Badge>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={entry.createdAt.toISOString()}
                    >
                      {entry.createdAt.toLocaleString()}
                    </time>
                  </div>
                  {detail ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detail}
                    </p>
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
