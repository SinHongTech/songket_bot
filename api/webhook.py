"""
Beyda Security Bot — Webhook Edition (Khmer + English UI)
==========================================================
- Silent on clean content
- Bilingual Khmer/English for all user-facing messages
- Suspicious URLs: warning sent, sleep 15s, then deleted
- Malicious: delete message + permanent threat alert
- URL shorteners / suspicious TLDs / raw IPs always scanned
- Uses completed VT analysis without waiting for an arbitrary engine count
- Bots ignored
- Admin private alert (optional)
- Vercel KV (Upstash Redis) for persistent cache
"""

import os
import re
import json
import time
import hashlib
import logging
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse
from typing import Optional

import requests

from api.common import kv_json_get, kv_json_set, local_date

# ──────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("BeydaBot")

# ──────────────────────────────────────────────
# Environment Variables
# ──────────────────────────────────────────────
BOT_TOKEN     = os.environ.get("BOT_TOKEN", "")
VT_API_KEY    = os.environ.get("VT_API_KEY", "")
ADMIN_CHAT_ID = os.environ.get("ADMIN_CHAT_ID", "")

# Vercel KV — auto-injected when KV is connected in Vercel dashboard
KV_REST_API_URL = (
    os.environ.get("UPSTASH_REDIS_REST_URL")
    or os.environ.get("KV_REST_API_URL")
    or ""
).rstrip("/")
KV_REST_API_TOKEN = (
    os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    or os.environ.get("KV_REST_API_TOKEN")
    or ""
)

if not BOT_TOKEN:
    logger.critical("BOT_TOKEN is not set.")
if not VT_API_KEY:
    logger.critical("VT_API_KEY is not set.")
if not KV_REST_API_URL:
    logger.warning("Upstash Redis REST credentials are not set — persistent cache/reporting disabled; using memory only.")

TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"
VT_BASE_URL  = "https://www.virustotal.com/api/v3"
VT_HEADERS   = {"x-apikey": VT_API_KEY}

# ──────────────────────────────────────────────
# Allowed Groups
# ──────────────────────────────────────────────
_raw = os.environ.get("ALLOWED_GROUP_IDS", "")
ALLOWED_GROUPS: set[int] = set()
for _g in _raw.split(","):
    _g = _g.strip()
    if _g:
        try:
            ALLOWED_GROUPS.add(int(_g))
        except ValueError:
            logger.warning("Bad group ID: %s", _g)

logger.info("Allowed groups: %s", ALLOWED_GROUPS)

# ──────────────────────────────────────────────
# VirusTotal settings
# VirusTotal returns a final analysis result with status=completed. Waiting
# for an arbitrary number of engines can make a Vercel webhook time out.
VT_MALICIOUS_THRESHOLD = max(1, int(os.environ.get("VT_MALICIOUS_THRESHOLD", "1")))
VT_SUSPICIOUS_THRESHOLD = max(1, int(os.environ.get("VT_SUSPICIOUS_THRESHOLD", "1")))
VT_POLL_INTERVAL = max(1, int(os.environ.get("VT_POLL_INTERVAL", "2")))
VT_POLL_ATTEMPTS = max(1, int(os.environ.get("VT_POLL_ATTEMPTS", "5")))

MAX_FILE_SIZE_MB = min(32, max(1, int(os.environ.get("MAX_FILE_SIZE_MB", "32"))))
TELEGRAM_MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024
KV_TTL = 24 * 3600  # 24 hours

# ──────────────────────────────────────────────
# File extensions
# ──────────────────────────────────────────────
HIGH_RISK_EXTENSIONS: set[str] = {
    ".exe", ".dll", ".scr", ".bat", ".cmd",
    ".ps1", ".js",  ".vbs", ".jar", ".msi",
    ".apk", ".com", ".pif", ".hta", ".wsf",
    ".reg", ".rar", ".zip", ".7z", ".tar",
    ".gz",  ".eml", ".xlsm", ".pptm", ".docm", ".dotm", ".xltm",
    ".crt", ".cer", ".z", ".lz", ".lzma", ".xz", ".bz2",
    ".iso", ".img", ".bin", ".dmg", ".deb", ".rpm",
    ".elf", ".so", ".a", ".class", ".war", ".ear", ".aab",
}

