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

# ── Feature Defaults ────────────────────────────────────────────────────────
DEFAULT_LANGUAGE: str = os.environ.get("DEFAULT_LANGUAGE", "both").strip().lower()  # 'both', 'kh', 'en'
DEFAULT_SAFE_TIMEOUT: int = max(0, _int_env("DEFAULT_SAFE_TIMEOUT", 10))
ENABLE_SAFE_MESSAGES: bool = _bool_env("ENABLE_SAFE_MESSAGES", True)

# ── VirusTotal throttle / retry / hybrid lookup ──────────────────────────────
# Free tier: 4 requests/minute, 500/day. VT_MIN_INTERVAL_SECONDS spaces out
# every VT call so bursts from the worker pool never trip the 4/min limit.
VT_MIN_INTERVAL_SECONDS: float = max(0.0, float(os.environ.get("VT_MIN_INTERVAL_SECONDS", "15")))
VT_RETRY_ATTEMPTS: int = max(0, _int_env("VT_RETRY_ATTEMPTS", 3))
VT_RETRY_BASE_DELAY: float = max(0.0, float(os.environ.get("VT_RETRY_BASE_DELAY", "5")))
# Hybrid URL lookup: read VT's last verdict before submitting a fresh scan.
URL_LOOKUP_ENABLED: bool = _bool_env("URL_LOOKUP_ENABLED", True)
URL_LOOKUP_MAX_AGE_SECONDS: int = max(0, _int_env("URL_LOOKUP_MAX_AGE_SECONDS", 1800))

# ── Cache TTL split (URL vs file) ────────────────────────────────────────────
# URLs can redirect to a new target, so their cache is short. File verdicts are
# keyed by immutable SHA-256, so they can be cached much longer.
URL_CACHE_TTL_SECONDS: int = max(60, _int_env("URL_CACHE_TTL_SECONDS", 3600))
FILE_CACHE_TTL_SECONDS: int = max(3600, _int_env("FILE_CACHE_TTL_SECONDS", 24 * 3600))

# ── Trust & reputation (per-user) ────────────────────────────────────────────
TRUST_SCORE_ENABLED: bool = _bool_env("TRUST_SCORE_ENABLED", True)
TRUST_NEW_ACCOUNT_DAYS: int = max(0, _int_env("TRUST_NEW_ACCOUNT_DAYS", 7))
TRUST_NEW_MEMBER_DAYS: int = max(0, _int_env("TRUST_NEW_MEMBER_DAYS", 7))
TRUST_NEW_MATCH_MODE: str = os.environ.get("TRUST_NEW_MATCH_MODE", "any").strip().lower()  # 'any' | 'all'
TRUST_FLAGGED_STRIKES: int = max(1, _int_env("TRUST_FLAGGED_STRIKES", 3))

# ── Link destination preview ─────────────────────────────────────────────────
LINK_PREVIEW_ENABLED: bool = _bool_env("LINK_PREVIEW_ENABLED", True)
LINK_PREVIEW_TIMEOUT: int = max(1, _int_env("LINK_PREVIEW_TIMEOUT", 8))
LINK_PREVIEW_MAX_REDIRECTS: int = max(1, _int_env("LINK_PREVIEW_MAX_REDIRECTS", 5))

# ── New-member verification gate ─────────────────────────────────────────────
VERIFY_NEW_MEMBERS_DEFAULT: bool = _bool_env("VERIFY_NEW_MEMBERS_DEFAULT", False)
VERIFY_METHOD: str = os.environ.get("VERIFY_METHOD", "button").strip().lower()  # 'button' | 'approve' | 'age'
VERIFY_AGE_DAYS: int = max(0, _int_env("VERIFY_AGE_DAYS", 7))
VERIFY_TIMEOUT_MINUTES: int = max(0, _int_env("VERIFY_TIMEOUT_MINUTES", 10))

# ── Plans / quotas ───────────────────────────────────────────────────────────
SUPER_ADMIN_IDS: str = os.environ.get("SUPER_ADMIN_IDS", "").strip()
PLAN_EXPIRY_DAYS: int = max(1, _int_env("PLAN_EXPIRY_DAYS", 30))
QUOTA_ENABLED: bool = _bool_env("QUOTA_ENABLED", True)

# Plan catalog follows the Business Plan. price in USD, scans/month, groups, history_days.
PLAN_CATALOG: dict = {
    "personal_free": {"name": "Personal Free", "price": 0.0, "scans": 0, "groups": 0, "history_days": 0},
    "personal_pro": {"name": "Personal Pro", "price": 5.99, "scans": 200, "groups": 0, "history_days": 0},
    "personal_premium": {"name": "Personal Premium", "price": 9.99, "scans": 400, "groups": 0, "history_days": 0},
    "group_starter": {"name": "Group Starter", "price": 8.0, "scans": 400, "groups": 2, "history_days": 7},
    "group_pro": {"name": "Group Pro", "price": 18.99, "scans": 1000, "groups": 5, "history_days": 30},
    "group_premium": {"name": "Group Premium", "price": 35.99, "scans": 2000, "groups": 10, "history_days": 90},
}

# ── Payment (ABA PayWay — later self-serve) ──────────────────────────────────
PAYWAY_ENABLED: bool = _bool_env("PAYWAY_ENABLED", False)
PAYWAY_MERCHANT_ID: str = os.environ.get("PAYWAY_MERCHANT_ID", "").strip()
PAYWAY_API_KEY: str = os.environ.get("PAYWAY_API_KEY", "").strip()
PAYWAY_API_URL: str = os.environ.get(
    "PAYWAY_API_URL", "https://checkout-sandbox.payway.com.kh"
).rstrip("/")


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
