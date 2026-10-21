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
import unicodedata
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


# ── IDN Homograph & Confusable Attack Detection Engine ───────────────────────

_CONFUSABLE_MAP = str.maketrans({
    # Cyrillic lookalikes
    "а": "a", "в": "b", "е": "e", "к": "k", "м": "m", "н": "h",
    "о": "o", "р": "p", "с": "c", "т": "t", "у": "y", "х": "x",
    "і": "i", "ї": "i", "ј": "j", "ѕ": "s", "ӏ": "l", "ԁ": "d",
    "ԛ": "q", "ԝ": "w", "г": "r", "п": "n", "б": "b", "з": "3", "д": "d",
    "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H",
    "О": "O", "Р": "P", "С": "C", "Т": "T", "У": "Y", "Х": "X",
    "І": "I", "Ї": "I", "Ј": "J", "Ѕ": "S", "Ӏ": "l",
    # Greek lookalikes
    "α": "a", "β": "b", "ε": "e", "η": "n", "ι": "i", "κ": "k",
    "ν": "v", "ο": "o", "ρ": "p", "τ": "t", "υ": "u", "χ": "x", "ω": "w",
    "Α": "A", "Β": "B", "Ε": "E", "Η": "H", "Ι": "I", "Κ": "K",
    "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
    # Latin IPA & Latin Extended lookalikes
    "ɑ": "a", "ɡ": "g", "ɩ": "i", "ł": "l", "ø": "o", "ß": "ss",
    "ạ": "a", "ẹ": "e", "ị": "i", "ọ": "o", "ụ": "u",
    "ı": "i", "ȷ": "j", "ꞇ": "t", "ƿ": "w", "ᴑ": "o", "ᴏ": "o",
    "ᴄ": "c", "ᴅ": "d", "ᴇ": "e", "ᴊ": "j", "ᴋ": "k", "ʟ": "l",
    "ᴍ": "m", "ɴ": "n", "ᴘ": "p", "ᴛ": "t", "ᴜ": "u", "ᴠ": "v",
    "ᴡ": "w", "ʏ": "y", "ᴢ": "z",
    # Armenian lookalikes
    "օ": "o", "ո": "n", "ս": "u", "տ": "in", "հ": "h",
    # Cherokee lookalikes
    "Ꭵ": "i", "Ꭲ": "T", "Ꭷ": "ka",
    # Fullwidth ASCII (U+FF01 - U+FF5E)
    "ａ": "a", "ｂ": "b", "ｃ": "c", "ｄ": "d", "ｅ": "e", "ｆ": "f",
    "ｇ": "g", "ｈ": "h", "ｉ": "i", "ｊ": "j", "ｋ": "k", "ｌ": "l",
    "ｍ": "m", "ｎ": "n", "ｏ": "o", "ｐ": "p", "ｑ": "q", "ｒ": "r",
    "ｓ": "s", "ｔ": "t", "ｕ": "u", "ｖ": "v", "ｗ": "w", "ｘ": "x",
    "ｙ": "y", "ｚ": "z",
    "０": "0", "１": "1", "２": "2", "３": "3", "４": "4",
    "５": "5", "៦": "6", "៧": "7", "៨": "8", "៩": "9",
})

_PROTECTED_BRANDS = {
    # Telegram & Messaging
    "telegram", "telegraam", "t.me", "telegram-org", "whatsapp", "signal",
    "discord", "viber", "wechat", "line", "messenger", "skype",
    # Tech Giants & Social Media
    "google", "apple", "microsoft", "facebook", "meta", "instagram",
    "tiktok", "twitter", "x.com", "github", "gitlab", "linkedin",
    "youtube", "netflix", "amazon", "cloudflare", "spotify", "adobe",
    # Crypto & Web3
    "binance", "coinbase", "metamask", "trustwallet", "bybit", "okx",
    "kucoin", "kraken", "phantom", "ledger", "trezor", "uniswap",
    "pancakeswap", "blockchain",
    # Global Banking & Payment
    "paypal", "stripe", "visa", "mastercard", "westernunion", "moneygram",
    # Cambodian Financial & Banking
    "aba", "ababank", "acleda", "acledabank", "wingbank", "wing",
    "bakong", "khqr", "canadiabank", "canadia", "chipmong", "chipmongbank",
    "sathapana", "princebank", "vattanacbank", "vattanac", "cpbank",
    "phillipbank", "amk", "prasac", "ftb", "ftbbank",
}

