import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FitBadge } from "@/components/dashboard/fit-badge";
import { LeadActions } from "@/components/dashboard/lead-actions";
import { LeadNotesField } from "@/components/dashboard/lead-notes-field";
import { OutreachDrafts } from "@/components/dashboard/outreach-drafts";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getLeadDetail } from "@/lib/dashboard/queries";

type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDimensionLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  await connection();
  const { id } = await params;
  const lead = await getLeadDetail(id);

  if (!lead) {
    notFound();
  }

  const score = lead.score;
  const enrichment = lead.enrichment;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardContent className="pt-(--card-spacing)">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {lead.rank > 0 ? (
                    <span className="text-sm font-medium text-muted-foreground">
                      Rank #{lead.rank}
                    </span>
                  ) : null}
                  <StatusBadge status={lead.status} />
                </div>
                {lead.headline ? (
                  <p className="text-sm text-muted-foreground">
                    {lead.headline}
                  </p>
                ) : null}
                {lead.location ? (
                  <p className="text-sm text-muted-foreground">
                    {lead.location}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-3 pt-1">
                  <a
                    href={lead.linkedInUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary transition hover:text-primary/80"
                  >
                    Open LinkedIn profile ↗
                  </a>
                  {lead.snListSource ? (
                    <span className="text-sm text-muted-foreground">
                      Source: {lead.snListSource}
                    </span>
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

            <Separator className="my-6" />
            <LeadActions leadId={lead.id} status={lead.status} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Your notes</CardTitle>
            <CardDescription>
              Private notes for your team — not sent to LinkedIn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeadNotesField leadId={lead.id} initialNotes={lead.notes} />
          </CardContent>
        </Card>

        {score ? (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>ICP score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-5">
                  {score.fitReasons.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Fit reasons
                      </h3>
                      <ul className="space-y-2 text-sm text-foreground">
                        {score.fitReasons.map((reason) => (
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
                      <ul className="space-y-2 text-sm text-foreground">
                        {score.painPoints.map((point) => (
                          <li key={point} className="flex gap-2">
                            <span className="text-amber-500">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {score.disqualifiers.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Disqualifiers
                      </h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {score.disqualifiers.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="text-destructive">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {score.recommendedOffer ? (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Recommended offer
                      </h3>
                      <p className="text-sm leading-6 text-foreground">
                        {score.recommendedOffer}
                      </p>
                    </div>
                  ) : null}
                </div>

                {Object.keys(score.dimensionScores).length > 0 ? (
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Dimension breakdown
                    </h3>
                    <dl className="space-y-3">
                      {Object.entries(score.dimensionScores).map(
                        ([key, value]) => (
                          <div key={key} className="flex items-center gap-3">
                            <dt className="w-28 shrink-0 text-sm text-muted-foreground">
                              {formatDimensionLabel(key)}
                            </dt>
                            <dd className="flex flex-1 items-center gap-2">
                              <Progress
                                value={Math.min(100, Math.max(0, value))}
                                className="h-2 flex-1"
                              />
                              <span className="w-10 text-right text-sm tabular-nums text-foreground">
                                {Math.round(value)}
                              </span>
                            </dd>
                          </div>
                        ),
                      )}
                    </dl>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {enrichment ? (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Company enrichment</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                {enrichment.companyName ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Company
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {enrichment.companyName}
                    </dd>
                  </div>
                ) : null}
                {enrichment.domain ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Domain
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {enrichment.domain}
                    </dd>
                  </div>
                ) : null}
                {enrichment.employeeCount ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Employees
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {enrichment.employeeCount.toLocaleString()}
                    </dd>
                  </div>
                ) : null}
                {enrichment.industry ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Industry
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {enrichment.industry}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>
        ) : null}

        {lead.recentPosts.length > 0 ? (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Recent LinkedIn posts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {lead.recentPosts.map((post) => (
                  <li
                    key={post.text}
                    className="rounded-lg border border-border bg-muted/50 p-4"
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {post.text}
                    </p>
                    {post.postedAt ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {post.postedAt}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Outreach drafts</CardTitle>
            <CardDescription>
              Copy these manually — lnkr never posts or connects on your behalf.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OutreachDrafts
              leadId={lead.id}
              leadName={lead.name}
              warmingComment={lead.content?.warmingComment ?? null}
              connectionNote={lead.content?.connectionNote ?? null}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
