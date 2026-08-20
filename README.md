# Telegram Security Bot + Private Mini App Dashboard

This version keeps the original VirusTotal scanning behavior and adds:

- **32 MB application file limit** (`MAX_FILE_SIZE_MB`, capped at 32).
- **Telegram Mini App** at `/` with project idea, business plan, and About Us.
- **Whitelist by Telegram user ID**.
- Whitelisted users see a private **Security Dashboard** inside the Mini App.
- A user can manage **up to 5 groups**.
- Group ownership can be configured explicitly with `GROUP_HANDLERS_JSON`, or the bot can discover which allowed groups the user administers using `getChatMember`.
- **Daily persistent reports** per group: files scanned, URLs scanned, malicious detections, deleted messages, suspicious results, errors, and oversized files.
- `/start` or `/app` in the bot's private chat opens the Mini App button.
- `setup_webapp.py` sets the Telegram bot menu button to open the Mini App.

## Important: 32 MB and Telegram downloads

The code accepts files up to **32 MB** at the application level because that matches the VirusTotal public file-size limit used by the project. The actual download limit is also determined by the Telegram Bot API endpoint you use. If your Telegram Bot API cannot download a particular file above its own limit, the bot cannot scan that file until you use a compatible/local Bot API setup. The code does not pretend that a 32 MB VirusTotal limit automatically removes Telegram's own transport limit.

## Environment variables

Required:

```env
BOT_TOKEN=123456789:ABC...
VT_API_KEY=...
ALLOWED_GROUP_IDS=-1001111111111,-1002222222222
WEB_APP_URL=https://your-project.vercel.app/
```

Scanning:

```env
VT_MALICIOUS_THRESHOLD=1
VT_SUSPICIOUS_THRESHOLD=1
VT_POLL_INTERVAL=2
VT_POLL_ATTEMPTS=5
MAX_FILE_SIZE_MB=32
```

Mini App access:

```env
# Comma-separated Telegram user IDs allowed to see the dashboard.
WHITELIST_USER_IDS=123456789,987654321

# Optional explicit group ownership. A user can have at most 5 groups.
# The group IDs should also be in ALLOWED_GROUP_IDS.
GROUP_HANDLERS_JSON={"123456789":[-1001111111111,-1002222222222],"987654321":[-1003333333333]}

MAX_DASHBOARD_GROUPS=5
REPORT_TIMEZONE=Asia/Phnom_Penh
```

Persistent reporting uses **Upstash Redis** through its REST API. The recommended Vercel variables are:

```env
UPSTASH_REDIS_REST_URL=https://YOUR-DATABASE.upstash.io
UPSTASH_REDIS_REST_TOKEN=YOUR_HTTP_REST_TOKEN
```

The code also accepts the older `KV_REST_API_URL` / `KV_REST_API_TOKEN` names as a fallback, but use the `UPSTASH_REDIS_REST_*` names for a new deployment. These are server-side variables and must never be exposed to the Mini App frontend.

The application uses the same Upstash Redis database for:
- VirusTotal result caching
- Daily per-group scan reports
- Malicious/deleted/suspicious counters
- Oversized-file counters

**Configure KV in production.** Without KV, the project falls back to process memory, which is not reliable across Vercel cold starts.

## How the whitelist works

The Mini App never trusts a Telegram ID supplied by the browser. It receives Telegram's `initData` and validates the HMAC signature using the bot token.

1. User opens the Mini App from Telegram.
2. Telegram supplies signed `initData`.
3. `/api/webapp` validates the signature and timestamp.
4. The returned Telegram user ID is compared with `WHITELIST_USER_IDS`.
5. Non-whitelisted users only see the public project page.
6. Whitelisted users receive the dashboard data for their groups only.

## Group access

There are two modes.

### Mode A — explicit assignment

Recommended when one person is responsible for specific groups:

```env
GROUP_HANDLERS_JSON={"123456789":[-1001111111111,-1002222222222,-1003333333333,-1004444444444,-1005555555555]}
```

That user gets reports from those five groups.

### Mode B — automatic admin discovery

If `GROUP_HANDLERS_JSON` is not set for a whitelisted user, the dashboard checks every group in `ALLOWED_GROUP_IDS` with Telegram `getChatMember` and includes groups where that user is `creator` or `administrator`. The dashboard still limits the result to five groups.

## Daily report example

For a group, a day can look like:

```json
{
  "date": "2026-08-20",
  "group_id": -1001234567890,
  "group_title": "Security Team",
  "scanned": 18,
  "files": 11,
  "urls": 7,
  "malicious": 2,
  "deleted": 2,
  "suspicious": 3,
  "errors": 0,
  "oversize": 1
}
```

The dashboard aggregates these rows across the groups assigned to the logged-in user.

## Deploy

1. Push this folder to GitHub.
2. Import it into Vercel.
3. Add the environment variables above, including the two Upstash Redis REST variables.
4. Deploy.
5. Set `WEB_APP_URL` to the deployed URL, for example `https://your-project.vercel.app/`.
6. Run:

```bash
BOT_TOKEN="..." WEB_APP_URL="https://your-project.vercel.app/" python setup_webapp.py
```

7. Register the webhook as before:

```bash
BOT_TOKEN="..." VERCEL_URL="https://your-project.vercel.app" python setup_webhook.py
```

## User flow

- User opens bot → `/start` → **Open Security Mini App**.
- Normal user → project information only.
- Whitelisted user → project information + **Security Dashboard**.
- Dashboard → today's totals + 7-day daily report for each managed group.

## Security notes

- Do not put the bot token or VirusTotal API key in the frontend.
- Keep the whitelist in Vercel environment variables.
- Use KV in production for persistent reports.
- The dashboard API requires valid Telegram Mini App `initData`; a manually typed Telegram ID is not accepted.
- The bot still needs administrator permission to delete messages in protected groups.
