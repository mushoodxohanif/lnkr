"use client";

import { MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LeadEditDialog } from "@/components/dashboard/lead-edit-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteLead,
  enrichLeadAction,
  generateDraftsAction,
  markLeadSent,
  rescoreLeadAction,
  skipLead,
  snoozeLead,
} from "@/lib/dashboard/actions";
import type { FinalizedLeadRow } from "@/lib/dashboard/finalized-leads-shared";

type LeadRowActionsProps = {
  lead: FinalizedLeadRow;
};

export function LeadRowActions({ lead }: LeadRowActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isWorkflowDone =
    lead.status === "SENT" ||
    lead.status === "SKIPPED" ||
    lead.status === "SNOOZED";

  const hasDrafts = Boolean(lead.connectionNote);

  function runAction(
    action: () => Promise<{ success: boolean; message: string }>,
    options?: { refresh?: boolean; onSuccess?: () => void },
  ) {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);
      if (result.success) {
        options?.onSuccess?.();
        if (options?.refresh !== false) {
          router.refresh();
        }
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Delete ${lead.name}? This cannot be undone.`)) {
      return;
    }

    runAction(() => deleteLead(lead.id), { refresh: true });
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={pending}
              aria-label={`Actions for ${lead.name}`}
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href={`/leads/${lead.id}`}>View details</Link>
            </DropdownMenuItem>

            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              Edit
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => runAction(() => enrichLeadAction(lead.id))}
            >
              Enrich
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => runAction(() => rescoreLeadAction(lead.id))}
            >
              Re-score
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() =>
                runAction(() =>
                  generateDraftsAction(lead.id, {
                    forceRegenerate: hasDrafts,
                  }),
                )
              }
            >
              {hasDrafts ? "Regenerate drafts" : "Generate drafts"}
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={`/leads/${lead.id}#drafts`}>Refine drafts</Link>
            </DropdownMenuItem>

            {!isWorkflowDone ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => runAction(() => markLeadSent(lead.id))}
                >
                  Mark as sent
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => runAction(() => skipLead(lead.id))}
                >
                  Skip
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => runAction(() => snoozeLead(lead.id))}
                >
                  Snooze 7 days
                </DropdownMenuItem>
              </>
            ) : null}

            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleDelete}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {message ? (
        <p
          className="mt-1 max-w-32 text-xs text-muted-foreground"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <LeadEditDialog
        lead={lead}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={(successMessage) => setMessage(successMessage)}
      />
    </>
  );
}
