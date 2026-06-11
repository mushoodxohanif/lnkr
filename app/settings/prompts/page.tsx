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
      description="Add custom instructions appended to Gemini prompts for scoring and outreach copy."
    >
      <PromptsForm templates={templates} />
    </SettingsShell>
  );
}
