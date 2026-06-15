import { generateObject } from "ai";
import { flashModel } from "@/lib/ai/models";
import { buildScoringPrompt } from "@/lib/icp/prompts";
import { type LeadScoreLLMOutput, leadScoreSchema } from "@/lib/icp/schema";
import type { ScoringContext } from "@/lib/icp/types";
import { appendCustomInstructions } from "@/lib/prompts/store";

export async function evaluateLeadWithLLM(
  context: ScoringContext,
): Promise<LeadScoreLLMOutput> {
  const prompt = await appendCustomInstructions(
    buildScoringPrompt(context),
    "icp_scoring",
  );

  const { object } = await generateObject({
    model: flashModel,
    schema: leadScoreSchema,
    prompt,
    maxRetries: 5,
  });

  return object;
}
