"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { LeadStatus } from "@/app/generated/prisma/client";
import { LeadNotesField } from "@/components/dashboard/lead-notes-field";
import { exportFinalizedLeadsCsvAction } from "@/lib/dashboard/actions";
import {
  FINALIZED_LEAD_STATUSES,
  type FinalizedLeadRow,
  type FinalizedLeadsFilters,
} from "@/lib/dashboard/finalized-leads-shared";

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-blue-50 text-blue-700",
  QUALIFIED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-zinc-100 text-zinc-600",
  SENT: "bg-violet-50 text-violet-700",
  SKIPPED: "bg-zinc-100 text-zinc-500",
  SNOOZED: "bg-amber-50 text-amber-700",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  ARCHIVED: "Archived",
  SENT: "Sent",
  SKIPPED: "Skipped",
  SNOOZED: "Snoozed",
};

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

type FinalizedLeadsPanelProps = {
  result: {
    leads: FinalizedLeadRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  listSources: string[];
  filters: FinalizedLeadsFilters;
};

export function FinalizedLeadsPanel({
  result,
  listSources,
  filters,
}: FinalizedLeadsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exportPending, startExport] = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);

  const filterState = useMemo(
    () => ({
      search: filters.search ?? "",
      status: filters.status ?? "ALL",
      list: filters.snListSource ?? "ALL",
      minFit: filters.minFit?.toString() ?? "",
      maxFit: filters.maxFit?.toString() ?? "",
    }),
    [filters],
  );

  const [search, setSearch] = useState(filterState.search);

  function applyFilters(
    next: Partial<{
      search: string;
      status: string;
      list: string;
      minFit: string;
      maxFit: string;
    }>,
  ) {
    const merged = { ...filterState, search, ...next };
    const params = new URLSearchParams();

    if (merged.search.trim()) params.set("search", merged.search.trim());
    if (merged.status !== "ALL") params.set("status", merged.status);
    if (merged.list !== "ALL") params.set("list", merged.list);
    if (merged.minFit) params.set("minFit", merged.minFit);
    if (merged.maxFit) params.set("maxFit", merged.maxFit);

    const query = params.toString();
    router.push(query ? `/leads?${query}` : "/leads");
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const query = params.toString();
    router.push(query ? `/leads?${query}` : "/leads");
  }

  function handleExport() {
    startExport(async () => {
      setExportError(null);
      try {
        const { csv, filename } = await exportFinalizedLeadsCsvAction(filters);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch {
        setExportError("Export failed. Try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 space-y-1">
            <span className="text-xs font-medium text-zinc-600">Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, company, title…"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applyFilters({ search });
                }
              }}
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600">Status</span>
            <select
              defaultValue={filterState.status}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
              onChange={(event) => applyFilters({ status: event.target.value })}
            >
              <option value="ALL">All statuses</option>
              {FINALIZED_LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600">SN list</span>
            <select
              defaultValue={filterState.list}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
              onChange={(event) => applyFilters({ list: event.target.value })}
            >
              <option value="ALL">All lists</option>
              {listSources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>

          <label className="w-24 space-y-1">
            <span className="text-xs font-medium text-zinc-600">Min fit %</span>
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={filterState.minFit}
              placeholder="0"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm tabular-nums text-zinc-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
              onBlur={(event) => applyFilters({ minFit: event.target.value })}
            />
          </label>

          <label className="w-24 space-y-1">
            <span className="text-xs font-medium text-zinc-600">Max fit %</span>
            <input
              type="number"
              min={0}
              max={100}
              defaultValue={filterState.maxFit}
              placeholder="100"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm tabular-nums text-zinc-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
              onBlur={(event) => applyFilters({ maxFit: event.target.value })}
            />
          </label>

          <button
            type="button"
            onClick={() => applyFilters({ search })}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            Apply
          </button>

          <button
            type="button"
            disabled={exportPending}
            onClick={handleExport}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportPending ? "Exporting…" : "Export CSV"}
          </button>
        </div>

        {exportError ? (
          <p className="mt-3 text-sm text-red-600">{exportError}</p>
        ) : null}

        <p className="mt-3 text-xs text-zinc-500">
          {result.total} finalized lead{result.total === 1 ? "" : "s"} · page{" "}
          {result.page} of {result.totalPages}
        </p>
      </div>

      {result.leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            No leads match
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
            Adjust filters or run the pipeline to sync and score new leads.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Lead
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Fit
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Status
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  List
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Scraped
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {result.leads.map((lead) => (
                <tr key={lead.id} className="align-top hover:bg-zinc-50/80">
                  <td className="px-3 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-zinc-900 hover:text-violet-700"
                    >
                      {lead.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-600">
                      {[lead.title, lead.company].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                    {lead.location ? (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {lead.location}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-sm tabular-nums text-zinc-700">
                    {lead.fitPercent !== null ? (
                      <>
                        {Math.round(lead.fitPercent)}%
                        {lead.timingSignal ? (
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {lead.timingSignal}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[lead.status]}`}
                    >
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="max-w-32 truncate px-3 py-3 text-xs text-zinc-600">
                    {lead.snListSource ?? "—"}
                  </td>
                  <td className="px-3 py-3 text-xs text-zinc-600">
                    {formatDate(lead.scrapedAt)}
                  </td>
                  <td className="px-3 py-3">
                    <LeadNotesField
                      leadId={lead.id}
                      initialNotes={lead.notes}
                      compact
                      rows={2}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3">
          <button
            type="button"
            disabled={result.page <= 1}
            onClick={() => goToPage(result.page - 1)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm tabular-nums text-zinc-600">
            Page {result.page} of {result.totalPages}
          </span>
          <button
            type="button"
            disabled={result.page >= result.totalPages}
            onClick={() => goToPage(result.page + 1)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
