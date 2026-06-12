import { connection } from "next/server";
import { ICPForm } from "@/components/settings/icp-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { getICPCriteria } from "@/lib/settings/actions";

export default async function ICPSettingsPage() {
  await connection();
  const criteria = await getICPCriteria();

  return (
    <SettingsShell
      title="ICP criteria"
      description="Define who makes it into today's batch. Start with target titles and fit threshold — see the setup guide for details."
    >
      <ICPForm initialData={criteria} />
    </SettingsShell>
  );
}
