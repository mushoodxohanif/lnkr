import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "lnkr — LinkedIn outreach, draft-only",
  description:
    "Sync Sales Navigator leads, score against your ICP, and generate warming comments and connection notes for manual sending. No auto-posting. No auto-connecting.",
};

export default function HomePage() {
  return <LandingPage />;
}