# ──────────────────────────────────────────────
# Domain lists
# ──────────────────────────────────────────────
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
    ".tk",  ".ml",  ".ga",    ".cf",  ".gq",
    ".work", ".date", ".download", ".stream",
)

# ──────────────────────────────────────────────
# Messages — Bilingual Khmer / English
# ──────────────────────────────────────────────
MSG_SCANNING = (
    "🔍 <i>កំពុងស្កែនមាតិកា សូមរង់ចាំ...</i>\n"
)

MSG_THREAT = (
    "🚨 <b>រកឃើញមាតិកាគ្រោះថ្នាក់ | Threat Detection</b>\n\n"
    "🔹 <b>អ្នកផ្ញើរ :</b> {user}\n"
    "🔹 <b>សារ​ :</b> {flag}\n"
    "🔹 <b>ករណីរកឃើញ : </b>{count} security engines មាតិកានេះមានគ្រោះថ្នាក់\n"
    "🔹 <b>សកម្មភាព : </b>{action_kh}\n"
)

MSG_SUSPICIOUS = (
    "⚠️ <b>រកឃើញតំណភ្ជាប់គួរឱ្យសង្ស័យ | Suspicious Link Detected</b>\n\n"
    "🔹 <b>អ្នកផ្ញើរ :</b> {user}\n"
    "🔹 <b>សារ :</b> {domain}\n"
    "🔹 <b>ករណីរកឃើញ : </b>{count} engine(s) បានរកឃើញថាគួរឱ្យសង្ស័យ\n"
    "⏳ <i>សារនេះនឹងលុបដោយស្វ័យប្រវត្តិក្នុង 15 វិនាទី</i>\n"
)

MSG_TOO_LARGE = (
    "🚨 <b>ព្រមាន! ឯកសារអាចមានគ្រោះថ្នាក់ | SECURITY ALERT</b>\n\n"
    "🫣 <b>អ្នកផ្ញើរ :</b> {user}\n"
    "👾 <b>ឯកសារ :</b> {filename}\n"
    "📦 <b>ទំហំ :</b> {size_mb} MB\n\n"
    "⚠️ <b>សូមប្រុងប្រយ័ត្ន!</b>\n"
    " - ឯកសារដែលមានឈ្មោះមិនប្រក្រតី គួរឱ្យសង្ស័យ អាចផ្ទុកមេរោគ ឬកម្មវិធីបង្កគ្រោះថ្នាក់\n"
    " - ឯកសារគ្រប់ប្រភេទដែលមានកន្ទុយខាងក្រោយដូចជា: (.exe, .zip, .rar, .iso, .js, .bat, .cmd, .scr, .msi, .vbs, .dll, .docm, .xlsm, .pptm, .apk, .z និងឯកសារផ្សេងៗទៀត)\n\n"
    "👉 <b>សូមអនុវត្ត៖</b>\n"
    "❌ ហាមបើក / ពន្លា (extract)\n"
    "❌ ហាមចុច (Run ឬ Install)\n"
    "❌ ហាមបញ្ជូនបន្ត (forward)\n"
    "🗑️ លុបចោលភ្លាមៗ រួមទាំង Trash\n\n"
    "🙈 <b>បើបានបើកឯកសាររួចហើយ៖</b>\n"
    "<b>1️⃣</b> ផ្ដាច់ Wi-Fi/LAN ភ្លាមៗ\n"
    "<b>2️⃣</b> ប្តូរពាក្យសម្ងាត់ពីឧបករណ៍ផ្សេងៗ\n\n"
    "🤖 <b>ក្រុមការងារ PLP / DPE, MoEYS</b>\n"
)

# ──────────────────────────────────────────────
# Vercel KV cache — persistent across cold starts
# Falls back to in-memory if KV is not configured
# ──────────────────────────────────────────────
_mem_cache: dict[str, tuple[float, dict]] = {}


def _make_cache_key(raw: str) -> str:
    """Normalize URL/hash into a consistent cache key."""
    normalized = raw.lower()
    normalized = re.sub(r'^https?://', '', normalized)
    normalized = normalized.rstrip("/").split("?")[0].split("#")[0]
    return hashlib.sha256(normalized.encode()).hexdigest()[:32]


