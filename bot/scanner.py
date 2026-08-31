"""VirusTotal scanning for URLs and files, with Redis-backed result caching.

Rate-limit aware: every VT call is spaced out via a shared throttle so the
worker pool never trips the free-tier limit (4 requests/minute). 429 responses
are retried with `Retry-After` / exponential backoff instead of being dropped.

URLs support an optional hybrid lookup (read VT's last verdict before
submitting a fresh scan); files already do a hash lookup first.
"""
from __future__ import annotations

import base64
import hashlib
import logging
import re
import threading
import time

import requests

from bot import config
from bot.redis_client import cache_get, cache_set

logger = logging.getLogger("BeydaBot.scanner")

VT_HEADERS = {"x-apikey": config.VT_API_KEY}

# Shared throttle: guarantees a minimum spacing between VT HTTP calls.
_rate_lock = threading.Lock()
_last_request_ts = 0.0


def _make_cache_key(raw: str) -> str:
    normalized = raw.lower()
    normalized = re.sub(r"^https?://", "", normalized)
    normalized = normalized.rstrip("/").split("?")[0].split("#")[0]
    return hashlib.sha256(normalized.encode()).hexdigest()[:32]


def _url_id(url: str) -> str:
    return base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")


def _throttle() -> None:
    global _last_request_ts
    with _rate_lock:
        wait = config.VT_MIN_INTERVAL_SECONDS - (time.monotonic() - _last_request_ts)
        if wait > 0:
            time.sleep(wait)
        _last_request_ts = time.monotonic()


def _request(method: str, url: str, **kwargs) -> requests.Response:
    """Rate-limited request with 429 retry/backoff. Returns the last response."""
    resp = None
    for attempt in range(config.VT_RETRY_ATTEMPTS + 1):
        _throttle()
        try:
            resp = requests.request(method, url, headers=VT_HEADERS, **kwargs)
        except Exception as exc:
            logger.error("VT request error: %s", exc)
            if attempt < config.VT_RETRY_ATTEMPTS:
                time.sleep(config.VT_RETRY_BASE_DELAY * (2 ** attempt))
                continue
            raise

        if resp.status_code == 429:
            try:
                delay = float(resp.headers.get("Retry-After"))
            except (TypeError, ValueError):
                delay = config.VT_RETRY_BASE_DELAY * (2 ** attempt)
            if attempt < config.VT_RETRY_ATTEMPTS:
                logger.warning("VT 429, retrying in %.1fs", max(delay, 1.0))
                time.sleep(max(delay, 1.0))
                continue
            return resp
        return resp

    return resp  # type: ignore[return-value]


def _poll_analysis(analysis_id: str) -> dict:
    """Poll a VirusTotal analysis until it completes or attempts run out."""
    for attempt in range(config.VT_POLL_ATTEMPTS):
        time.sleep(config.VT_POLL_INTERVAL)
        try:
            r = _request("GET", f"{config.VT_BASE_URL}/analyses/{analysis_id}", timeout=10)
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

    # Hybrid lookup: reuse VT's latest verdict when it is still fresh.
    if config.URL_LOOKUP_ENABLED:
        try:
            url_id = _url_id(url)
            r = _request("GET", f"{config.VT_BASE_URL}/urls/{url_id}", timeout=10)
            if r.status_code == 200:
                attrs = r.json().get("data", {}).get("attributes", {})
                stats = attrs.get("last_analysis_stats", {})
                last_date = int(attrs.get("last_analysis_date", 0) or 0)
                if stats and (time.time() - last_date) <= config.URL_LOOKUP_MAX_AGE_SECONDS:
                    result = {
                        "malicious": stats.get("malicious", 0),
                        "suspicious": stats.get("suspicious", 0),
                        "harmless": stats.get("harmless", 0),
                        "undetected": stats.get("undetected", 0),
                        "lookup": True,
                    }
                    cache_set(key, result, ttl=config.URL_CACHE_TTL_SECONDS)
                    return result
        except Exception as exc:
            logger.error("vt_scan_url lookup: %s", exc)

    try:
        resp = _request("POST", f"{config.VT_BASE_URL}/urls", data={"url": url}, timeout=10)
        if resp.status_code == 429:
            return {"error": "VT rate limit"}
        if resp.status_code != 200:
            return {"error": f"VT submit HTTP {resp.status_code}"}

        analysis_id = resp.json()["data"]["id"]
        result = _poll_analysis(analysis_id)
        if "error" not in result:
            cache_set(key, result, ttl=config.URL_CACHE_TTL_SECONDS)
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
        check = _request("GET", f"{config.VT_BASE_URL}/files/{sha256}", timeout=10)
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
            cache_set(key, result, ttl=config.FILE_CACHE_TTL_SECONDS)
            return result

        if check.status_code == 429:
            return {"error": "VT rate limit"}

        logger.info("Uploading to VT | %s | %d bytes", filename, len(file_bytes))
        up = _request(
            "POST",
            f"{config.VT_BASE_URL}/files",
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
            cache_set(key, result, ttl=config.FILE_CACHE_TTL_SECONDS)
        return result
    except Exception as exc:
        logger.error("vt_scan_file: %s", exc)
        return {"error": str(exc)}
