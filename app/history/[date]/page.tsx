import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LeadCard } from "@/components/dashboard/lead-card";
import { Button } from "@/components/ui/button";
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
        <div className="text-right text-sm text-muted-foreground">
          <p className="tabular-nums">
            {batch.leadCount} leads · {completedCount} actioned
          </p>
          <Button variant="link" size="sm" asChild className="mt-1 h-auto p-0">
            <Link href="/history">← All batches</Link>
          </Button>
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
