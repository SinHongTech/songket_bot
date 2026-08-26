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


def cache_set(key: str, value: dict) -> None:
    kv_json_set(f"scan:{key}", value, ttl=config.SCAN_CACHE_TTL_SECONDS)


# ── group configuration settings ─────────────────────────────────────────────

def get_group_settings(chat_id: int) -> dict:
    data = kv_json_get(f"settings:group:{chat_id}")
    default_settings = {
        "lang": config.DEFAULT_LANGUAGE,
        "safe_timeout": config.DEFAULT_SAFE_TIMEOUT,
        "show_safe": config.ENABLE_SAFE_MESSAGES,
    }
    if not data or not isinstance(data, dict):
        return default_settings
    return {
        "lang": str(data.get("lang", config.DEFAULT_LANGUAGE)).lower(),
        "safe_timeout": int(data.get("safe_timeout", config.DEFAULT_SAFE_TIMEOUT)),
        "show_safe": bool(data.get("show_safe", config.ENABLE_SAFE_MESSAGES)),
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
