# PED Telegram Security Bot

A bilingual (Khmer + English) Telegram security bot that scans links and
files shared in group chats with [VirusTotal](https://www.virustotal.com/),
automatically removes confirmed threats, warns on suspicious content, and
gives authorized admins a daily per-group security dashboard.

## How it's put together

```
PED_Telegram_Security_Bot/
│
├── bot/                  # Python bot — long-polls Telegram, runs 24/7
│   ├── main.py           # Entry point: polling loop
│   ├── config.py         # Environment variables
│   ├── telegram_api.py   # Client for the local Telegram Bot API server
│   ├── handlers.py       # Message/update processing, threat responses
│   ├── file_handler.py   # File download + validation
│   ├── scanner.py        # VirusTotal scanning
│   ├── redis_client.py   # Upstash Redis (cache + report storage)
│   ├── reports.py        # Daily per-group statistics
│   └── utils.py          # URL/domain/file heuristics
│
├── telegram-bot-api/      # Self-hosted Telegram Bot API server
│   └── Dockerfile         # Builds tdlib/telegram-bot-api from source
│
├── miniapp/               # Telegram Mini App (deployed to Vercel as static files)
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── api/                   # Vercel serverless function backing the Mini App
│   ├── common.py          # Shared helpers (Upstash, initData verification)
│   └── dashboard.py        # POST /api/dashboard
│
├── docker-compose.yml     # Full local dev stack: bot API server + bot
├── vercel.json            # Vercel routing for miniapp/ + api/
├── .env.example
└── requirements are split per-component (bot/requirements.txt, api/requirements.txt)
```

Two independent things get deployed:

1. **The bot** (`bot/` + `telegram-bot-api/`) — runs continuously (e.g. via
   `docker-compose`, a VPS, or any container host). It never needs a public
   URL: it long-polls Telegram for updates.
2. **The Mini App** (`miniapp/` + `api/`) — a static dashboard plus one
   serverless function, deployed to Vercel. It needs a public HTTPS URL so
   Telegram can open it as a `web_app` button.

Both share the same Upstash Redis database: the bot writes daily scan
reports, and the Vercel API reads them back for the dashboard.

## 1. Prerequisites

| What you need | Where to get it |
|---|---|
| Bot token | [@BotFather](https://t.me/BotFather) → `/newbot` |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | [my.telegram.org](https://my.telegram.org) → "API development tools" (needed to run the self-hosted Bot API server) |
| VirusTotal API key | [virustotal.com](https://www.virustotal.com/gui/join-us) → your profile → API key |
| Upstash Redis REST URL/token | [console.upstash.com](https://console.upstash.com/) → create a Redis database → REST API section |

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

## 2. Run the bot locally with Docker

```bash
docker compose up --build
```

This starts two containers:

- `telegram-bot-api` — the official self-hosted Bot API server, built from
  source ([tdlib/telegram-bot-api](https://github.com/tdlib/telegram-bot-api)).
  Using your own server removes the 20MB download cap that
  `api.telegram.org` imposes, so larger attachments can be scanned.
- `bot` — the Python security bot, talking to `telegram-bot-api` over the
  Docker network and long-polling Telegram for updates.

No inbound port needs to be exposed publicly for the bot to work.

If you'd rather not self-host the Bot API server, set `USE_LOCAL_BOT_API=false`
in `.env` — the bot will then talk to `api.telegram.org` directly (file
downloads are capped at 20MB in that mode).

Add the bot to your Telegram group as an **administrator** with permission
to delete messages, then put the group's numeric ID in `ALLOWED_GROUP_IDS`
(negative numbers for groups/supergroups — you can get this from
`@userinfobot` or by adding `@RawDataBot` temporarily).

## 3. Deploy the bot to Railway (instead of / in addition to Docker locally)

Railway hosts each Dockerfile in this repo as its own service, and gives
services in the same project a private network so the bot can reach the
Bot API server without exposing it publicly. Create **two services** from
the same GitHub repo:

**Service 1 — `telegram-bot-api`**
1. New Service → Deploy from GitHub repo → pick this repo.
2. Settings → Root Directory: `telegram-bot-api`
   (Dockerfile Path stays the default `Dockerfile`).
3. Variables: add `TELEGRAM_API_ID` and `TELEGRAM_API_HASH`.
4. Add a Volume mounted at `/var/lib/telegram-bot-api` (Settings → Volumes)
   so the server's local file cache survives redeploys.
5. Deploy. Note the service's name (shown in the dashboard) — Railway
   private networking makes it reachable at
   `http://<service-name>.railway.internal:8081` from other services in
   the same project.

**Service 2 — `bot`**
1. New Service → Deploy from GitHub repo → same repo.
2. Settings → Root Directory: `/` (repo root), Dockerfile Path: `bot/Dockerfile`.
3. Variables: copy everything from `.env.example`, plus:
   - `TELEGRAM_LOCAL_API_URL=http://telegram-bot-api.railway.internal:8081`
     (use the actual service name from step 1 if you renamed it)
   - `USE_LOCAL_BOT_API=true`
4. Deploy. This service has no public port — it long-polls Telegram, so
   you don't need to expose or configure any domain for it.

Because both services read `TELEGRAM_API_ID`/`TELEGRAM_API_HASH` and
`UPSTASH_REDIS_REST_URL`/`TOKEN` the same way locally and on Railway, you
can move between `docker-compose` and Railway without touching code —
only the `TELEGRAM_LOCAL_API_URL` value changes (Docker network name vs.
Railway internal DNS name).

## 4. Deploy the Mini App to Vercel

The Mini App only needs the `miniapp/`, `api/`, and `vercel.json` files.

```bash
npm i -g vercel   # if you don't already have it
vercel
```

In the Vercel project's environment variables, set at minimum:
`BOT_TOKEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
`ALLOWED_GROUP_IDS`, `WHITELIST_USER_IDS`, and optionally
`GROUP_HANDLERS_JSON` / `MAX_DASHBOARD_GROUPS` / `REPORT_TIMEZONE`.

Once deployed, copy the resulting `https://your-project.vercel.app` URL into
`WEB_APP_URL` in the bot's `.env`, then register it as the bot's menu
button:

```bash
BOT_TOKEN=... WEB_APP_URL=https://your-project.vercel.app python setup_webapp.py
```

Now `/start` in a private chat with the bot offers a button that opens the
Mini App, and whitelisted user IDs (`WHITELIST_USER_IDS`) see their groups'
daily security dashboard.

## 5. How scanning works

- **URLs**: extracted from message text/captions. Known-safe domains are
  skipped; URL shorteners, suspicious TLDs, and raw IPs are always sent to
  VirusTotal. Malicious results delete the message and post a threat alert
  (plus an optional private admin copy). Suspicious-only results post a
  warning that auto-deletes after 15 seconds.
- **Files**: obviously risky extensions (`.exe`, `.js`, `.apk`, archives,
  macro-enabled Office docs, etc.) are always scanned. Common safe media
  files are skipped unless their raw bytes look like an executable/archive
  (catches simple extension spoofing). Files over `MAX_FILE_SIZE_MB` are
  never downloaded — the bot instead posts a safety warning.
- Every VirusTotal verdict is cached in Upstash Redis (24h TTL) by URL or
  SHA-256 so the same link/file isn't re-scanned repeatedly.
- Daily counters per group (`scanned`, `files`, `urls`, `malicious`,
  `deleted`, `suspicious`, `errors`, `oversize`) are stored for 45 days and
  power the Mini App dashboard.

## 6. Configuration reference

See `.env.example` for the full list of environment variables and their
defaults, including VirusTotal thresholds/poll timing, access control
(`ALLOWED_GROUP_IDS`, `WHITELIST_USER_IDS`, `GROUP_HANDLERS_JSON`), and
report timezone.

## Notes on this v2 (Upstash) rewrite

This version replaces the earlier single Vercel-webhook deployment with a
long-running polling bot backed by a self-hosted Telegram Bot API server
(for large-file scanning), while keeping the Mini App dashboard on Vercel.
Upstash Redis is the shared persistence layer between the two.
