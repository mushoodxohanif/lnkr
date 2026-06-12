import { connection } from "next/server";
import { PipelineActions } from "@/components/dashboard/pipeline-actions";
import { ListsForm } from "@/components/settings/lists-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { getPipelineConfig } from "@/lib/pipeline/status";
import { getSnLists } from "@/lib/settings/actions";

export default async function ListsSettingsPage() {
  await connection();
  const [lists, pipelineConfig] = await Promise.all([
    getSnLists(),
    getPipelineConfig(),
  ]);

  return (
    <SettingsShell
      title="Sales Navigator lists"
      description="Add saved SN list URLs on Vercel, then sync from your computer with the same database."
    >
      <ListsForm lists={lists} />
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-zinc-900">Sync now</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Sync runs on your computer (Playwright + Chrome), writing leads to
            the same Neon database this Vercel app uses. See Settings → Safety
            or the setup guide for commands.
          </p>
        </div>
        <PipelineActions config={pipelineConfig} variant="sync-only" />
      </section>
    </SettingsShell>
  );
}
