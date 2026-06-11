"use client";

import { useState, useTransition } from "react";
import type { LeadStatus } from "@/app/generated/prisma/client";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { markLeadSent, skipLead, snoozeLead } from "@/lib/dashboard/actions";

type LeadActionsProps = {
  leadId: string;
  status: LeadStatus;
  compact?: boolean;
};

export function LeadActions({
  leadId,
  status,
  compact = false,
}: LeadActionsProps) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const isDone =
    status === "SENT" || status === "SKIPPED" || status === "SNOOZED";

  function runAction(
    action: () => Promise<{ success: boolean; message: string }>,
  ) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
    });
  }

  if (isDone) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={status} />
        {message ? (
          <span className="text-xs text-zinc-500" role="status">
            {message}
          </span>
        ) : null}
      </div>
    );
  }

  const buttonClass = compact
    ? "rounded-lg px-2.5 py-1 text-xs"
    : "rounded-lg px-3 py-1.5 text-sm";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => runAction(() => markLeadSent(leadId))}
          className={`${buttonClass} font-medium bg-violet-600 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Mark as sent
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => runAction(() => skipLead(leadId))}
          className={`${buttonClass} font-medium border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Skip
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => runAction(() => snoozeLead(leadId))}
          className={`${buttonClass} font-medium border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Snooze 7d
        </button>
      </div>
      {message ? (
        <p className="text-xs text-zinc-500" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
