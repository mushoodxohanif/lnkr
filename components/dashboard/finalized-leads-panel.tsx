"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { LeadNotesField } from "@/components/dashboard/lead-notes-field";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { exportFinalizedLeadsCsvAction } from "@/lib/dashboard/actions";
import {
  FINALIZED_LEAD_STATUSES,
  type FinalizedLeadRow,
  type FinalizedLeadsFilters,
} from "@/lib/dashboard/finalized-leads-shared";
import { STATUS_LABELS } from "@/lib/dashboard/lead-status";

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
      <Card className="shadow-sm">
        <CardContent className="pt-(--card-spacing)">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48 flex-1 space-y-1.5">
              <Label htmlFor="leads-search">Search</Label>
              <Input
                id="leads-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, company, title…"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applyFilters({ search });
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={filterState.status}
                onValueChange={(value) => applyFilters({ status: value })}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="NEW">New (pending score)</SelectItem>
                  {FINALIZED_LEAD_STATUSES.filter((s) => s !== "NEW").map(
                    (status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>SN list</Label>
              <Select
                value={filterState.list}
                onValueChange={(value) => applyFilters({ list: value })}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All lists" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All lists</SelectItem>
                  {listSources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-24 space-y-1.5">
              <Label htmlFor="min-fit">Min fit %</Label>
              <Input
                id="min-fit"
                type="number"
                min={0}
                max={100}
                defaultValue={filterState.minFit}
                placeholder="0"
                className="tabular-nums"
                onBlur={(event) => applyFilters({ minFit: event.target.value })}
              />
            </div>

            <div className="w-24 space-y-1.5">
              <Label htmlFor="max-fit">Max fit %</Label>
              <Input
                id="max-fit"
                type="number"
                min={0}
                max={100}
                defaultValue={filterState.maxFit}
                placeholder="100"
                className="tabular-nums"
                onBlur={(event) => applyFilters({ maxFit: event.target.value })}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => applyFilters({ search })}
            >
              Apply
            </Button>

            <Button
              type="button"
              disabled={exportPending}
              onClick={handleExport}
            >
              {exportPending ? "Exporting…" : "Export CSV"}
            </Button>
          </div>

          {exportError ? (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{exportError}</AlertDescription>
            </Alert>
          ) : null}

          <CardDescription className="mt-3">
            {result.total} finalized lead{result.total === 1 ? "" : "s"} · page{" "}
            {result.page} of {result.totalPages}
          </CardDescription>
        </CardContent>
      </Card>

      {result.leads.length === 0 ? (
        <Card className="border-dashed shadow-sm">
          <CardHeader className="text-center">
            <CardTitle>No leads match</CardTitle>
            <CardDescription className="mx-auto max-w-md">
              Adjust filters or run the pipeline to sync and score new leads.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wide">
                  Lead
                </TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wide">
                  Fit
                </TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wide">
                  Status
                </TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wide">
                  List
                </TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wide">
                  Scraped
                </TableHead>
                <TableHead className="px-3 text-xs font-semibold uppercase tracking-wide">
                  Notes
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.leads.map((lead) => (
                <TableRow key={lead.id} className="align-top">
                  <TableCell className="px-3 py-3 whitespace-normal">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {lead.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[lead.title, lead.company].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                    {lead.location ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {lead.location}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-3 py-3 tabular-nums whitespace-normal">
                    {lead.fitPercent !== null ? (
                      <>
                        {Math.round(lead.fitPercent)}%
                        {lead.timingSignal ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {lead.timingSignal}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-3">
                    <StatusBadge status={lead.status} alwaysShow />
                  </TableCell>
                  <TableCell className="max-w-32 truncate px-3 py-3 text-xs text-muted-foreground">
                    {lead.snListSource ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-xs text-muted-foreground">
                    {formatDate(lead.scrapedAt)}
                  </TableCell>
                  <TableCell className="px-3 py-3 whitespace-normal">
                    <LeadNotesField
                      leadId={lead.id}
                      initialNotes={lead.notes}
                      compact
                      rows={2}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {result.totalPages > 1 ? (
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-between py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={result.page <= 1}
              onClick={() => goToPage(result.page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm tabular-nums text-muted-foreground">
              Page {result.page} of {result.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={result.page >= result.totalPages}
              onClick={() => goToPage(result.page + 1)}
            >
              Next
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