def cache_get(key: str) -> Optional[dict]:
    """Get from KV first, fall back to in-memory."""
    if KV_REST_API_URL and KV_REST_API_TOKEN:
        try:
            r = requests.get(
                f"{KV_REST_API_URL}/get/{key}",
                headers={"Authorization": f"Bearer {KV_REST_API_TOKEN}"},
                timeout=3,
            )
            if r.status_code == 200:
                val = r.json().get("result")
                if val:
                    data = json.loads(val)
                    if isinstance(data, dict) and "malicious" in data:
                        logger.info("KV cache hit | key=%s | mal=%d",
                                    key[:16], data.get("malicious", 0))
                        return data
                    logger.warning("KV cache entry malformed, ignoring | key=%s", key[:16])
        except Exception as exc:
            logger.error("KV get error: %s", exc)

    entry = _mem_cache.get(key)
    if entry and (time.time() - entry[0]) < KV_TTL:
        logger.info("Memory cache hit | key=%s", key[:16])
        return entry[1]

    return None


def cache_set(key: str, value: dict) -> None:
    """Store in KV and in-memory."""
    _mem_cache[key] = (time.time(), value)

    if KV_REST_API_URL and KV_REST_API_TOKEN:
        try:
            r = requests.post(
                f"{KV_REST_API_URL}/set/{key}",
                headers={"Authorization": f"Bearer {KV_REST_API_TOKEN}"},
                params={"EX": KV_TTL},
                data=json.dumps(value),
                timeout=3,
            )
            if r.status_code == 200:
                logger.info("KV cache set | key=%s | mal=%d",
                            key[:16], value.get("malicious", 0))
            else:
                logger.warning("KV set non-200 | key=%s | status=%d",
                               key[:16], r.status_code)
        except Exception as exc:
            logger.error("KV set error: %s", exc)


# ──────────────────────────────────────────────
# URL helpers
# ──────────────────────────────────────────────

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

    full_urls = re.compile(r'https?://[^\s]+').findall(text)

    bare_domains = re.compile(
        r'(?<![/@\w])'
        r'('
        r'(?:[a-zA-Z0-9-]+\.)+'
        r'(?:com|net|org|io|co|app|dev|xyz|top|tk|ml|ga|cf|gq|me|info|biz|'
        r'online|site|web|shop|click|zip|review|work|date|download|stream|'
        r'live|tv|cc|pw|su|ru|cn|vn|kh)'
        r'(?:/[^\s]*)?'
        r')'
    ).findall(text)

    normalized = [
        u if u.startswith("http") else "https://" + u
        for u in full_urls + bare_domains
    ]

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

    if re.match(r'^\d{1,3}(\.\d{1,3}){3}$', domain):
        return False

    for trusted in WHITELIST_DOMAINS:
        trusted = trusted.lower()
        if domain == trusted or domain.endswith("." + trusted):
            return True

    return False


def is_high_risk_file(filename: str) -> bool:
    """Return True when any suffix in the filename is high risk.

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
    are also scanned because attackers can deliberately remove/rename it.
    Common media/text files are skipped to preserve VirusTotal quota.
    """
    if is_high_risk_file(filename):
        return True

    lower = (filename or "").lower()
    safe_extensions = {
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tif", ".tiff",
        ".mp3", ".wav", ".ogg", ".m4a", ".mp4", ".mkv", ".avi", ".mov",
        ".txt", ".csv", ".json", ".xml",
    }

    if "." not in lower:
        return True

    final_ext = "." + lower.rsplit(".", 1)[-1]
    if final_ext in safe_extensions:
        return False

    # Unknown document types are worth scanning. This catches renamed files
    # while avoiding scans of common media.
    suspicious_mime = any(x in (mime_type or "").lower() for x in (
        "application/x-executable",
        "application/x-dosexec",
        "application/x-msdownload",
        "application/x-sh",
        "application/x-elf",
        "application/octet-stream",
    ))
    return suspicious_mime or final_ext not in safe_extensions


def looks_dangerous_bytes(file_bytes: bytes) -> bool:
    """Detect common executable/archive signatures before relying on filename.

    This catches simple extension spoofing such as malware.exe renamed to
    photo.jpg. It is a pre-filter, not a malware verdict; VirusTotal remains
    the final scanner.
    """
    if not file_bytes:
        return False

    head = file_bytes[:16]
    signatures = (
        b"MZ",                 # Windows PE
        b"\x7fELF",             # Linux/Unix ELF
        b"PK\x03\x04",          # ZIP / OOXML / JAR / APK
        b"\x1f\x8b",            # GZIP
        b"7z\xbc\xaf\x27\x1c",  # 7-Zip
        b"Rar!\x1a\x07",         # RAR
        b"\xfd7zXZ\x00",         # XZ
        b"BZh",                # BZIP2
        b"#!",                 # Script with shebang
    )
    return any(head.startswith(sig) for sig in signatures)


