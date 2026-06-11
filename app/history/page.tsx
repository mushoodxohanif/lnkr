import Link from "next/link";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PipelineActions } from "@/components/dashboard/pipeline-actions";
import { StatusBadge } from "@/components/dashboard/status-badge";
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
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            No batches yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
            Build your first daily batch after syncing and scoring leads.
          </p>
          <div className="mx-auto mt-8 max-w-xl text-left">
            <PipelineActions config={pipelineConfig} variant="compact" />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Leads
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Actioned
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Progress
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  View
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {batches.map((batch) => {
                const progress =
                  batch.leadCount > 0
                    ? Math.round((batch.actionedCount / batch.leadCount) * 100)
                    : 0;

                return (
                  <tr key={batch.id} className="hover:bg-zinc-50/80">
                    <td className="px-4 py-4 text-sm font-medium text-zinc-900">
                      {formatBatchDate(batch.date)}
                    </td>
                    <td className="px-4 py-4 text-sm tabular-nums text-zinc-600">
                      {batch.leadCount}
                    </td>
                    <td className="px-4 py-4 text-sm tabular-nums text-zinc-600">
                      {batch.actionedCount}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-zinc-500">
                          {progress}%
                        </span>
                        {progress === 100 ? (
                          <StatusBadge status="SENT" />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/history/${batch.date}`}
                        className="text-sm font-medium text-zinc-700 transition hover:text-zinc-900"
                      >
                        Open batch →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
