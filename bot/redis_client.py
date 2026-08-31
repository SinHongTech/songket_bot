"""
Upstash Redis REST client.

Used both as a scan-result cache (URL / file-hash -> VirusTotal verdict) and
as the persistence layer for daily per-group reports that the Vercel Mini
App API reads back. Falls back to an in-process dict when Upstash
credentials are not configured, so the bot still runs (without persistence
across restarts) in a bare local test.
"""
from __future__ import annotations

import json
import logging
import time
from typing import Optional

import requests

from bot import config

logger = logging.getLogger("BeydaBot.redis")

_mem: dict[str, tuple[float, object]] = {}
_MEM_TTL_FALLBACK = 7 * 86400


def kv_get(key: str):
    if config.REDIS_CONFIGURED:
        try:
            r = requests.get(
                f"{config.UPSTASH_REDIS_REST_URL}/get/{key}",
                headers={"Authorization": f"Bearer {config.UPSTASH_REDIS_REST_TOKEN}"},
                timeout=5,
            )
            if r.status_code == 200:
                return r.json().get("result")
        except Exception as exc:
            logger.warning("KV GET %s failed: %s", key, exc)

    item = _mem.get(key)
    if item and time.time() - item[0] < _MEM_TTL_FALLBACK:
        return item[1]
    return None


def kv_set(key: str, value, ttl: Optional[int] = None) -> bool:
    raw = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    _mem[key] = (time.time(), value)

    if config.REDIS_CONFIGURED:
        try:
            params = {"EX": ttl} if ttl else None
            r = requests.post(
                f"{config.UPSTASH_REDIS_REST_URL}/set/{key}",
                headers={"Authorization": f"Bearer {config.UPSTASH_REDIS_REST_TOKEN}"},
                params=params,
                data=raw,
                timeout=5,
            )
            return r.status_code == 200
        except Exception as exc:
            logger.warning("KV SET %s failed: %s", key, exc)
            return False
    return True


def kv_json_get(key: str) -> Optional[dict]:
    value = kv_get(key)
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    try:
        obj = json.loads(value)
        return obj if isinstance(obj, dict) else None
    except Exception:
        return None


def kv_json_set(key: str, value: dict, ttl: Optional[int] = None) -> bool:
    return kv_set(key, value, ttl)


# ── scan-result cache ────────────────────────────────────────────────────────

def cache_get(key: str) -> Optional[dict]:
    data = kv_json_get(f"scan:{key}")
    if data and "malicious" in data:
        return data
    return None


def cache_set(key: str, value: dict, ttl: Optional[int] = None) -> None:
    kv_json_set(f"scan:{key}", value, ttl=ttl or config.SCAN_CACHE_TTL_SECONDS)


# ── group configuration settings ─────────────────────────────────────────────

def get_group_settings(chat_id: int) -> dict:
    data = kv_json_get(f"settings:group:{chat_id}")
    default_settings = {
        "lang": config.DEFAULT_LANGUAGE,
        "safe_timeout": config.DEFAULT_SAFE_TIMEOUT,
        "show_safe": config.ENABLE_SAFE_MESSAGES,
        "verify_mode": config.VERIFY_NEW_MEMBERS_DEFAULT,
        "link_preview": config.LINK_PREVIEW_ENABLED,
        "trust_score": config.TRUST_SCORE_ENABLED,
    }
    if not data or not isinstance(data, dict):
        return default_settings
    return {
        "lang": str(data.get("lang", config.DEFAULT_LANGUAGE)).lower(),
        "safe_timeout": int(data.get("safe_timeout", config.DEFAULT_SAFE_TIMEOUT)),
        "show_safe": bool(data.get("show_safe", config.ENABLE_SAFE_MESSAGES)),
        "verify_mode": bool(data.get("verify_mode", config.VERIFY_NEW_MEMBERS_DEFAULT)),
        "link_preview": bool(data.get("link_preview", config.LINK_PREVIEW_ENABLED)),
        "trust_score": bool(data.get("trust_score", config.TRUST_SCORE_ENABLED)),
    }


def set_group_settings(chat_id: int, settings: dict) -> bool:
    current = get_group_settings(chat_id)
    current.update(settings)
    return kv_json_set(f"settings:group:{chat_id}", current)


def get_group_lang(chat_id: int) -> str:
    return get_group_settings(chat_id).get("lang", config.DEFAULT_LANGUAGE)


def set_group_lang(chat_id: int, lang: str) -> bool:
    settings = get_group_settings(chat_id)
    settings["lang"] = lang.strip().lower()
    return set_group_settings(chat_id, settings)


# ── subscriptions & quotas ───────────────────────────────────────────────────

def get_subscription(user_id: int) -> dict:
    data = kv_json_get(f"sub:{user_id}")
    if data and isinstance(data, dict):
        return data
    return {"plan": "personal_free", "expiry": 0}


def set_subscription(user_id: int, plan: str, expiry: int) -> bool:
    ok = kv_json_set(f"sub:{user_id}", {"plan": plan, "expiry": expiry})
    index = kv_get("subs:index") or ""
    ids = [x.strip() for x in str(index).split(",") if x.strip()]
    sid = str(user_id)
    if sid not in ids:
        ids.append(sid)
        kv_set("subs:index", ",".join(ids))
    return ok


def get_strikes(chat_id: int, user_id: int) -> int:
    value = kv_get(f"strikes:{chat_id}:{user_id}")
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def set_strikes(chat_id: int, user_id: int, strikes: int) -> None:
    kv_set(f"strikes:{chat_id}:{user_id}", str(strikes))


def record_first_seen(user_id: int) -> float:
    """Return the first-seen timestamp for a user (best-effort account age proxy)."""
    key = f"firstseen:{user_id}"
    existing = kv_get(key)
    if existing:
        try:
            return float(existing)
        except (TypeError, ValueError):
            pass
    now = time.time()
    kv_set(key, str(now))
    return now


def record_join_time(chat_id: int, user_id: int) -> float:
    key = f"joined:{chat_id}:{user_id}"
    existing = kv_get(key)
    if existing:
        try:
            return float(existing)
        except (TypeError, ValueError):
            pass
    now = time.time()
    kv_set(key, str(now))
    return now


# ── scan quota (per user, per month) ─────────────────────────────────────────

def _quota_month() -> str:
    return time.strftime("%Y-%m", time.gmtime())


def get_scan_usage(user_id: int) -> int:
    value = kv_get(f"quota:{user_id}:{_quota_month()}")
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def increment_scan_usage(user_id: int) -> int:
    used = get_scan_usage(user_id) + 1
    kv_set(f"quota:{user_id}:{_quota_month()}", str(used))
    return used


def _quota_day() -> str:
    return time.strftime("%Y-%m-%d", time.gmtime())


def get_daily_scan_usage(user_id: int) -> int:
    value = kv_get(f"quota:daily:{user_id}:{_quota_day()}")
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def increment_daily_scan_usage(user_id: int) -> int:
    used = get_daily_scan_usage(user_id) + 1
    kv_set(f"quota:daily:{user_id}:{_quota_day()}", str(used))
    return used


def plan_scan_limit(plan: str) -> int:
    return int(config.PLAN_CATALOG.get(plan, {}).get("scans", 0))


def get_plan_catalog() -> dict:
    """Plan catalog from Redis (edited via the Mini App), falling back to config."""
    data = kv_json_get("config:plan_catalog")
    if data and isinstance(data, dict) and data:
        return data
    return config.PLAN_CATALOG


def plan_scan_limit_runtime(plan: str) -> int:
    return int(get_plan_catalog().get(plan, {}).get("scans", 0))
