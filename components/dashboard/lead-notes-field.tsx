"use client";

import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadNotes } from "@/lib/dashboard/actions";
import { cn } from "@/lib/utils";

type LeadNotesFieldProps = {
  leadId: string;
  initialNotes: string | null;
  rows?: number;
  compact?: boolean;
};

export function LeadNotesField({
  leadId,
  initialNotes,
  rows = 3,
  compact = false,
}: LeadNotesFieldProps) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [, startTransition] = useTransition();

  function save(nextNotes: string) {
    startTransition(async () => {
      setStatus("saving");
      const result = await updateLeadNotes(leadId, nextNotes);
      setStatus(result.success ? "saved" : "error");
      if (result.success) {
        setSavedNotes(nextNotes);
        setTimeout(() => setStatus("idle"), 2000);
      }
    });
  }

  return (
    <div className={compact ? "min-w-48" : undefined}>
      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        onBlur={() => {
          if (notes !== savedNotes) {
            save(notes);
          }
        }}
        rows={rows}
        placeholder="Add a note…"
        className={cn(compact && "text-xs")}
      />
      {status === "saving" ? (
        <p
          className={cn(
            "mt-1 text-muted-foreground",
            compact ? "text-[10px]" : "text-xs",
          )}
        >
          Saving…
        </p>
      ) : status === "saved" ? (
        <p
          className={cn(
            "mt-1 text-emerald-600 dark:text-emerald-400",
            compact ? "text-[10px]" : "text-xs",
          )}
        >
          Saved
        </p>
      ) : status === "error" ? (
        <p
          className={cn(
            "mt-1 text-destructive",
            compact ? "text-[10px]" : "text-xs",
          )}
        >
          Could not save
        </p>
      ) : null}
    </div>
  );
}
