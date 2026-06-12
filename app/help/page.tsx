import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
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
    <div className="min-h-dvh bg-background">
      <AppHeader containerClass="max-w-3xl" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <MarkdownContent content={content} />
      </main>
    </div>
  );
}
