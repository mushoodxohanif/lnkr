import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | lnkr",
  description:
    "Configure your SaaS profile, ICP criteria, and Sales Navigator lists.",
};

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
