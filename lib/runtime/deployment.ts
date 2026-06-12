export type DeploymentPlatform = "vercel" | "local";

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

/** Smaller batches on Vercel to stay within Hobby function time limits. */
export function getPipelineBatchLimit(): number {
  return isVercelDeployment() ? 10 : 50;
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