_ASCII_TLDS = {
    "com", "net", "org", "io", "co", "app", "dev", "xyz", "top", "tk",
    "ml", "ga", "cf", "gq", "me", "info", "biz", "online", "site", "web",
    "shop", "click", "zip", "review", "work", "date", "download", "stream",
    "live", "tv", "cc", "pw", "su", "ru", "cn", "vn", "kh", "cloud", "tech",
    "store", "vip", "club", "pro", "space", "icu", "link", "guru", "agency",
}


def _get_char_script(ch: str) -> str:
    code = ord(ch)
    if code < 128:
        return "LATIN" if ch.isalpha() else "COMMON"
    name = unicodedata.name(ch, "")
    for s in ("LATIN", "CYRILLIC", "GREEK", "ARMENIAN", "CHEROKEE", "HEBREW", "ARABIC", "KHMER", "THAI"):
        if s in name:
            return s
    return "OTHER"


def _to_confusable_skeleton(label: str) -> str:
    nfd = unicodedata.normalize("NFD", label)
    stripped = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return stripped.translate(_CONFUSABLE_MAP).lower()


def detect_idn_homograph(domain: str) -> Optional[dict]:
    """
    Detect Internationalized Domain Name (IDN) homograph phishing attacks.
    Follows Unicode UTS #39 and browser spoof-defense standards:
    1. Decodes and validates Punycode (xn--) labels to Unicode.
    2. Flags mixed-script labels (e.g. Latin mixed with Cyrillic/Greek/Armenian).
    3. Checks confusable skeleton against protected brands (Telegram, Apple, Google, PayPal, Banking, etc.).
    4. Detects whole-script confusable masquerading as Latin words under common ASCII TLDs.
    5. Flags malformed or deceptive Punycode.
    """
    if not domain:
        return None

    clean_dom = domain.strip().rstrip(".").lower()
    labels = clean_dom.split(".")
    if len(labels) < 2:
        return None

    # Ultra-fast path: If domain has no 'xn--' and all characters are ASCII (<128), it cannot be an IDN homograph
    if not any(lbl.startswith("xn--") for lbl in labels) and all(ord(c) < 128 for c in clean_dom):
        return None

    u_labels: list[str] = []
    p_labels: list[str] = []
    for lbl in labels:
        if lbl.startswith("xn--"):
            try:
                u_lbl = lbl.encode("ascii").decode("idna")
            except Exception:
                logger.warning("[Homograph] Malformed punycode label: %s", lbl)
                return {
                    "malicious": 18,
                    "suspicious": 5,
                    "harmless": 0,
                    "undetected": 0,
                    "heuristic": "homograph",
                    "threat_type": "homograph_attack",
                    "spoofed_target": clean_dom,
                    "real_domain": clean_dom,
                    "unicode_domain": clean_dom,
                    "skeleton": clean_dom,
                    "reason": "Malformed Punycode IDN",
                }
            p_lbl = lbl
        else:
            u_lbl = lbl
            try:
                p_lbl = lbl.encode("idna").decode("ascii")
            except Exception:
                p_lbl = lbl
        u_labels.append(u_lbl)
        p_labels.append(p_lbl)

    unicode_domain = ".".join(u_labels)
    punycode_domain = ".".join(p_labels)
    tld = labels[-1].lower()

    # Analyze non-TLD labels
    check_labels = u_labels[:-1] if tld in _ASCII_TLDS else u_labels

    for raw_u_lbl in check_labels:
        u_lbl = raw_u_lbl.lower()
        if all(ord(c) < 128 for c in u_lbl):
            continue

        scripts = {_get_char_script(c) for c in u_lbl if _get_char_script(c) != "COMMON"}
        skel = _to_confusable_skeleton(u_lbl)

        # 1. Mixed-script check: single label mixes Latin with Cyrillic, Greek, etc.
        if "LATIN" in scripts and len(scripts) > 1:
            logger.warning("[Homograph] Mixed scripts %s detected in label '%s' (domain: %s)", scripts, u_lbl, clean_dom)
            return {
                "malicious": 18,
                "suspicious": 5,
                "harmless": 0,
                "undetected": 0,
                "heuristic": "homograph",
                "threat_type": "homograph_attack",
                "spoofed_target": f"{unicode_domain} (Punycode: {punycode_domain})",
                "real_domain": punycode_domain,
                "unicode_domain": unicode_domain,
                "skeleton": skel,
                "reason": f"Mixed scripts ({', '.join(sorted(scripts))}) in domain label",
            }

        # 2. Confusable skeleton brand match (e.g. аррӏе -> apple, tеlеgrаm -> telegram)
        for brand in _PROTECTED_BRANDS:
            if skel == brand or f".{brand}" in skel or skel.startswith(f"{brand}-") or skel.endswith(f"-{brand}"):
                logger.warning("[Homograph] Spoofed brand '%s' detected (skeleton: '%s', domain: %s)", brand, skel, clean_dom)
                return {
                    "malicious": 18,
                    "suspicious": 5,
                    "harmless": 0,
                    "undetected": 0,
                    "heuristic": "homograph",
                    "threat_type": "homograph_attack",
                    "spoofed_target": f"{unicode_domain} (Spoofing: {brand} | Punycode: {punycode_domain})",
                    "real_domain": punycode_domain,
                    "unicode_domain": unicode_domain,
                    "skeleton": skel,
                    "reason": f"Spoofing protected brand '{brand}' using lookalike characters",
                }

        # 3. Whole-script confusable masquerading as Latin under ASCII TLD (.com, .org, etc.)
        if tld in _ASCII_TLDS and skel.isalpha() and all(ord(c) < 128 for c in skel):
            if any(ord(c) > 127 for c in u_lbl):
                logger.warning("[Homograph] Whole-script confusable '%s' -> '%s' under .%s", u_lbl, skel, tld)
                return {
                    "malicious": 18,
                    "suspicious": 5,
                    "harmless": 0,
                    "undetected": 0,
                    "heuristic": "homograph",
                    "threat_type": "homograph_attack",
                    "spoofed_target": f"{unicode_domain} (Punycode: {punycode_domain})",
                    "real_domain": punycode_domain,
                    "unicode_domain": unicode_domain,
                    "skeleton": skel,
                    "reason": f"Whole-script confusable domain imitating Latin under .{tld}",
                }

    return None


