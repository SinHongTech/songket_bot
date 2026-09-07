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


def kv_delete(key: str) -> bool:
    _mem.pop(key, None)
    if config.REDIS_CONFIGURED:
        try:
            r = requests.post(
                f"{config.UPSTASH_REDIS_REST_URL}/del/{key}",
                headers={"Authorization": f"Bearer {config.UPSTASH_REDIS_REST_TOKEN}"},
                timeout=5,
            )
            return r.status_code == 200
        except Exception as exc:
            logger.warning("KV DEL %s failed: %s", key, exc)
            return False
    return True


def kv_json_get(key: str):
    value = kv_get(key)
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    try:
        obj = json.loads(value)
        return obj if isinstance(obj, (dict, list)) else None
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


def get_user_lang(user_id: int) -> str:
    data = kv_json_get(f"settings:user:{user_id}")
    if data and isinstance(data, dict):
        return str(data.get("lang", config.DEFAULT_LANGUAGE)).lower()
    return config.DEFAULT_LANGUAGE


def set_user_lang(user_id: int, lang: str) -> bool:
    data = kv_json_get(f"settings:user:{user_id}") or {}
    data["lang"] = lang.strip().lower()
    return kv_json_set(f"settings:user:{user_id}", data)


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


def add_strike(chat_id: int, user_id: int) -> int:
    strikes = get_strikes(chat_id, user_id) + 1
    set_strikes(chat_id, user_id, strikes)
    return strikes


def is_file_whitelisted(chat_id: int, sha256: str) -> bool:
    return kv_get(f"whitelist:file:{chat_id}:{sha256}") is not None


def whitelist_file(chat_id: int, sha256: str) -> None:
    kv_set(f"whitelist:file:{chat_id}:{sha256}", "1")


def set_pending(user_id: int, value: str) -> None:
    kv_set(f"pending:{user_id}", value)


def get_pending(user_id: int) -> str:
    return str(kv_get(f"pending:{user_id}") or "")


def clear_pending(user_id: int) -> None:
    kv_set(f"pending:{user_id}", "")


def add_allowed_group(chat_id: int) -> None:
    raw = kv_get("config:allowed_groups") or ""
    ids = [x.strip() for x in str(raw).split(",") if x.strip()]
    sid = str(chat_id)
    if sid not in ids:
        ids.append(sid)
        kv_set("config:allowed_groups", ",".join(ids))


def add_group_handler(user_id: int, chat_id: int) -> None:
    data = kv_json_get("config:group_handlers") or {}
    uid = str(user_id)
    grps = [int(g) for g in data.get(uid, [])]
    if chat_id not in grps:
        grps.append(chat_id)
        data[uid] = grps
        kv_json_set("config:group_handlers", data)


def record_known_group(chat_id: int, title: str) -> None:
    data = kv_json_get("known_groups") or {}
    data[str(chat_id)] = title or str(chat_id)
    kv_json_set("known_groups", data)


def get_known_groups() -> dict:
    return kv_json_get("known_groups") or {}


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


def get_join_time(chat_id: int, user_id: int) -> Optional[float]:
    existing = kv_get(f"joined:{chat_id}:{user_id}")
    if existing:
        try:
            return float(existing)
        except (TypeError, ValueError):
            return None
    return None


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


def get_user_plan_status(user_id: int, is_super: bool = False, is_wl: bool = False) -> dict:
    if is_super:
        return {
            "plan_key": "group_premium",
            "plan_name": "👑 Super Admin (Personal & Group Premium)",
            "role": "Super Admin",
            "is_super_admin": True,
            "is_whitelisted": True,
            "is_free": False,
            "daily_limit": None,
            "used_today": get_daily_scan_usage(user_id),
            "remaining_today": "Unlimited (មិនកំណត់)",
            "monthly_limit": 999999,
            "used_month": get_scan_usage(user_id),
            "remaining_month": "Unlimited (មិនកំណត់)",
            "expiry": None,
        }

    sub = get_subscription(user_id)
    plan_key = sub.get("plan")
    expiry = int(sub.get("expiry", 0) or 0)
    now = time.time()
    if expiry and expiry < now:
        plan_key = "personal_free"

    if is_wl and (not plan_key or plan_key == "personal_free"):
        plan_key = "group_pro"
    elif not plan_key:
        plan_key = "personal_free"

    catalog = get_plan_catalog()
    plan_info = catalog.get(plan_key, catalog.get("personal_free", {}))
    is_free = (plan_key == "personal_free")

    used_today = get_daily_scan_usage(user_id)
    used_month = get_scan_usage(user_id)
    daily_limit = 3 if is_free else None
    monthly_limit = int(plan_info.get("scans", 200 if is_wl else 30))

    if is_wl:
        plan_display_name = f"🛡️ Group Handler ({plan_info.get('name', 'Group Pro')})"
        role = "Group Handler"
    elif is_free:
        plan_display_name = "Personal Free"
        role = "Personal Free"
    else:
        plan_display_name = plan_info.get("name", plan_key.replace("_", " ").title())
        role = "Personal Pro/Premium"

    return {
        "plan_key": plan_key,
        "plan_name": plan_display_name,
        "role": role,
        "is_super_admin": False,
        "is_whitelisted": is_wl,
        "is_free": is_free,
        "daily_limit": daily_limit,
        "used_today": used_today,
        "remaining_today": max(0, 3 - used_today) if is_free else "Unlimited",
        "monthly_limit": monthly_limit,
        "used_month": used_month,
        "remaining_month": max(0, monthly_limit - used_month) if not is_free else None,
        "expiry": expiry,
    }


