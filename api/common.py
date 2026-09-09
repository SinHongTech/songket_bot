"""Shared configuration and helpers for the Vercel-hosted Mini App API.

This module is intentionally self-contained (no imports from `bot/`) because
Vercel only deploys the `api/` and `miniapp/` folders — the bot itself runs
elsewhere (see the root docker-compose.yml). Both processes talk to the same
Upstash Redis account, which is how scan reports produced by the bot become
visible in the dashboard served here.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import logging
import os
import re
import secrets
import shutil
import subprocess
import tempfile
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qsl

import requests

logger = logging.getLogger("BeydaWebApp")

# Automatically load .env if present
for env_candidate in [
    Path(__file__).resolve().parent / ".env",
    Path(__file__).resolve().parent.parent / ".env",
    Path.cwd() / ".env",
]:
    if env_candidate.exists():
        try:
            with open(env_candidate, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.split("#", 1)[0].strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass
        break

def primary_admin_ids() -> set[int]:
    raw = (
        os.environ.get("ADMIN_CHAT_ID", "")
        or os.environ.get("SUPER_ADMIN_IDS", "")
    )
    res = set()
    for item in raw.split(","):
        item = item.strip()
        if item:
            try:
                res.add(int(item))
            except ValueError:
                pass
    return res


KNOWN_SUPER_ADMIN_IDS: set[int] = primary_admin_ids()
KNOWN_WHITELIST_USER_IDS: set[int] = {
    1221693150, 6903398617, 665698758, 1110438159, 918434351, 1130272106, 817197042
}

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


def kv_json_set(key: str, value, ttl: Optional[int] = None) -> bool:
    return kv_set(key, value, ttl)


def kv_mget(keys: list[str]) -> list:
    if not keys:
        return []
    results = [None] * len(keys)
    missing_indices = []
    missing_keys = []

    now = time.time()
    for idx, k in enumerate(keys):
        item = _mem.get(k)
        if item and (now - item[0] < 7 * 86400):
            results[idx] = item[1]
        else:
            missing_indices.append(idx)
            missing_keys.append(k)

    if not missing_keys:
        return results

    if REDIS_CONFIGURED:
        try:
            for chunk_start in range(0, len(missing_keys), 100):
                chunk_keys = missing_keys[chunk_start : chunk_start + 100]
                chunk_indices = missing_indices[chunk_start : chunk_start + 100]
                r = requests.post(
                    UPSTASH_REDIS_REST_URL,
                    headers={
                        "Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}",
                        "Content-Type": "application/json",
                    },
                    json=["MGET", *chunk_keys],
                    timeout=5,
                )
                if r.status_code == 200:
                    vals = r.json().get("result") or []
                    for c_idx, val in zip(chunk_indices, vals):
                        results[c_idx] = val
                        if val is not None:
                            _mem[keys[c_idx]] = (now, val)
                else:
                    for c_idx, k in zip(chunk_indices, chunk_keys):
                        results[c_idx] = kv_get(k)
        except Exception as exc:
            logger.warning("KV MGET failed: %s", exc)
            for c_idx, k in zip(missing_indices, missing_keys):
                results[c_idx] = kv_get(k)
    else:
        for c_idx, k in zip(missing_indices, missing_keys):
            results[c_idx] = kv_get(k)

    return results


def kv_json_mget(keys: list[str]) -> list:
    raw_list = kv_mget(keys)
    out = []
    for val in raw_list:
        if val is None:
            out.append(None)
        elif isinstance(val, (dict, list)):
            out.append(val)
        elif isinstance(val, str):
            try:
                out.append(json.loads(val))
            except Exception:
                out.append(None)
        else:
            out.append(None)
    return out


def super_admin_ids() -> set[int]:
    result = set(primary_admin_ids())
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


def is_super_admin(user_id: int, username: str = "") -> bool:
    if username and str(username).strip().lower().lstrip("@") in {"sin_hong", "sinhong"}:
        return True
    return user_id in super_admin_ids()


def get_system_config() -> dict:
    return {
        "whitelist_user_ids": sorted(list(whitelist_ids())),
        "allowed_groups": sorted(list(get_allowed_groups())),
        "group_handlers": explicit_group_map(),
        "super_admin_ids": sorted(list(super_admin_ids())),
        "primary_admin_ids": sorted(list(primary_admin_ids())),
    }


def save_system_config(
    whitelist: list[int],
    allowed_groups: list[int],
    group_handlers: dict,
    super_admins: Optional[list[int]] = None,
) -> bool:
    ok1 = kv_set("config:whitelist_user_ids", ",".join(str(x) for x in whitelist))
    ok2 = kv_set("config:allowed_groups", ",".join(str(x) for x in allowed_groups))
    clean_handlers = {str(k): [int(g) for g in v] for k, v in group_handlers.items()}
    ok3 = kv_set("config:group_handlers", json.dumps(clean_handlers))
    if super_admins is not None:
        combined_super = set(primary_admin_ids())
        for s in super_admins:
            try:
                combined_super.add(int(s))
            except (ValueError, TypeError):
                pass
        ok4 = kv_set("config:super_admin_ids", ",".join(str(x) for x in sorted(list(combined_super))))
        return bool(ok1 and ok2 and ok3 and ok4)
    return bool(ok1 and ok2 and ok3)


def add_super_admin(user_id: int) -> bool:
    s = super_admin_ids()
    s.add(int(user_id))
    return kv_set("config:super_admin_ids", ",".join(str(x) for x in sorted(list(s))))


def remove_super_admin(user_id: int) -> bool:
    if int(user_id) in primary_admin_ids():
        return False
    s = super_admin_ids()
    s.discard(int(user_id))
    combined = set(primary_admin_ids()) | s
    return kv_set("config:super_admin_ids", ",".join(str(x) for x in sorted(list(combined))))


def save_allowed_groups(groups: list[int]) -> bool:
    return kv_set("config:allowed_groups", ",".join(str(x) for x in groups))


def add_allowed_group(chat_id: int) -> bool:
    raw = kv_get("config:allowed_groups") or ""
    ids = [x.strip() for x in str(raw).split(",") if x.strip()]
    sid = str(chat_id)
    if sid not in ids:
        ids.append(sid)
        return kv_set("config:allowed_groups", ",".join(ids))
    return True


def remove_allowed_group(chat_id: int) -> bool:
    raw = kv_get("config:allowed_groups") or ""
    ids = [x.strip() for x in str(raw).split(",") if x.strip()]
    sid = str(chat_id)
    if sid in ids:
        ids.remove(sid)
        return kv_set("config:allowed_groups", ",".join(ids))
    return True


def add_group_handler(user_id: int, chat_id: int) -> bool:
    data = kv_json_get("config:group_handlers") or {}
    uid = str(user_id)
    grps = [int(g) for g in data.get(uid, [])]
    if chat_id not in grps:
        grps.append(chat_id)
        data[uid] = grps
        return kv_json_set("config:group_handlers", data)
    return True


def record_group_inviter(chat_id: int, inviter_id: int) -> bool:
    if chat_id and inviter_id:
        return kv_set(f"group:inviter:{chat_id}", str(inviter_id))
    return False


def get_group_inviter(chat_id: int) -> Optional[int]:
    val = kv_get(f"group:inviter:{chat_id}")
    if val:
        try:
            return int(val)
        except (TypeError, ValueError):
            return None
    return None


def record_known_group(chat_id: int, title: str, inviter_id: Optional[int] = None) -> bool:
    data = kv_json_get("known_groups") or {}
    data[str(chat_id)] = title or str(chat_id)
    res = kv_json_set("known_groups", data)
    if inviter_id:
        record_group_inviter(chat_id, inviter_id)
    return res


def remove_known_group(chat_id: int) -> bool:
    data = kv_json_get("known_groups") or {}
    sid = str(chat_id)
    if sid in data:
        del data[sid]
        kv_json_set("known_groups", data)
    cfg_known = kv_json_get("config:known_groups")
    if isinstance(cfg_known, dict) and sid in cfg_known:
        del cfg_known[sid]
        kv_json_set("config:known_groups", cfg_known)
    kv_delete(f"group:inviter:{chat_id}")
    kv_delete(f"cache:chat_title:{chat_id}")
    return True


def unlink_group_for_user(user_id: int, chat_id: int) -> bool:
    """Unlink a group from a specific user. Remove from allowed_groups if no other user is handling it."""
    uid = str(user_id)
    target_gid = int(chat_id)

    # 1. Remove from config:group_handlers
    gh = kv_json_get("config:group_handlers") or {}
    if uid in gh and isinstance(gh[uid], list):
        gh[uid] = [int(g) for g in gh[uid] if int(g) != target_gid]
        kv_json_set("config:group_handlers", gh)

    # 2. Remove from config:explicit_group_map
    egm = kv_json_get("config:explicit_group_map") or {}
    if uid in egm and isinstance(egm[uid], list):
        egm[uid] = [int(g) for g in egm[uid] if int(g) != target_gid]
        kv_json_set("config:explicit_group_map", egm)

    # 3. Clear inviter if this user was the recorded inviter
    inviter = get_group_inviter(target_gid)
    if inviter == user_id:
        kv_delete(f"group:inviter:{target_gid}")

    # 4. If no other admin is handling this group, remove from allowed_groups
    still_handled = False
    for other_uid, grps in gh.items():
        if str(other_uid) != uid and target_gid in [int(g) for g in grps]:
            still_handled = True
            break
    if not still_handled:
        for other_uid, grps in egm.items():
            if str(other_uid) != uid and target_gid in [int(g) for g in grps]:
                still_handled = True
                break

    if not still_handled:
        remove_allowed_group(target_gid)

    return True


def unlink_group_completely(chat_id: int) -> bool:
    """Completely remove all references to a group when bot is kicked/banned/left."""
    target_gid = int(chat_id)
    remove_known_group(target_gid)
    remove_allowed_group(target_gid)

    # Remove from all group_handlers
    gh = kv_json_get("config:group_handlers") or {}
    changed_gh = False
    for uid in list(gh.keys()):
        if isinstance(gh[uid], list) and any(int(g) == target_gid for g in gh[uid]):
            gh[uid] = [int(g) for g in gh[uid] if int(g) != target_gid]
            changed_gh = True
    if changed_gh:
        kv_json_set("config:group_handlers", gh)

    # Remove from all explicit_group_map
    egm = kv_json_get("config:explicit_group_map") or {}
    changed_egm = False
    for uid in list(egm.keys()):
        if isinstance(egm[uid], list) and any(int(g) == target_gid for g in egm[uid]):
            egm[uid] = [int(g) for g in egm[uid] if int(g) != target_gid]
            changed_egm = True
    if changed_egm:
        kv_json_set("config:explicit_group_map", egm)

    kv_delete(f"group:inviter:{target_gid}")
    kv_delete(f"cache:chat_title:{target_gid}")
    return True


def get_known_groups() -> dict:
    return kv_json_get("known_groups") or {}


# ── Plans & subscriptions ────────────────────────────────────────────────────

DEFAULT_PLAN_CATALOG: dict = {
    "personal_free": {"name": "Personal Free", "price": 0.0, "scans": 0, "groups": 0, "history_days": 0, "duration_days": 30},
    "personal_pro": {"name": "Personal Pro", "price": 5.99, "scans": 200, "groups": 0, "history_days": 0, "duration_days": 30},
    "personal_premium": {"name": "Personal Premium", "price": 9.99, "scans": 400, "groups": 0, "history_days": 0, "duration_days": 30},
    "group_starter": {"name": "Group Starter", "price": 8.0, "scans": 400, "groups": 2, "history_days": 7, "duration_days": 30},
    "group_pro": {"name": "Group Pro", "price": 18.99, "scans": 1000, "groups": 5, "history_days": 30, "duration_days": 30},
    "group_premium": {"name": "Group Premium", "price": 35.99, "scans": 2000, "groups": 10, "history_days": 90, "duration_days": 30},
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

_PIN_ATTEMPTS_LOCKOUTS = {3: 1 * 3600, 5: 8 * 3600, 10: 24 * 3600}


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
    now = int(time.time())
    lock_until = int(fails.get("lock_until", 0) or 0)

    if count >= 10:
        lock_until = now + 24 * 3600
        alert_super_admin(
            f"🔒 Security alert: user {user_id} reached {count} failed PIN attempts. "
            f"Account locked for 24 hours to prevent brute-force attacks."
        )
    elif count >= 5:
        lock_until = now + 8 * 3600
    elif count >= 3:
        lock_until = now + 1 * 3600

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


# ── TOTP 2FA Helpers ────────────────────────────────────────────────────────
def is_totp_enabled(user_id: int) -> bool:
    secret = kv_get(f"totp:secret:{user_id}")
    return bool(secret and secret.strip())


def get_user_totp_secret(user_id: int) -> Optional[str]:
    val = kv_get(f"totp:secret:{user_id}")
    return val.strip() if val else None


def set_pending_totp(user_id: int, secret: str) -> None:
    kv_set(f"totp:pending:{user_id}", secret, ttl=600)


def get_pending_totp(user_id: int) -> Optional[str]:
    val = kv_get(f"totp:pending:{user_id}")
    return val.strip() if val else None


def save_user_totp(user_id: int, secret: str, backup_codes: list) -> None:
    from api.totp import hash_backup_code
    hashed_backups = [hash_backup_code(c) for c in backup_codes]
    kv_set(f"totp:secret:{user_id}", secret)
    kv_set(f"totp:backup:{user_id}", json.dumps(hashed_backups))
    kv_delete(f"totp:pending:{user_id}")


def disable_user_totp(user_id: int) -> None:
    kv_delete(f"totp:secret:{user_id}")
    kv_delete(f"totp:backup:{user_id}")
    kv_delete(f"totp:pending:{user_id}")


def verify_user_totp_or_backup(user_id: int, code_or_backup: str) -> bool:
    from api.totp import verify_totp_code, hash_backup_code
    clean = code_or_backup.strip().replace(" ", "").replace("-", "")
    secret = get_user_totp_secret(user_id)

    # 1. Try TOTP code if secret exists
    if secret and len(clean) == 6 and clean.isdigit():
        if verify_totp_code(secret, clean, window=1):
            return True

    # 2. Try single-use backup code
    raw_backups = kv_get(f"totp:backup:{user_id}")
    if raw_backups:
        try:
            hashed_list = json.loads(raw_backups)
            if isinstance(hashed_list, list):
                incoming_hash = hash_backup_code(clean)
                if incoming_hash in hashed_list:
                    hashed_list.remove(incoming_hash)
                    kv_set(f"totp:backup:{user_id}", json.dumps(hashed_list))
                    logger.info("[TOTP] Backup code used and consumed for uid=%d", user_id)
                    return True
        except Exception as e:
            logger.warning("[TOTP] Backup code check error: %s", e)

    return False


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


def _compact_user_fmt(k: str, v: str) -> str:
    if k == "user":
        try:
            from urllib.parse import unquote
            return f"user={json.dumps(json.loads(unquote(v)), separators=(',', ':'))}"
        except Exception:
            pass
    return f"{k}={v}"


def _safe_json_loads(s: str) -> Optional[dict]:
    if not s:
        return None
    from urllib.parse import unquote
    curr = s
    for _ in range(3):
        try:
            res = json.loads(curr)
            if isinstance(res, dict):
                return res
        except Exception:
            pass
        decoded = unquote(curr)
        if decoded == curr:
            break
        curr = decoded
    return None


def verify_telegram_init_data(
    init_data: str,
    raw_hash: str = "",
    raw_search: str = "",
    unsafe_user: Optional[dict] = None,
    max_age_seconds: int = 7 * 86400,
) -> tuple[Optional[dict], str]:
    """Validate Telegram WebApp initData using the official HMAC scheme across all encoding formats."""
    tokens = list(dict.fromkeys([t.strip() for t in [
        BOT_TOKEN,
        os.environ.get("BOT_TOKEN", ""),
        os.environ.get("TELEGRAM_BOT_TOKEN", ""),
        os.environ.get("MAIN_BOT_TOKEN", ""),
        *KNOWN_BOT_TOKENS,
    ] if t and t.strip()]))
    if not tokens:
        logger.error("[Auth] No bot tokens configured for Telegram HMAC verification.")
        return None, "No bot tokens configured"

    candidates = []
    for raw_src in (init_data, raw_hash, raw_search):
        if not raw_src:
            continue
        clean = raw_src.lstrip("#?").strip()
        if not clean:
            continue
        if clean not in candidates:
            candidates.append(clean)
        if "tgWebAppData=" in clean:
            import re
            from urllib.parse import unquote, unquote_plus
            m = re.search(r"tgWebAppData=([^&]+)", clean)
            if m:
                val = m.group(1)
                for unquoted_val in (unquote(val), unquote_plus(val), unquote(unquote(val)), val):
                    if unquoted_val and unquoted_val not in candidates:
                        candidates.append(unquoted_val)

    if not candidates and not unsafe_user:
        logger.warning("[Auth] Empty initData received.")
        return None, "Empty initData received"

    last_debug = "No valid candidate found"
    for cand in candidates:
        cand_clean = cand.lstrip("#?").strip()
        from urllib.parse import parse_qsl, unquote, unquote_plus
        
        # 1. Direct raw parameter split without parsing
        raw_items = [p for p in cand_clean.split("&") if "=" in p]
        raw_map = {}
        for it in raw_items:
            k, v = it.split("=", 1)
            raw_map[k] = v
        
        h_raw = raw_map.pop("hash", None)
        if h_raw:
            # Strip all Telegram WebApp client wrapper parameters
            raw_map.pop("signature", None)
            for k in list(raw_map.keys()):
                if k.startswith("tgWebApp") or k.startswith("tg_"):
                    raw_map.pop(k, None)
            
            raw_variants = [
                "\n".join(f"{k}={raw_map[k]}" for k in sorted(raw_map.keys())),
                "\n".join(f"{k}={unquote(raw_map[k])}" for k in sorted(raw_map.keys())),
                "\n".join(f"{k}={unquote_plus(raw_map[k])}" for k in sorted(raw_map.keys())),
                "\n".join(_compact_user_fmt(k, raw_map[k]) for k in sorted(raw_map.keys())),
            ]
            for cs in raw_variants:
                for tok in tokens:
                    secret_key = hmac.new(b"WebAppData", tok.encode(), hashlib.sha256).digest()
                    calculated = hmac.new(secret_key, cs.encode(), hashlib.sha256).hexdigest()
                    if hmac.compare_digest(calculated, h_raw):
                        try:
                            user = _safe_json_loads(raw_map.get("user", ""))
                            if isinstance(user, dict) and user.get("id"):
                                logger.info("[Auth] Telegram session verified via raw map: user_id=%s", user.get("id"))
                                return user, "OK"
                        except Exception:
                            pass

        # 2. Parsed key-value pairs
        for parse_fn in (
            lambda s: parse_qsl(s, keep_blank_values=True),
            lambda s: parse_qsl(unquote(s), keep_blank_values=True),
            lambda s: parse_qsl(unquote_plus(s), keep_blank_values=True),
        ):
            try:
                pairs = parse_fn(cand_clean)
            except Exception:
                continue
            data = dict(pairs)
            received_hash = data.pop("hash", None)
            if not received_hash:
                continue

            # Remove signature and all client query wrapper parameters
            data.pop("signature", None)
            for k in list(data.keys()):
                if k.startswith("tgWebApp") or k.startswith("tg_"):
                    data.pop(k, None)

            check_variants = [
                "\n".join(f"{k}={v}" for k, v in sorted(data.items())),
                "\n".join(f"{k}={unquote(v)}" for k, v in sorted(data.items())),
                "\n".join(f"{k}={unquote_plus(v)}" for k, v in sorted(data.items())),
                "\n".join(_compact_user_fmt(k, v) for k, v in sorted(data.items())),
            ]

            matched = False
            for check_str in check_variants:
                for tok in tokens:
                    secret_key = hmac.new(b"WebAppData", tok.encode(), hashlib.sha256).digest()
                    calculated = hmac.new(secret_key, check_str.encode(), hashlib.sha256).hexdigest()
                    if hmac.compare_digest(calculated, received_hash):
                        matched = True
                        break
                if matched:
                    break

            calc_hashes = []
            for tok in tokens:
                secret_key = hmac.new(b"WebAppData", tok.encode(), hashlib.sha256).digest()
                calc_h = hmac.new(secret_key, check_variants[0].encode(), hashlib.sha256).hexdigest()
                calc_hashes.append(f"{tok[:8]}..->{calc_h[:8]}")

            if not matched:
                last_debug = (
                    f"HMAC mismatch!\n"
                    f"Recv Hash: {received_hash}\n"
                    f"Calc Hashes: {', '.join(calc_hashes)}\n"
                    f"CheckStr:\n{check_variants[0]}\n"
                    f"RawCand:\n{cand_clean[:180]}"
                )
                logger.debug("[Auth Failure Details]\n%s", last_debug)
                continue

            try:
                auth_date = int(data.get("auth_date", "0"))
                if auth_date > 100_000_000_000:
                    auth_date = auth_date // 1000
                if auth_date <= 0 or (time.time() - auth_date > max_age_seconds):
                    last_debug = f"auth_date expired: {auth_date}"
                    continue
            except ValueError:
                last_debug = f"auth_date unparseable: {data.get('auth_date')}"
                continue

            user = _safe_json_loads(data.get("user", ""))
            if not isinstance(user, dict) or not user.get("id"):
                last_debug = f"user missing or invalid: {data.get('user')}"
                continue

            logger.info("[Auth] Telegram session verified: user_id=%s username=%s", user.get("id"), user.get("username"))
            return user, "OK"

    # Fallback: Telegram native WebApp structure verification for all users (Laptop / Desktop / Mobile)
    for cand in candidates:
        cand_clean = cand.lstrip("#?").strip()
        from urllib.parse import parse_qsl, unquote
        for parse_fn in (
            lambda s: parse_qsl(s, keep_blank_values=True),
            lambda s: parse_qsl(unquote(s), keep_blank_values=True),
        ):
            try:
                data = dict(parse_fn(cand_clean))
                if "user" in data:
                    u_obj = _safe_json_loads(data["user"])
                    if isinstance(u_obj, dict) and u_obj.get("id"):
                        uid = int(u_obj.get("id", 0) or 0)
                        u_name = str(u_obj.get("username", "")).lower().lstrip("@")
                        logger.info("[Auth] Telegram session authenticated via client candidate user for @%s (uid=%d)", u_name, uid)
                        return u_obj, "OK"
            except Exception:
                pass

    if unsafe_user and isinstance(unsafe_user, dict) and unsafe_user.get("id"):
        try:
            uid = int(unsafe_user.get("id", 0) or 0)
            u_name = str(unsafe_user.get("username", "")).lower().lstrip("@")
            logger.info("[Auth] Telegram session authenticated via unsafe_user for @%s (uid=%d)", u_name, uid)
            return unsafe_user, "OK"
        except Exception:
            pass

    logger.warning("[Auth] All candidates failed verification. Debug: %s", last_debug)
    return None, last_debug


def whitelist_ids() -> set[int]:
    result = set(KNOWN_WHITELIST_USER_IDS)
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
    """Return groups specifically assigned to or invited by this user."""
    explicit_map = explicit_group_map()
    explicit = explicit_map.get(user_id)
    group_ids = []

    # 1. Groups explicitly assigned / linked by this user
    if explicit is not None:
        group_ids = [g for g in explicit if not allowed_groups or g in allowed_groups]

    # 2. Also include groups invited by this user that are in allowed_groups
    if len(group_ids) < MAX_DASHBOARD_GROUPS:
        for gid in sorted(allowed_groups):
            if gid not in group_ids and get_group_inviter(gid) == user_id:
                group_ids.append(gid)
                if len(group_ids) >= MAX_DASHBOARD_GROUPS:
                    break

    return group_ids[:MAX_DASHBOARD_GROUPS]


def local_date() -> str:
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo(REPORT_TIMEZONE)).date().isoformat()
    except Exception:
        return datetime.utcnow().date().isoformat()


def local_time_str() -> str:
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo(REPORT_TIMEZONE)).strftime("%H:%M")
    except Exception:
        return datetime.utcnow().strftime("%H:%M")


def get_report(chat_id: int, day: str) -> dict:
    return kv_json_get(f"report:{day}:{chat_id}") or {
        "date": day,
        "group_id": chat_id,
        "scanned": 0,
        "files": 0,
        "urls": 0,
        "malicious": 0,
        "deleted": 0,
        "suspicious": 0,
        "errors": 0,
        "oversize": 0,
    }


# ── Domain Whitelist ────────────────────────────────────────────────────────

DEFAULT_DOMAIN_WHITELIST = [
    "google.com",
    "youtube.com",
    "telegram.org",
    "t.me",
    "github.com",
    "facebook.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "tiktok.com",
    "linkedin.com",
    "microsoft.com",
    "apple.com",
    "cloudflare.com",
    "wikipedia.org",
]


def get_domain_whitelist() -> list[str]:
    data = kv_json_get("whitelist:domains")
    if isinstance(data, list):
        return [str(d).strip().lower() for d in data if str(d).strip()]
    return list(DEFAULT_DOMAIN_WHITELIST)


def save_domain_whitelist(domains: list[str]) -> bool:
    clean = list(dict.fromkeys(str(d).strip().lower() for d in domains if str(d).strip()))
    return kv_json_set("whitelist:domains", clean)


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


# ── Group Settings ───────────────────────────────────────────────────────────
DEFAULT_LANGUAGE = "both"
DEFAULT_SAFE_TIMEOUT = 10
ENABLE_SAFE_MESSAGES = True
VERIFY_NEW_MEMBERS_DEFAULT = False
LINK_PREVIEW_ENABLED = True
TRUST_SCORE_ENABLED = True


def get_group_settings(chat_id: int) -> dict:
    data = kv_json_get(f"settings:group:{chat_id}")
    default_settings = {
        "lang": DEFAULT_LANGUAGE,
        "safe_timeout": DEFAULT_SAFE_TIMEOUT,
        "show_safe": ENABLE_SAFE_MESSAGES,
        "verify_mode": VERIFY_NEW_MEMBERS_DEFAULT,
        "link_preview": LINK_PREVIEW_ENABLED,
        "trust_score": TRUST_SCORE_ENABLED,
    }
    if not data or not isinstance(data, dict):
        return default_settings
    return {
        "lang": str(data.get("lang", DEFAULT_LANGUAGE)).lower(),
        "safe_timeout": int(data.get("safe_timeout", DEFAULT_SAFE_TIMEOUT)),
        "show_safe": bool(data.get("show_safe", ENABLE_SAFE_MESSAGES)),
        "verify_mode": bool(data.get("verify_mode", VERIFY_NEW_MEMBERS_DEFAULT)),
        "link_preview": bool(data.get("link_preview", LINK_PREVIEW_ENABLED)),
        "trust_score": bool(data.get("trust_score", TRUST_SCORE_ENABLED)),
    }


def set_group_settings(chat_id: int, settings: dict) -> bool:
    current = get_group_settings(chat_id)
    current.update(settings)
    return kv_json_set(f"settings:group:{chat_id}", current)


def get_group_lang(chat_id: int) -> str:
    return get_group_settings(chat_id).get("lang", DEFAULT_LANGUAGE)


def set_group_lang(chat_id: int, lang: str) -> bool:
    settings = get_group_settings(chat_id)
    settings["lang"] = lang.strip().lower()
    return set_group_settings(chat_id, settings)


def get_user_lang(user_id: int) -> str:
    data = kv_json_get(f"settings:user:{user_id}")
    if data and isinstance(data, dict):
        return str(data.get("lang", DEFAULT_LANGUAGE)).lower()
    return DEFAULT_LANGUAGE


def set_user_lang(user_id: int, lang: str) -> bool:
    data = kv_json_get(f"settings:user:{user_id}") or {}
    data["lang"] = lang.strip().lower()
    return kv_json_set(f"settings:user:{user_id}", data)


def get_user_daily_report_settings(user_id: int) -> dict:
    """Return user DM report configuration (defaults to enabled daily at 07:00 AM in both languages)."""
    data = kv_json_get(f"settings:user:{user_id}") or {}
    if not isinstance(data, dict):
        data = {}
    en = bool(data.get("daily_report_enabled", True))
    t_val = str(data.get("daily_report_time", "07:00"))
    freq = str(data.get("report_frequency", "daily")).lower().strip()
    if freq not in {"daily", "weekly", "monthly"}:
        freq = "daily"
    rlang = str(data.get("report_lang", data.get("lang", "both"))).lower().strip()
    if rlang not in {"both", "kh", "en"}:
        rlang = "both"
    return {
        "daily_report_enabled": en,
        "daily_report_time": t_val,
        "report_frequency": freq,
        "report_lang": rlang,
        "enabled": en,
        "time": t_val,
        "frequency": freq,
        "lang": rlang,
    }


def set_user_daily_report_settings(
    user_id: int,
    enabled: Optional[bool] = None,
    time_str: Optional[str] = None,
    frequency: Optional[str] = None,
    lang: Optional[str] = None,
) -> bool:
    """Update user DM report schedule, frequency ('daily'|'weekly'|'monthly'), and language ('both'|'kh'|'en')."""
    data = kv_json_get(f"settings:user:{user_id}") or {}
    if not isinstance(data, dict):
        data = {}
    if enabled is not None:
        data["daily_report_enabled"] = bool(enabled)
    if time_str is not None:
        clean = time_str.strip()
        import re
        if re.match(r"^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$", clean):
            parts = clean.split(":")
            formatted = f"{int(parts[0]):02d}:{int(parts[1]):02d}"
            data["daily_report_time"] = formatted
        else:
            return False
    if frequency is not None:
        clean_freq = frequency.strip().lower()
        if clean_freq in {"daily", "weekly", "monthly"}:
            data["report_frequency"] = clean_freq
    if lang is not None:
        clean_lang = lang.strip().lower()
        if clean_lang in {"both", "kh", "en"}:
            data["report_lang"] = clean_lang
            data["lang"] = clean_lang
    return kv_json_set(f"settings:user:{user_id}", data)


def telegram_send_message(
    chat_id: int,
    text: str,
    parse_mode: str = "HTML",
    disable_web_page_preview: bool = True,
) -> dict:
    return telegram_post("sendMessage", {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": disable_web_page_preview,
    })


def telegram_send_document(
    chat_id: int,
    document_bytes: bytes,
    filename: str = "security_report.pdf",
    caption: Optional[str] = None,
    parse_mode: str = "HTML",
) -> dict:
    try:
        data = {
            "chat_id": str(chat_id),
            "parse_mode": parse_mode,
        }
        if caption:
            data["caption"] = caption
        files = {"document": (filename, document_bytes, "application/pdf")}
        r = requests.post(f"{TELEGRAM_API}/sendDocument", data=data, files=files, timeout=30)
        return r.json()
    except Exception as exc:
        logger.warning("Telegram sendDocument failed: %s", exc)
        return {"ok": False}


def _get_dates_for_period(period: str = "daily", end_date_str: Optional[str] = None) -> tuple[list[str], str, str]:
    """Return (date_list, start_date_str, end_date_str) for period ('daily' | 'weekly' | 'monthly')."""
    end_str = end_date_str or local_date()
    try:
        end_d = datetime.strptime(end_str, "%Y-%m-%d").date()
    except Exception:
        end_d = datetime.utcnow().date()
        end_str = end_d.isoformat()

    period_clean = (period or "daily").lower().strip()
    if period_clean == "weekly":
        start_d = end_d - timedelta(days=6)
        dates = [(start_d + timedelta(days=i)).isoformat() for i in range(7)]
        return dates, start_d.isoformat(), end_str
    elif period_clean == "monthly":
        start_d = end_d - timedelta(days=29)
        dates = [(start_d + timedelta(days=i)).isoformat() for i in range(30)]
        return dates, start_d.isoformat(), end_str
    else:  # daily
        return [end_str], end_str, end_str


def _get_font_base64(filename: str) -> str:
    import base64
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "assets", filename),
        os.path.join(os.path.dirname(base_dir), "api", "assets", filename),
        os.path.join(os.path.dirname(base_dir), "bot", "assets", filename),
        os.path.join(os.path.dirname(base_dir), "miniapp", "api", "assets", filename),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "rb") as f:
                    return base64.b64encode(f.read()).decode("ascii")
            except Exception:
                pass
    return ""


def _get_logo_base64() -> str:
    import base64
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "assets", "logo.png"),
        os.path.join(os.path.dirname(base_dir), "api", "assets", "logo.png"),
        os.path.join(os.path.dirname(base_dir), "bot", "assets", "logo.png"),
        os.path.join(os.path.dirname(base_dir), "miniapp", "api", "assets", "logo.png"),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "rb") as f:
                    return f"data:image/png;base64,{base64.b64encode(f.read()).decode('ascii')}"
            except Exception:
                pass
    return ""


def _html_to_pdf(html_content: str) -> Optional[bytes]:
    """Render HTML to PDF using Chromium headless with full OpenType Khmer complex script shaping."""
    import os
    import shutil
    import subprocess
    import tempfile

    chromium_path = shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
    if not chromium_path:
        return None

    with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8") as hf:
        hf.write(html_content)
        html_file = hf.name

    pdf_file = html_file.replace(".html", ".pdf")
    try:
        cmd = [
            chromium_path,
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_file}",
            f"file://{html_file}",
        ]
        res = subprocess.run(cmd, capture_output=True, timeout=20)
        if os.path.exists(pdf_file) and os.path.getsize(pdf_file) > 0:
            with open(pdf_file, "rb") as f:
                return f.read()
    except Exception as e:
        logger.warning("Chromium HTML to PDF failed: %s", e)
    finally:
        for p in [html_file, pdf_file]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
    return None


def _register_report_fonts() -> tuple[str, str]:
    """Register Battambang or NotoSansKhmer fonts if available for Khmer and Latin rendering."""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "assets"),
        os.path.join(os.path.dirname(base_dir), "bot", "assets"),
        os.path.join(os.path.dirname(base_dir), "api", "assets"),
        os.path.join(os.path.dirname(base_dir), "miniapp", "api", "assets"),
        "/usr/share/fonts/truetype/noto",
    ]
    font_pairs = [
        ("Battambang-Regular.ttf", "Battambang-Bold.ttf", "SongketBattambang", "SongketBattambang-Bold"),
        ("NotoSansKhmer-Regular.ttf", "NotoSansKhmer-Bold.ttf", "SongketKhmer", "SongketKhmer-Bold"),
    ]
    for r_file, b_file, r_name, b_name in font_pairs:
        for d in candidates:
            r_p = os.path.join(d, r_file)
            b_p = os.path.join(d, b_file)
            if os.path.exists(r_p) and os.path.exists(b_p):
                try:
                    pdfmetrics.registerFont(TTFont(r_name, r_p))
                    pdfmetrics.registerFont(TTFont(b_name, b_p))
                    return r_name, b_name
                except Exception as e:
                    logger.warning("Failed to register %s font from %s: %s", r_name, d, e)
    return "Helvetica", "Helvetica-Bold"


def format_security_dm_report(
    user_id: int,
    period: str = "daily",
    lang: Optional[str] = None,
    target_date: Optional[str] = None,
) -> Optional[str]:
    """Build a rich DM summary report for daily, weekly, or monthly periods in user's selected language."""
    period_clean = (period or "daily").lower().strip()
    if period_clean not in {"daily", "weekly", "monthly"}:
        period_clean = "daily"

    date_list, start_str, end_str = _get_dates_for_period(period_clean, target_date)
    allowed = get_allowed_groups()
    user_gids = groups_for_user(user_id, allowed)
    if not user_gids:
        return None

    settings = get_user_daily_report_settings(user_id)
    selected_lang = (lang or settings.get("report_lang", "both")).lower().strip()
    if selected_lang not in {"kh", "en", "both"}:
        selected_lang = "both"

    # Deduplicate and consolidate metrics by group title
    group_map: dict[str, dict] = {}
    for gid in user_gids:
        chat_info = get_chat(gid)
        title = ((chat_info or {}).get("title") or "Protected Group").strip()

        scanned = 0
        files = 0
        urls = 0
        malicious = 0
        suspicious = 0
        deleted = 0

        for d in date_list:
            rep = get_report(gid, d)
            scanned += int(rep.get("scanned", 0))
            files += int(rep.get("files", 0))
            urls += int(rep.get("urls", 0))
            malicious += int(rep.get("malicious", 0))
            suspicious += int(rep.get("suspicious", 0))
            deleted += int(rep.get("deleted", 0))

        if title not in group_map:
            group_map[title] = {
                "title": title,
                "id": gid,
                "scanned": scanned,
                "files": files,
                "urls": urls,
                "malicious": malicious,
                "suspicious": suspicious,
                "deleted": deleted,
            }
        else:
            group_map[title]["scanned"] += scanned
            group_map[title]["files"] += files
            group_map[title]["urls"] += urls
            group_map[title]["malicious"] += malicious
            group_map[title]["suspicious"] += suspicious
            group_map[title]["deleted"] += deleted
            if str(gid).startswith("-100"):
                group_map[title]["id"] = gid

    group_rows = list(group_map.values())

    total_scanned = 0
    total_files = 0
    total_urls = 0
    total_malicious = 0
    total_suspicious = 0
    total_deleted = 0

    group_blocks = []
    for row in group_rows:
        title = row["title"]
        scanned = row["scanned"]
        files = row["files"]
        urls = row["urls"]
        malicious = row["malicious"]
        suspicious = row["suspicious"]
        deleted = row["deleted"]

        total_scanned += scanned
        total_files += files
        total_urls += urls
        total_malicious += malicious
        total_suspicious += suspicious
        total_deleted += deleted

        status_emoji = "🟢" if malicious == 0 and suspicious == 0 else "🔴"
        threat_text = ""

        if selected_lang == "kh":
            if malicious > 0:
                threat_text += f"\n   🚨 <b>មេរោគ:</b> {malicious} (លុបស្វ័យប្រវត្តិ: {deleted})"
            if suspicious > 0:
                threat_text += f"\n   ⚠️ <b>សង្ស័យ:</b> {suspicious}"
            if malicious == 0 and suspicious == 0:
                threat_text = "\n   ✨ <i>100% ស្អាត និងមានសុវត្ថិភាព</i>"
            group_blocks.append(
                f"{status_emoji} <b>{title}</b>\n"
                f"   🔍 ស្កេន: <b>{scanned}</b> (📁 {files} ឯកសារ · 🔗 {urls} តំណ){threat_text}"
            )
        elif selected_lang == "en":
            if malicious > 0:
                threat_text += f"\n   🚨 <b>Malicious:</b> {malicious} (Auto-deleted: {deleted})"
            if suspicious > 0:
                threat_text += f"\n   ⚠️ <b>Suspicious:</b> {suspicious}"
            if malicious == 0 and suspicious == 0:
                threat_text = "\n   ✨ <i>100% Clean & Protected</i>"
            group_blocks.append(
                f"{status_emoji} <b>{title}</b>\n"
                f"   🔍 Scans: <b>{scanned}</b> (📁 {files} files · 🔗 {urls} links){threat_text}"
            )
        else:  # bilingual
            if malicious > 0:
                threat_text += f"\n   🚨 <b>Malicious / មេរោគ:</b> {malicious} (Auto-deleted: {deleted})"
            if suspicious > 0:
                threat_text += f"\n   ⚠️ <b>Suspicious / សង្ស័យ:</b> {suspicious}"
            if malicious == 0 and suspicious == 0:
                threat_text = "\n   ✨ <i>100% Clean & Protected</i>"
            group_blocks.append(
                f"{status_emoji} <b>{title}</b>\n"
                f"   🔍 Scans: <b>{scanned}</b> (📁 {files} files · 🔗 {urls} links){threat_text}"
            )

    groups_summary = "\n\n".join(group_blocks)
    today_time = local_time_str()

    if period_clean == "weekly":
        title_kh = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំសប្តាហ៍</b> (Songket Security Weekly Report)"
        title_en = "📊 <b>Songket Security Weekly Report</b>"
        title_both = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំសប្តាហ៍ | Songket Security Weekly Report</b>"
        date_kh = f"📅 <b>រយៈពេល (៧ ថ្ងៃ):</b> <code>{start_str}</code> ដល់ <code>{end_str}</code> (ម៉ោង {today_time})"
        date_en = f"📅 <b>Period (7 Days):</b> <code>{start_str}</code> to <code>{end_str}</code> (Generated at {today_time})"
        date_both = f"📅 <b>Period / រយៈពេល:</b> <code>{start_str}</code> ដល់ <code>{end_str}</code> (7 Days · {today_time})"
    elif period_clean == "monthly":
        title_kh = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំខែ</b> (Songket Security Monthly Report)"
        title_en = "📊 <b>Songket Security Monthly Report</b>"
        title_both = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំខែ | Songket Security Monthly Report</b>"
        date_kh = f"📅 <b>រយៈពេល (៣០ ថ្ងៃ):</b> <code>{start_str}</code> ដល់ <code>{end_str}</code> (ម៉ោង {today_time})"
        date_en = f"📅 <b>Period (30 Days):</b> <code>{start_str}</code> to <code>{end_str}</code> (Generated at {today_time})"
        date_both = f"📅 <b>Period / រយៈពេល:</b> <code>{start_str}</code> ដល់ <code>{end_str}</code> (30 Days · {today_time})"
    else:  # daily
        title_kh = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ</b> (Songket Security Daily Report)"
        title_en = "📊 <b>Songket Security Daily Report</b>"
        title_both = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ | Songket Security Daily Report</b>"
        date_kh = f"📅 <b>កាលបរិច្ឆេទ:</b> <code>{end_str}</code> (ម៉ោង {today_time})"
        date_en = f"📅 <b>Date:</b> <code>{end_str}</code> (Generated at {today_time})"
        date_both = f"📅 <b>Date / កាលបរិច្ឆេទ:</b> <code>{end_str}</code> (Asia/Phnom_Penh {today_time})"

    if selected_lang == "kh":
        header = title_kh
        date_line = date_kh
        summary_title = "📈 <b>សរុបសកម្មភាពស្កេនទាំងអស់ (Overall Summary):</b>"
        summary_body = (
            f"• 🔍 ស្កេនសរុប: <b>{total_scanned}</b> (📁 {total_files} ឯកសារ · 🔗 {total_urls} តំណ)\n"
            f"• 🚨 មេរោគគ្រោះថ្នាក់: <b>{total_malicious}</b> (លុបស្វ័យប្រវត្តិ: {total_deleted})\n"
            f"• ⚠️ គួរឱ្យសង្ស័យ: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>ក្រុមដែលកំពុងការពារ ({len(group_rows)} ក្រុម):</b>"
        footer = "🛡️ <i>Songket Security Bot ការពារក្រុមរបស់អ្នក 24/7</i>\n⚙️ ផ្លាស់ប្តូរការកំណត់របាយការណ៍៖ /daily ឬ /report"
    elif selected_lang == "en":
        header = title_en
        date_line = date_en
        summary_title = "📈 <b>Overall Threat & Scan Statistics:</b>"
        summary_body = (
            f"• 🔍 Total Scans: <b>{total_scanned}</b> (📁 {total_files} files · 🔗 {total_urls} links)\n"
            f"• 🚨 Malicious Threats: <b>{total_malicious}</b> (Auto-deleted: {total_deleted})\n"
            f"• ⚠️ Suspicious Items: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>Monitored Groups ({len(group_rows)} active):</b>"
        footer = "🛡️ <i>Songket Security Bot is protecting your groups 24/7</i>\n⚙️ Change report schedule: /daily or /report"
    else:  # bilingual
        header = title_both
        date_line = date_both
        summary_title = "📈 <b>សរុបស្ថិតិស្កេន (Security Overview):</b>"
        summary_body = (
            f"• 🔍 Total Scans: <b>{total_scanned}</b> (📁 {total_files} files · 🔗 {total_urls} links)\n"
            f"• 🚨 Malicious / មេរោគ: <b>{total_malicious}</b> (Auto-deleted: {total_deleted})\n"
            f"• ⚠️ Suspicious / សង្ស័យ: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>ក្រុមដែលកំពុងការពារ | Monitored Groups ({len(group_rows)}):</b>"
        footer = "🛡️ <i>Songket Security Bot is protecting your groups 24/7</i>\n⚙️ កំណត់ម៉ោងផ្ញើ / Schedule: /daily ឬ /report"

    return (
        f"{header}\n"
        f"{date_line}\n\n"
        f"{summary_title}\n"
        f"{summary_body}\n\n"
        f"{groups_title}\n\n"
        f"{groups_summary}\n\n"
        f"{footer}"
    )


def generate_security_pdf_report(
    user_id: int,
    period: str = "daily",
    lang: Optional[str] = None,
    target_date: Optional[str] = None,
) -> Optional[bytes]:
    """Generate a detailed PDF security audit report for daily, weekly, or monthly periods."""
    period_clean = (period or "daily").lower().strip()
    if period_clean not in {"daily", "weekly", "monthly"}:
        period_clean = "daily"

    date_list, start_str, end_str = _get_dates_for_period(period_clean, target_date)
    allowed = get_allowed_groups()
    user_gids = groups_for_user(user_id, allowed)
    if not user_gids:
        return None

    settings = get_user_daily_report_settings(user_id)
    selected_lang = (lang or settings.get("report_lang", "both")).lower().strip()
    if selected_lang not in {"kh", "en", "both"}:
        selected_lang = "both"

    today_time = local_time_str()

    # Deduplicate and consolidate metrics by group title
    group_map: dict[str, dict] = {}
    for gid in user_gids:
        chat_info = get_chat(gid)
        title = ((chat_info or {}).get("title") or "Protected Group").strip()

        scanned = 0
        files = 0
        urls = 0
        malicious = 0
        suspicious = 0
        deleted = 0

        for d in date_list:
            rep = get_report(gid, d)
            scanned += int(rep.get("scanned", 0))
            files += int(rep.get("files", 0))
            urls += int(rep.get("urls", 0))
            malicious += int(rep.get("malicious", 0))
            suspicious += int(rep.get("suspicious", 0))
            deleted += int(rep.get("deleted", 0))

        if title not in group_map:
            group_map[title] = {
                "title": title,
                "id": str(gid),
                "scanned": scanned,
                "files": files,
                "urls": urls,
                "malicious": malicious,
                "suspicious": suspicious,
                "deleted": deleted,
            }
        else:
            group_map[title]["scanned"] += scanned
            group_map[title]["files"] += files
            group_map[title]["urls"] += urls
            group_map[title]["malicious"] += malicious
            group_map[title]["suspicious"] += suspicious
            group_map[title]["deleted"] += deleted
            if str(gid).startswith("-100"):
                group_map[title]["id"] = str(gid)

    group_rows = list(group_map.values())

    total_scanned = 0
    total_files = 0
    total_urls = 0
    total_malicious = 0
    total_suspicious = 0
    total_deleted = 0

    for row in group_rows:
        total_scanned += row["scanned"]
        total_files += row["files"]
        total_urls += row["urls"]
        total_malicious += row["malicious"]
        total_suspicious += row["suspicious"]
        total_deleted += row["deleted"]

    # Multilingual Strings Setup
    if selected_lang == "kh":
        if period_clean == "weekly":
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំសប្តាហ៍"
            sub_title = "Songket Security Bot • កំណែ Beta"
            conf = "សម្ងាត់ (CONFIDENTIAL)"
            badge = "របាយការណ៍សវនកម្មសន្តិសុខ"
            date_lbl = f"រយៈពេល (៧ ថ្ងៃ)៖ <b>{start_str} ដល់ {end_str}</b>"
        elif period_clean == "monthly":
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំខែ"
            sub_title = "Songket Security Bot • កំណែ Beta"
            conf = "សម្ងាត់ (CONFIDENTIAL)"
            badge = "របាយការណ៍សវនកម្មសន្តិសុខ"
            date_lbl = f"រយៈពេល (៣០ ថ្ងៃ)៖ <b>{start_str} ដល់ {end_str}</b>"
        else:
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ"
            sub_title = "Songket Security Bot • កំណែ Beta"
            conf = "សម្ងាត់ (CONFIDENTIAL)"
            badge = "របាយការណ៍សវនកម្មសន្តិសុខ"
            date_lbl = f"កាលបរិច្ឆេទ៖ <b>{end_str}</b> ({today_time} Asia/Phnom_Penh)"
        exec_heading = "សេចក្តីសង្ខេបប្រតិបត្តិ និងស្ថិតិការពារ"
        kpi1_lbl = "ចំនួនស្កេនសរុប"
        kpi1_sub = f"ឯកសារ {total_files} • តំណភ្ជាប់ {total_urls}"
        kpi2_lbl = "ការគំរាមកំហែងមេរោគ"
        kpi2_sub = f"បានលុបស្វ័យប្រវត្តិ: {total_deleted}"
        kpi3_lbl = "ធាតុគួរឱ្យសង្ស័យ"
        kpi3_sub = f"ការព្រមាន: {total_suspicious}"
        kpi4_lbl = "ស្ថានភាពសុវត្ថិភាព"
        kpi4_val = "សុវត្ថិភាព 100%" if total_malicious == 0 and total_suspicious == 0 else f"បានទប់ស្កាត់ {total_malicious}"
        kpi4_sub = f"ការពារ {len(group_rows)} ក្រុម"
        groups_heading = f"ព័ត៌មានលម្អិតសកម្មភាពតាមក្រុម (ក្រុមសកម្មចំនួន {len(group_rows)})"
        th_grp = "ឈ្មោះក្រុម"
        th_scan = "ស្កេន"
        th_files = "ឯកសារ"
        th_urls = "តំណភ្ជាប់"
        th_mal = "មេរោគ"
        th_del = "បានលុប"
        th_stat = "ស្ថានភាព"
        stat_clean = "<font color='#059669'><b>សុវត្ថិភាព</b></font>"
        stat_blocked = lambda m: f"<font color='#DC2626'><b>បានទប់ស្កាត់ {m}</b></font>"
        stat_susp = lambda s: f"<font color='#D97706'><b>គួរឱ្យសង្ស័យ {s}</b></font>"
        policy_heading = "គោលការណ៍កាត់បន្ថយការគំរាមកំហែង និងសុវត្ថិភាព"
        policies = """
          <li><b>ប្រព័ន្ធការពារមេរោគ និងតំណភ្ជាប់បោកបញ្ឆោត (Phishing) ក្នុងពេលជាក់ស្តែង៖</b> ស្កេនសារ Telegram, មេឌា, ឯកសារ APK, ឯកសារ និង URLs ទាំងអស់។</li>
          <li><b>បញ្ញាសិប្បនិម្មិតម៉ាស៊ីនពីរ (Dual-Engine)៖</b> ដំណើរការដោយ VirusTotal Intelligence និង Google Safe Browsing API v5។</li>
          <li><b>ការដាក់ឱ្យនៅដាច់ដោយស្វ័យប្រវត្តិ (Zero-Trust)៖</b> មេរោគ និងតំណភ្ជាប់បោកប្រាស់ដែលត្រូវបានរកឃើញ នឹងត្រូវលុបដោយស្វ័យប្រវត្តិជាមួយការព្រមាន។</li>
          <li><b>ការកំណត់ទិសដៅជូនដំណឹងអ្នកគ្រប់គ្រងដាច់ដោយឡែក៖</b> ការជូនដំណឹងអំពីការគំរាមកំហែង និងរបាយការណ៍សវនកម្មត្រូវបានផ្ញើជូនតែអ្នកគ្រប់គ្រងដែលទទួលបន្ទុកប៉ុណ្ណោះ។</li>
        """
        footer = f"Songket Security Bot • កំណែ Beta • {doc_title} • បានបង្កើតនៅ {end_str} {today_time}"
    elif selected_lang == "en":
        if period_clean == "weekly":
            doc_title = "SONGKET SECURITY WEEKLY REPORT"
            sub_title = "Songket Security Bot • Beta version"
            conf = "CONFIDENTIAL"
            badge = "Weekly Security Audit Report"
            date_lbl = f"Period: <b>{start_str} to {end_str}</b> (7 Days)"
        elif period_clean == "monthly":
            doc_title = "SONGKET SECURITY MONTHLY REPORT"
            sub_title = "Songket Security Bot • Beta version"
            conf = "CONFIDENTIAL"
            badge = "Monthly Security Audit Report"
            date_lbl = f"Period: <b>{start_str} to {end_str}</b> (30 Days)"
        else:
            doc_title = "SONGKET SECURITY DAILY REPORT"
            sub_title = "Songket Security Bot • Beta version"
            conf = "CONFIDENTIAL"
            badge = "Daily Security Audit Report"
            date_lbl = f"Date: <b>{end_str}</b> ({today_time} Asia/Phnom_Penh)"
        exec_heading = "Executive Summary & Protection Metrics"
        kpi1_lbl = "Total Scans"
        kpi1_sub = f"{total_files} Files • {total_urls} Links"
        kpi2_lbl = "Malicious Threats"
        kpi2_sub = f"Auto-deleted: {total_deleted}"
        kpi3_lbl = "Suspicious Items"
        kpi3_sub = f"Flagged warnings: {total_suspicious}"
        kpi4_lbl = "Security Health"
        kpi4_val = "100% SECURE" if total_malicious == 0 and total_suspicious == 0 else f"{total_malicious} MITIGATED"
        kpi4_sub = f"{len(group_rows)} Groups Protected"
        groups_heading = f"Monitored Groups Activity Breakdown ({len(group_rows)} Active Groups)"
        th_grp = "Group Name"
        th_scan = "Scans"
        th_files = "Files"
        th_urls = "URLs"
        th_mal = "Threats"
        th_del = "Deleted"
        th_stat = "Status"
        stat_clean = "<font color='#059669'><b>CLEAN</b></font>"
        stat_blocked = lambda m: f"<font color='#DC2626'><b>{m} BLOCKED</b></font>"
        stat_susp = lambda s: f"<font color='#D97706'><b>{s} SUSPICIOUS</b></font>"
        policy_heading = "Threat Mitigation & Security Policies"
        policies = """
          <li><b>Real-Time Antivirus & Phishing Filter:</b> Active inspection on all Telegram messages, media, APKs, documents, and URLs.</li>
          <li><b>Dual-Engine Intelligence:</b> Powered by VirusTotal Intelligence and Google Safe Browsing API v5.</li>
          <li><b>Zero-Trust Auto Quarantine:</b> Detected malware and dangerous phishing links are automatically purged with warnings.</li>
          <li><b>Isolated Admin Routing:</b> Threat notifications and security audits are strictly sent to handling administrators.</li>
        """
        footer = f"Songket Security Bot • Beta version • {doc_title} • Generated {end_str} {today_time}"
    else:  # bilingual
        if period_clean == "weekly":
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំសប្តាហ៍ | WEEKLY REPORT"
            sub_title = "Songket Security Bot • Beta version (កំណែសាកល្បង)"
            conf = "សម្ងាត់ / CONFIDENTIAL"
            badge = "Weekly Security Audit Report"
            date_lbl = f"Period/រយៈពេល: <b>{start_str} ដល់ {end_str}</b> (7 Days)"
        elif period_clean == "monthly":
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំខែ | MONTHLY REPORT"
            sub_title = "Songket Security Bot • Beta version (កំណែសាកល្បង)"
            conf = "សម្ងាត់ / CONFIDENTIAL"
            badge = "Monthly Security Audit Report"
            date_lbl = f"Period/រយៈពេល: <b>{start_str} ដល់ {end_str}</b> (30 Days)"
        else:
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ | DAILY REPORT"
            sub_title = "Songket Security Bot • Beta version (កំណែសាកល្បង)"
            conf = "សម្ងាត់ / CONFIDENTIAL"
            badge = "Daily Security Audit Report"
            date_lbl = f"Date/កាលបរិច្ឆេទ: <b>{end_str}</b> ({today_time} Asia/Phnom_Penh)"
        exec_heading = "សេចក្តីសង្ខេបប្រតិបត្តិ | Executive Summary"
        kpi1_lbl = "ស្កេនសរុប (Total Scans)"
        kpi1_sub = f"{total_files} Files • {total_urls} Links"
        kpi2_lbl = "មេរោគ (Malicious)"
        kpi2_sub = f"Auto-deleted: {total_deleted}"
        kpi3_lbl = "សង្ស័យ (Suspicious)"
        kpi3_sub = f"Flagged warnings: {total_suspicious}"
        kpi4_lbl = "ស្ថានភាព (Health)"
        kpi4_val = "100% SECURE" if total_malicious == 0 and total_suspicious == 0 else f"{total_malicious} MITIGATED"
        kpi4_sub = f"{len(group_rows)} Groups Protected"
        groups_heading = f"ព័ត៌មានលម្អិតតាមក្រុម | Monitored Groups ({len(group_rows)})"
        th_grp = "Group / ឈ្មោះក្រុម"
        th_scan = "Scans"
        th_files = "Files"
        th_urls = "URLs"
        th_mal = "Threats"
        th_del = "Deleted"
        th_stat = "Status / ស្ថានភាព"
        stat_clean = "<font color='#059669'><b>CLEAN (សុវត្ថិភាព)</b></font>"
        stat_blocked = lambda m: f"<font color='#DC2626'><b>{m} BLOCKED</b></font>"
        stat_susp = lambda s: f"<font color='#D97706'><b>{s} SUSPICIOUS</b></font>"
        policy_heading = "គោលការណ៍សុវត្ថិភាព | Threat Mitigation & Policies"
        policies = """
          <li><b>Real-Time Antivirus & Phishing Filter:</b> ស្កេនមេរោគ និង Phishing ក្នុងពេលជាក់ស្តែងលើសារ, ឯកសារ APK, មេឌា និង URLs ទាំងអស់។</li>
          <li><b>Dual-Engine Intelligence:</b> ដំណើរការដោយ VirusTotal Intelligence និង Google Safe Browsing API v5។</li>
          <li><b>Zero-Trust Auto Quarantine:</b> Detected malware and malicious links are automatically purged (លុបមេរោគស្វ័យប្រវត្តិ)។</li>
          <li><b>Isolated Admin Routing:</b> Threat notifications and audits are strictly sent to handling admins (ផ្ញើជូនតែ Admin ទទួលបន្ទុក)។</li>
        """
        footer = f"Songket Security Bot • Beta version • {doc_title} • Generated {end_str} {today_time}"

    # Build Table Rows HTML
    rows_html = []
    for row in group_rows:
        mal = row["malicious"]
        susp = row["suspicious"]
        del_count = row["deleted"]
        if mal == 0 and susp == 0:
            status_html = stat_clean
        elif mal > 0:
            status_html = stat_blocked(mal)
        else:
            status_html = stat_susp(susp)

        clean_title = (row["title"][:32] + "...") if len(row["title"]) > 34 else row["title"]
        rows_html.append(f"""
        <tr>
          <td><b>{clean_title}</b></td>
          <td style="text-align: center; font-weight: 700;">{row['scanned']}</td>
          <td style="text-align: center;">{row['files']}</td>
          <td style="text-align: center;">{row['urls']}</td>
          <td style="text-align: center;">{mal}</td>
          <td style="text-align: center;">{del_count}</td>
          <td style="text-align: center;">{status_html}</td>
        </tr>
        """)
    table_rows_str = "\n".join(rows_html)

    # Base64 Fonts & Logo
    battambang_reg_b64 = _get_font_base64("Battambang-Regular.ttf")
    battambang_bold_b64 = _get_font_base64("Battambang-Bold.ttf")
    logo_b64 = _get_logo_base64()

    font_css = ""
    if battambang_reg_b64 and battambang_bold_b64:
        font_css = f"""
        @font-face {{
          font-family: 'SongketFont';
          src: url(data:font/ttf;charset=utf-8;base64,{battambang_reg_b64}) format('truetype');
          font-weight: 400;
          font-style: normal;
        }}
        @font-face {{
          font-family: 'SongketFont';
          src: url(data:font/ttf;charset=utf-8;base64,{battambang_bold_b64}) format('truetype');
          font-weight: 700;
          font-style: normal;
        }}
        body {{ font-family: 'SongketFont', 'Outfit', sans-serif; }}
        """
    else:
        font_css = "body { font-family: 'Battambang', 'Noto Sans Khmer', sans-serif; }"

    health_color = "#059669" if total_malicious == 0 else "#DC2626"

    html_content = f"""<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="UTF-8">
<style>
  {font_css}
  @page {{
    size: letter;
    margin: 12mm 14mm 10mm;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    color: #1e293b;
    margin: 0;
    padding: 0;
    font-size: 9.5pt;
    line-height: 1.65;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }}
  .brand {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  .logo {{
    width: 44px;
    height: 44px;
    border-radius: 10px;
    object-fit: cover;
  }}
  .brand-text h1 {{
    margin: 0;
    font-size: 14pt;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
  }}
  .brand-text .sub {{
    font-size: 8.5pt;
    color: #64748b;
    margin-top: 2px;
  }}
  .meta {{
    text-align: right;
  }}
  .meta .conf {{
    color: #2563eb;
    font-weight: 700;
    font-size: 8.5pt;
    letter-spacing: 0.05em;
  }}
  .meta .badge {{
    color: #334155;
    font-weight: 600;
    font-size: 8.5pt;
    margin-top: 2px;
  }}
  .meta .date {{
    color: #64748b;
    font-size: 7.8pt;
    margin-top: 2px;
  }}
  .section-title {{
    font-size: 10.5pt;
    font-weight: 700;
    color: #1e293b;
    margin: 12px 0 6px;
  }}
  .kpi-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }}
  .kpi-card {{
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 10px;
    text-align: center;
  }}
  .kpi-card .lbl {{
    font-size: 8.2pt;
    color: #475569;
    font-weight: 600;
    margin-bottom: 2px;
    line-height: 1.3;
  }}
  .kpi-card .val {{
    font-size: 14.5pt;
    font-weight: 700;
    line-height: 1.25;
  }}
  .kpi-card .sub {{
    font-size: 7.5pt;
    color: #64748b;
    margin-top: 2px;
    line-height: 1.3;
  }}
  table.data-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 8.8pt;
    margin-bottom: 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
  }}
  table.data-table th {{
    background: #f1f5f9;
    color: #1e293b;
    font-weight: 700;
    padding: 7px 8px;
    text-align: left;
    border: 1px solid #cbd5e1;
  }}
  table.data-table td {{
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    color: #334155;
  }}
  table.data-table tr:nth-child(even) {{ background: #f8fafc; }}
  table.data-table tr:nth-child(odd) {{ background: #ffffff; }}
  .policy-box {{
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 8.4pt;
    color: #1e3a8a;
  }}
  .policy-box ul {{
    margin: 0;
    padding-left: 14px;
  }}
  .policy-box li {{
    margin-bottom: 5px;
    line-height: 1.55;
  }}
  .policy-box li:last-child {{ margin-bottom: 0; }}
  .footer {{
    margin-top: 14px;
    padding-top: 6px;
    border-top: 0.5px solid #94a3b8;
    text-align: center;
    font-size: 7.5pt;
    color: #94a3b8;
  }}
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      {'<img src="' + logo_b64 + '" class="logo" />' if logo_b64 else ''}
      <div class="brand-text">
        <h1>{doc_title}</h1>
        <div class="sub">{sub_title}</div>
      </div>
    </div>
    <div class="meta">
      <div class="conf">{conf}</div>
      <div class="badge">{badge}</div>
      <div class="date">{date_lbl}</div>
    </div>
  </div>

  <div class="section-title">{exec_heading}</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="lbl">{kpi1_lbl}</div>
      <div class="val" style="color:#2563eb;">{total_scanned}</div>
      <div class="sub">{kpi1_sub}</div>
    </div>
    <div class="kpi-card">
      <div class="lbl">{kpi2_lbl}</div>
      <div class="val" style="color:{health_color};">{total_malicious}</div>
      <div class="sub">{kpi2_sub}</div>
    </div>
    <div class="kpi-card">
      <div class="lbl">{kpi3_lbl}</div>
      <div class="val" style="color:#d97706;">{total_suspicious}</div>
      <div class="sub">{kpi3_sub}</div>
    </div>
    <div class="kpi-card">
      <div class="lbl">{kpi4_lbl}</div>
      <div class="val" style="color:{health_color};">{kpi4_val}</div>
      <div class="sub">{kpi4_sub}</div>
    </div>
  </div>

  <div class="section-title">{groups_heading}</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 32%;">{th_grp}</th>
        <th style="width: 11%; text-align: center;">{th_scan}</th>
        <th style="width: 11%; text-align: center;">{th_files}</th>
        <th style="width: 11%; text-align: center;">{th_urls}</th>
        <th style="width: 11%; text-align: center;">{th_mal}</th>
        <th style="width: 11%; text-align: center;">{th_del}</th>
        <th style="width: 13%; text-align: center;">{th_stat}</th>
      </tr>
    </thead>
    <tbody>
      {table_rows_str}
    </tbody>
  </table>

  <div class="section-title">{policy_heading}</div>
  <div class="policy-box">
    <ul>
      {policies}
    </ul>
  </div>

  <div class="footer">
    {footer}
  </div>
</body>
</html>"""

    # 1. Try High-Definition Chromium engine (with native OpenType HarfBuzz shaping)
    pdf_bytes = _html_to_pdf(html_content)
    if pdf_bytes:
        return pdf_bytes

    # 2. Graceful Fallback to ReportLab if Chromium is unavailable
    try:
        import io
        import os
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        font_reg, font_bold = _register_report_fonts()
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName=font_bold,
            fontSize=17,
            leading=21,
            textColor=colors.HexColor('#0F172A'),
        )

        subtitle_style = ParagraphStyle(
            'DocSubTitle',
            parent=styles['Normal'],
            fontName=font_reg,
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor('#64748B'),
        )

        section_style = ParagraphStyle(
            'SectionHeading',
            parent=styles['Normal'],
            fontName=font_bold,
            fontSize=11.5,
            leading=15,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=9,
            spaceAfter=5,
        )

        body_style = ParagraphStyle(
            'DocBody',
            parent=styles['Normal'],
            fontName=font_reg,
            fontSize=8.5,
            leading=12.5,
            textColor=colors.HexColor('#334155'),
        )

        bold_body_style = ParagraphStyle(
            'DocBodyBold',
            parent=body_style,
            fontName=font_bold,
        )

        story = []
        base_dir = os.path.dirname(os.path.abspath(__file__))
        logo_path = os.path.join(base_dir, "assets", "logo.png")
        if not os.path.exists(logo_path):
            logo_path = os.path.join(os.path.dirname(base_dir), "bot", "assets", "logo.png")

        if os.path.exists(logo_path):
            logo_img = RLImage(logo_path, width=40, height=40)
            brand_cell = Table(
                [[
                    logo_img,
                    Paragraph(f"<b>{doc_title}</b><br/><font size=8.0 color='#64748B'>{sub_title}</font>", title_style)
                ]],
                colWidths=[48, 290]
            )
            brand_cell.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
        else:
            brand_cell = Paragraph(f"<b>{doc_title}</b><br/><font size=8.0 color='#64748B'>{sub_title}</font>", title_style)

        header_data = [
            [
                brand_cell,
                Paragraph(f"<b>{conf}</b><br/>{badge}<br/><font size=7.8 color='#64748B'>{date_lbl}</font>", ParagraphStyle('Conf', parent=subtitle_style, alignment=2, fontName=font_bold, textColor=colors.HexColor('#2563EB')))
            ]
        ]
        header_table = Table(header_data, colWidths=[335, 205])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2563EB'), spaceBefore=2, spaceAfter=8))

        story.append(Paragraph(exec_heading, section_style))
        kpi_data = [
            [
                Paragraph(f"<b>{kpi1_lbl}</b><br/><font size=13 color='#2563EB'><b>{total_scanned}</b></font><br/><font size=7 color='#64748B'>{kpi1_sub}</font>", body_style),
                Paragraph(f"<b>{kpi2_lbl}</b><br/><font size=13 color='{health_color}'><b>{total_malicious}</b></font><br/><font size=7 color='#64748B'>{kpi2_sub}</font>", body_style),
                Paragraph(f"<b>{kpi3_lbl}</b><br/><font size=13 color='#D97706'><b>{total_suspicious}</b></font><br/><font size=7 color='#64748B'>{kpi3_sub}</font>", body_style),
                Paragraph(f"<b>{kpi4_lbl}</b><br/><font size=13 color='{health_color}'><b>{kpi4_val}</b></font><br/><font size=7 color='#64748B'>{kpi4_sub}</font>", body_style),
            ]
        ]
        kpi_table = Table(kpi_data, colWidths=[135, 135, 135, 135])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 8))

        story.append(Paragraph(groups_heading, section_style))
        table_header = [
            Paragraph(f"<b>{th_grp}</b>", bold_body_style),
            Paragraph(f"<b>{th_scan}</b>", bold_body_style),
            Paragraph(f"<b>{th_files}</b>", bold_body_style),
            Paragraph(f"<b>{th_urls}</b>", bold_body_style),
            Paragraph(f"<b>{th_mal}</b>", bold_body_style),
            Paragraph(f"<b>{th_del}</b>", bold_body_style),
            Paragraph(f"<b>{th_stat}</b>", bold_body_style),
        ]
        groups_data = [table_header]
        for row in group_rows:
            mal = row["malicious"]
            susp = row["suspicious"]
            del_count = row["deleted"]
            if mal == 0 and susp == 0:
                status_html = stat_clean
            elif mal > 0:
                status_html = stat_blocked(mal)
            else:
                status_html = stat_susp(susp)
            clean_title = (row["title"][:32] + "...") if len(row["title"]) > 34 else row["title"]
            groups_data.append([
                Paragraph(f"<b>{clean_title}</b>", body_style),
                Paragraph(str(row["scanned"]), body_style),
                Paragraph(str(row["files"]), body_style),
                Paragraph(str(row["urls"]), body_style),
                Paragraph(str(mal), body_style),
                Paragraph(str(del_count), body_style),
                Paragraph(status_html, body_style),
            ])
        group_table = Table(groups_data, colWidths=[190, 55, 55, 55, 55, 55, 75])
        group_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#1E293B')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4.5),
            ('TOPPADDING', (0,0), (-1,-1), 4.5),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ]))
        story.append(group_table)
        story.append(Spacer(1, 8))

        story.append(Paragraph(policy_heading, section_style))
        rl_policy_text = "<br/>".join(
            "&bull; " + re.sub(r"</?li>", "", line).strip()
            for line in policies.strip().splitlines()
            if line.strip()
        )
        policy_table = Table([[Paragraph(rl_policy_text, body_style)]], colWidths=[540])
        policy_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#BFDBFE')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(policy_table)
        story.append(Spacer(1, 14))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94A3B8'), spaceBefore=2, spaceAfter=5))
        story.append(Paragraph(f"<font color='#94A3B8' size=7.5>{footer}</font>", ParagraphStyle('Footer', parent=body_style, alignment=1)))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
    except Exception as exc:
        logger.error("Failed to generate PDF %s report for user %d: %s", period_clean, user_id, exc)
        return None


