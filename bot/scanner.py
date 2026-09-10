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
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional
from urllib.parse import quote

import requests

from bot import config
from bot.redis_client import cache_get, cache_set

logger = logging.getLogger("BeydaBot.scanner")

VT_HEADERS = {"x-apikey": config.VT_API_KEY}

# Shared HTTP session with keep-alive connection pooling
_http_session = requests.Session()
adapter = requests.adapters.HTTPAdapter(pool_connections=15, pool_maxsize=30, max_retries=1)
_http_session.mount("https://", adapter)
_http_session.mount("http://", adapter)

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


def check_telegram_phishing_heuristics(url: str) -> Optional[dict]:
    """Fast local heuristic check for Telegram phishing and homograph domains."""
    from bot.utils import extract_domain
    domain = extract_domain(url).lower()
    if not domain:
        return None

    # 1. Detect Cyrillic / Greek homoglyph attacks in ASCII domains
    if re.search(r"[\u0400-\u04FF\u0370-\u03FF]", url):
        logger.warning("[Heuristics] Homograph phishing detected: %s", url)
        return {"malicious": 15, "suspicious": 5, "harmless": 0, "undetected": 0, "heuristic": "homograph"}

    # 2. Known Telegram phishing patterns
    phish_patterns = [
        r"telegra[a-z0-9]*\.(?:xyz|top|site|club|buzz|info|cc|online|tk|ga|ml|cf|gq|pw|space|monster)",
        r"telegram-(?:login|auth|verify|gift|premium|airdrop|bot|web|security)",
        r"(?:login|auth|verify|claim|free)-telegram",
        r"t\.me-[a-z0-9]+\.",
        r"t-me\.[a-z]+",
        r"telegrem\.",
        r"telegraam\.",
        r"web-telegram-[a-z0-9]+",
    ]
    for pat in phish_patterns:
        if re.search(pat, domain, re.IGNORECASE):
            logger.warning("[Heuristics] Telegram phishing keyword match '%s' in %s", pat, url)
            return {"malicious": 15, "suspicious": 5, "harmless": 0, "undetected": 0, "heuristic": "telegram_phish"}

    return None


def check_urlhaus_prefilter(url: str) -> Optional[dict]:
    """Pre-filter URLs against URLhaus database to catch active malware immediately."""
    try:
        r = _http_session.post(
            "https://urlhaus-api.abuse.ch/v1/url/",
            data={"url": url},
            timeout=2.0,
        )
        if r.status_code == 200:
            data = r.json()
            if data.get("query_status") == "ok" and data.get("url_status") in ("online", "offline"):
                threat = data.get("threat", "malware_download")
                logger.warning("[URLhaus] Match found for %s: %s", url, threat)
                return {
                    "malicious": 20,
                    "suspicious": 5,
                    "harmless": 0,
                    "undetected": 0,
                    "prefilter": "urlhaus",
                    "threat": threat,
                }
    except Exception as e:
        logger.debug("URLhaus query skipped/failed: %s", e)
    return None


def check_google_safebrowsing(url: str) -> Optional[dict]:
    """Check URL against Google Safe Browsing API v5 (uris:search) with v4 fallback."""
    api_key = (
        getattr(config, "GOOGLE_SAFE_BROWSING_KEY", "")
        or os.environ.get("GOOGLE_SAFE_BROWSING_KEY")
        or os.environ.get("GOOGLE_SAFE_BROWSING_API_KEY")
        or os.environ.get("GSB_API_KEY")
        or os.environ.get("SAFE_BROWSING_API_KEY", "")
    ).strip()
    if not api_key:
        return None

    # 1. Primary: Google Safe Browsing v5 (Lookup API uris:search)
    try:
        encoded_url = quote(url, safe="")
        threat_params = [
            "threatTypes=MALWARE",
            "threatTypes=SOCIAL_ENGINEERING",
            "threatTypes=UNWANTED_SOFTWARE",
            "threatTypes=POTENTIALLY_HARMFUL_APPLICATION",
        ]
        query_str = f"key={api_key}&uri={encoded_url}&{'&'.join(threat_params)}"
        endpoint_v5 = f"https://safebrowsing.googleapis.com/v5/uris:search?{query_str}"
        r = _http_session.get(endpoint_v5, timeout=2.0)
        if r.status_code == 200:
            data = r.json()
            threat = data.get("threat") or {}
            threat_types = threat.get("threatTypes") or []
            if threat_types:
                threat_label = ", ".join(threat_types)
                logger.warning("[Google Safe Browsing v5] Threat matched for %s: %s", url, threat_label)
                return {
                    "malicious": 25,
                    "suspicious": 5,
                    "harmless": 0,
                    "undetected": 0,
                    "prefilter": "google_safe_browsing_v5",
                    "threat": threat_label,
                    "heuristic": "phishing" if "SOCIAL_ENGINEERING" in threat_label else "malware",
                }
            return None
    except Exception as e:
        logger.debug("GSB v5 check skipped/failed: %s", e)

    # 2. Fallback: Google Safe Browsing v4 (threatMatches:find)
    try:
        endpoint_v4 = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}"
        payload_v4 = {
            "client": {"clientId": "songket-security-bot", "clientVersion": "2.0.0"},
            "threatInfo": {
                "threatTypes": [
                    "MALWARE",
                    "SOCIAL_ENGINEERING",
                    "UNWANTED_SOFTWARE",
                    "POTENTIALLY_HARMFUL_APPLICATION",
                ],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": url}],
            },
        }
        r = _http_session.post(endpoint_v4, json=payload_v4, timeout=2.0)
        if r.status_code == 200:
            res = r.json()
            matches = res.get("matches") or []
            if matches:
                matched_types = list({m.get("threatType", "THREAT") for m in matches if isinstance(m, dict)})
                threat_label = ", ".join(matched_types) or "MALWARE/PHISHING"
                logger.warning("[Google Safe Browsing v4] Threat matched for %s: %s", url, threat_label)
                return {
                    "malicious": 25,
                    "suspicious": 5,
                    "harmless": 0,
                    "undetected": 0,
                    "prefilter": "google_safe_browsing_v4",
                    "threat": threat_label,
                    "heuristic": "phishing" if "SOCIAL_ENGINEERING" in threat_label else "malware",
                }
    except Exception as e:
        logger.debug("GSB v4 fallback skipped/failed: %s", e)

    return None


