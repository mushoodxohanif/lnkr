import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LeadCard } from "@/components/dashboard/lead-card";
import { PipelineActions } from "@/components/dashboard/pipeline-actions";
import { getTodayBatch } from "@/lib/dashboard/queries";
import { getPipelineConfig } from "@/lib/pipeline/status";

function formatBatchDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export default async function HomePage() {
  await connection();
  const [batch, pipelineConfig] = await Promise.all([
    getTodayBatch(),
    getPipelineConfig(),
  ]);

  const completedCount =
    batch?.leads.filter(
      (lead) => lead.status === "SENT" || lead.status === "SKIPPED",
    ).length ?? 0;

  return (
    <DashboardShell
      title="Today's top 50"
      description="Review fit scores, copy drafts, and track outreach manually. Nothing is sent automatically. Daily batch: top 50 qualified leads; sync capped at 50 profiles/day by default."
      headerExtra={
        batch ? (
          <div className="text-right text-sm text-zinc-500">
            <p className="font-medium text-zinc-700">
              {formatBatchDate(batch.date)}
            </p>
            <p className="mt-0.5 tabular-nums">
              {batch.leadCount} leads · {completedCount} actioned
            </p>
          </div>
        ) : null
      }
    >
      {!batch || batch.leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            No daily batch yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
            Run the complete pipeline to sync leads, score them, and build
            today&apos;s batch. New here?{" "}
            <a
              href="/help"
              className="font-medium text-violet-700 hover:underline"
            >
              Read the setup guide
            </a>
            .
          </p>
          <div className="mx-auto mt-8 max-w-xl text-left">
            <PipelineActions config={pipelineConfig} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <PipelineActions config={pipelineConfig} variant="complete-only" />
          </div>
          {batch.leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
