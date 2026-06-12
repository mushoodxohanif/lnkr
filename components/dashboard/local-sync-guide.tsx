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
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
      <p className="font-medium text-zinc-900">
        Session setup (admin, one-time)
      </p>
      <p>
        GitHub Actions uses exported LinkedIn cookies — not a browser on Vercel.
        Re-export monthly or when sync fails with a login timeout.
      </p>
      <ol className="list-decimal space-y-2 pl-5">
        <li>
          On your computer:{" "}
          <code className="rounded bg-white px-1 font-mono text-xs">
            {GITHUB_SESSION_COMMANDS.envPull}
          </code>
        </li>
        <li>
          Sign in once:{" "}
          <code className="rounded bg-white px-1 font-mono text-xs">
            {GITHUB_SESSION_COMMANDS.login}
          </code>
        </li>
        <li>
          Export cookies to GitHub Secrets:{" "}
          <code className="block mt-1 rounded bg-white px-2 py-1 font-mono text-xs">
            {GITHUB_SESSION_COMMANDS.setCookiesSecret}
          </code>
        </li>
        <li>{GITHUB_SESSION_COMMANDS.sessionFlag}</li>
      </ol>
    </div>
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
      <p className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
        Sync runs in GitHub Actions when you click{" "}
        <strong>Sync lists (GitHub)</strong> (~10–30 min). After it finishes,
        run <strong>Run cloud pipeline</strong> here.
        {!sessionConfigured ? (
          <>
            {" "}
            LinkedIn session cookies are not marked configured — complete{" "}
            <a
              href="/settings/safety"
              className="font-medium text-violet-700 hover:underline"
            >
              Session setup
            </a>{" "}
            in Settings → Safety.
          </>
        ) : null}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
      <p className="font-medium">LinkedIn sync runs via GitHub Actions</p>
      <p className="mt-1 text-violet-900/90">
        Click <strong>Sync lists (GitHub)</strong> on the dashboard to trigger
        the workflow. Scraping takes about 10–30 minutes. When it completes,
        return here and run <strong>Run cloud pipeline</strong> to enrich,
        score, and build today&apos;s batch.
      </p>
      {!sessionConfigured ? (
        <p className="mt-3 rounded-lg bg-amber-100/80 px-3 py-2 text-amber-950">
          LinkedIn session is not configured yet. An admin must export cookies
          to GitHub Secrets — see Settings → Safety for steps.
        </p>
      ) : null}
    </div>
  );
}

function LocalCliSyncGuide({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
        Sales Navigator sync runs on your computer, not on Vercel. Use{" "}
        <code className="rounded bg-white px-1 font-mono text-xs">
          {LOCAL_SYNC_COMMANDS.sync}
        </code>{" "}
        locally with the same{" "}
        <code className="font-mono text-xs">DATABASE_URL</code> as production.
        See the{" "}
        <a
          href="/help#local-sync"
          className="font-medium text-violet-700 hover:underline"
        >
          setup guide
        </a>
        .
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">LinkedIn sync runs on your computer</p>
      <p className="mt-1 text-amber-900/90">
        Vercel hosts the dashboard and AI pipeline. Playwright needs Chrome on
        your machine — pull production env vars, sign in once, then sync to the
        same Neon database your deployment uses.
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-amber-900/90">
        <li>
          In this repo locally:{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-xs">
            {LOCAL_SYNC_COMMANDS.envPull}
          </code>
        </li>
        <li>
          First time only:{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-xs">
            {LOCAL_SYNC_COMMANDS.login}
          </code>
        </li>
        <li>
          Each sync:{" "}
          <code className="rounded bg-white/80 px-1 font-mono text-xs">
            {LOCAL_SYNC_COMMANDS.sync}
          </code>
        </li>
      </ol>
      <p className="mt-3 text-xs text-amber-800">
        You can add Sales Navigator list URLs on Vercel without signing in —
        only the sync step needs a local LinkedIn session. Then return here and
        run <strong>Enrich</strong>, <strong>Score</strong>, and{" "}
        <strong>Build today&apos;s batch</strong> from the dashboard.
      </p>
      <p className="mt-2 text-xs text-amber-800">
        Or configure GitHub Actions sync (
        <code className="font-mono">GITHUB_SYNC_TOKEN</code>,{" "}
        <code className="font-mono">GITHUB_REPO</code>) to sync from the
        dashboard without a local CLI.
      </p>
    </div>
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