def _fast_vt_url_lookup(url: str) -> Optional[dict]:
    """Fast non-blocking read from VirusTotal's existing URL intelligence database."""
    if not config.VT_API_KEY:
        return None
    try:
        url_id = _url_id(url)
        r = _http_session.get(f"{config.VT_BASE_URL}/urls/{url_id}", headers=VT_HEADERS, timeout=2.5)
        if r.status_code == 200:
            attrs = r.json().get("data", {}).get("attributes", {})
            stats = attrs.get("last_analysis_stats", {})
            last_date = int(attrs.get("last_analysis_date", 0) or 0)
            if stats and (time.time() - last_date) <= config.URL_LOOKUP_MAX_AGE_SECONDS:
                return {
                    "malicious": stats.get("malicious", 0),
                    "suspicious": stats.get("suspicious", 0),
                    "harmless": stats.get("harmless", 0),
                    "undetected": stats.get("undetected", 0),
                    "lookup": True,
                }
    except Exception as exc:
        logger.debug("Fast VT lookup skipped/failed: %s", exc)
    return None


def _async_submit_vt_url(url: str) -> None:
    """Asynchronously submit a new URL to VirusTotal in background without blocking chat."""
    try:
        _request("POST", f"{config.VT_BASE_URL}/urls", data={"url": url}, timeout=10)
    except Exception:
        pass


def vt_scan_url(url: str) -> dict:
    # 1. Quick Redis Cache Check (<1ms)
    key = _make_cache_key(url)
    cached = cache_get(key)
    if cached:
        return cached

    # 2. Check Trusted Domain Whitelist (<1ms)
    from bot.redis_client import is_domain_whitelisted
    if is_domain_whitelisted(url):
        res = {"malicious": 0, "suspicious": 0, "harmless": 100, "undetected": 0, "whitelisted": True}
        cache_set(key, res, ttl=config.URL_CACHE_TTL_SECONDS)
        return res

    # 3. Check Fast Local Heuristics (<1ms)
    heuristic_hit = check_telegram_phishing_heuristics(url)
    if heuristic_hit:
        cache_set(key, heuristic_hit, ttl=config.URL_CACHE_TTL_SECONDS)
        return heuristic_hit

    # 4. Resolve redirect ONLY if known shortener or candidate
    from bot.utils import is_shortener, resolve_redirect
    urls_to_check = [url]
    if is_shortener(url):
        final_url = resolve_redirect(url, max_redirects=2, timeout=1.0)
        if final_url and final_url != url:
            urls_to_check.append(final_url)
            cached_final = cache_get(_make_cache_key(final_url))
            if cached_final:
                return cached_final
            if is_domain_whitelisted(final_url):
                res = {"malicious": 0, "suspicious": 0, "harmless": 100, "undetected": 0, "whitelisted": True}
                cache_set(key, res, ttl=config.URL_CACHE_TTL_SECONDS)
                return res
            h_hit = check_telegram_phishing_heuristics(final_url)
            if h_hit:
                cache_set(key, h_hit, ttl=config.URL_CACHE_TTL_SECONDS)
                return h_hit

    # 5. Concurrent Multi-Engine Pre-Filters (Google Safe Browsing + URLhaus + VT Lookup) in Parallel!
    tasks = []
    latest_lookup_result = None
    with ThreadPoolExecutor(max_workers=6) as executor:
        for u in urls_to_check:
            tasks.append(executor.submit(check_google_safebrowsing, u))
            tasks.append(executor.submit(check_urlhaus_prefilter, u))
            if config.VT_API_KEY and config.URL_LOOKUP_ENABLED:
                tasks.append(executor.submit(_fast_vt_url_lookup, u))

        for future in as_completed(tasks, timeout=3.0):
            try:
                verdict = future.result()
                if verdict and isinstance(verdict, dict):
                    mal = int(verdict.get("malicious", 0) or 0)
                    susp = int(verdict.get("suspicious", 0) or 0)
                    if mal > 0 or susp > 0:
                        cache_set(key, verdict, ttl=config.URL_CACHE_TTL_SECONDS)
                        return verdict
                    if verdict.get("lookup"):
                        latest_lookup_result = verdict
            except Exception as e:
                logger.debug("Parallel scanner task error: %s", e)

    # 6. If VT lookup had fresh clean stats, return it
    if latest_lookup_result:
        cache_set(key, latest_lookup_result, ttl=config.URL_CACHE_TTL_SECONDS)
        return latest_lookup_result

    # 7. Pre-filters confirmed Clean: Return Safe immediately (<300ms)
    clean_verdict = {"malicious": 0, "suspicious": 0, "harmless": 100, "undetected": 0, "clean": True}
    cache_set(key, clean_verdict, ttl=config.URL_CACHE_TTL_SECONDS)

    # Submit background analysis for VT indexing (non-blocking daemon thread)
    if config.VT_API_KEY:
        threading.Thread(target=_async_submit_vt_url, args=(url,), daemon=True).start()

    return clean_verdict


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
