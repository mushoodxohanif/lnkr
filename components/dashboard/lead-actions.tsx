"use client";

import { useState, useTransition } from "react";
import type { LeadStatus } from "@/app/generated/prisma/client";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
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
          <span className="text-xs text-muted-foreground" role="status">
            {message}
          </span>
        ) : null}
      </div>
    );
  }

  const size = compact ? ("xs" as const) : ("sm" as const);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size={size}
          disabled={pending}
          onClick={() => runAction(() => markLeadSent(leadId))}
        >
          Mark as sent
        </Button>
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={pending}
          onClick={() => runAction(() => skipLead(leadId))}
        >
          Skip
        </Button>
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={pending}
          onClick={() => runAction(() => snoozeLead(leadId))}
        >
          Snooze 7d
        </Button>
      </div>
      {message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