def check_telegram_phishing_heuristics(url: str) -> Optional[dict]:
    """Fast local heuristic check for IDN homographs and Telegram phishing domains."""
    from bot.utils import extract_domain
    domain = extract_domain(url).lower()
    if not domain:
        return None

    # 1. Comprehensive IDN Homograph & Confusable Attack Detection
    homograph_hit = detect_idn_homograph(domain)
    if homograph_hit:
        return homograph_hit

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
            is_threat = (int(stats.get("malicious", 0) or 0) > 0 or int(stats.get("suspicious", 0) or 0) > 0)
            is_fresh = (time.time() - last_date) <= config.URL_LOOKUP_MAX_AGE_SECONDS
            if stats and (is_threat or is_fresh):
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


def vt_scan_url(url: str, chat_id: Optional[int] = None, user_id: Optional[int] = None) -> dict:
    # 1. Quick Redis Cache Check (<1ms)
    key = _make_cache_key(url)
    cached = cache_get(key)
    if cached:
        return cached

    # 2. Check Trusted Domain Whitelist (<1ms)
    from bot.redis_client import is_domain_whitelisted
    if is_domain_whitelisted(url, chat_id=chat_id, user_id=user_id):
        return {"malicious": 0, "suspicious": 0, "harmless": 100, "undetected": 0, "whitelisted": True}

    # 3. Check Fast Local Heuristics (<1ms)
    heuristic_hit = check_telegram_phishing_heuristics(url)
    if heuristic_hit:
        cache_set(key, heuristic_hit, ttl=config.URL_CACHE_TTL_SECONDS)
        return heuristic_hit

    # 4. Resolve redirect for all known shorteners and redirect candidates
    from bot.utils import is_shortener, resolve_redirect
    urls_to_check = [url]
    if is_shortener(url) or ("/" in url.split("://", 1)[-1].strip("/") and not is_domain_whitelisted(url, chat_id=chat_id, user_id=user_id)):
        final_url = resolve_redirect(url, max_redirects=3, timeout=1.5)
        if final_url and final_url != url:
            logger.info("Unmasked redirect URL: %s -> %s", url, final_url)
            urls_to_check.append(final_url)
            cached_final = cache_get(_make_cache_key(final_url))
            if cached_final:
                return cached_final
            if is_domain_whitelisted(final_url, chat_id=chat_id, user_id=user_id):
                return {"malicious": 0, "suspicious": 0, "harmless": 100, "undetected": 0, "whitelisted": True}
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
            mal = stats.get("malicious", 0)
            susp = stats.get("suspicious", 0)
            harm = stats.get("harmless", 0)
            undet = stats.get("undetected", 0)
            total = mal + susp + harm + undet
            if total > 0:
                result = {
                    "malicious": mal,
                    "suspicious": susp,
                    "harmless": harm,
                    "undetected": undet,
                    "sha256": sha256,
                    "cached": True,
                }
                cache_set(key, result, ttl=config.FILE_CACHE_TTL_SECONDS)
                return result
            logger.info("VT file %s exists but has 0 engine stats (analysis pending); submitting for fresh analysis", filename)

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
            total = (
                result.get("malicious", 0)
                + result.get("suspicious", 0)
                + result.get("harmless", 0)
                + result.get("undetected", 0)
            )
            if total == 0:
                try:
                    time.sleep(1)
                    fresh = _request("GET", f"{config.VT_BASE_URL}/files/{sha256}", timeout=10)
                    if fresh.status_code == 200:
                        f_stats = fresh.json()["data"]["attributes"]["last_analysis_stats"]
                        f_mal = f_stats.get("malicious", 0)
                        f_susp = f_stats.get("suspicious", 0)
                        f_harm = f_stats.get("harmless", 0)
                        f_undet = f_stats.get("undetected", 0)
                        if (f_mal + f_susp + f_harm + f_undet) > 0:
                            result = {
                                "malicious": f_mal,
                                "suspicious": f_susp,
                                "harmless": f_harm,
                                "undetected": f_undet,
                            }
                            total = f_mal + f_susp + f_harm + f_undet
                except Exception as exc:
                    logger.warning("Failed to refresh file stats after analysis: %s", exc)

            if total > 0:
                result["sha256"] = sha256
                result["cached"] = False
                cache_set(key, result, ttl=config.FILE_CACHE_TTL_SECONDS)
            else:
                logger.warning("VT analysis completed with 0 engines for file %s; scan incomplete", filename)
                return {"error": "VirusTotal analysis in progress or incomplete. Please try again in a few moments."}
        return result
    except Exception as exc:
        logger.error("vt_scan_file: %s", exc)
        return {"error": str(exc)}
