import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LeadCard } from "@/components/dashboard/lead-card";
import { getBatchByDate } from "@/lib/dashboard/queries";

type HistoryBatchPageProps = {
  params: Promise<{ date: string }>;
};

function formatBatchDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export default async function HistoryBatchPage({
  params,
}: HistoryBatchPageProps) {
  await connection();
  const { date } = await params;
  const batch = await getBatchByDate(date);

  if (!batch) {
    notFound();
  }

  const completedCount = batch.leads.filter(
    (lead) => lead.status === "SENT" || lead.status === "SKIPPED",
  ).length;

  return (
    <DashboardShell
      title={formatBatchDate(batch.date)}
      description="Past daily batch — review leads and track what you sent or skipped."
      headerExtra={
        <div className="text-right text-sm text-zinc-500">
          <p className="tabular-nums">
            {batch.leadCount} leads · {completedCount} actioned
          </p>
          <Link
            href="/history"
            className="mt-1 inline-block font-medium text-zinc-700 transition hover:text-zinc-900"
          >
            ← All batches
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {batch.leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </DashboardShell>
  );
}
