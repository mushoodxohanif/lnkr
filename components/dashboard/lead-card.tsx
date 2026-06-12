import Link from "next/link";
import { DraftBlock } from "@/components/dashboard/draft-block";
import { FitBadge } from "@/components/dashboard/fit-badge";
import { LeadActions } from "@/components/dashboard/lead-actions";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { LeadSummaryView } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

type LeadCardProps = {
  lead: LeadSummaryView;
};

function formatSubtitle(lead: LeadSummaryView): string {
  const parts = [lead.title, lead.company].filter(Boolean);
  return parts.join(" at ") || lead.headline || "—";
}

function formatEnrichment(lead: LeadSummaryView): string | null {
  const enrichment = lead.enrichment;
  if (!enrichment) return null;

  const parts: string[] = [];
  if (enrichment.employeeCount) {
    parts.push(`${enrichment.employeeCount} employees`);
  }
  if (enrichment.industry) {
    parts.push(enrichment.industry);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function LeadCard({ lead }: LeadCardProps) {
  const score = lead.score;
  const isInactive =
    lead.status === "SENT" ||
    lead.status === "SKIPPED" ||
    lead.status === "SNOOZED";

  return (
    <Card className={cn("shadow-sm transition", isInactive && "opacity-75")}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                #{lead.rank}
              </span>
              <StatusBadge status={lead.status} />
            </div>
            <div>
              <Link
                href={`/leads/${lead.id}`}
                className="text-lg font-semibold text-foreground transition hover:text-muted-foreground"
              >
                {lead.name}
              </Link>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {formatSubtitle(lead)}
              </p>
              {formatEnrichment(lead) ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatEnrichment(lead)}
                </p>
              ) : null}
            </div>
          </div>

          {score ? (
            <FitBadge
              fitPercent={score.fitPercent}
              timingSignal={score.timingSignal}
            />
          ) : null}
        </div>
      </CardHeader>

      {score ? (
        <CardContent>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              {score.fitReasons.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Why fit
                  </h3>
                  <ul className="space-y-1.5 text-sm text-foreground">
                    {score.fitReasons.slice(0, 3).map((reason) => (
                      <li key={reason} className="flex gap-2">
                        <span className="text-emerald-500">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {score.painPoints.length > 0 ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pain points
                  </h3>
                  <ul className="space-y-1.5 text-sm text-foreground">
                    {score.painPoints.slice(0, 3).map((point) => (
                      <li key={point} className="flex gap-2">
                        <span className="text-amber-500">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {score.recommendedOffer ? (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    What we offer
                  </h3>
                  <p className="text-sm leading-6 text-foreground">
                    {score.recommendedOffer}
                  </p>
                </div>
              ) : null}
            </div>

            <DraftBlock
              warmingComment={lead.content?.warmingComment ?? null}
              connectionNote={lead.content?.connectionNote ?? null}
            />
          </div>
        </CardContent>
      ) : null}

      <CardFooter className="flex flex-wrap items-center justify-between gap-4">
        <LeadActions leadId={lead.id} status={lead.status} compact />
        <div className="flex items-center gap-3">
          <a
            href={lead.linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            LinkedIn ↗
          </a>
          <Link
            href={`/leads/${lead.id}`}
            className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            View details →
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