def mask_domain(domain: str) -> str:
    return domain.replace(".", "[.]")


# ──────────────────────────────────────────────
# Telegram helpers
# ──────────────────────────────────────────────

def tg_post(endpoint: str, payload: dict) -> dict:
    try:
        r = requests.post(f"{TELEGRAM_API}/{endpoint}", json=payload, timeout=10)
        data = r.json()
        if not data.get("ok"):
            logger.warning("%s failed: %s", endpoint, data)
        return data
    except Exception as exc:
        logger.error("%s error: %s", endpoint, exc)
        return {"ok": False}


def tg_send(chat_id: int, text: str) -> Optional[int]:
    payload: dict = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    data = tg_post("sendMessage", payload)
    if data.get("ok"):
        return data["result"]["message_id"]
    return None


def tg_delete(chat_id: int, message_id: int) -> bool:
    data = tg_post("deleteMessage", {"chat_id": chat_id, "message_id": message_id})
    return data.get("ok", False)


def tg_get_file_url(file_id: str) -> Optional[str]:
    try:
        r = requests.get(f"{TELEGRAM_API}/getFile", params={"file_id": file_id}, timeout=5)
        d = r.json()
        if d.get("ok"):
            return f"https://api.telegram.org/file/bot{BOT_TOKEN}/{d['result']['file_path']}"
        logger.error("getFile failed: %s", d)
    except Exception as exc:
        logger.error("getFile error: %s", exc)
    return None


# ──────────────────────────────────────────────
# Alert senders
# ──────────────────────────────────────────────

def send_threat_alert(chat_id: int, user_display: str, flag: str,
                      malicious: int, deleted: bool) -> None:
    action_kh = "សារត្រូវបានលុប" if deleted else "មិនអាចលុបសារ, ពិនិត្យសិទ្ធិ Admin របស់ Bot"

    text = MSG_THREAT.format(
        user=user_display,
        flag=flag,
        count=malicious,
        action_kh=action_kh,
    )
    tg_send(chat_id, text)

    if ADMIN_CHAT_ID:
        try:
            tg_send(int(ADMIN_CHAT_ID), text)
        except Exception as exc:
            logger.error("Admin alert failed: %s", exc)


def send_suspicious_warning(chat_id: int, user_display: str,
                            domain: str, suspicious: int) -> Optional[int]:
    text = MSG_SUSPICIOUS.format(
        user=user_display,
        domain=mask_domain(domain),
        count=suspicious,
    )
    return tg_send(chat_id, text)


# ──────────────────────────────────────────────
# VirusTotal — URL scan
# ──────────────────────────────────────────────

def vt_scan_url(url: str) -> dict:
    key = _make_cache_key(url)
    cached = cache_get(key)
    if cached:
        return cached

    try:
        resp = requests.post(
            f"{VT_BASE_URL}/urls",
            headers=VT_HEADERS,
            data={"url": url},
            timeout=10,
        )
        if resp.status_code == 429:
            return {"error": "VT rate limit"}
        if resp.status_code != 200:
            return {"error": f"VT submit HTTP {resp.status_code}"}

        analysis_id = resp.json()["data"]["id"]

        for attempt in range(VT_POLL_ATTEMPTS):
            # Short polling keeps the synchronous Vercel webhook inside its
            # execution window while still giving VT time to finish.
            time.sleep(VT_POLL_INTERVAL)
            r = requests.get(
                f"{VT_BASE_URL}/analyses/{analysis_id}",
                headers=VT_HEADERS,
                timeout=3,
            )
            attrs = r.json()["data"]["attributes"]

            if attrs.get("status") == "completed":
                stats = attrs.get("stats", {})
                result = {
                    "malicious": stats.get("malicious", 0),
                    "suspicious": stats.get("suspicious", 0),
                    "harmless": stats.get("harmless", 0),
                    "undetected": stats.get("undetected", 0),
                }
                cache_set(key, result)
                logger.info(
                    "VT URL done | attempt=%d | malicious=%d | suspicious=%d",
                    attempt + 1, result["malicious"], result["suspicious"],
                )
                return result

        return {"error": "VT URL timed out before analysis completed"}

    except Exception as exc:
        logger.error("vt_scan_url: %s", exc)
        return {"error": str(exc)}


