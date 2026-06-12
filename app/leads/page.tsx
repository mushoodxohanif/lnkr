import { connection } from "next/server";
import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FinalizedLeadsPanel } from "@/components/dashboard/finalized-leads-panel";
import {
  getFinalizedLeadListSources,
  getFinalizedLeads,
  parseFinalizedLeadsFilters,
} from "@/lib/dashboard/finalized-leads";

type LeadsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  await connection();
  const params = await searchParams;
  const filters = parseFinalizedLeadsFilters(params);

  const [result, listSources] = await Promise.all([
    getFinalizedLeads(filters),
    getFinalizedLeadListSources(),
  ]);

  return (
    <DashboardShell
      wide
      title="All leads"
      description="All scraped leads from Sales Navigator — filter by status, add notes, and export to CSV."
    >
      <Suspense fallback={null}>
        <FinalizedLeadsPanel
          result={result}
          listSources={listSources}
          filters={filters}
        />
      </Suspense>
    </DashboardShell>
  );
}
