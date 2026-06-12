# lnkr

LinkedIn Sales Navigator outreach agent — draft-only, human-in-the-loop. Syncs leads from your SN saved lists, scores them against your ICP, and generates warming comments and connection notes for manual sending.

**No auto-posting. No auto-connecting. You copy and send.**

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | [Bun](https://bun.sh) |
| App | [Next.js 16](https://nextjs.org) on [Vercel](https://vercel.com) |
| Database | PostgreSQL via [Prisma](https://prisma.io) ([Neon](https://neon.tech)) |
| AI | Google Gemini via Vercel AI SDK |
| SN ingestion | Playwright — [GitHub Actions](.github/workflows/sn-sync.yml) or local runner (`packages/sn-scraper/`) |

## Architecture

| Runs on Vercel | Runs in GitHub Actions | Runs locally (optional) |
|----------------|------------------------|-------------------------|
| Dashboard, settings, history | `bun sn:sync --all` (scheduled + on-demand) | `bun sn:sync --login` / `--all` |
| Enrich, score, build batch | Playwright headless → same Neon DB | Same DB via `DATABASE_URL` |
| **Sync lists** button → triggers workflow | | Dev / fallback without GitHub setup |

**Full walkthrough:** [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) (also at `/help` on your deployment).

## Deploy to Vercel

1. Import the repo in Vercel and connect Neon Postgres
2. Set environment variables in Vercel → Project → Settings:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini — scoring and AI drafts |
| `ENRICHMENT_PROVIDER` | `profile` (default, free — uses scrape data) or `datalayer` / `apollo` |
| `ENRICHMENT_API_KEY` | Only for `datalayer` / `apollo` — not needed for `profile` |
| `GITHUB_SYNC_TOKEN` | Fine-grained PAT with **Actions: Read and write** |
| `GITHUB_REPO` | e.g. `your-org/lnkr` |
| `GITHUB_SYNC_SESSION_CONFIGURED` | Set to `true` after cookies are in GitHub Secrets |

Optional: `GITHUB_SYNC_WORKFLOW` (default `sn-sync.yml`), `GITHUB_SYNC_REF` (default `main`).

3. Add **GitHub Secrets** (repo → Settings → Secrets):

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Same Neon connection string as Vercel |
| `LINKEDIN_SESSION_COOKIES` | JSON from `bun sn:export-cookies` (see below) |

4. Deploy and open your production URL
5. Locally (one-time): `vercel env pull .env.local && bun db:push`

## LinkedIn sync

### GitHub Actions (recommended for the sales team)

One-time admin setup on your computer:

```bash
vercel env pull .env.local
bun sn:sync --login                              # sign in once
bun sn:export-cookies | gh secret set LINKEDIN_SESSION_COOKIES --repo owner/lnkr
```

Then on **Vercel**: click **Sync lists (GitHub)** → wait ~10–30 min → **Run cloud pipeline**.

The workflow also runs on a weekday schedule (default 11:00 UTC). Re-export cookies monthly or when sync fails with a login timeout.

### Local sync (dev or fallback)

```bash
vercel env pull .env.local
bun sn:sync --login          # once
bun sn:sync --all            # daily
```

Then on your **Vercel URL**: **Run cloud pipeline** (Enrich → Score → Build batch).

## Environment variables

See [`.env.example`](.env.example) (local + Vercel), [`.github/env.example`](.github/env.example) (GitHub Actions), and [`packages/sn-scraper/.env.example`](packages/sn-scraper/.env.example) (scraper reference).

```bash
vercel env pull .env.local   # local CLI / cookie export
```

## Scripts

```bash
bun dev              # Local Next.js (optional — use Vercel URL for daily work)
bun db:push          # Push Prisma schema
bun sn:sync --all    # Playwright SN sync (local or GitHub Actions)
bun sn:export-cookies  # Dump LinkedIn cookies for GitHub Secrets
bun enrich:leads     # Company enrichment (CLI alternative)
bun score:leads      # Hybrid ICP scoring
bun daily:rank       # Top-50 ranker + drafts
```

## App routes

| Route | Purpose |
|-------|---------|
| `/help` | Step-by-step setup guide |
| `/` | Today's top 50 — fit %, drafts, copy buttons |
| `/history` | Past daily batches |
| `/settings/*` | Product, ICP, lists, prompts, safety |

## Safety and compliance

- **Draft-only** — zero auto-posting or auto-connecting
- **Rate limits** — hard cap on daily profile scrapes (GitHub Actions or local sync)
- **Session-based auth** — LinkedIn login is manual; cookies exported to GitHub Secrets for CI
- **Do-not-contact list** — blocklist in settings

> Scraping LinkedIn Sales Navigator may violate LinkedIn's Terms of Service. You assume all risk. Licensed under GPL v3 — see [LICENSE](LICENSE).
