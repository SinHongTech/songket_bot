"""URL / file heuristics shared by the message handlers and scanner."""
from __future__ import annotations

import html
import ipaddress
import json
import logging
import os
import re
import socket
import time
from typing import Optional
from urllib.parse import urljoin, urlparse

import requests

from bot import config
from bot.redis_client import kv_get, kv_json_get

logger = logging.getLogger("BeydaBot.utils")


def esc(s: str) -> str:
    """HTML-escape user-controlled text before inserting into parse_mode=HTML."""
    return html.escape(str(s), quote=True)


def _blocked_host(host: str) -> bool:
    """True if host resolves to a private/reserved/loopback address (SSRF guard)."""
    try:
        ip = ipaddress.ip_address(host)
        return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified
    except ValueError:
        pass
    try:
        infos = socket.getaddrinfo(host, None)
    except Exception:
        return True  # fail closed
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return True
        except ValueError:
            pass
    return False

# ── file extensions ──────────────────────────────────────────────────────────
HIGH_RISK_EXTENSIONS: set[str] = {
    ".exe", ".dll", ".scr", ".bat", ".cmd",
    ".ps1", ".js", ".vbs", ".jar", ".msi",
    ".apk", ".com", ".pif", ".hta", ".wsf",
    ".reg", ".rar", ".zip", ".7z", ".tar",
    ".gz", ".eml", ".xlsm", ".pptm", ".docm", ".dotm", ".xltm",
    ".crt", ".cer", ".z", ".lz", ".lzma", ".xz", ".bz2",
    ".iso", ".img", ".bin", ".dmg", ".deb", ".rpm",
    ".elf", ".so", ".a", ".class", ".war", ".ear", ".aab",
}

SAFE_EXTENSIONS: set[str] = {
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff",
    ".mp3", ".wav", ".ogg", ".m4a", ".mp4", ".mkv", ".avi", ".mov",
    ".txt", ".csv", ".json", ".xml",
}

# ── domain lists ─────────────────────────────────────────────────────────────
WHITELIST_DOMAINS: list[str] = [
    "google.com", "docs.google.com", "drive.google.com",
    "youtube.com", "github.com", "microsoft.com",
    "office.com", "live.com", "outlook.com",
    "wikipedia.org", "stackoverflow.com",
    "telegram.org", "t.me",
    "maps.google.com",
    "gov.kh", "moeys.gov.kh", "tms.moeys.gov.kh",
    "plp-tms.moeys.gov.kh", "openplp.org", "kru.openplp.org",
]

URL_SHORTENERS: set[str] = {
    "bit.ly", "tinyurl.com", "cutt.ly", "t.co",
    "goo.gl", "ow.ly", "buff.ly", "is.gd",
    "rb.gy", "short.io", "tiny.cc",
}

SUSPICIOUS_TLDS: tuple[str, ...] = (
    ".xyz", ".top", ".click", ".zip", ".review",
    ".tk", ".ml", ".ga", ".cf", ".gq",
    ".work", ".date", ".download", ".stream",
)

_FULL_URL_RE = re.compile(r"https?://[^\s]+")
_BARE_DOMAIN_RE = re.compile(
    r"(?<![/@\w])"
    r"("
    r"(?:[a-zA-Z0-9-]+\.)+"
    r"(?:com|net|org|io|co|app|dev|xyz|top|tk|ml|ga|cf|gq|me|info|biz|"
    r"online|site|web|shop|click|zip|review|work|date|download|stream|"
    r"live|tv|cc|pw|su|ru|cn|vn|kh)"
    r"(?:/[^\s]*)?"
    r")"
)
_IPV4_RE = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")

_EXECUTABLE_SIGNATURES: tuple[bytes, ...] = (
    b"MZ",                  # Windows PE
    b"\x7fELF",             # Linux/Unix ELF
    b"PK\x03\x04",          # ZIP / OOXML / JAR / APK
    b"\x1f\x8b",            # GZIP
    b"7z\xbc\xaf\x27\x1c",  # 7-Zip
    b"Rar!\x1a\x07",        # RAR
    b"\xfd7zXZ\x00",        # XZ
    b"BZh",                 # BZIP2
    b"#!",                  # Script with shebang
)


