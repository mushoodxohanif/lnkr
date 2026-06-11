import { connection } from "next/server";
import { SafetyForm } from "@/components/settings/safety-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { getPipelineConfig } from "@/lib/pipeline/status";
import {
  getActivityLogForSettings,
  getDoNotContactList,
  getSafetyStatus,
} from "@/lib/settings/actions";

export default async function SafetySettingsPage() {
  await connection();
  const [safety, blocklist, activityLog, pipelineConfig] = await Promise.all([
    getSafetyStatus(),
    getDoNotContactList(),
    getActivityLogForSettings(),
    getPipelineConfig(),
  ]);

  return (
    <SettingsShell
      title="Safety & audit"
      description="Scraper guardrails, do-not-contact list, and an audit trail of agent actions. Draft-only — nothing is sent automatically."
    >
      <SafetyForm
        safety={safety}
        blocklist={blocklist}
        activityLog={activityLog}
        pipelineConfig={pipelineConfig}
      />
    </SettingsShell>
  );
}
