/** Split pasted comma/newline blobs into separate tags and dedupe. */
export function normalizeTagList(tags: string[]): string[] {
  const result: string[] = [];

  for (const tag of tags) {
    const parts = tag.split(/[,\n]+/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) result.push(trimmed);
    }
  }

  return [...new Set(result)];
}
