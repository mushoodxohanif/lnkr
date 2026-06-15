"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { LeadNotesField } from "@/components/dashboard/lead-notes-field";
import { LeadRowActions } from "@/components/dashboard/lead-row-actions";
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
import {
  type ColumnDef,
  DataTable,
  getCoreRowModel,
  useReactTable,
} from "@/components/ui/data-table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportFinalizedLeadsCsvAction } from "@/lib/dashboard/actions";
import {
  FINALIZED_LEAD_STATUSES,
  type FinalizedLeadRow,
  type FinalizedLeadsFilters,
  type LeadCountStats,
  QUALIFICATION_LABELS,
  type QualificationFilter,
} from "@/lib/dashboard/finalized-leads-shared";
import { STATUS_LABELS } from "@/lib/dashboard/lead-status";
import { cn } from "@/lib/utils";

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

const leadColumns: ColumnDef<FinalizedLeadRow>[] = [
  {
    id: "lead",
    header: "Lead",
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <>
          <Link
            href={`/leads/${lead.id}`}
            className="font-medium text-foreground hover:text-primary"
          >
            {lead.name}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[lead.title, lead.company].filter(Boolean).join(" · ") || "—"}
          </p>
          {lead.location ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {lead.location}
            </p>
          ) : null}
        </>
      );
    },
  },
  {
    id: "fit",
    header: "Fit",
    cell: ({ row }) => {
      const lead = row.original;
      if (lead.fitPercent === null) return "—";

      return (
        <>
          {Math.round(lead.fitPercent)}%
          {lead.timingSignal ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {lead.timingSignal}
            </span>
          ) : null}
        </>
      );
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} alwaysShow />,
  },
  {
    id: "list",
    header: "List",
    cell: ({ row }) => (
      <span className="block max-w-32 truncate text-xs text-muted-foreground">
        {row.original.snListSource ?? "—"}
      </span>
    ),
  },
  {
    id: "scraped",
    header: "Scraped",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(row.original.scrapedAt)}
      </span>
    ),
  },
  {
    id: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <LeadNotesField
        leadId={row.original.id}
        initialNotes={row.original.notes}
        compact
        rows={2}
      />
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <LeadRowActions lead={row.original} />,
  },
];

type FinalizedLeadsPanelProps = {
  result: {
    leads: FinalizedLeadRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  stats: LeadCountStats;
  listSources: string[];
  filters: FinalizedLeadsFilters;
};

function StatCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-lg border bg-card px-4 py-3 text-left shadow-xs transition",
        onClick && "cursor-pointer hover:border-primary/40 hover:bg-accent/30",
        active && "border-primary ring-1 ring-primary/20",
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </Component>
  );
}

export function FinalizedLeadsPanel({
  result,
  stats,
  listSources,
  filters,
}: FinalizedLeadsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exportPending, startExport] = useTransition();
  const [exportError, setExportError] = useState<string | null>(null);

  const table = useReactTable({
    data: result.leads,
    columns: leadColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: result.totalPages,
    rowCount: result.total,
    state: {
      pagination: {
        pageIndex: result.page - 1,
        pageSize: result.pageSize,
      },
    },
  });

  const filterState = useMemo(
    () => ({
      search: filters.search ?? "",
      status: filters.status ?? "ALL",
      qualification: filters.qualification ?? "ALL",
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
      qualification: string;
      list: string;
      minFit: string;
      maxFit: string;
    }>,
  ) {
    const merged = { ...filterState, search, ...next };
    const params = new URLSearchParams();

    if (merged.search.trim()) params.set("search", merged.search.trim());
    if (merged.status !== "ALL") params.set("status", merged.status);
    if (merged.qualification !== "ALL")
      params.set("qualification", merged.qualification);
    if (merged.list !== "ALL") params.set("list", merged.list);
    if (merged.minFit) params.set("minFit", merged.minFit);
    if (merged.maxFit) params.set("maxFit", merged.maxFit);

    const query = params.toString();
    router.push(query ? `/leads?${query}` : "/leads");
  }

  function applyQualificationFilter(qualification: QualificationFilter) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("status");

    if (qualification === "ALL") {
      params.delete("qualification");
    } else {
      params.set("qualification", qualification);
    }

    const query = params.toString();
    router.push(query ? `/leads?${query}` : "/leads");
  }

  function goToPage(pageIndex: number) {
    const page = pageIndex + 1;
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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total leads"
          value={stats.total}
          active={
            filterState.qualification === "ALL" && filterState.status === "ALL"
          }
          onClick={() => applyQualificationFilter("ALL")}
        />
        <StatCard
          label="Qualified"
          value={stats.qualified}
          active={filterState.qualification === "QUALIFIED"}
          onClick={() => applyQualificationFilter("QUALIFIED")}
        />
        <StatCard
          label="Unqualified"
          value={stats.unqualified}
          active={filterState.qualification === "UNQUALIFIED"}
          onClick={() => applyQualificationFilter("UNQUALIFIED")}
        />
        <StatCard
          label="Pending score"
          value={stats.pendingScore}
          active={filterState.qualification === "NEW"}
          onClick={() => applyQualificationFilter("NEW")}
        />
      </div>

      <Card className="shrink-0 shadow-sm pt-0">
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
              <Label>Qualification</Label>
              <Select
                value={filterState.qualification}
                onValueChange={(value) =>
                  applyFilters({ qualification: value, status: "ALL" })
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All leads" />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.entries(QUALIFICATION_LABELS) as [
                      QualificationFilter,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {FINALIZED_LEAD_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
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
        <Card className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0 shadow-sm">
          <DataTable
            table={table}
            emptyMessage="No leads match."
            className="min-h-0 flex-1 rounded-none border-0"
          />
          <DataTablePagination
            table={table}
            totalRows={result.total}
            onPageChange={goToPage}
            className="shrink-0"
          />
        </Card>
      )}
    </div>
  );
}
