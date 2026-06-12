import Link from "next/link";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LeadCard } from "@/components/dashboard/lead-card";
import { PipelineActions } from "@/components/dashboard/pipeline-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default async function TodayPage() {
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
          <div className="text-right text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
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
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <CardTitle>No daily batch yet</CardTitle>
            <CardDescription className="mx-auto max-w-md">
              Run the complete pipeline to sync leads, score them, and build
              today&apos;s batch. New here?{" "}
              <Link
                href="/help"
                className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Read the setup guide
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent className="mx-auto max-w-xl">
            <PipelineActions config={pipelineConfig} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardContent>
              <PipelineActions
                config={pipelineConfig}
                variant="complete-only"
              />
            </CardContent>
          </Card>
          {batch.leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