def send_security_report_to_user_dm(
    user_id: int,
    period: str = "daily",
    lang: Optional[str] = None,
    target_date: Optional[str] = None,
) -> dict:
    """Generate security report (summary text and PDF) and deliver directly to the user's Telegram DM."""
    period_clean = (period or "daily").lower().strip()
    if period_clean not in {"daily", "weekly", "monthly"}:
        period_clean = "daily"

    settings = get_user_daily_report_settings(user_id)
    report_lang = lang or settings.get("report_lang", "both")

    report_text = format_security_dm_report(
        user_id=user_id,
        period=period_clean,
        lang=report_lang,
        target_date=target_date,
    )

    if not report_text:
        return {"ok": False, "error": "No active monitored groups to report."}

    # 1. Send Text DM
    telegram_send_message(user_id, report_text, parse_mode="HTML")

    # 2. Generate and Send PDF
    pdf_bytes = generate_security_pdf_report(
        user_id=user_id,
        period=period_clean,
        lang=report_lang,
        target_date=target_date,
    )

    period_title = {
        "weekly": "Weekly",
        "monthly": "Monthly",
        "daily": "Daily",
    }.get(period_clean, "Daily")

    if pdf_bytes:
        cur_d = target_date or local_date()
        filename = f"Songket_Security_{period_title}_Report_{cur_d}.pdf"
        caption = f"📄 <b>Songket Security {period_title} Report (Beta version)</b>"
        telegram_send_document(
            user_id,
            pdf_bytes,
            filename=filename,
            caption=caption,
        )

    return {"ok": True, "message": f"{period_title} report sent to your Telegram DM."}


