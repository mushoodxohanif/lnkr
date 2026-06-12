# lnkr setup guide

This guide walks you from zero to a populated dashboard on your **Vercel deployment** — fit scores, AI drafts, and today's batch.

## How lnkr runs

| Part | Where it runs | What it does |
|------|----------------|--------------|
| **Dashboard & settings** | Vercel | Configure ICP, lists, prompts; review batches |
| **Enrich / score / batch** | Vercel | API calls to DataLayer + Gemini (same Neon DB) |
| **LinkedIn sync** | **GitHub Actions** (recommended) | Playwright headless; writes leads to the same Neon DB |
| **LinkedIn sync** | *Your computer* (optional) | Playwright + Chrome; same DB via `DATABASE_URL` |

Playwright cannot run on Vercel serverless. Configure everything on your deployed URL, sync leads via GitHub Actions (or locally), then run the **cloud pipeline** from the dashboard.

---

## What you need

| Requirement | Why |
|-------------|-----|
| [Vercel](https://vercel.com) project (Hobby/free is fine) | Hosts the dashboard and AI pipeline |
| PostgreSQL ([Neon](https://neon.tech) via Vercel Marketplace works) | Shared database for Vercel + sync |
| Google Gemini API key | Scores leads and writes connection notes |
| DataLayer or Apollo API key | Company enrichment for fit scoring |
| LinkedIn **Sales Navigator** | Saved lists are the lead source |
| GitHub repo with Actions enabled | Runs scheduled and on-demand SN sync |
| [Bun](https://bun.sh) + Chrome **on an admin Mac/PC** | One-time login + monthly cookie export — not daily |

---

## Step 1 — Deploy to Vercel

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com/new).
2. Add a **Neon Postgres** database (Vercel Marketplace → Neon) or paste an existing `DATABASE_URL`.
3. In **Vercel → Project → Settings → Environment Variables**, set:

| Variable | What it is |
|----------|------------|
| `DATABASE_URL` | Postgres connection string (auto-set if you use Neon integration) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/apikey) |
| `ENRICHMENT_PROVIDER` | Default `profile` — free, uses LinkedIn scrape data (no API key). Or `datalayer` / `apollo` with `ENRICHMENT_API_KEY` |
| `ENRICHMENT_API_KEY` | Only if using `datalayer` or `apollo` — omit for `profile` |
| `GITHUB_SYNC_TOKEN` | Fine-grained PAT: repo access + **Actions: Read and write** |
| `GITHUB_REPO` | e.g. `your-org/lnkr` |
| `GITHUB_SYNC_SESSION_CONFIGURED` | Set to `true` after Step 3 cookie export |

Optional: `GITHUB_SYNC_WORKFLOW` (default `sn-sync.yml`), `GITHUB_SYNC_REF` (branch for workflow dispatch; default `main`).

4. Deploy. Open your production URL (e.g. `https://your-app.vercel.app`).

5. **One-time schema push** (from your computer):

```bash
git clone <your-repo>
cd lnkr
bun install
vercel link
vercel env pull .env.local
bun db:push
```

---

## Step 2 — Configure on Vercel (in the browser)

Use your **deployed URL** for all settings — not localhost.

### Product profile (Settings → Product)

**Required:** product name and at least one value proposition.

| Field | What it does | Tip |
|-------|----------------|-----|
| **Product name** | Used in drafts and scoring | Your public product name |
| **Value propositions** | Outcomes you pitch (one tag per line) | 3–5 short tags, not a paragraph |
| **Target industries** | Industry fit when ICP industries are empty | e.g. `Gyms`, `Fitness` |
| **Target personas** | Title hints when ICP titles are empty | e.g. `Gym owner`, `Studio manager` |
| **Case studies** | Proof points for drafts | Example entries are pre-filled — replace with real wins |

Click **Save product profile**.

### ICP criteria (Settings → ICP)

| Field | Recommended start |
|-------|-------------------|
| **Target titles** | Match jobs in your SN list: `Owner`, `Founder`, `Director` |
| **Industries** | Leave empty to use Product → Target industries |
| **Minimum fit threshold (%)** | **45** — raise later when quality is consistent |

Advanced options (geo, exclusions, weights) are optional. See the in-app “Suggested advanced values” panel.

### Prompt templates (Settings → Prompts)

Pre-filled examples steer Gemini tone for fitness/wellness outreach. Edit or clear any field.

### Sales Navigator list (Settings → Lists)

1. In Sales Navigator, open a saved people list
2. Copy the URL (`https://www.linkedin.com/sales/lists/people/...`)
3. **Settings → Lists → Add list** — paste URL, enable sync, save

No LinkedIn sign-in is required on Vercel to save list URLs. Session setup happens in Step 3.

---

## Step 3 — GitHub Actions sync {#github-sync}

This is the recommended path: the sales team uses only the Vercel dashboard; sync runs in [`.github/workflows/sn-sync.yml`](../.github/workflows/sn-sync.yml).

### 3a — GitHub Secrets (admin, one-time)

In **GitHub → repo → Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|--------|-------|
| `DATABASE_URL` | Same Neon connection string as Vercel |
| `LINKEDIN_SESSION_COOKIES` | See cookie export below |

Export cookies from your computer (after a one-time LinkedIn login):

```bash
vercel env pull .env.local
bun sn:sync --login          # once — sign in to LinkedIn in Chrome
bun sn:export-cookies | gh secret set LINKEDIN_SESSION_COOKIES --repo owner/lnkr
```

Replace `owner/lnkr` with your `GITHUB_REPO`. Then set `GITHUB_SYNC_SESSION_CONFIGURED=true` on Vercel and redeploy.

**Session refresh** (monthly or when sync fails with login timeout):

```bash
vercel env pull .env.local
bun sn:sync --login
bun sn:export-cookies | gh secret set LINKEDIN_SESSION_COOKIES --repo owner/lnkr
```

Your local session is saved to `~/.lnkr/browser-profile`. No LinkedIn password goes in Vercel or GitHub env vars — only exported cookies in GitHub Secrets.

### 3b — Trigger sync

**From the dashboard:** click **Sync lists (GitHub)**. The workflow takes ~10–30 minutes. You get a link to the Actions run.

**Automatic:** weekdays at 11:00 UTC (~6:00 AM ET) by default. Edit the `cron` in `sn-sync.yml` to change the schedule.

**Manual (GitHub UI):** Actions → SN Sync → Run workflow. Optional `limit` input for testing.

**Manual (CLI):**

```bash
gh workflow run sn-sync.yml --repo owner/lnkr
gh workflow run sn-sync.yml --repo owner/lnkr -f limit=5   # test run
```

---

## Step 3 (alternative) — Local LinkedIn sync {#local-sync}

Use this for local development or if you skip GitHub Actions setup.

On your computer (same repo, same `DATABASE_URL` as Vercel):

```bash
vercel env pull .env.local   # same Neon DB as production
bun sn:sync --login          # once — sign in to LinkedIn in Chrome
bun sn:sync --all            # pull enabled lists into Neon
```

Test with a small run first:

```bash
bun sn:sync --all --limit 5
```

---

## Step 4 — Run the cloud pipeline on Vercel

Back on your **deployed dashboard**, run in order:

1. **Enrich leads** — company data from DataLayer
2. **Score leads** — hybrid rules + Gemini
3. **Build today's batch** — top leads + AI drafts

Or click **Run cloud pipeline** to chain all three.

**Success looks like:** lead cards with fit %, copy buttons, and drafts. **History** lists today's batch.

> **Vercel Hobby note:** Each button processes up to **10 leads per click** to stay within serverless time limits. Click again if you have more leads, or run `bun enrich:leads && bun score:leads && bun daily:rank` locally with `vercel env pull`.

---

## Step 5 — Daily workflow

### With GitHub Actions (typical)

1. Sync runs automatically on weekday mornings (or click **Sync lists (GitHub)** anytime).
2. On **your Vercel URL**: **Run cloud pipeline** after sync completes (~10–30 min).
3. Review drafts, copy, send manually on LinkedIn.
4. Mark sent / skip / snooze on the dashboard.

### With local sync

```bash
# On your computer (morning)
vercel env pull .env.local   # if vars changed
bun sn:sync --all
```

Then on **your Vercel URL**: **Run cloud pipeline** (or Enrich → Score → Build batch).

Optional — run the full pipeline locally instead of dashboard buttons:

```bash
bun enrich:leads
bun score:leads --force    # re-score existing leads
bun daily:rank --force
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Sync button disabled on Vercel | GitHub sync not configured | Set `GITHUB_SYNC_TOKEN`, `GITHUB_REPO`; add GitHub Secrets |
| Sync triggers but workflow fails | Missing or expired cookies | Re-export: `bun sn:export-cookies \| gh secret set LINKEDIN_SESSION_COOKIES` |
| "GitHub token invalid" | PAT lacks Actions write | Create fine-grained PAT with **Actions: Read and write** |
| Workflow not found | Wrong repo or workflow name | Check `GITHUB_REPO` and `GITHUB_SYNC_WORKFLOW` (default `sn-sync.yml`) |
| Sync button does nothing (no GitHub setup) | Local-only mode | Run `bun sn:sync --all` on your computer, or complete Step 3 |
| Sync: "No leads saved" | Session expired | Re-run login + cookie export (GitHub) or `bun sn:sync --login` (local) |
| Enrich/score fails on Vercel | Missing env vars | Check Vercel → Environment Variables; redeploy |
| Function timeout on Vercel Hobby | Batch too large | Click steps again (10 leads/run) or use local CLI |
| Score: all archived | Titles/threshold too strict | Lower fit threshold to **40–45**; match SN list titles |
| Batch empty | No QUALIFIED leads | Re-score after adjusting ICP |

---

## Advanced environment (optional)

### Vercel environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `GITHUB_SYNC_WORKFLOW` | `sn-sync.yml` | Workflow file to dispatch |
| `GITHUB_SYNC_REF` | `main` | Branch/ref for workflow dispatch |
| `GITHUB_SYNC_SESSION_CONFIGURED` | unset | Set `true` after cookies are in GitHub Secrets |
| `DAILY_SCRAPE_LIMIT` | `50` | Max profiles scraped per sync run |
| `SCRAPE_MIN_DELAY_MS` / `SCRAPE_MAX_DELAY_MS` | `4000` / `10000` | Delay between profile visits |
| `MAX_POSTS_PER_PROFILE` | `5` | Recent posts read per profile |
| `TIMEZONE` | `America/New_York` | Daily batch date boundary |
| `ENRICHMENT_PROVIDER` | `profile` | `profile` = free scrape data; `datalayer` or `apollo` need `ENRICHMENT_API_KEY` |
| `API_KEY` | unset | Protects `/api/*` routes |

For GitHub Actions, mirror scraper tuning vars as **repo Variables** (Settings → Secrets and variables → Actions → Variables): `DAILY_SCRAPE_LIMIT`, `SCRAPE_MIN_DELAY_MS`, `SCRAPE_MAX_DELAY_MS`, `MAX_POSTS_PER_PROFILE`.

### Local-only

| Variable | Default | Purpose |
|----------|---------|---------|
| `BROWSER_PROFILE_DIR` | `~/.lnkr/browser-profile` | Local Chrome profile path |
| `SCRAPE_HEADLESS` | `false` | Set `true` for headless local runs |

See [`.env.example`](../.env.example) for a full commented template.

---

## Safety reminder

lnkr is **draft-only** — nothing is posted or connected automatically. Scraping Sales Navigator may violate LinkedIn's Terms of Service; use at your own risk with conservative daily limits. GitHub Actions runners use datacenter IPs — keep `DAILY_SCRAPE_LIMIT` conservative and re-export session cookies if LinkedIn shows checkpoints.