# ──────────────────────────────────────────────
# VirusTotal — file scan
# ──────────────────────────────────────────────

def vt_scan_file(file_bytes: bytes, filename: str) -> dict:
    sha256 = hashlib.sha256(file_bytes).hexdigest()
    key    = f"file-{sha256[:32]}"
    cached = cache_get(key)
    if cached:
        return cached

    try:
        check = requests.get(f"{VT_BASE_URL}/files/{sha256}",
                             headers=VT_HEADERS, timeout=5)
        if check.status_code == 200:
            stats  = check.json()["data"]["attributes"]["last_analysis_stats"]
            result = {
                "malicious":  stats.get("malicious", 0),
                "suspicious": stats.get("suspicious", 0),
                "harmless":   stats.get("harmless", 0),
                "undetected": stats.get("undetected", 0),
                "cached": True,
            }
            cache_set(key, result)
            logger.info("VT file hash hit | malicious=%d | %s", result["malicious"], filename)
            return result

        if check.status_code == 429:
            return {"error": "VT rate limit"}

        logger.info("Uploading to VT | %s | %d bytes", filename, len(file_bytes))
        up = requests.post(
            f"{VT_BASE_URL}/files",
            headers=VT_HEADERS,
            files={"file": (filename, file_bytes)},
            timeout=20,
        )
        if up.status_code == 429:
            return {"error": "VT rate limit on upload"}
        if up.status_code != 200:
            return {"error": f"VT upload HTTP {up.status_code}"}

        analysis_id = up.json()["data"]["id"]

        for attempt in range(VT_POLL_ATTEMPTS):
            time.sleep(VT_POLL_INTERVAL)
            r = requests.get(
                f"{VT_BASE_URL}/analyses/{analysis_id}",
                headers=VT_HEADERS,
                timeout=3,
            )
            attrs = r.json()["data"]["attributes"]

            if attrs.get("status") == "completed":
                stats = attrs.get("stats", {})
                result = {
                    "malicious": stats.get("malicious", 0),
                    "suspicious": stats.get("suspicious", 0),
                    "harmless": stats.get("harmless", 0),
                    "undetected": stats.get("undetected", 0),
                    "sha256": sha256,
                    "cached": False,
                }
                cache_set(key, result)
                logger.info(
                    "VT file done | attempt=%d | malicious=%d | suspicious=%d",
                    attempt + 1, result["malicious"], result["suspicious"],
                )
                return result

        return {"error": "VT file timed out before analysis completed"}

    except Exception as exc:
        logger.error("vt_scan_file: %s", exc)
        return {"error": str(exc)}


# ──────────────────────────────────────────────
# Persistent daily reporting
# ──────────────────────────────────────────────

def record_report(chat_id: int, chat_title: str, metric: str, amount: int = 1) -> None:
    """Persist one daily metric per Telegram group.

    Reports are keyed by group, not by admin, so one group is counted once.
    A whitelisted admin sees only the groups they are assigned to / administer.
    """
    day = local_date()
    key = f"report:{day}:{chat_id}"
    report = kv_json_get(key) or {
        "date": day, "group_id": chat_id, "group_title": chat_title or str(chat_id),
        "scanned": 0, "files": 0, "urls": 0, "malicious": 0,
        "deleted": 0, "suspicious": 0, "errors": 0, "oversize": 0,
    }
    report["group_title"] = chat_title or report.get("group_title") or str(chat_id)
    report[metric] = int(report.get(metric, 0)) + amount
    kv_json_set(key, report, ttl=45 * 86400)


# ──────────────────────────────────────────────
# Core processor
# ──────────────────────────────────────────────

def get_user_display(sender: dict) -> str:
    username = sender.get("username")
    if username:
        return f"@{username}"
    first = sender.get("first_name", "")
    last  = sender.get("last_name", "")
    return f"{first} {last}".strip() or "Unknown"


