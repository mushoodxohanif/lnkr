import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DraftBlock } from "@/components/dashboard/draft-block";
import { FitBadge } from "@/components/dashboard/fit-badge";
import { LeadActions } from "@/components/dashboard/lead-actions";
import { LeadNotesField } from "@/components/dashboard/lead-notes-field";
import { StatusBadge } from "@/components/dashboard/status-badge";
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
    <DashboardShell
      title={lead.name}
      description={[lead.title, lead.company].filter(Boolean).join(" at ")}
      headerExtra={
        <Link
          href="/leads"
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          ← All leads
        </Link>
      }
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {lead.rank > 0 ? (
                  <span className="text-sm font-medium text-zinc-400">
                    Rank #{lead.rank}
                  </span>
                ) : null}
                <StatusBadge status={lead.status} />
              </div>
              {lead.headline ? (
                <p className="text-sm text-zinc-600">{lead.headline}</p>
              ) : null}
              {lead.location ? (
                <p className="text-sm text-zinc-500">{lead.location}</p>
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href={lead.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-violet-600 transition hover:text-violet-800"
                >
                  Open LinkedIn profile ↗
                </a>
                {lead.snListSource ? (
                  <span className="text-sm text-zinc-400">
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

          <div className="mt-6 border-t border-zinc-100 pt-6">
            <LeadActions leadId={lead.id} status={lead.status} />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Your notes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Private notes for your team — not sent to LinkedIn.
          </p>
          <div className="mt-4">
            <LeadNotesField leadId={lead.id} initialNotes={lead.notes} />
          </div>
        </section>

        {score ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900">ICP score</h2>
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                {score.fitReasons.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Fit reasons
                    </h3>
                    <ul className="space-y-2 text-sm text-zinc-700">
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
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Pain points
                    </h3>
                    <ul className="space-y-2 text-sm text-zinc-700">
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
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Disqualifiers
                    </h3>
                    <ul className="space-y-2 text-sm text-zinc-600">
                      {score.disqualifiers.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="text-red-400">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {score.recommendedOffer ? (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Recommended offer
                    </h3>
                    <p className="text-sm leading-6 text-zinc-700">
                      {score.recommendedOffer}
                    </p>
                  </div>
                ) : null}
              </div>

              {Object.keys(score.dimensionScores).length > 0 ? (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Dimension breakdown
                  </h3>
                  <dl className="space-y-3">
                    {Object.entries(score.dimensionScores).map(
                      ([key, value]) => (
                        <div key={key} className="flex items-center gap-3">
                          <dt className="w-28 shrink-0 text-sm text-zinc-600">
                            {formatDimensionLabel(key)}
                          </dt>
                          <dd className="flex flex-1 items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{
                                  width: `${Math.min(100, Math.max(0, value))}%`,
                                }}
                              />
                            </div>
                            <span className="w-10 text-right text-sm tabular-nums text-zinc-700">
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
          </section>
        ) : null}

        {enrichment ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900">
              Company enrichment
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {enrichment.companyName ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Company
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-800">
                    {enrichment.companyName}
                  </dd>
                </div>
              ) : null}
              {enrichment.domain ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Domain
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-800">
                    {enrichment.domain}
                  </dd>
                </div>
              ) : null}
              {enrichment.employeeCount ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Employees
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-800">
                    {enrichment.employeeCount.toLocaleString()}
                  </dd>
                </div>
              ) : null}
              {enrichment.industry ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Industry
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-800">
                    {enrichment.industry}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {lead.recentPosts.length > 0 ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900">
              Recent LinkedIn posts
            </h2>
            <ul className="mt-4 space-y-4">
              {lead.recentPosts.map((post) => (
                <li
                  key={post.text}
                  className="rounded-lg border border-zinc-100 bg-zinc-50 p-4"
                >
                  <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-800">
                    {post.text}
                  </p>
                  {post.postedAt ? (
                    <p className="mt-2 text-xs text-zinc-400">
                      {post.postedAt}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            Outreach drafts
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Copy these manually — lnkr never posts or connects on your behalf.
          </p>
          <div className="mt-5">
            <DraftBlock
              warmingComment={lead.content?.warmingComment ?? null}
              connectionNote={lead.content?.connectionNote ?? null}
            />
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
