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
import time
from datetime import datetime
from typing import Optional
from urllib.parse import parse_qsl

import requests

logger = logging.getLogger("BeydaWebApp")

BOT_TOKEN = os.environ.get("BOT_TOKEN", "")
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


def verify_telegram_init_data(init_data: str, max_age_seconds: int = 86400) -> Optional[dict]:
    """Validate Telegram WebApp initData using the official HMAC scheme."""
    if not BOT_TOKEN or not init_data:
        return None
    pairs = parse_qsl(init_data, keep_blank_values=True)
    data = dict(pairs)
    received_hash = data.pop("hash", None)
    if not received_hash:
        return None
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calculated = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calculated, received_hash):
        return None
    try:
        auth_date = int(data.get("auth_date", "0"))
        if auth_date <= 0 or time.time() - auth_date > max_age_seconds:
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
    raw = os.environ.get("WHITELIST_USER_IDS", "")
    result = set()
    for item in raw.split(","):
        item = item.strip()
        if item:
            try:
                result.add(int(item))
            except ValueError:
                logger.warning("Invalid whitelist user id: %s", item)
    return result


def explicit_group_map() -> dict[int, list[int]]:
    """GROUP_HANDLERS_JSON example: {"123456789":[-1001,-1002]}."""
    raw = os.environ.get("GROUP_HANDLERS_JSON", "")
    if not raw:
        return {}
    try:
        obj = json.loads(raw)
        out = {}
        for uid, groups in obj.items():
            out[int(uid)] = [int(g) for g in groups][:MAX_DASHBOARD_GROUPS]
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
    d = telegram_post("getChat", {"chat_id": chat_id})
    return d.get("result") if d.get("ok") else None


def is_group_admin(user_id: int, chat_id: int) -> bool:
    d = telegram_post("getChatMember", {"chat_id": chat_id, "user_id": user_id})
    if not d.get("ok"):
        return False
    return d.get("result", {}).get("status") in {"creator", "administrator"}


def groups_for_user(user_id: int, allowed_groups: set[int]) -> list[int]:
    """Prefer explicit ownership; otherwise discover admin rights in allowed groups."""
    explicit = explicit_group_map().get(user_id)
    if explicit is not None:
        return [g for g in explicit if not allowed_groups or g in allowed_groups][:MAX_DASHBOARD_GROUPS]
    groups = []
    for gid in sorted(allowed_groups):
        if is_group_admin(user_id, gid):
            groups.append(gid)
            if len(groups) >= MAX_DASHBOARD_GROUPS:
                break
    return groups


def local_date() -> str:
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo(REPORT_TIMEZONE)).date().isoformat()
    except Exception:
        return datetime.utcnow().date().isoformat()
