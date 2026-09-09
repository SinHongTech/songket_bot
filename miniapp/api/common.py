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

KNOWN_SUPER_ADMIN_IDS: set[int] = {1221693150}
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
    result = set(KNOWN_SUPER_ADMIN_IDS)
    raw = os.environ.get("ADMIN_CHAT_ID", "") or os.environ.get("SUPER_ADMIN_IDS", "")
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
    }


def save_system_config(whitelist: list[int], allowed_groups: list[int], group_handlers: dict) -> bool:
    ok1 = kv_set("config:whitelist_user_ids", ",".join(str(x) for x in whitelist))
    ok2 = kv_set("config:allowed_groups", ",".join(str(x) for x in allowed_groups))
    clean_handlers = {str(k): [int(g) for g in v] for k, v in group_handlers.items()}
    ok3 = kv_set("config:group_handlers", json.dumps(clean_handlers))
    return bool(ok1 and ok2 and ok3)


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


def get_known_groups() -> dict:
    return kv_json_get("known_groups") or {}


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
    data = kv_json_get(f"settings:user:{user_id}") or {}
    if not isinstance(data, dict):
        data = {}
    return {
        "enabled": bool(data.get("daily_report_enabled", True)),
        "time": str(data.get("daily_report_time", "07:00")),
    }


def set_user_daily_report_settings(
    user_id: int,
    enabled: Optional[bool] = None,
    time_str: Optional[str] = None,
) -> bool:
    data = kv_json_get(f"settings:user:{user_id}") or {}
    if not isinstance(data, dict):
        data = {}
    if enabled is not None:
        data["daily_report_enabled"] = bool(enabled)
    if time_str is not None:
        clean = time_str.strip()
        import re
        if re.match(r"^([01]\d|2[0-3]):([0-5]\d)$", clean):
            data["daily_report_time"] = clean
        else:
            return False
    return kv_json_set(f"settings:user:{user_id}", data)


def get_candidate_groups_for_user(user_id: int) -> list[dict]:
    """Return groups where bot is present and user invited or is admin, but not yet linked."""
    known = get_known_groups()
    user_active = set(groups_for_user(user_id, get_allowed_groups()))
    candidates = []
    for gid_str, title in known.items():
        try:
            gid = int(gid_str)
        except (TypeError, ValueError):
            continue
        if gid in user_active:
            continue
        inviter = get_group_inviter(gid)
        if inviter == user_id or (is_super_admin(user_id) and not inviter) or is_group_admin(user_id, gid):
            candidates.append({"id": gid, "title": title or f"Group {gid}"})
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