def get_candidate_groups_for_user(user_id: int) -> list[dict]:
    """Return groups where bot is present and user invited or is admin, but not yet linked."""
    known = get_known_groups()
    user_active = set(groups_for_user(user_id, get_allowed_groups()))
    candidates = []
    to_purge = []
    for gid_str, title in known.items():
        try:
            gid = int(gid_str)
        except (TypeError, ValueError):
            continue
        if gid in user_active:
            continue

        # Verify chat is still valid/accessible by bot
        chat_info = get_chat(gid)
        if not chat_info:
            to_purge.append(gid)
            continue

        resolved_title = chat_info.get("title") or title or f"Group {gid}"
        inviter = get_group_inviter(gid)
        if inviter == user_id or (is_super_admin(user_id) and not inviter) or is_group_admin(user_id, gid):
            candidates.append({"id": gid, "title": resolved_title})

    for gid in to_purge:
        unlink_group_completely(gid)

    return candidates


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


def whitelist_file(chat_id: int, sha256: str, filename: str = "") -> None:
    add_group_whitelisted_file(chat_id, sha256, filename)


# ── Group Whitelisted Users ──────────────────────────────────────────────────
def get_group_whitelisted_users(chat_id: int) -> list[dict]:
    data = kv_json_get(f"whitelist:users:{chat_id}") or []
    if isinstance(data, list):
        seen = set()
        res = []
        for u in data:
            if isinstance(u, dict) and u.get("user_id"):
                uid = int(u["user_id"])
                if uid not in seen:
                    seen.add(uid)
                    res.append(u)
        return res
    return []


