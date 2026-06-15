import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LeadCard } from "@/components/dashboard/lead-card";
import { getBatchByDate } from "@/lib/dashboard/queries";

type HistoryBatchPageProps = {
  params: Promise<{ date: string }>;
};

function _formatBatchDate(date: string): string {
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

  const _completedCount = batch.leads.filter(
    (lead) => lead.status === "SENT" || lead.status === "SKIPPED",
  ).length;

  return (
    <DashboardShell>
      <div className="space-y-6">
        {batch.leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </DashboardShell>
  );
}
