"""URL / file heuristics shared by the message handlers and scanner."""
from __future__ import annotations

import re
from urllib.parse import urlparse

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


def get_user_display(sender: dict) -> str:
    username = sender.get("username")
    if username:
        return f"@{username}"
    first = sender.get("first_name", "")
    last = sender.get("last_name", "")
    return f"{first} {last}".strip() or "Unknown"
