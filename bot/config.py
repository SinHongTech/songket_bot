"""
Central configuration for the PED Telegram Security Bot.

Everything here is read from environment variables so the same code works
whether it's started with `docker-compose`, a plain `.env` file (via
python-dotenv) or real environment variables injected by a process manager.
"""
from __future__ import annotations

import logging
import os

try:
    # Optional: makes `python -m bot.main` work without docker-compose too.
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover - python-dotenv is optional
    pass

logger = logging.getLogger("BeydaBot")


def _int_env(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        logger.warning("Invalid int for %s=%r, using default %s", name, raw, default)
        return default


def _bool_env(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int_set_env(name: str) -> set[int]:
    raw = os.environ.get(name, "")
    out: set[int] = set()
    for item in raw.split(","):
        item = item.strip()
        if not item:
            continue
        try:
            out.add(int(item))
        except ValueError:
            logger.warning("Invalid id in %s: %r", name, item)
    return out


# ── Telegram ────────────────────────────────────────────────────────────────
BOT_TOKEN: str = os.environ.get("BOT_TOKEN", "")
ADMIN_CHAT_ID: str = os.environ.get("ADMIN_CHAT_ID", "")
WEB_APP_URL: str = os.environ.get("WEB_APP_URL", "").strip()

# Whether to talk to a locally-hosted Telegram Bot API server (recommended:
# it removes the 20MB download limit imposed by api.telegram.org and lets us
# scan much larger files). Falls back to the public Bot API otherwise.
USE_LOCAL_BOT_API: bool = _bool_env("USE_LOCAL_BOT_API", True)
TELEGRAM_LOCAL_API_URL: str = os.environ.get(
    "TELEGRAM_LOCAL_API_URL", "http://telegram-bot-api:8081"
).rstrip("/")

POLL_TIMEOUT: int = _int_env("POLL_TIMEOUT", 30)
MAX_WORKERS: int = _int_env("MAX_WORKERS", 8)

# ── Access control ───────────────────────────────────────────────────────────
ALLOWED_GROUP_IDS: set[int] = _int_set_env("ALLOWED_GROUP_IDS")
WHITELIST_USER_IDS: set[int] = _int_set_env("WHITELIST_USER_IDS")
# GROUP_HANDLERS_JSON example: {"123456789": [-1001111, -1002222]}
GROUP_HANDLERS_JSON: str = os.environ.get("GROUP_HANDLERS_JSON", "")
MAX_DASHBOARD_GROUPS: int = max(1, min(5, _int_env("MAX_DASHBOARD_GROUPS", 5)))

# ── VirusTotal ───────────────────────────────────────────────────────────────
VT_API_KEY: str = os.environ.get("VT_API_KEY", "")
VT_BASE_URL: str = "https://www.virustotal.com/api/v3"
VT_MALICIOUS_THRESHOLD: int = max(1, _int_env("VT_MALICIOUS_THRESHOLD", 1))
VT_SUSPICIOUS_THRESHOLD: int = max(1, _int_env("VT_SUSPICIOUS_THRESHOLD", 1))
VT_POLL_INTERVAL: int = max(1, _int_env("VT_POLL_INTERVAL", 3))
VT_POLL_ATTEMPTS: int = max(1, _int_env("VT_POLL_ATTEMPTS", 10))

# With a local Bot API server files up to ~2000MB can be downloaded; without
# it, api.telegram.org caps downloads at 20MB regardless of this setting.
MAX_FILE_SIZE_MB: int = max(1, _int_env("MAX_FILE_SIZE_MB", 50 if USE_LOCAL_BOT_API else 20))
MAX_FILE_SIZE_BYTES: int = MAX_FILE_SIZE_MB * 1024 * 1024

# ── Upstash Redis (REST API) ────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL: str = (
    os.environ.get("UPSTASH_REDIS_REST_URL") or os.environ.get("KV_REST_API_URL") or ""
).rstrip("/")
UPSTASH_REDIS_REST_TOKEN: str = (
    os.environ.get("UPSTASH_REDIS_REST_TOKEN") or os.environ.get("KV_REST_API_TOKEN") or ""
)
REDIS_CONFIGURED: bool = bool(UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)

SCAN_CACHE_TTL_SECONDS: int = 24 * 3600
REPORT_TTL_SECONDS: int = 45 * 24 * 3600
REPORT_TIMEZONE: str = os.environ.get("REPORT_TIMEZONE", "Asia/Phnom_Penh")


def validate() -> None:
    """Log (not raise) about missing critical configuration at startup."""
    if not BOT_TOKEN:
        logger.critical("BOT_TOKEN is not set — the bot cannot start.")
    if not VT_API_KEY:
        logger.critical("VT_API_KEY is not set — scanning will fail.")
    if not REDIS_CONFIGURED:
        logger.warning(
            "Upstash Redis REST credentials are not set — caching and "
            "reporting will use in-memory storage only (lost on restart)."
        )
    if not WEB_APP_URL:
        logger.warning("WEB_APP_URL is not set — /start will not offer the Mini App button.")
    logger.info(
        "Config loaded | local_api=%s | allowed_groups=%d | whitelist_users=%d",
        USE_LOCAL_BOT_API, len(ALLOWED_GROUP_IDS), len(WHITELIST_USER_IDS),
    )
