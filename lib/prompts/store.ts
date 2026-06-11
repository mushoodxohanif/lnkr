import { db } from "@/lib/db";
import {
  PROMPT_TEMPLATE_KEYS,
  type PromptTemplateData,
  type PromptTemplateKey,
} from "@/lib/prompts/types";

export {
  PROMPT_TEMPLATE_DESCRIPTIONS,
  PROMPT_TEMPLATE_KEYS,
  PROMPT_TEMPLATE_LABELS,
  type PromptTemplateData,
  type PromptTemplateKey,
} from "@/lib/prompts/types";

export async function getPromptTemplate(
  key: PromptTemplateKey,
): Promise<PromptTemplateData> {
  const record = await db.promptTemplate.findUnique({ where: { key } });

  return {
    key,
    instructions: record?.instructions ?? "",
    updatedAt: record?.updatedAt ?? null,
  };
}

export async function getAllPromptTemplates(): Promise<PromptTemplateData[]> {
  const records = await db.promptTemplate.findMany({
    where: { key: { in: [...PROMPT_TEMPLATE_KEYS] } },
  });

  const byKey = new Map(records.map((record) => [record.key, record]));

  return PROMPT_TEMPLATE_KEYS.map((key) => {
    const record = byKey.get(key);
    return {
      key,
      instructions: record?.instructions ?? "",
      updatedAt: record?.updatedAt ?? null,
    };
  });
}

export async function appendCustomInstructions(
  prompt: string,
  key: PromptTemplateKey,
): Promise<string> {
  const { instructions } = await getPromptTemplate(key);
  const trimmed = instructions.trim();

  if (!trimmed) {
    return prompt;
  }

  return `${prompt}\n\n## Custom instructions (from your settings)\n${trimmed}`;
}

export async function savePromptTemplate(
  key: PromptTemplateKey,
  instructions: string,
): Promise<void> {
  await db.promptTemplate.upsert({
    where: { key },
    create: { key, instructions },
    update: { instructions },
  });
}
