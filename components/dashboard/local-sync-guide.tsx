import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SyncProvider } from "@/lib/runtime/deployment";
import {
  GITHUB_SESSION_COMMANDS,
  LOCAL_SYNC_COMMANDS,
} from "@/lib/runtime/deployment";

type LocalSyncGuideProps = {
  compact?: boolean;
  syncProvider: SyncProvider;
  sessionConfigured?: boolean;
};

export function GitHubSessionSetup() {
  return (
    <Card size="sm" className="bg-muted/50">
      <CardHeader>
        <CardTitle className="text-sm">
          Session setup (admin, one-time)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>
          GitHub Actions uses exported LinkedIn cookies — not a browser on
          Vercel. Re-export monthly or when sync fails with a login timeout.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            On your computer:{" "}
            <code className="rounded bg-background px-1 font-mono text-xs">
              {GITHUB_SESSION_COMMANDS.envPull}
            </code>
          </li>
          <li>
            Sign in once:{" "}
            <code className="rounded bg-background px-1 font-mono text-xs">
              {GITHUB_SESSION_COMMANDS.login}
            </code>
          </li>
          <li>
            Export cookies to GitHub Secrets:{" "}
            <code className="mt-1 block rounded bg-background px-2 py-1 font-mono text-xs">
              {GITHUB_SESSION_COMMANDS.setCookiesSecret}
            </code>
          </li>
          <li>{GITHUB_SESSION_COMMANDS.sessionFlag}</li>
        </ol>
      </CardContent>
    </Card>
  );
}

function GitHubSyncGuide({
  compact,
  sessionConfigured,
}: {
  compact: boolean;
  sessionConfigured?: boolean;
}) {
  if (compact) {
    return (
      <Alert className="border-primary/30 bg-primary/5 text-primary">
        <AlertDescription>
          Sync runs in GitHub Actions when you click{" "}
          <strong>Sync lists (GitHub)</strong> (~10–30 min). After it finishes,
          run <strong>Run cloud pipeline</strong> here.
          {!sessionConfigured ? (
            <>
              {" "}
              LinkedIn session cookies are not marked configured — complete{" "}
              <a
                href="/settings/safety"
                className="font-medium underline hover:text-foreground"
              >
                Session setup
              </a>{" "}
              in Settings → Safety.
            </>
          ) : null}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <AlertTitle>LinkedIn sync runs via GitHub Actions</AlertTitle>
      <AlertDescription>
        Click <strong>Sync lists (GitHub)</strong> on the dashboard to trigger
        the workflow. Scraping takes about 10–30 minutes. When it completes,
        return here and run <strong>Run cloud pipeline</strong> to enrich,
        score, and build today&apos;s batch.
      </AlertDescription>
      {!sessionConfigured ? (
        <Alert className="mt-3 border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertDescription>
            LinkedIn session is not configured yet. An admin must export cookies
            to GitHub Secrets — see Settings → Safety for steps.
          </AlertDescription>
        </Alert>
      ) : null}
    </Alert>
  );
}

function LocalCliSyncGuide({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <Alert>
        <AlertDescription>
          Sales Navigator sync runs on your computer, not on Vercel. Use{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            {LOCAL_SYNC_COMMANDS.sync}
          </code>{" "}
          locally with the same{" "}
          <code className="font-mono text-xs">DATABASE_URL</code> as production.
          See the{" "}
          <a
            href="/help#local-sync"
            className="font-medium text-primary underline hover:text-foreground"
          >
            setup guide
          </a>
          .
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <AlertTitle>LinkedIn sync runs on your computer</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          Vercel hosts the dashboard and AI pipeline. Playwright needs Chrome on
          your machine — pull production env vars, sign in once, then sync to
          the same Neon database your deployment uses.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            In this repo locally:{" "}
            <code className="rounded bg-background/80 px-1 font-mono text-xs">
              {LOCAL_SYNC_COMMANDS.envPull}
            </code>
          </li>
          <li>
            First time only:{" "}
            <code className="rounded bg-background/80 px-1 font-mono text-xs">
              {LOCAL_SYNC_COMMANDS.login}
            </code>
          </li>
          <li>
            Each sync:{" "}
            <code className="rounded bg-background/80 px-1 font-mono text-xs">
              {LOCAL_SYNC_COMMANDS.sync}
            </code>
          </li>
        </ol>
        <p className="text-xs">
          You can add Sales Navigator list URLs on Vercel without signing in —
          only the sync step needs a local LinkedIn session. Then return here
          and run <strong>Enrich</strong>, <strong>Score</strong>, and{" "}
          <strong>Build today&apos;s batch</strong> from the dashboard.
        </p>
        <p className="text-xs">
          Or configure GitHub Actions sync (
          <code className="font-mono">GITHUB_SYNC_TOKEN</code>,{" "}
          <code className="font-mono">GITHUB_REPO</code>) to sync from the
          dashboard without a local CLI.
        </p>
      </AlertDescription>
    </Alert>
  );
}

export function LocalSyncGuide({
  compact = false,
  syncProvider,
  sessionConfigured,
}: LocalSyncGuideProps) {
  if (syncProvider === "local") {
    return null;
  }

  if (syncProvider === "github") {
    return (
      <GitHubSyncGuide
        compact={compact}
        sessionConfigured={sessionConfigured}
      />
    );
  }

  return <LocalCliSyncGuide compact={compact} />;
}
