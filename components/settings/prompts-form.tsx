"use client";

import { useActionState } from "react";
import {
  Field,
  FormMessage,
  FormSection,
  SubmitButton,
  TextArea,
} from "@/components/settings/form-primitives";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
      <Alert className="border-primary/20 bg-primary/5">
        <AlertTitle>How these work</AlertTitle>
        <AlertDescription>
          Custom instructions are <strong>appended</strong> to the base Gemini
          prompt — they steer tone and focus without replacing core rules. Edit
          the pre-filled examples to match your voice, or clear a field to use
          defaults only.
        </AlertDescription>
      </Alert>

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
            <p className="text-xs text-muted-foreground">
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
