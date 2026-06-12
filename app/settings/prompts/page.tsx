import { connection } from "next/server";
import { PromptsForm } from "@/components/settings/prompts-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { getAllPromptTemplates } from "@/lib/prompts/store";

export default async function PromptsSettingsPage() {
  await connection();
  const templates = await getAllPromptTemplates();

  return (
    <SettingsShell
      title="Prompt templates"
      description="Optional tone and focus rules appended to Gemini. Pre-filled examples match your fitness/gym setup."
    >
      <PromptsForm templates={templates} />
    </SettingsShell>
  );
}
