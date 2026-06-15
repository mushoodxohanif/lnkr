export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Errors where rule-only scoring is a reasonable fallback. */
export function isLlmFallbackError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("high demand") ||
    message.includes("rate limit") ||
    message.includes("resource exhausted") ||
    message.includes("overloaded") ||
    message.includes("429") ||
    message.includes("503") ||
    message.includes("try again") ||
    message.includes("did not match schema") ||
    message.includes("no object generated")
  );
}
