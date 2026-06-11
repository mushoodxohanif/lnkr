export const RULE_SCORE_WEIGHT = 0.6;
export const LLM_SCORE_WEIGHT = 0.4;

export function isScoringConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
}
