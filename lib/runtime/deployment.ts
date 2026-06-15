import { DAILY_BATCH_SIZE } from "@/lib/agent/config";
import { isGitHubSyncConfigured } from "@/lib/github/trigger-sync";

export type DeploymentPlatform = "vercel" | "local";

export type SyncProvider = "local" | "github" | "none";

export { isGitHubSyncConfigured };

export function getDeploymentPlatform(): DeploymentPlatform {
  if (isVercelDeployment()) {
    return "vercel";
  }
  return "local";
}

export function isVercelDeployment(): boolean {
  return (
    process.env.VERCEL === "1" ||
    typeof process.env.VERCEL_ENV === "string" ||
    typeof process.env.VERCEL_URL === "string"
  );
}

/** Playwright needs a local Chrome profile — unavailable on Vercel serverless. */
export function canRunPlaywrightSync(): boolean {
  return !isVercelDeployment();
}

export function getSyncProvider(): SyncProvider {
  if (canRunPlaywrightSync()) {
    return "local";
  }
  if (isGitHubSyncConfigured()) {
    return "github";
  }
  return "none";
}

/** Admin-set flag after LINKEDIN_SESSION_COOKIES is stored in GitHub Secrets. */
export function isGitHubSessionConfigured(): boolean {
  return process.env.GITHUB_SYNC_SESSION_CONFIGURED === "true";
}

/** Smaller batches on Vercel to stay within Hobby function time limits. */
export function getPipelineBatchLimit(): number {
  return isVercelDeployment() ? 10 : DAILY_BATCH_SIZE;
}

export function envConfigHint(): string {
  return isVercelDeployment()
    ? "Add the key under Vercel → Project → Settings → Environment Variables."
    : "Add the key to .env (or pull from Vercel with `vercel env pull`).";
}

export const LOCAL_SYNC_COMMANDS = {
  envPull: "vercel env pull .env.local",
  login: "bun sn:sync --login",
  sync: "bun sn:sync --all",
  syncTest: "bun sn:sync --all --limit 5",
} as const;

/** One-time admin setup: export LinkedIn cookies into GitHub Secrets for CI sync. */
export const GITHUB_SESSION_COMMANDS = {
  envPull: LOCAL_SYNC_COMMANDS.envPull,
  login: LOCAL_SYNC_COMMANDS.login,
  exportCookies: "bun sn:export-cookies",
  setCookiesSecret:
    "bun sn:export-cookies | gh secret set LINKEDIN_SESSION_COOKIES --repo owner/lnkr",
  sessionFlag:
    "Set GITHUB_SYNC_SESSION_CONFIGURED=true on Vercel after cookies are stored.",
} as const;
