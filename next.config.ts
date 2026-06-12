import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Playwright is local-only; keep it out of the serverless bundle graph.
  serverExternalPackages: ["playwright", "playwright-core"],
  outputFileTracingIncludes: {
    "/help": ["./docs/GETTING_STARTED.md"],
  },
};

export default nextConfig;
