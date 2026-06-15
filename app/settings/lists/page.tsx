import { connection } from "next/server";
import { PipelineActions } from "@/components/dashboard/pipeline-actions";
import { ListsForm } from "@/components/settings/lists-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Sync now</CardTitle>
          <CardDescription>
            Sync runs on your computer (Playwright + Chrome), writing leads to
            the same Neon database this Vercel app uses. See Settings → Safety
            or the setup guide for commands.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PipelineActions config={pipelineConfig} variant="sync-only" />
        </CardContent>
      </Card>
    </SettingsShell>
  );
}
