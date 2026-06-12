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
| SN ingestion | Playwright local runner (`packages/sn-scraper/`) |

## Architecture

| Runs on Vercel | Runs on your computer |
|----------------|----------------------|
| Dashboard, settings, history | `bun sn:sync --login` |
| Enrich, score, build batch | `bun sn:sync --all` |
| | (same `DATABASE_URL` as production) |

**Full walkthrough:** [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) (also at `/help` on your deployment).

## Deploy to Vercel

1. Import the repo in Vercel and connect Neon Postgres
2. Set environment variables in Vercel → Project → Settings:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini — scoring and AI drafts |
| `ENRICHMENT_API_KEY` | DataLayer or Apollo — company enrichment |

3. Deploy and open your production URL
4. Locally: `vercel env pull .env.local && bun db:push`

## Local sync (required for Sales Navigator)

```bash
vercel env pull .env.local
bun sn:sync --login          # once
bun sn:sync --all            # daily
```

Then on your **Vercel URL**: **Run cloud pipeline** (Enrich → Score → Build batch).

## Environment variables

See [`.env.example`](.env.example). Production vars live in **Vercel**; pull them locally for sync:

```bash
vercel env pull .env.local
```

## Scripts

```bash
bun dev              # Local Next.js (optional — use Vercel URL for daily work)
bun db:push          # Push Prisma schema
bun sn:sync --all    # Playwright SN sync (local only)
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
- **Rate limits** — hard cap on daily profile scrapes (local sync)
- **Session-based auth** — LinkedIn login is manual on your computer
- **Do-not-contact list** — blocklist in settings

> Scraping LinkedIn Sales Navigator may violate LinkedIn's Terms of Service. You assume all risk. Licensed under GPL v3 — see [LICENSE](LICENSE).
