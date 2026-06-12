import { CopyButton } from "@/components/dashboard/copy-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONNECTION_NOTE_MAX_CHARS } from "@/lib/agent/config";
import { cn } from "@/lib/utils";

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
      <Card size="sm" className="bg-muted/50">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Warming comment
          </CardTitle>
          <CopyButton text={warmingComment ?? ""} />
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {warmingComment ?? (
              <span className="text-muted-foreground italic">No draft yet</span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card size="sm" className="bg-muted/50">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Connection note
            </CardTitle>
            <span
              className={cn(
                "text-xs tabular-nums",
                noteLength > CONNECTION_NOTE_MAX_CHARS
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {noteLength}/{CONNECTION_NOTE_MAX_CHARS}
            </span>
          </div>
          <CopyButton text={connectionNote ?? ""} />
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
            {connectionNote ?? (
              <span className="text-muted-foreground italic">No draft yet</span>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