# ── Domain Whitelist Management ─────────────────────────────────────────────

DEFAULT_TRUSTED_DOMAINS = [
    "t.me",
    "telegram.org",
    "google.com",
    "youtube.com",
    "youtu.be",
    "drive.google.com",
    "docs.google.com",
    "microsoft.com",
    "github.com",
    "facebook.com",
    "instagram.com",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "wikipedia.org",
    "apple.com",
]


def get_domain_whitelist() -> list[str]:
    """Return all whitelisted domains from Redis."""
    raw = kv_get("config:domain_whitelist")
    if not raw:
        return list(DEFAULT_TRUSTED_DOMAINS)
    try:
        if isinstance(raw, str):
            data = json.loads(raw)
            if isinstance(data, list):
                return data
            return [d.strip().lower() for d in raw.split(",") if d.strip()]
        if isinstance(raw, list):
            return [str(d).strip().lower() for d in raw if str(d).strip()]
    except Exception:
        pass
    return list(DEFAULT_TRUSTED_DOMAINS)


def save_domain_whitelist(domains: list[str]) -> bool:
    """Save full domain whitelist to Redis."""
    clean = sorted(list(dict.fromkeys(str(d).strip().lower() for d in domains if str(d).strip())))
    return kv_set("config:domain_whitelist", json.dumps(clean))


def add_domain_whitelist(domain: str) -> bool:
    clean = domain.strip().lower()
    if not clean:
        return False
    current = get_domain_whitelist()
    if clean not in current:
        current.append(clean)
        return save_domain_whitelist(current)
    return True


def remove_domain_whitelist(domain: str) -> bool:
    clean = domain.strip().lower()
    current = get_domain_whitelist()
    if clean in current:
        current.remove(clean)
        return save_domain_whitelist(current)
    return True


def is_domain_whitelisted(url_or_domain: str) -> bool:
    """Check if a URL or domain is in the trusted domain whitelist."""
    from bot.utils import extract_domain
    domain = extract_domain(url_or_domain).lower()
    if not domain:
        return False
    whitelist = get_domain_whitelist()
    for wl in whitelist:
        wl_clean = wl.lower()
        if domain == wl_clean or domain.endswith(f".{wl_clean}"):
            return True
    return False


# ── Threat Event Persistence ───────────────────────────────────────────────

def record_threat_event(
    chat_id: int,
    chat_title: str,
    sender: dict,
    target: str,
    threat_type: str,
    risk: str = "critical",
    action_taken: str = "deleted",
) -> None:
    """Record an individual threat occurrence with sender details in Redis."""
    try:
        from bot.reports import local_date
        day = local_date()
    except Exception:
        day = time.strftime("%Y-%m-%d")

    now = time.time()
    t_id = f"th_{int(now * 1000)}"
    time_str = time.strftime("%H:%M:%S")

    sender_username = sender.get("username") or ""
    sender_first = sender.get("first_name") or ""
    sender_last = sender.get("last_name") or ""
    sender_full = f"{sender_first} {sender_last}".strip() or sender_username or f"User_{sender.get('id', 'unknown')}"

    event = {
        "id": t_id,
        "timestamp": int(now),
        "date": day,
        "time": time_str,
        "type": threat_type,
        "risk": risk,
        "content": target,
        "sender_id": sender.get("id"),
        "sender_username": sender_username,
        "sender_name": sender_full,
        "group_id": chat_id,
        "group_title": chat_title or str(chat_id),
        "action_taken": action_taken,
    }

    # 1. Group daily list
    g_key = f"threat_events:{day}:{chat_id}"
    g_events = kv_json_get(g_key) or []
    if isinstance(g_events, list):
        g_events.insert(0, event)
        kv_json_set(g_key, g_events[:100], ttl=30 * 86400)

    # 2. Global recent threats list (capped at 200)
    all_key = "threat_events:recent"
    all_events = kv_json_get(all_key) or []
    if isinstance(all_events, list):
        all_events.insert(0, event)
        kv_json_set(all_key, all_events[:200], ttl=30 * 86400)


def get_threat_events(chat_ids: list[int], days: int = 1) -> list[dict]:
    """Retrieve threat events for specified group IDs across the requested days."""
    from datetime import date, timedelta
    try:
        from bot.reports import local_date
        today = date.fromisoformat(local_date())
    except Exception:
        today = date.today()

    events: list[dict] = []
    seen_ids = set()

    for offset in range(days):
        day_str = (today - timedelta(days=offset)).isoformat()
        for gid in chat_ids:
            key = f"threat_events:{day_str}:{gid}"
            day_events = kv_json_get(key) or []
            if isinstance(day_events, list):
                for ev in day_events:
                    if isinstance(ev, dict) and ev.get("id") and ev["id"] not in seen_ids:
                        seen_ids.add(ev["id"])
                        events.append(ev)

    # Sort newest first
    events.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return events


