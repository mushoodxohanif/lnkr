"use client";

import { useState, useTransition } from "react";
import { updateLeadNotes } from "@/lib/dashboard/actions";

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
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        onBlur={() => {
          if (notes !== savedNotes) {
            save(notes);
          }
        }}
        rows={rows}
        placeholder="Add a note…"
        className={
          compact
            ? "w-full resize-y rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-800 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
            : "w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
        }
      />
      {status === "saving" ? (
        <p
          className={`mt-1 ${compact ? "text-[10px]" : "text-xs"} text-zinc-500`}
        >
          Saving…
        </p>
      ) : status === "saved" ? (
        <p
          className={`mt-1 ${compact ? "text-[10px]" : "text-xs"} text-emerald-600`}
        >
          Saved
        </p>
      ) : status === "error" ? (
        <p
          className={`mt-1 ${compact ? "text-[10px]" : "text-xs"} text-red-600`}
        >
          Could not save
        </p>
      ) : null}
    </div>
  );
}