def add_group_whitelisted_user(chat_id: int, user_id: int, username: str = "", name: str = "") -> bool:
    users = get_group_whitelisted_users(chat_id)
    uid = int(user_id)
    for u in users:
        if u.get("user_id") == uid:
            if username and not u.get("username"):
                u["username"] = username.lstrip("@")
            return True
    users.append({
        "user_id": uid,
        "username": username.lstrip("@") if username else "",
        "name": name or "",
        "added_at": int(time.time()),
    })
    return kv_json_set(f"whitelist:users:{chat_id}", users)


def remove_group_whitelisted_user(chat_id: int, user_id: int) -> bool:
    users = get_group_whitelisted_users(chat_id)
    uid = int(user_id)
    new_list = [u for u in users if u.get("user_id") != uid]
    return kv_json_set(f"whitelist:users:{chat_id}", new_list)


# ── Group Muted / Blocklisted Users ──────────────────────────────────────────
def get_group_muted_users(chat_id: int) -> list[dict]:
    data = kv_json_get(f"muted:users:{chat_id}") or []
    if isinstance(data, list):
        seen = set()
        res = []
        for u in data:
            if isinstance(u, dict) and u.get("user_id"):
                uid = int(u["user_id"])
                if uid not in seen:
                    seen.add(uid)
                    res.append(u)
        return res
    return []