def extract_domain(url: str) -> str:
    try:
        if not url.startswith("http"):
            url = "https://" + url
        parsed = urlparse(url)
        domain = (parsed.netloc or parsed.path).split(":")[0].lower()
        if domain.startswith("www."):
            domain = domain[4:]
        return domain or url[:60]
    except Exception:
        return url[:60]


def extract_urls(text: str) -> list[str]:
    if not text:
        return []

    full_urls = _FULL_URL_RE.findall(text)
    bare_domains = _BARE_DOMAIN_RE.findall(text)

    normalized = [u if u.startswith("http") else "https://" + u for u in full_urls + bare_domains]

    seen: set[str] = set()
    result: list[str] = []
    for u in normalized:
        if u not in seen:
            seen.add(u)
            result.append(u)
    return result


def is_whitelisted(url: str) -> bool:
    domain = extract_domain(url)

    for s in URL_SHORTENERS:
        if domain == s or domain.endswith("." + s):
            return False

    for tld in SUSPICIOUS_TLDS:
        if domain.endswith(tld):
            return False

    if _IPV4_RE.match(domain):
        return False

    for trusted in WHITELIST_DOMAINS:
        trusted = trusted.lower()
        if domain == trusted or domain.endswith("." + trusted):
            return True

    return False


def is_high_risk_file(filename: str) -> bool:
    """True when any suffix in the filename is high risk.

    Checking every suffix catches files such as malware.exe.txt or
    payload.js.backup instead of trusting only the final extension.
    """
    if not filename:
        return False
    lower = filename.lower().strip()
    parts = lower.split(".")[1:]
    return any("." + part in HIGH_RISK_EXTENSIONS for part in parts)


def is_file_candidate(filename: str, mime_type: str = "") -> bool:
    """Decide whether a Telegram document should be sent to VirusTotal.

    High-risk extensions are always scanned. Files without a useful extension
    are also scanned, since attackers can deliberately remove/rename it.
    Common media/text files are skipped to preserve VirusTotal quota.
    """
    if is_high_risk_file(filename):
        return True

    lower = (filename or "").lower()
    if "." not in lower:
        return True

    final_ext = "." + lower.rsplit(".", 1)[-1]
    if final_ext in SAFE_EXTENSIONS:
        return False

    suspicious_mime = any(
        x in (mime_type or "").lower()
        for x in (
            "application/x-executable",
            "application/x-dosexec",
            "application/x-msdownload",
            "application/x-sh",
            "application/x-elf",
            "application/octet-stream",
        )
    )
    return suspicious_mime or final_ext not in SAFE_EXTENSIONS


def looks_dangerous_bytes(file_bytes: bytes) -> bool:
    """Detect common executable/archive signatures before relying on filename.

    This catches simple extension spoofing such as malware.exe renamed to
    photo.jpg. It's a pre-filter, not a verdict; VirusTotal is the final say.
    """
    if not file_bytes:
        return False
    head = file_bytes[:16]
    return any(head.startswith(sig) for sig in _EXECUTABLE_SIGNATURES)


def mask_domain(domain: str) -> str:
    return domain.replace(".", "[.]")


def resolve_redirect(url: str, max_redirects: int = None, timeout: int = None) -> str:
    """Resolve a URL's redirect chain to its final destination without reading the body.

    SSRF guard: only http/https, and hosts resolving to private/reserved/loopback
    addresses are never fetched.
    """
    max_redirects = config.LINK_PREVIEW_MAX_REDIRECTS if max_redirects is None else max_redirects
    timeout = config.LINK_PREVIEW_TIMEOUT if timeout is None else timeout
    current = url if url.startswith("http") else "https://" + url
    for _ in range(max_redirects + 1):
        parsed = urlparse(current)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            return current
        if _blocked_host(parsed.hostname):
            return current
        try:
            r = requests.get(
                current,
                timeout=timeout,
                allow_redirects=False,
                stream=True,
                headers={"User-Agent": "Mozilla/5.0 (SongketBot)"},
            )
        except Exception:
            return current
        try:
            r.close()
        except Exception:
            pass
        if r.status_code in (301, 302, 303, 307, 308) and r.headers.get("location"):
            current = urljoin(current, r.headers["location"])
            continue
        return current
    return current


