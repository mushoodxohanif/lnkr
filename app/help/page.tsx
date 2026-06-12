import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/components/markdown-content";
import { getGettingStartedMarkdown } from "@/lib/content/getting-started";

export const metadata: Metadata = {
  title: "Setup guide | lnkr",
  description: "Step-by-step guide to configure lnkr and run your first batch.",
};

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  let content: string;
  try {
    content = await getGettingStartedMarkdown();
  } catch {
    notFound();
  }

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
