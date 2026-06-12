import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { MarkdownContent } from "@/components/markdown-content";

export const metadata: Metadata = {
  title: "Setup guide | lnkr",
  description: "Step-by-step guide to configure lnkr and run your first batch.",
};

export default async function HelpPage() {
  const path = join(process.cwd(), "docs/GETTING_STARTED.md");
  const content = await readFile(path, "utf8");

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-zinc-900">
            lnkr
          </Link>
          <Link
            href="/settings/product"
            className="text-sm font-medium text-violet-700 hover:text-violet-900"
          >
            Go to settings →
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <MarkdownContent content={content} />
      </main>
    </div>
  );
}