def compute_trust(chat_id: int, user_id: int, first_seen: float, join_ts: Optional[float]) -> dict:
    """Compute a per-user trust badge from strikes + account/join age signals.

    `join_ts` may be None when the member joined before the bot was added (no
    new_chat_members event) — in that case the join-age signal is skipped.
    """
    from bot.redis_client import get_strikes

    strikes = get_strikes(chat_id, user_id)
    if strikes >= config.TRUST_FLAGGED_STRIKES:
        return {"level": "flagged", "label": "🔴 Flagged"}

    now = time.time()
    account_new = (now - first_seen) / 86400 < config.TRUST_NEW_ACCOUNT_DAYS
    member_new = join_ts is not None and (now - join_ts) / 86400 < config.TRUST_NEW_MEMBER_DAYS
    is_new = account_new and member_new if config.TRUST_NEW_MATCH_MODE == "all" else account_new or member_new
    if is_new:
        return {"level": "new", "label": "🟡 New"}
    return {"level": "verified", "label": "🟢 Verified"}


def get_user_display(sender: dict) -> str:
    username = sender.get("username")
    if username:
        return esc(f"@{username}")
    first = sender.get("first_name", "")
    last = sender.get("last_name", "")
    return esc(f"{first} {last}".strip() or "Unknown")


# ── admin & group authorization helpers ──────────────────────────────────────

def super_admin_ids() -> set[int]:
    result = set()
    raw = config.ADMIN_CHAT_ID or os.environ.get("ADMIN_CHAT_ID", "")
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


def whitelist_user_ids() -> set[int]:
    result = set(config.WHITELIST_USER_IDS)
    try:
        redis_extra = kv_get("config:whitelist_user_ids")
        if redis_extra:
            for item in str(redis_extra).split(","):
                item = item.strip()
                if item:
                    try:
                        result.add(int(item))
                    except ValueError:
                        pass
    except Exception:
        pass
    return result


def get_allowed_groups() -> set[int]:
    groups = set(config.ALLOWED_GROUP_IDS)
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
    except Exception:
        pass
    return groups


def explicit_group_map() -> dict[int, list[int]]:
    try:
        redis_handlers = kv_json_get("config:group_handlers")
        if redis_handlers and isinstance(redis_handlers, dict):
            out = {}
            for uid, grps in redis_handlers.items():
                out[int(uid)] = [int(g) for g in grps][:config.MAX_DASHBOARD_GROUPS]
            return out
    except Exception:
        pass

    raw = config.GROUP_HANDLERS_JSON or os.environ.get("GROUP_HANDLERS_JSON", "").strip()
    if not raw:
        return {}
    try:
        cleaned = re.sub(r',\s*([\]}])', r'\1', raw)
        obj = json.loads(cleaned)
        out = {}
        for uid, grps in obj.items():
            out[int(uid)] = [int(g) for g in grps][:config.MAX_DASHBOARD_GROUPS]
        return out
    except Exception:
        return {}


def get_managed_groups_for_user(api, user_id: int) -> list[dict]:
    """Return the list of {'id': group_id, 'title': title} that the user is authorized to manage."""
    allowed = get_allowed_groups()
    group_ids: list[int] = []

    # 1. Prefer explicit group mapping if defined for this user
    explicit = explicit_group_map().get(user_id)
    if explicit is not None:
        group_ids = [g for g in explicit if not allowed or g in allowed]
    elif is_super_admin(user_id):
        group_ids = sorted(list(allowed))
    else:
        for gid in sorted(allowed):
            if api.is_group_admin(user_id, gid):
                group_ids.append(gid)
                if len(group_ids) >= config.MAX_DASHBOARD_GROUPS:
                    break

    groups: list[dict] = []
    for gid in group_ids:
        chat = api.get_chat(gid)
        title = (chat or {}).get("title") or f"Group {gid}"
        groups.append({"id": gid, "title": title})
    return groups
