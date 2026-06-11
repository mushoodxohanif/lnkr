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
      description="Define your ideal customer profile. The scorer uses these rules plus AI evaluation to rank leads."
    >
      <ICPForm initialData={criteria} />
    </SettingsShell>
  );
}
