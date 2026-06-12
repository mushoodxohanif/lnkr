import {
  ArrowRightIcon,
  ClipboardCopyIcon,
  ListFilterIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";

import { ModeToggle } from "@/components/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    icon: ListFilterIcon,
    title: "ICP scoring",
    description:
      "Sync leads from Sales Navigator saved lists and score each profile against your ideal customer profile with Gemini.",
  },
  {
    icon: SparklesIcon,
    title: "AI drafts",
    description:
      "Generate warming comments and connection notes tailored to each lead — ready to copy, never auto-sent.",
  },
  {
    icon: UsersIcon,
    title: "Daily top 50",
    description:
      "Every weekday batch surfaces your highest-fit prospects so you focus outreach where it matters most.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Safety built in",
    description:
      "Hard caps on daily profile scrapes, a do-not-contact blocklist, and session-based LinkedIn auth.",
  },
];

const steps = [
  {
    step: "1",
    title: "Configure",
    description:
      "Set your product, ICP, saved lists, prompts, and safety rules in settings.",
  },
  {
    step: "2",
    title: "Sync leads",
    description:
      "Pull profiles from Sales Navigator via GitHub Actions or a local Playwright runner.",
  },
  {
    step: "3",
    title: "Run pipeline",
    description:
      "Enrich company data, score against your ICP, and build today's ranked batch.",
  },
  {
    step: "4",
    title: "Copy & send",
    description:
      "Review fit scores and drafts on the dashboard, then paste into LinkedIn yourself.",
  },
];

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            lnkr
          </Link>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/help">Docs</Link>
            </Button>
            <ModeToggle />
            <Button size="sm" asChild>
              <Link href="/today">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-6">
              Draft-only · Human-in-the-loop
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              LinkedIn outreach, scored and drafted — never automated
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              lnkr syncs leads from Sales Navigator, scores them against your
              ICP, and generates warming comments and connection notes for
              manual sending.
            </p>
            <p className="mt-4 text-sm font-medium text-foreground">
              No auto-posting. No auto-connecting. You copy and send.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/today">
                  Open dashboard
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/help">Read setup guide</Link>
              </Button>
            </div>
          </div>
        </section>

        <Separator />

        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Everything you need for daily outreach
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built for sales teams who want AI-assisted drafts without losing
              control of every message.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="size-4" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-muted/40">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                How it works
              </h2>
              <p className="mt-3 text-muted-foreground">
                From zero to a populated dashboard in four steps.
              </p>
            </div>
            <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((item) => (
                <li key={item.step}>
                  <Card size="sm" className="h-full">
                    <CardHeader>
                      <Badge variant="outline" className="w-fit">
                        Step {item.step}
                      </Badge>
                      <CardTitle className="mt-3">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <Card>
            <CardContent className="flex flex-col items-center gap-6 py-10 text-center sm:flex-row sm:text-left">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ClipboardCopyIcon className="size-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">
                  Ready to review your first batch?
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Deploy to Vercel, sync your Sales Navigator lists, and open
                  today&apos;s top 50 when the pipeline finishes.
                </p>
              </div>
              <Button asChild>
                <Link href="/today">
                  Go to dashboard
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-muted-foreground">
          <p>lnkr — GPL v3. Use at your own risk.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/help"
              className="transition-colors hover:text-foreground"
            >
              Setup guide
            </Link>
            <Link
              href="/settings/product"
              className="transition-colors hover:text-foreground"
            >
              Settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
