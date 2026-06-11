export const PROMPT_TEMPLATE_KEYS = [
  "warming_comment",
  "connection_note",
  "icp_scoring",
] as const;

export type PromptTemplateKey = (typeof PROMPT_TEMPLATE_KEYS)[number];

export const PROMPT_TEMPLATE_LABELS: Record<PromptTemplateKey, string> = {
  warming_comment: "Warming comment",
  connection_note: "Connection note",
  icp_scoring: "ICP scoring",
};

export const PROMPT_TEMPLATE_DESCRIPTIONS: Record<PromptTemplateKey, string> = {
  warming_comment:
    "Extra instructions appended when generating LinkedIn post comments.",
  connection_note:
    "Extra instructions appended when generating connection request notes.",
  icp_scoring:
    "Extra instructions appended when evaluating ICP fit with Gemini.",
};

export type PromptTemplateData = {
  key: PromptTemplateKey;
  instructions: string;
  updatedAt: Date | null;
};
