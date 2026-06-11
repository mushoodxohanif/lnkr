import type { TimingSignal } from "@/app/generated/prisma/client";

type FitBadgeProps = {
  fitPercent: number;
  timingSignal?: TimingSignal;
};

function getFitColor(fitPercent: number): string {
  if (fitPercent >= 80) return "bg-emerald-100 text-emerald-800";
  if (fitPercent >= 70) return "bg-green-100 text-green-800";
  if (fitPercent >= 60) return "bg-amber-100 text-amber-800";
  return "bg-zinc-100 text-zinc-700";
}

const TIMING_LABELS: Record<TimingSignal, string> = {
  HOT: "Hot",
  WARM: "Warm",
  COLD: "Cold",
};

const TIMING_COLORS: Record<TimingSignal, string> = {
  HOT: "bg-orange-100 text-orange-800",
  WARM: "bg-sky-100 text-sky-800",
  COLD: "bg-slate-100 text-slate-600",
};

export function FitBadge({ fitPercent, timingSignal }: FitBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${getFitColor(fitPercent)}`}
      >
        {Math.round(fitPercent)}% fit
      </span>
      {timingSignal ? (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TIMING_COLORS[timingSignal]}`}
        >
          {TIMING_LABELS[timingSignal]}
        </span>
      ) : null}
    </div>
  );
}