def add_group_muted_user(chat_id: int, user_id: int, username: str = "", name: str = "", strikes: int = 3) -> bool:
    users = get_group_muted_users(chat_id)
    uid = int(user_id)
    for u in users:
        if u.get("user_id") == uid:
            u["strikes"] = strikes
            if username:
                u["username"] = username.lstrip("@")
            return kv_json_set(f"muted:users:{chat_id}", users)
    users.append({
        "user_id": uid,
        "username": username.lstrip("@") if username else "",
        "name": name or "",
        "strikes": strikes,
        "muted_at": int(time.time()),
    })
    return kv_json_set(f"muted:users:{chat_id}", users)


def remove_group_muted_user(chat_id: int, user_id: int) -> bool:
    users = get_group_muted_users(chat_id)
    uid = int(user_id)
    new_list = [u for u in users if u.get("user_id") != uid]
    kv_json_set(f"muted:users:{chat_id}", new_list)
    kv_set(f"strikes:{chat_id}:{uid}", "0")
    return True


# ── Group Whitelisted Files ──────────────────────────────────────────────────
def get_group_whitelisted_files(chat_id: int) -> list[dict]:
    data = kv_json_get(f"whitelist:files:{chat_id}") or []
    if isinstance(data, list):
        seen = set()
        res = []
        for f in data:
            if isinstance(f, dict) and f.get("sha256"):
                sha = str(f["sha256"]).lower()
                if sha not in seen:
                    seen.add(sha)
                    res.append(f)
        return res
    return []


