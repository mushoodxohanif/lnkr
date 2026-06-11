# lnkr

LinkedIn Sales Navigator outreach agent — draft-only, human-in-the-loop. Syncs leads from your SN saved lists, scores them against your ICP, and generates warming comments and connection notes for manual sending.

**No auto-posting. No auto-connecting. You copy and send.**

## Stack

| Layer | Technology |
|-------|------------|
| Runtime | [Bun](https://bun.sh) |
| App | [Next.js 16](https://nextjs.org) (App Router, Turbopack, Cache Components) |
| Lint / Format | [Biome](https://biomejs.dev) |
| Database | PostgreSQL via [Prisma](https://prisma.io) ([Neon](https://neon.tech) recommended) |
| AI | Google Gemini via Vercel AI SDK (`gemini-2.5-flash` / `gemini-2.5-pro`) |
| SN ingestion | Playwright local runner in `packages/sn-scraper/` |

## Prerequisites

- [Bun](https://bun.sh) 1.1+
- PostgreSQL database (local or [Neon](https://neon.tech))
- Google Gemini API key
- Company enrichment API key (DataLayer or Apollo) for scoring

## Quick start

```bash
bun install
cp .env.example .env   # fill in DATABASE_URL, API keys
bun db:push
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Daily workflow

```bash
# 1. Sync leads from Sales Navigator saved lists
bun sn:sync

# 2. Enrich company data
bun enrich:leads

# 3. Score leads against your ICP (rules + Gemini)
bun score:leads

# 4. Generate warming comments + connection notes
bun generate:content

# 5. Rank today's top 50 and generate drafts
bun daily:rank

# Or run the ranker on a schedule (7:00 AM in TIMEZONE)
bun daily:rank:cron
```

Then open the dashboard → review fit %, copy drafts, send manually on LinkedIn → mark sent/skip/snooze.

## Environment variables

See [`.env.example`](.env.example). Required:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `ENRICHMENT_API_KEY` | DataLayer or Apollo API key |

Optional:

| Variable | Description |
|----------|-------------|
| `ENRICHMENT_PROVIDER` | `datalayer` (default) or `apollo` |
| `APIFY_TOKEN` | Fallback SN scraper via Apify (`bun sn:sync:apify`) |
| `API_KEY` | Protects `/api/*` routes via `proxy.ts` |
| `DAILY_SCRAPE_LIMIT` | Max profiles per day (default: 50) |
| `TIMEZONE` | Timezone for daily batch cron |

## Scripts

```bash
bun dev              # Next.js dev server (Turbopack)
bun run build        # Production build
bun start            # Production server
bun lint             # Biome check
bun format           # Biome format
bun typecheck        # TypeScript
bun db:push          # Push Prisma schema
bun db:studio        # Prisma Studio
bun sn:sync          # Playwright SN list sync
bun sn:sync:apify    # Apify fallback sync
bun enrich:leads     # Company enrichment
bun score:leads      # Hybrid ICP scoring
bun generate:content # Gemini outreach drafts
bun daily:rank       # Top-50 ranker (one-shot)
bun daily:rank:cron  # Top-50 ranker (scheduled)
```

## App routes

| Route | Purpose |
|-------|---------|
| `/` | Today's top 50 — fit %, drafts, copy buttons |
| `/history` | Past daily batches and actioned progress |
| `/history/[date]` | View a specific batch |
| `/leads/[id]` | Full lead detail |
| `/settings/product` | SaaS value props and personas |
| `/settings/icp` | ICP criteria and weights |
| `/settings/lists` | SN saved list URLs |
| `/settings/prompts` | Custom Gemini prompt instructions |
| `/settings/safety` | Scrape limits, blocklist, audit log |

## Project structure

```
lnkr/
├── app/                    # Next.js dashboard
├── proxy.ts                # API key auth at network boundary
├── packages/sn-scraper/    # Playwright SN runner
├── lib/
│   ├── ai/                 # Gemini model config
│   ├── agent/              # Ranker, content generator
│   ├── enrichment/         # DataLayer / Apollo
│   ├── icp/                # Hybrid scorer
│   ├── prompts/            # Editable prompt templates
│   └── integrations/       # Apify
└── prisma/schema.prisma
```

## Safety and compliance

- **Draft-only** — zero auto-posting or auto-connecting
- **Rate limits** — hard cap on daily profile scrapes
- **Session-based auth** — LinkedIn login is manual, never automated
- **CAPTCHA detection** — scraper pauses and alerts
- **Do-not-contact list** — blocklist in settings
- **Audit log** — every scrape, score, and generation recorded

> Scraping LinkedIn Sales Navigator may violate LinkedIn's Terms of Service. You assume all risk. Licensed under GPL v3 — see [LICENSE](LICENSE).

## License

GPL v3 — see [LICENSE](LICENSE).
