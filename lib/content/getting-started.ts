import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const docPath = join(process.cwd(), "docs/GETTING_STARTED.md");

export async function getGettingStartedMarkdown(): Promise<string> {
  return readFile(docPath, "utf8");
}
