import { CopyButton } from "@/components/dashboard/copy-button";
import { CONNECTION_NOTE_MAX_CHARS } from "@/lib/agent/config";

type DraftBlockProps = {
  warmingComment: string | null;
  connectionNote: string | null;
};

export function DraftBlock({
  warmingComment,
  connectionNote,
}: DraftBlockProps) {
  const noteLength = connectionNote?.length ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Warming comment
          </h4>
          <CopyButton text={warmingComment ?? ""} />
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-800">
          {warmingComment ?? (
            <span className="text-zinc-400 italic">No draft yet</span>
          )}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Connection note
            </h4>
            <span
              className={`text-xs tabular-nums ${
                noteLength > CONNECTION_NOTE_MAX_CHARS
                  ? "text-red-600"
                  : "text-zinc-400"
              }`}
            >
              {noteLength}/{CONNECTION_NOTE_MAX_CHARS}
            </span>
          </div>
          <CopyButton text={connectionNote ?? ""} />
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-800">
          {connectionNote ?? (
            <span className="text-zinc-400 italic">No draft yet</span>
          )}
        </p>
      </div>
    </div>
  );
}