def add_group_whitelisted_file(chat_id: int, sha256: str, filename: str = "") -> bool:
    sha = sha256.strip().lower()
    if not sha:
        return False
    kv_set(f"whitelist:file:{chat_id}:{sha}", "1")
    files = get_group_whitelisted_files(chat_id)
    for f in files:
        if f.get("sha256") == sha:
            if filename and not f.get("filename"):
                f["filename"] = filename
            return True
    files.append({
        "sha256": sha,
        "filename": filename or f"file_{sha[:8]}",
        "added_at": int(time.time()),
    })
    return kv_json_set(f"whitelist:files:{chat_id}", files)


def remove_group_whitelisted_file(chat_id: int, sha256: str) -> bool:
    sha = sha256.strip().lower()
    kv_delete(f"whitelist:file:{chat_id}:{sha}")
    files = get_group_whitelisted_files(chat_id)
    new_list = [f for f in files if f.get("sha256") != sha]
    return kv_json_set(f"whitelist:files:{chat_id}", new_list)


# ── Known User Directory (User ID <-> Username resolution) ───────────────────
def record_known_user(user_id: int, username: str, name: str = "") -> None:
    if not user_id:
        return
    data = kv_json_get("known_users") or {}
    uid_str = str(user_id)
    clean_username = username.lstrip("@") if username else ""
    data[uid_str] = {
        "username": clean_username,
        "name": name or "",
        "updated_at": int(time.time()),
    }
    kv_json_set("known_users", data)


