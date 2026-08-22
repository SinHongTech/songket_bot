"""VirusTotal scanning for URLs and files, with Redis-backed result caching."""
from __future__ import annotations

import hashlib
import logging
import re
import time

import requests

from bot import config
from bot.redis_client import cache_get, cache_set

logger = logging.getLogger("BeydaBot.scanner")

VT_HEADERS = {"x-apikey": config.VT_API_KEY}


def _make_cache_key(raw: str) -> str:
    normalized = raw.lower()
    normalized = re.sub(r"^https?://", "", normalized)
    normalized = normalized.rstrip("/").split("?")[0].split("#")[0]
    return hashlib.sha256(normalized.encode()).hexdigest()[:32]


def _poll_analysis(analysis_id: str) -> dict:
    """Poll a VirusTotal analysis until it completes or attempts run out."""
    for attempt in range(config.VT_POLL_ATTEMPTS):
        time.sleep(config.VT_POLL_INTERVAL)
        try:
            r = requests.get(
                f"{config.VT_BASE_URL}/analyses/{analysis_id}", headers=VT_HEADERS, timeout=10
            )
            attrs = r.json()["data"]["attributes"]
        except Exception as exc:
            logger.error("VT poll error: %s", exc)
            continue

        if attrs.get("status") == "completed":
            stats = attrs.get("stats", {})
            logger.info("VT analysis completed after %d attempt(s)", attempt + 1)
            return {
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless": stats.get("harmless", 0),
                "undetected": stats.get("undetected", 0),
            }
    return {"error": "VT analysis timed out before completion"}


def vt_scan_url(url: str) -> dict:
    if not config.VT_API_KEY:
        return {"error": "VT_API_KEY not configured"}

    key = _make_cache_key(url)
    cached = cache_get(key)
    if cached:
        return cached

    try:
        resp = requests.post(
            f"{config.VT_BASE_URL}/urls", headers=VT_HEADERS, data={"url": url}, timeout=10
        )
        if resp.status_code == 429:
            return {"error": "VT rate limit"}
        if resp.status_code != 200:
            return {"error": f"VT submit HTTP {resp.status_code}"}

        analysis_id = resp.json()["data"]["id"]
        result = _poll_analysis(analysis_id)
        if "error" not in result:
            cache_set(key, result)
        return result
    except Exception as exc:
        logger.error("vt_scan_url: %s", exc)
        return {"error": str(exc)}


def vt_scan_file(file_bytes: bytes, filename: str) -> dict:
    if not config.VT_API_KEY:
        return {"error": "VT_API_KEY not configured"}

    sha256 = hashlib.sha256(file_bytes).hexdigest()
    key = f"file-{sha256[:32]}"
    cached = cache_get(key)
    if cached:
        return cached

    try:
        check = requests.get(f"{config.VT_BASE_URL}/files/{sha256}", headers=VT_HEADERS, timeout=10)
        if check.status_code == 200:
            stats = check.json()["data"]["attributes"]["last_analysis_stats"]
            result = {
                "malicious": stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless": stats.get("harmless", 0),
                "undetected": stats.get("undetected", 0),
                "sha256": sha256,
                "cached": True,
            }
            cache_set(key, result)
            return result

        if check.status_code == 429:
            return {"error": "VT rate limit"}

        logger.info("Uploading to VT | %s | %d bytes", filename, len(file_bytes))
        up = requests.post(
            f"{config.VT_BASE_URL}/files",
            headers=VT_HEADERS,
            files={"file": (filename, file_bytes)},
            timeout=60,
        )
        if up.status_code == 429:
            return {"error": "VT rate limit on upload"}
        if up.status_code != 200:
            return {"error": f"VT upload HTTP {up.status_code}"}

        analysis_id = up.json()["data"]["id"]
        result = _poll_analysis(analysis_id)
        if "error" not in result:
            result["sha256"] = sha256
            result["cached"] = False
            cache_set(key, result)
        return result
    except Exception as exc:
        logger.error("vt_scan_file: %s", exc)
        return {"error": str(exc)}