def process_update(update: dict) -> None:
    message = update.get("message") or update.get("edited_message")
    if not message:
        return

    sender = message.get("from") or {}

    if sender.get("is_bot"):
        return

    chat      = message.get("chat", {})
    chat_id   = chat.get("id", 0)
    chat_type = chat.get("type", "")
    msg_id    = message.get("message_id", 0)

    if chat_type == "private":
        # Open the Telegram Mini App from a private chat. The Mini App itself
        # decides whether this user is whitelisted and can see the dashboard.
        command = (message.get("text") or "").split()[0].split("@", 1)[0] if (message.get("text") or "").strip() else ""
        if command in {"/start", "/app"}:
            web_app_url = os.environ.get("WEB_APP_URL", "").strip()
            if web_app_url:
                tg_post("sendMessage", {
                    "chat_id": chat_id,
                    "text": "🛡️ <b>Telegram Security Bot</b>\n\nOpen the project information and, if you are authorized, your security dashboard.",
                    "parse_mode": "HTML",
                    "reply_markup": {"inline_keyboard": [[{"text": "🛡️ Open Security Mini App", "web_app": {"url": web_app_url}}]]},
                })
            else:
                tg_send(chat_id, "WEB_APP_URL is not configured yet.")
        return

    if ALLOWED_GROUPS and chat_id not in ALLOWED_GROUPS:
        logger.info("Unauthorized group %d — ignored", chat_id)
        return

    user_display = get_user_display(sender)
    chat_title = chat.get("title", str(chat_id))

    content = (message.get("text") or "") + " " + (message.get("caption") or "")
    urls    = extract_urls(content)

    doc      = message.get("document") or {}
    filename = doc.get("file_name", "")
    file_id  = doc.get("file_id", "")
    filesize = doc.get("file_size", 0)

    has_scannable_url  = any(not is_whitelisted(u) for u in urls)
    mime_type = doc.get("mime_type", "")
    has_file = bool(file_id)
    has_scannable_file = bool(file_id and is_file_candidate(filename, mime_type))

    if not has_scannable_url and not has_file:
        return

    notice_id = tg_send(chat_id, MSG_SCANNING)

    def delete_notice():
        if notice_id:
            tg_delete(chat_id, notice_id)

    # ── URL scanning ──────────────────────────────────────────────────────
    for url in urls:
        domain = extract_domain(url)

        if is_whitelisted(url):
            logger.info("Whitelisted | domain=%s", domain)
            continue

        logger.info("Scanning URL | domain=%s | user=%s", domain, user_display)
        result = vt_scan_url(url)

        if "error" in result:
            logger.error("URL scan error | domain=%s | %s", domain, result["error"])
            continue

        malicious  = result.get("malicious", 0)
        suspicious = result.get("suspicious", 0)
        record_report(chat_id, chat_title, "scanned")
        record_report(chat_id, chat_title, "urls")
        if malicious > 0:
            record_report(chat_id, chat_title, "malicious")
        if suspicious > 0:
            record_report(chat_id, chat_title, "suspicious")

        if malicious == 0 and suspicious == 0:
            logger.info("URL clean | domain=%s", domain)
            continue

        if malicious == 0 and suspicious > 0:
            delete_notice()
            warn_id = send_suspicious_warning(chat_id, user_display, domain, suspicious)
            logger.info("Suspicious URL | domain=%s | suspicious=%d", domain, suspicious)
            if warn_id:
                time.sleep(15)
                tg_delete(chat_id, warn_id)
            return

        delete_notice()
        deleted = tg_delete(chat_id, msg_id)
        if deleted:
            record_report(chat_id, chat_title, "deleted")
        send_threat_alert(chat_id, user_display, mask_domain(domain), malicious, deleted)
        logger.warning("URL THREAT | domain=%s | malicious=%d | deleted=%s",
                       domain, malicious, deleted)
        return

    # ── File scanning ─────────────────────────────────────────────────────
    if not has_file:
        delete_notice()
        return

    if filesize > TELEGRAM_MAX_FILE_SIZE:
        size_mb = filesize // (1024 * 1024)
        logger.warning("File too large to scan | %s | %d MB", filename, size_mb)
        record_report(chat_id, chat_title, "oversize")
        delete_notice()
        tg_send(chat_id, MSG_TOO_LARGE.format(user=user_display, filename=filename, size_mb=size_mb))
        return

    logger.info("Scanning file | %s | user=%s", filename, user_display)

    download_url = tg_get_file_url(file_id)
    if not download_url:
        delete_notice()
        return

    try:
        download_resp = requests.get(download_url, timeout=12)
        if download_resp.status_code != 200:
            raise RuntimeError(f"Telegram download HTTP {download_resp.status_code}")

        file_bytes = download_resp.content
        if not file_bytes:
            raise RuntimeError("Telegram returned an empty file")

        # Telegram gives us file_size in the update, but verify the actual
        # downloaded payload too.
        if len(file_bytes) > TELEGRAM_MAX_FILE_SIZE:
            raise RuntimeError("Downloaded file exceeds configured size limit")

        logger.info(
            "File downloaded | %s | bytes=%d | mime=%s",
            filename, len(file_bytes), mime_type or "unknown",
        )

        # For common media/text files, only send to VirusTotal when the bytes
        # themselves look like an executable/archive. This catches basic
        # extension spoofing without spending VT quota on every photo/video.
        if not has_scannable_file and not looks_dangerous_bytes(file_bytes):
            logger.info("Safe file prefilter | %s", filename)
            delete_notice()
            return
    except Exception as exc:
        logger.error("File download failed | %s | %s", filename, exc)
        delete_notice()
        return

    result = vt_scan_file(file_bytes, filename)

    if "error" in result:
        logger.error("File scan error | %s | %s", filename, result["error"])
        delete_notice()
        return

    malicious  = result.get("malicious", 0)
    suspicious = result.get("suspicious", 0)
    record_report(chat_id, chat_title, "scanned")
    record_report(chat_id, chat_title, "files")
    if malicious > 0:
        record_report(chat_id, chat_title, "malicious")
    if suspicious > 0:
        record_report(chat_id, chat_title, "suspicious")

    if malicious >= VT_MALICIOUS_THRESHOLD:
        delete_notice()
        deleted = tg_delete(chat_id, msg_id)
        if deleted:
            record_report(chat_id, chat_title, "deleted")
        send_threat_alert(chat_id, user_display, filename, malicious, deleted)
        logger.warning(
            "FILE THREAT | %s | malicious=%d | suspicious=%d | deleted=%s",
            filename, malicious, suspicious, deleted,
        )
        return

    if suspicious >= VT_SUSPICIOUS_THRESHOLD:
        # Suspicious-only results are warned about but not auto-deleted because
        # VirusTotal can produce occasional false positives.
        delete_notice()
        warn_text = (
            "⚠️ <b>Suspicious File Detected | ឯកសារគួរឱ្យសង្ស័យ</b>\n\n"
            f"🔹 <b>អ្នកផ្ញើរ :</b> {user_display}\n"
            f"🔹 <b>ឯកសារ :</b> {filename}\n"
            f"🔹 <b>Suspicious engines :</b> {suspicious}\n"
            "⚠️ <i>សូមកុំបើក ឬដំណើរការឯកសារនេះ មុនពេលពិនិត្យបន្ថែម។</i>"
        )
        tg_send(chat_id, warn_text)
        logger.warning(
            "FILE SUSPICIOUS | %s | malicious=%d | suspicious=%d",
            filename, malicious, suspicious,
        )
        return

    logger.info(
        "File clean | %s | malicious=%d | suspicious=%d",
        filename, malicious, suspicious,
    )
    delete_notice()



# ──────────────────────────────────────────────
# Vercel entry point
# ──────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):  # noqa: A002
        pass

    def do_GET(self):  # noqa: N802
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        kv_status = "connected" if KV_REST_API_URL else "not configured"
        self.wfile.write(
            f"Beyda Security Bot កំពុងដំណើរការ។ | KV: {kv_status}".encode("utf-8")
        )

    def do_POST(self):  # noqa: N802
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            self._respond(400, "No body")
            return

        body = self.rfile.read(length)
        try:
            update = json.loads(body)
        except json.JSONDecodeError as exc:
            logger.error("Bad JSON: %s", exc)
            self._respond(400, "Invalid JSON")
            return

        try:
            process_update(update)
        except Exception as exc:
            logger.exception("Unhandled error: %s", exc)

        self._respond(200, "OK")

    def _respond(self, status: int, body: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "text/plain")
        self.end_headers()
        self.wfile.write(body.encode())