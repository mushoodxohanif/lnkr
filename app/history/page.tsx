import Link from "next/link";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PipelineActions } from "@/components/dashboard/pipeline-actions";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPastBatches } from "@/lib/dashboard/queries";
import { getPipelineConfig } from "@/lib/pipeline/status";

function formatBatchDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export default async function HistoryPage() {
  await connection();
  const [batches, pipelineConfig] = await Promise.all([
    getPastBatches(),
    getPipelineConfig(),
  ]);

  return (
    <DashboardShell
      title="Outreach history"
      description="Past daily top-50 batches and how many leads you actioned."
    >
      {batches.length === 0 ? (
        <Card className="border-dashed shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">No batches yet</CardTitle>
            <CardDescription className="mx-auto max-w-md">
              Build your first daily batch after syncing and scoring leads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto max-w-xl">
              <PipelineActions config={pipelineConfig} variant="compact" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wide">
                  Date
                </TableHead>
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wide">
                  Leads
                </TableHead>
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wide">
                  Actioned
                </TableHead>
                <TableHead className="px-4 text-xs font-semibold uppercase tracking-wide">
                  Progress
                </TableHead>
                <TableHead className="px-4 text-right text-xs font-semibold uppercase tracking-wide">
                  View
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => {
                const progress =
                  batch.leadCount > 0
                    ? Math.round((batch.actionedCount / batch.leadCount) * 100)
                    : 0;

                return (
                  <TableRow key={batch.id}>
                    <TableCell className="px-4 py-4 text-sm font-medium">
                      {formatBatchDate(batch.date)}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm tabular-nums text-muted-foreground">
                      {batch.leadCount}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm tabular-nums text-muted-foreground">
                      {batch.actionedCount}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="h-2 w-24" />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {progress}%
                        </span>
                        {progress === 100 ? (
                          <StatusBadge status="SENT" />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right">
                      <Button
                        variant="link"
                        size="sm"
                        asChild
                        className="h-auto p-0"
                      >
                        <Link href={`/history/${batch.date}`}>
                          Open batch →
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </DashboardShell>
  );
}
