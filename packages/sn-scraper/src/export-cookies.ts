import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { closeBrowserContext, launchBrowser } from "./browser";
import { loadConfig } from "./config";

const packageRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
loadEnv({ path: resolve(packageRoot, "../../.env.local"), quiet: true });
loadEnv({ path: resolve(packageRoot, "../../.env"), quiet: true });

async function main(): Promise<void> {
  const config = loadConfig({ sessionMode: "profile" });
  const context = await launchBrowser(config);

  try {
    const cookies = await context.cookies();
    const linkedInCookies = cookies.filter((cookie) =>
      cookie.domain.includes("linkedin"),
    );

    if (!linkedInCookies.some((cookie) => cookie.name === "li_at")) {
      console.error(
        "No LinkedIn session found in the browser profile. Run `bun sn:sync --login` first.",
      );
      process.exit(1);
    }

    process.stdout.write(`${JSON.stringify(linkedInCookies)}\n`);
  } finally {
    await closeBrowserContext(context);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