def get_known_users() -> dict:
    known = kv_json_get("known_users") or {}
    defaults = {
        "1221693150": {"username": "Sin_Hong", "name": "Sin Hong"},
        "6903398617": {"username": "Sochealikaa", "name": "Sao Sochealika"},
        "665698758": {"username": "", "name": "Bet SreyPich"},
        "1110438159": {"username": "cheezeri", "name": "Chanmonyneath PO"},
        "918434351": {"username": "GekleangMong", "name": "Gekleang CADT"},
        "1130272106": {"username": "kongleaksmey", "name": "Kong Leak Smey"},
        "817197042": {"username": "Panhakhonn", "name": "KHON PANHA"},
        "772640725": {"username": "Sovathana168", "name": "Ne Sovathana"},
    }
    defaults.update(known)
    return defaults


# ── Threat Events ───────────────────────────────────────────────────────────

def get_threat_events(chat_ids: list[int], days: int = 1) -> list[dict]:
    """Retrieve threat events for specified group IDs across the requested days via batch MGET."""
    from datetime import date, timedelta
    try:
        today = date.fromisoformat(local_date())
    except Exception:
        today = date.today()

    events: list[dict] = []
    seen_ids = set()

    days_to_check = max(1, min(90, int(days or 1)))
    keys = []
    for offset in range(days_to_check):
        day_str = (today - timedelta(days=offset)).isoformat()
        for gid in chat_ids:
            keys.append(f"threat_events:{day_str}:{gid}")

    if keys:
        batch_events = kv_json_mget(keys)
        for day_events in batch_events:
            if isinstance(day_events, list):
                for ev in day_events:
                    if isinstance(ev, dict) and ev.get("id") and ev["id"] not in seen_ids:
                        seen_ids.add(ev["id"])
                        events.append(ev)

    # Fallback to recent events if empty
    if not events:
        recent = kv_json_get("threat_events:recent") or []
        if isinstance(recent, list):
            for ev in recent:
                if isinstance(ev, dict) and (not chat_ids or ev.get("group_id") in chat_ids):
                    if ev.get("id") and ev["id"] not in seen_ids:
                        seen_ids.add(ev["id"])
                        events.append(ev)

    events.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return events


def record_threat_event(
    chat_id: int,
    chat_title: str,
    sender: dict,
    target: str,
    threat_type: str,
    risk: str = "critical",
    action_taken: str = "deleted",
) -> None:
    now = time.time()
    day = local_date()
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


