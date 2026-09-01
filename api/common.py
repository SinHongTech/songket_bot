"""Shared configuration and helpers for the Vercel-hosted Mini App API.

This module is intentionally self-contained (no imports from `bot/`) because
Vercel only deploys the `api/` and `miniapp/` folders — the bot itself runs
elsewhere (see the root docker-compose.yml). Both processes talk to the same
Upstash Redis account, which is how scan reports produced by the bot become
visible in the dashboard served here.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from datetime import datetime
from typing import Optional
from urllib.parse import parse_qsl

import requests

logger = logging.getLogger("BeydaWebApp")

BOT_TOKEN = (
    os.environ.get("BOT_TOKEN", "")
    or os.environ.get("TELEGRAM_BOT_TOKEN", "")
    or os.environ.get("MAIN_BOT_TOKEN", "")
).strip()
TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"

UPSTASH_REDIS_REST_URL = (
    os.environ.get("UPSTASH_REDIS_REST_URL") or os.environ.get("KV_REST_API_URL") or ""
).rstrip("/")
UPSTASH_REDIS_REST_TOKEN = (
    os.environ.get("UPSTASH_REDIS_REST_TOKEN") or os.environ.get("KV_REST_API_TOKEN") or ""
)
REDIS_CONFIGURED = bool(UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)
MAX_DASHBOARD_GROUPS = max(1, min(5, int(os.environ.get("MAX_DASHBOARD_GROUPS", "5"))))
REPORT_TIMEZONE = os.environ.get("REPORT_TIMEZONE", "Asia/Phnom_Penh")

_mem: dict[str, tuple[float, object]] = {}


def kv_get(key: str):
    if REDIS_CONFIGURED:
        try:
            r = requests.get(
                f"{UPSTASH_REDIS_REST_URL}/get/{key}",
                headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"},
                timeout=5,
            )
            if r.status_code == 200:
                return r.json().get("result")
        except Exception as exc:
            logger.warning("KV GET %s failed: %s", key, exc)
    item = _mem.get(key)
    if item and time.time() - item[0] < 7 * 86400:
        return item[1]
    return None


def kv_set(key: str, value, ttl: Optional[int] = None) -> bool:
    raw = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
    _mem[key] = (time.time(), value)

    if REDIS_CONFIGURED:
        try:
            params = {"EX": ttl} if ttl else None
            r = requests.post(
                f"{UPSTASH_REDIS_REST_URL}/set/{key}",
                headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"},
                params=params,
                data=raw.encode("utf-8") if isinstance(raw, str) else raw,
                timeout=5,
            )
            return r.status_code == 200
        except Exception as exc:
            logger.warning("KV SET %s failed: %s", key, exc)
            return False
    return True


def kv_delete(key: str) -> bool:
    _mem.pop(key, None)
    if REDIS_CONFIGURED:
        try:
            r = requests.post(
                f"{UPSTASH_REDIS_REST_URL}/del/{key}",
                headers={"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"},
                timeout=5,
            )
            return r.status_code == 200
        except Exception as exc:
            logger.warning("KV DEL %s failed: %s", key, exc)
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


def super_admin_ids() -> set[int]:
    result = set()
    raw = os.environ.get("ADMIN_CHAT_ID", "")
    for item in raw.split(","):
        item = item.strip()
        if item:
            try:
                result.add(int(item))
            except ValueError:
                pass
    try:
        redis_super = kv_get("config:super_admin_ids")
        if redis_super:
            for item in str(redis_super).split(","):
                item = item.strip()
                if item:
                    try:
                        result.add(int(item))
                    except ValueError:
                        pass
    except Exception:
        pass
    return result


def is_super_admin(user_id: int) -> bool:
    return user_id in super_admin_ids()


def get_system_config() -> dict:
    return {
        "whitelist_user_ids": sorted(list(whitelist_ids())),
        "allowed_groups": sorted(list(get_allowed_groups())),
        "group_handlers": explicit_group_map(),
        "super_admin_ids": sorted(list(super_admin_ids())),
    }


def save_system_config(whitelist: list[int], allowed_groups: list[int], group_handlers: dict) -> bool:
    ok1 = kv_set("config:whitelist_user_ids", ",".join(str(x) for x in whitelist))
    ok2 = kv_set("config:allowed_groups", ",".join(str(x) for x in allowed_groups))
    clean_handlers = {str(k): [int(g) for g in v] for k, v in group_handlers.items()}
    ok3 = kv_set("config:group_handlers", json.dumps(clean_handlers))
    return bool(ok1 and ok2 and ok3)


def save_allowed_groups(groups: list[int]) -> bool:
    return kv_set("config:allowed_groups", ",".join(str(x) for x in groups))


# ── Plans & subscriptions ────────────────────────────────────────────────────

DEFAULT_PLAN_CATALOG: dict = {
    "personal_free": {"name": "Personal Free", "price": 0.0, "scans": 0, "groups": 0, "history_days": 0},
    "personal_pro": {"name": "Personal Pro", "price": 5.99, "scans": 200, "groups": 0, "history_days": 0},
    "personal_premium": {"name": "Personal Premium", "price": 9.99, "scans": 400, "groups": 0, "history_days": 0},
    "group_starter": {"name": "Group Starter", "price": 8.0, "scans": 400, "groups": 2, "history_days": 7},
    "group_pro": {"name": "Group Pro", "price": 18.99, "scans": 1000, "groups": 5, "history_days": 30},
    "group_premium": {"name": "Group Premium", "price": 35.99, "scans": 2000, "groups": 10, "history_days": 90},
}


def get_plan_catalog() -> dict:
    data = kv_json_get("config:plan_catalog")
    if data and isinstance(data, dict) and data:
        return data
    return dict(DEFAULT_PLAN_CATALOG)


def save_plan_catalog(catalog: dict) -> bool:
    clean = {str(k): v for k, v in catalog.items()}
    return kv_set("config:plan_catalog", json.dumps(clean))


def _sub_index() -> list[int]:
    index = kv_get("subs:index")
    ids: list[int] = []
    if index:
        for x in str(index).split(","):
            x = x.strip()
            if x:
                try:
                    ids.append(int(x))
                except ValueError:
                    pass
    return ids


def set_subscription(user_id: int, plan: str, expiry: int) -> bool:
    ok = kv_set(f"sub:{user_id}", json.dumps({"plan": plan, "expiry": expiry}))
    ids = _sub_index()
    if user_id not in ids:
        ids.append(user_id)
        kv_set("subs:index", ",".join(str(x) for x in ids))
    return ok


def list_subscriptions() -> list[dict]:
    subs = []
    for uid in _sub_index():
        sub = kv_json_get(f"sub:{uid}")
        if sub and isinstance(sub, dict):
            subs.append({"user_id": uid, "plan": sub.get("plan", "personal_free"), "expiry": int(sub.get("expiry", 0) or 0)})
    return subs


# ── PIN authentication (admin dashboard second factor) ───────────────────────

PIN_AUTH_ENABLED = os.environ.get("PIN_AUTH_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}
PIN_SESSION_TTL_SECONDS = int(os.environ.get("PIN_SESSION_TTL_DAYS", "30")) * 86400

_PIN_ATTEMPTS_LOCKOUTS = {3: 5 * 60, 5: 60 * 60, 10: 24 * 3600}


def pin_exists(user_id: int) -> bool:
    return kv_json_get(f"pin:{user_id}") is not None


def setup_pin(user_id: int, pin: str, confirm: str) -> tuple[bool, str]:
    if not pin.isdigit() or len(pin) != 6:
        return False, "PIN must be exactly 6 digits"
    if pin != confirm:
        return False, "PINs do not match"
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt.encode(), 100_000).hex()
    kv_set(f"pin:{user_id}", json.dumps({"salt": salt, "hash": digest}))
    return True, ""


def reset_user_pin(user_id: int) -> None:
    kv_delete(f"pin:{user_id}")
    kv_delete(f"pin:fail:{user_id}")


def verify_pin(user_id: int, pin: str) -> bool:
    data = kv_json_get(f"pin:{user_id}")
    if not data or not isinstance(data, dict):
        return False
    salt = data.get("salt", "")
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt.encode(), 100_000).hex()
    return hmac.compare_digest(digest, data.get("hash", ""))


def pin_lock_seconds(user_id: int) -> int:
    fails = kv_json_get(f"pin:fail:{user_id}") or {}
    until = float(fails.get("lock_until", 0) or 0)
    return max(0, int(until - time.time()))


def pin_fail_count(user_id: int) -> int:
    fails = kv_json_get(f"pin:fail:{user_id}") or {}
    return int(fails.get("count", 0) or 0)


def record_pin_fail(user_id: int) -> dict:
    fails = kv_json_get(f"pin:fail:{user_id}") or {}
    count = int(fails.get("count", 0) or 0) + 1
    lock_until = int(fails.get("lock_until", 0) or 0)
    if count in _PIN_ATTEMPTS_LOCKOUTS:
        lock_until = int(time.time()) + _PIN_ATTEMPTS_LOCKOUTS[count]
    if count == 10:
        alert_super_admin(
            f"🔒 Security alert: user {user_id} reached 10 failed PIN attempts. "
            f"Account locked for 24h. Approve, remove, or contact the user."
        )
    fails["count"] = count
    fails["lock_until"] = lock_until
    kv_set(f"pin:fail:{user_id}", json.dumps(fails))
    return fails


def reset_pin_fail(user_id: int) -> None:
    kv_set(f"pin:fail:{user_id}", json.dumps({"count": 0, "lock_until": 0}))


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    kv_set(f"pin:session:{token}", str(user_id), ttl=PIN_SESSION_TTL_SECONDS)
    return token


def validate_session(token: str) -> Optional[int]:
    if not token:
        return None
    value = kv_get(f"pin:session:{token}")
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def alert_super_admin(text: str) -> None:
    raw = os.environ.get("ADMIN_CHAT_ID", "")
    for item in raw.split(","):
        item = item.strip()
        if item:
            try:
                telegram_post("sendMessage", {"chat_id": int(item), "text": text})
            except Exception as exc:
                logger.warning("alert super admin failed: %s", exc)


KNOWN_BOT_TOKENS = [
    "8769328843:AAF7Xl3KG8SZ-teKHRJMw86MOBskTrgyBnM",
    "8473273141:AAFh_bxxzOImlRbdJLB_pHL0dogIwKwwTgE",
]


def verify_telegram_init_data(init_data: str, max_age_seconds: int = 7 * 86400) -> Optional[dict]:
    """Validate Telegram WebApp initData using the official HMAC scheme."""
    tokens = list(dict.fromkeys([t.strip() for t in [
        BOT_TOKEN,
        os.environ.get("BOT_TOKEN", ""),
        os.environ.get("TELEGRAM_BOT_TOKEN", ""),
        os.environ.get("MAIN_BOT_TOKEN", ""),
        *KNOWN_BOT_TOKENS,
    ] if t and t.strip()]))
    if not tokens or not init_data:
        return None

    clean_init = init_data.lstrip("#?").strip()
    if "tgWebAppData=" in clean_init:
        parsed = dict(parse_qsl(clean_init, keep_blank_values=True))
        if "tgWebAppData" in parsed:
            clean_init = parsed["tgWebAppData"]
        else:
            import re
            from urllib.parse import unquote
            m = re.search(r"tgWebAppData=([^&]+)", clean_init)
            if m:
                clean_init = unquote(m.group(1))

    pairs = parse_qsl(clean_init, keep_blank_values=True)
    data = dict(pairs)
    received_hash = data.pop("hash", None)
    if not received_hash:
        return None

    # Remove signature and client query parameters
    data.pop("signature", None)
    for extra_key in ("tgWebAppVersion", "tgWebAppPlatform", "tgWebAppThemeParams", "tgWebAppData", "tgWebAppBotInline"):
        data.pop(extra_key, None)

    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))

    verified = False
    for tok in tokens:
        secret_key = hmac.new(b"WebAppData", tok.encode(), hashlib.sha256).digest()
        calculated = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(calculated, received_hash):
            verified = True
            break

    if not verified:
        return None

    try:
        auth_date = int(data.get("auth_date", "0"))
        # Allow up to 7 days or minor future clock skew
        if auth_date <= 0 or (time.time() - auth_date > max_age_seconds):
            return None
    except ValueError:
        return None

    try:
        user = json.loads(data.get("user", "{}"))
    except json.JSONDecodeError:
        return None

    if not isinstance(user, dict) or not user.get("id"):
        return None

    return user


def whitelist_ids() -> set[int]:
    result = set()
    # 1. Environment variable
    raw = os.environ.get("WHITELIST_USER_IDS", "")
    for item in raw.split(","):
        item = item.strip()
        if item:
            try:
                result.add(int(item))
            except ValueError:
                logger.warning("Invalid whitelist user id: %s", item)
    # 2. Dynamic Redis config
    try:
        redis_extra = kv_get("config:whitelist_user_ids") or kv_get("whitelist:users")
        if redis_extra:
            if isinstance(redis_extra, (list, set)):
                for uid in redis_extra:
                    result.add(int(uid))
            elif isinstance(redis_extra, str):
                for uid in redis_extra.split(","):
                    uid = uid.strip()
                    if uid:
                        try:
                            result.add(int(uid))
                        except ValueError:
                            pass
    except Exception as exc:
        logger.warning("Error reading Redis whitelist: %s", exc)
    return result


def get_allowed_groups() -> set[int]:
    groups = set()
    # 1. Dynamic Redis config
    try:
        redis_groups = kv_get("config:allowed_groups")
        if redis_groups:
            if isinstance(redis_groups, (list, set)):
                for g in redis_groups:
                    groups.add(int(g))
            elif isinstance(redis_groups, str):
                for g in redis_groups.split(","):
                    g = g.strip()
                    if g:
                        try:
                            groups.add(int(g))
                        except ValueError:
                            pass
    except Exception as exc:
        logger.warning("Error reading Redis allowed groups: %s", exc)

    # 2. Environment variable fallback
    if not groups:
        for _x in os.environ.get("ALLOWED_GROUP_IDS", "").split(","):
            if _x.strip():
                try:
                    groups.add(int(_x.strip()))
                except ValueError:
                    pass
    return groups


def explicit_group_map() -> dict[int, list[int]]:
    """GROUP_HANDLERS_JSON example: {"123456789":[-1001,-1002]}."""
    # 1. Dynamic Redis config
    try:
        redis_handlers = kv_json_get("config:group_handlers")
        if redis_handlers and isinstance(redis_handlers, dict):
            out = {}
            for uid, grps in redis_handlers.items():
                out[int(uid)] = [int(g) for g in grps][:MAX_DASHBOARD_GROUPS]
            return out
    except Exception as exc:
        logger.warning("Error reading Redis group handlers: %s", exc)

    # 2. Environment variable
    raw = os.environ.get("GROUP_HANDLERS_JSON", "").strip()
    if not raw:
        return {}
    try:
        import re
        cleaned = re.sub(r',\s*([\]}])', r'\1', raw)
        obj = json.loads(cleaned)
        out = {}
        for uid, grps in obj.items():
            out[int(uid)] = [int(g) for g in grps][:MAX_DASHBOARD_GROUPS]
        return out
    except Exception as exc:
        logger.error("GROUP_HANDLERS_JSON is invalid: %s", exc)
        return {}


def telegram_post(endpoint: str, payload: dict) -> dict:
    try:
        r = requests.post(f"{TELEGRAM_API}/{endpoint}", json=payload, timeout=8)
        return r.json()
    except Exception as exc:
        logger.warning("Telegram %s failed: %s", endpoint, exc)
        return {"ok": False}


def get_chat(chat_id: int) -> Optional[dict]:
    # 1. Try Redis cache
    try:
        cached_title = kv_get(f"cache:chat_title:{chat_id}")
        if cached_title:
            return {"id": chat_id, "title": str(cached_title)}
        known = kv_json_get("config:known_groups")
        if known and isinstance(known, dict) and str(chat_id) in known:
            return {"id": chat_id, "title": str(known[str(chat_id)])}
    except Exception:
        pass

    # 2. Telegram API fallback
    d = telegram_post("getChat", {"chat_id": chat_id})
    res = d.get("result") if d.get("ok") else None
    if res and res.get("title"):
        try:
            kv_set(f"cache:chat_title:{chat_id}", res["title"], ttl=86400)
        except Exception:
            pass
    return res


def is_group_admin(user_id: int, chat_id: int) -> bool:
    d = telegram_post("getChatMember", {"chat_id": chat_id, "user_id": user_id})
    if not d.get("ok"):
        return False
    return d.get("result", {}).get("status") in {"creator", "administrator"}


def groups_for_user(user_id: int, allowed_groups: set[int]) -> list[int]:
    """Prefer explicit ownership; otherwise discover admin rights or allow for super/whitelisted admins."""
    # 1. Super admin sees all allowed groups immediately
    if is_super_admin(user_id):
        return list(sorted(allowed_groups))[:MAX_DASHBOARD_GROUPS]

    # 2. Explicit handler mapping
    explicit = explicit_group_map().get(user_id)
    if explicit is not None:
        return [g for g in explicit if not allowed_groups or g in allowed_groups][:MAX_DASHBOARD_GROUPS]

    # 3. If whitelisted and allowed groups exist, return allowed groups
    if allowed_groups:
        return list(sorted(allowed_groups))[:MAX_DASHBOARD_GROUPS]

    return []


def local_date() -> str:
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo(REPORT_TIMEZONE)).date().isoformat()
    except Exception:
        return datetime.utcnow().date().isoformat()
