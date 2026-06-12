import type { TimingSignal } from "@/app/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FitBadgeProps = {
  fitPercent: number;
  timingSignal?: TimingSignal;
};

function getFitColor(fitPercent: number): string {
  if (fitPercent >= 80)
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  if (fitPercent >= 70)
    return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
  if (fitPercent >= 60)
    return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

const TIMING_LABELS: Record<TimingSignal, string> = {
  HOT: "Hot",
  WARM: "Warm",
  COLD: "Cold",
};

const TIMING_COLORS: Record<TimingSignal, string> = {
  HOT: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  WARM: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  COLD: "bg-muted text-muted-foreground",
};

export function FitBadge({ fitPercent, timingSignal }: FitBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="secondary"
        className={cn(
          "text-sm font-semibold tabular-nums",
          getFitColor(fitPercent),
        )}
      >
        {Math.round(fitPercent)}% fit
      </Badge>
      {timingSignal ? (
        <Badge variant="secondary" className={cn(TIMING_COLORS[timingSignal])}>
          {TIMING_LABELS[timingSignal]}
        </Badge>
      ) : null}
    </div>
  );
}
