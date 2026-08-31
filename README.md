# Songket (សង្កេត) — Telegram Security Bot & Mini App

Songket is a bilingual (Khmer + English) Telegram security platform that
protects groups and private chats from malicious links, phishing scams, and
infected files. It scans content with VirusTotal, automatically removes
confirmed threats, warns on suspicious content, enforces a graduated strike
system, and gives administrators a daily security dashboard via a Telegram
Mini App.

> **Brand signature:** 🤖 Songket Security Team | ក្រុមការងារសង្កេត

---

## Table of Contents

1. [Architecture](#architecture)
2. [Features](#features)
3. [How Scanning Works](#how-scanning-works)
4. [Prerequisites](#prerequisites)
5. [Configuration](#configuration)
6. [Run Locally with Docker](#run-locally-with-docker)
7. [Deploy to Railway](#deploy-to-railway)
8. [Deploy the Mini App to Vercel](#deploy-the-mini-app-to-vercel)
9. [Commands](#commands)
10. [Plans & Quotas](#plans--quotas)
11. [Project Structure](#project-structure)

---

## Architecture

Two independent components share one Upstash Redis database:

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│  Bot daemon (long-polling)   │        │  Mini App (static + API)     │
│  Docker / Railway            │        │  Vercel                      │
│  - Telegram Bot API server   │   ┌──▶ │  - React dashboard           │
│  - Python security bot       │   │    │  - /api/dashboard            │
└──────────────┬───────────────┘   │    └──────────────┬───────────────┘
               │  writes reports   │                   │ reads reports
               ▼                   │                   ▼
        ┌──────────────────────────┴──────────────────────────┐
        │                  Upstash Redis                      │
        └─────────────────────────────────────────────────────┘
```

1. **The bot** (`bot/` + `telegram-bot-api/`) runs continuously and long-polls
   Telegram for updates. It never needs a public URL. A self-hosted
   `telegram-bot-api` server removes the 20 MB file-download cap imposed by
   `api.telegram.org`.
2. **The Mini App** (`miniapp/` + `api/`) is a static dashboard plus one
   serverless function on Vercel. It needs a public HTTPS URL so Telegram can
   open it as a `web_app` button.

Both read and write the same Upstash Redis: the bot stores scan reports and
settings, and the Vercel API reads them back for the dashboard.

---

## Features

- **Link & file scanning** via VirusTotal, with Redis-backed caching.
- **Automatic threat removal** — confirmed threats are deleted immediately.
- **Suspicious warnings** — with an engine-consensus breakdown
  (`Safe / Suspicious / Undetected` percentages + raw counts).
- **Engine consensus** for suspicious verdicts: public groups see the
  percentage, admins see the full breakdown.
- **Link destination preview** — resolves redirect chains so members see the
  real domain behind short links before clicking.
- **Graduated strike system** — 3 strikes mute 1h, 5 mute 8h, 10 mute 24h.
- **Trust & reputation** — per-user badge (🟢 Verified / 🟡 New / 🔴 Flagged)
  driven by strikes, account age, and group-join age.
- **New-member verification gate** — optional per-group restriction of new
  joiners until they verify (button / admin approval).
- **Group-isolated whitelist** — approve a false positive in one group without
  affecting others.
- **Personal scanning** — users can DM the bot links/files for private scans.
- **Bilingual** — Khmer, English, or both, configurable per group.
- **Daily dashboard** — per-group scan statistics in the Mini App.

---

## How Scanning Works

- **URLs** are extracted from message text/captions. Known-safe domains are
  skipped; shorteners, suspicious TLDs, and raw IPs are always scanned.
  A hybrid lookup reuses VirusTotal's last verdict when it is fresh (≤ 30 min)
  before submitting a fresh scan.
- **Files** are pre-filtered: high-risk extensions (`.exe`, `.js`, `.apk`,
  archives, macro Office docs, etc.) are always scanned; common safe media is
  skipped unless its raw bytes look like an executable/archive. Files over
  `MAX_FILE_SIZE_MB` are never downloaded — the bot posts a safety warning.
- **Caching** — URL verdicts are cached 1 hour, file verdicts 24 hours
  (keyed by SHA-256). Re-scanning the same target within the window is free.
- **Rate limiting** — every VirusTotal call is throttled
  (`VT_MIN_INTERVAL_SECONDS`) and 429 responses are retried with
  `Retry-After`/backoff, so the free tier (4 req/min, 500 req/day) is respected.
- Daily counters per group (`scanned`, `files`, `urls`, `malicious`,
  `deleted`, `suspicious`, `errors`, `oversize`) power the dashboard.

---

## Prerequisites

| What you need | Where to get it |
|---|---|
| Bot token | [@BotFather](https://t.me/BotFather) → `/newbot` |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | [my.telegram.org](https://my.telegram.org) → API development tools |
| VirusTotal API key | [virustotal.com](https://www.virustotal.com/gui/join-us) → profile → API key |
| Upstash Redis REST URL/token | [console.upstash.com](https://console.upstash.com/) → Redis → REST API |

---

## Configuration

Copy `.env.example` to `.env` and fill in the values. See
[DEPLOYMENT.md](DEPLOYMENT.md) for the full variable reference.

```bash
cp .env.example .env
```

The most important variables:

| Variable | Purpose |
|---|---|
| `BOT_TOKEN` | Telegram bot token |
| `VT_API_KEY` | VirusTotal API key |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Shared persistence |
| `ALLOWED_GROUP_IDS` | Groups the bot may act in |
| `WHITELIST_USER_IDS` | Users allowed to view the dashboard |
| `USE_LOCAL_BOT_API` | Use self-hosted Bot API server (removes 20 MB cap) |

---

## Run Locally with Docker

```bash
cp .env.example .env   # then fill in the values
docker compose up --build
```

This starts two containers:

- `telegram-bot-api` — self-hosted Bot API server (built from source).
- `bot` — the Python security bot, long-polling via that server.

No inbound port needs to be exposed for the bot to work. Set
`USE_LOCAL_BOT_API=false` to talk to `api.telegram.org` directly (files capped
at 20 MB).

Add the bot to a group as **administrator** (needs "Delete messages" and
"Restrict users"), then put the group's numeric ID in `ALLOWED_GROUP_IDS`.

---

## Deploy to Railway

Create **two services** from the same GitHub repo.

**Service 1 — `telegram-bot-api`**

1. Root Directory: `telegram-bot-api`.
2. Variables: `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`.
3. Add a Volume at `/var/lib/telegram-bot-api`.

**Service 2 — `bot`**

1. Root Directory: `/`, Dockerfile Path: `bot/Dockerfile`.
2. Variables: everything from `.env.example`, plus
   `TELEGRAM_LOCAL_API_URL=http://telegram-bot-api.railway.internal:8081`
   and `USE_LOCAL_BOT_API=true`.

---

## Deploy the Mini App to Vercel

Deploy only `miniapp/`, `api/`, and `vercel.json`:

```bash
npm i -g vercel
vercel
```

Set the Vercel environment variables (see [DEPLOYMENT.md](DEPLOYMENT.md)),
then register the web app URL:

```bash
BOT_TOKEN=... WEB_APP_URL=https://your-project.vercel.app python setup_webapp.py
```

---

## Commands

No `/start` command — the Mini App is opened via the Telegram **Menu** button
(left of the message box). The bot sets this automatically on startup.

| Command | Scope | Function |
|---|---|---|
| `/whois` | Group | Show a user's trust badge + strike count |

All administration (group linking, language, safe-message timer, plan
assignment, plan pricing) happens inside the Mini App, gated by a 6-digit PIN.

---

## Plans & Quotas

V1 uses **manual plan assignment** by the super admin (`ADMIN_CHAT_ID`) from
the Mini App **Manage** tab (no automatic payment). PayWay self-serve is
planned for later.

| Plan | Price | Scans/month | Groups | History |
|---|---|---|---|---|
| Personal Free | $0 | 3/day | — | — |
| Personal Pro | $5.99 | 200 | — | — |
| Personal Premium | $9.99 | 400 | — | — |
| Group Starter | $8 | 400 | 2 | 7 days |
| Group Pro | $18.99 | 1,000 | 5 | 30 days |
| Group Premium | $35.99 | 2,000 | 10 | 90 days |

Plans expire after `PLAN_EXPIRY_DAYS` (30 days) and revert to Free.

---

## Project Structure

```
PED_Telegram_Security_Bot/
├── bot/                  # Python bot — long-polls Telegram, runs 24/7
│   ├── main.py           # Entry point: polling loop
│   ├── config.py         # Environment configuration
│   ├── telegram_api.py   # Telegram Bot API client
│   ├── handlers.py       # Message/update processing, threat responses
│   ├── file_handler.py   # File download + validation
│   ├── scanner.py        # VirusTotal scanning (throttled + cached)
│   ├── redis_client.py   # Upstash Redis (cache, reports, plans, quota)
│   ├── reports.py        # Daily per-group statistics
│   └── utils.py          # URL/file heuristics, link preview, trust
├── telegram-bot-api/     # Self-hosted Telegram Bot API server
├── miniapp/              # Telegram Mini App (React, deployed to Vercel)
├── api/                  # Vercel serverless function (dashboard + config)
├── docker-compose.yml    # Full local stack
├── vercel.json           # Vercel routing
├── DEPLOYMENT.md         # Railway + Vercel setup and ENV reference
└── .env.example
```

---

## License

Proprietary — Songket Security Team. See the in-app Terms of Service.
