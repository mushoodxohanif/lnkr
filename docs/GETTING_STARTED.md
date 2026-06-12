# lnkr setup guide

This guide walks you from zero to a populated dashboard on your **Vercel deployment** — fit scores, AI drafts, and today's batch.

## How lnkr runs

| Part | Where it runs | What it does |
|------|----------------|--------------|
| **Dashboard & settings** | Vercel | Configure ICP, lists, prompts; review batches |
| **Enrich / score / batch** | Vercel | API calls to DataLayer + Gemini (same Neon DB) |
| **LinkedIn sync** | **Your computer** | Playwright + Chrome; writes leads to the same Neon DB |

Playwright cannot run on Vercel serverless. You configure everything on your deployed URL, sync leads locally, then run the **cloud pipeline** from the dashboard.

---

## What you need

| Requirement | Why |
|-------------|-----|
| [Vercel](https://vercel.com) project (Hobby/free is fine) | Hosts the dashboard and AI pipeline |
| PostgreSQL ([Neon](https://neon.tech) via Vercel Marketplace works) | Shared database for Vercel + local sync |
| Google Gemini API key | Scores leads and writes connection notes |
| DataLayer or Apollo API key | Company enrichment for fit scoring |
| LinkedIn **Sales Navigator** | Saved lists are the lead source |
| [Bun](https://bun.sh) + Chrome **on your Mac/PC** | Local sync only — not on Vercel |

---

## Step 1 — Deploy to Vercel

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com/new).
2. Add a **Neon Postgres** database (Vercel Marketplace → Neon) or paste an existing `DATABASE_URL`.
3. In **Vercel → Project → Settings → Environment Variables**, set:

| Variable | What it is |
|----------|------------|
| `DATABASE_URL` | Postgres connection string (auto-set if you use Neon integration) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/apikey) |
| `ENRICHMENT_API_KEY` | From [DataLayer](https://datalayer.sh) or Apollo |

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

---

## Step 3 — Local LinkedIn sync {#local-sync}

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

Your session is saved to `~/.lnkr/browser-profile`. No LinkedIn password goes in Vercel env vars.

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

```bash
# On your computer (morning)
vercel env pull .env.local   # if vars changed
bun sn:sync --all
```

Then on **your Vercel URL**:

1. **Run cloud pipeline** (or Enrich → Score → Build batch)
2. Review drafts, copy, send manually on LinkedIn
3. Mark sent / skip / snooze on the dashboard

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
| Sync button does nothing / error on Vercel | Sync is local-only | Run `bun sn:sync --all` on your computer |
| Sync: "No leads saved" | Not signed in locally | `bun sn:sync --login` then sync again |
| Enrich/score fails on Vercel | Missing env vars | Check Vercel → Environment Variables; redeploy |
| Function timeout on Vercel Hobby | Batch too large | Click steps again (10 leads/run) or use local CLI |
| Score: all archived | Titles/threshold too strict | Lower fit threshold to **40–45**; match SN list titles |
| Batch empty | No QUALIFIED leads | Re-score after adjusting ICP |

---

## Advanced environment (optional)

Set in **Vercel → Environment Variables** (and in `.env.local` for local sync):

| Variable | Default | Purpose |
|----------|---------|---------|
| `DAILY_SCRAPE_LIMIT` | `50` | Max profiles scraped per day (local sync) |
| `SCRAPE_MIN_DELAY_MS` / `SCRAPE_MAX_DELAY_MS` | `4000` / `10000` | Delay between profile visits |
| `MAX_POSTS_PER_PROFILE` | `5` | Recent posts read per profile |
| `TIMEZONE` | `America/New_York` | Daily batch date boundary |
| `ENRICHMENT_PROVIDER` | `datalayer` | Switch to `apollo` if needed |
| `API_KEY` | unset | Protects `/api/*` routes |
| `BROWSER_PROFILE_DIR` | `~/.lnkr/browser-profile` | Local Chrome profile path |

---

## Safety reminder

lnkr is **draft-only** — nothing is posted or connected automatically. Scraping Sales Navigator may violate LinkedIn's Terms of Service; use at your own risk with conservative daily limits.
