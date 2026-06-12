"use client";

import { useActionState } from "react";
import {
  Field,
  FormMessage,
  FormSection,
  SubmitButton,
  TextArea,
} from "@/components/settings/form-primitives";
import {
  PROMPT_TEMPLATE_DESCRIPTIONS,
  PROMPT_TEMPLATE_LABELS,
  type PromptTemplateData,
} from "@/lib/prompts/types";
import { savePromptTemplates } from "@/lib/settings/actions";

const initialState = { success: false, message: "" };

type PromptsFormProps = {
  templates: PromptTemplateData[];
};

export function PromptsForm({ templates }: PromptsFormProps) {
  const [state, formAction, pending] = useActionState(
    savePromptTemplates,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-8">
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
        <p className="font-medium">How these work</p>
        <p className="mt-1 text-violet-800/90">
          Custom instructions are <strong>appended</strong> to the base Gemini
          prompt — they steer tone and focus without replacing core rules. Edit
          the pre-filled examples to match your voice, or clear a field to use
          defaults only.
        </p>
      </div>

      {templates.map((template) => (
        <FormSection
          key={template.key}
          title={PROMPT_TEMPLATE_LABELS[template.key]}
          description={PROMPT_TEMPLATE_DESCRIPTIONS[template.key]}
        >
          <Field
            label="Custom instructions"
            hint="Appended to the base prompt. Pre-filled examples target fitness/wellness operators — customize or clear to reset."
          >
            <TextArea
              name={`instructions_${template.key}`}
              rows={6}
              defaultValue={template.instructions}
              placeholder="e.g. Keep comments under 2 sentences. Never mention our product name."
            />
          </Field>
          {template.updatedAt ? (
            <p className="text-xs text-zinc-400">
              Last updated {template.updatedAt.toLocaleString()}
            </p>
          ) : null}
        </FormSection>
      ))}

      <SubmitButton label="Save prompt templates" pending={pending} />
      <FormMessage state={state} />
    </form>
  );
}
