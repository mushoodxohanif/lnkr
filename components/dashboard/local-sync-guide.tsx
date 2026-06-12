import {
  canRunPlaywrightSync,
  LOCAL_SYNC_COMMANDS,
} from "@/lib/runtime/deployment";

type LocalSyncGuideProps = {
  compact?: boolean;
};

export function LocalSyncGuide({ compact = false }: LocalSyncGuideProps) {
  if (canRunPlaywrightSync()) {
    return null;
  }

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
        Then return here and run <strong>Enrich</strong>, <strong>Score</strong>
        , and <strong>Build today&apos;s batch</strong> from the dashboard.
      </p>
    </div>
  );
}
