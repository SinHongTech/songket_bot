"""
Core update-processing logic — bilingual (Khmer + English) security bot.

- Silent on clean content
- Suspicious URLs: warning sent, wait, then deleted
- Malicious: delete message + permanent threat alert
- URL shorteners / suspicious TLDs / raw IPs are always scanned
- Bots are ignored
- Optional private admin alert
"""
from __future__ import annotations

import logging
import time

from bot import config
from bot.file_handler import fetch_and_validate
from bot.reports import record_report
from bot.scanner import vt_scan_file, vt_scan_url
from bot.telegram_api import TelegramAPI
from bot.utils import extract_domain, extract_urls, get_user_display, is_whitelisted, mask_domain

logger = logging.getLogger("BeydaBot.handlers")

# ── Messages — bilingual Khmer / English ────────────────────────────────────
MSG_SCANNING = "🔍 <i>កំពុងស្កែនមាតិកា សូមរង់ចាំ...</i>\n"

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

MSG_SUSPICIOUS_FILE = (
    "⚠️ <b>Suspicious File Detected | ឯកសារគួរឱ្យសង្ស័យ</b>\n\n"
    "🔹 <b>អ្នកផ្ញើរ :</b> {user}\n"
    "🔹 <b>ឯកសារ :</b> {filename}\n"
    "🔹 <b>Suspicious engines :</b> {count}\n"
    "⚠️ <i>សូមកុំបើក ឬដំណើរការឯកសារនេះ មុនពេលពិនិត្យបន្ថែម។</i>"
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


def _send_threat_alert(api: TelegramAPI, chat_id: int, user_display: str, flag: str, malicious: int, deleted: bool) -> None:
    action_kh = "សារត្រូវបានលុប" if deleted else "មិនអាចលុបសារ, ពិនិត្យសិទ្ធិ Admin របស់ Bot"
    text = MSG_THREAT.format(user=user_display, flag=flag, count=malicious, action_kh=action_kh)
    api.send_message(chat_id, text)
    if config.ADMIN_CHAT_ID:
        try:
            api.send_message(int(config.ADMIN_CHAT_ID), text)
        except Exception as exc:
            logger.error("Admin alert failed: %s", exc)


def _handle_private_chat(api: TelegramAPI, chat_id: int, message: dict) -> None:
    """In private chats we only offer the Mini App entry point."""
    text = (message.get("text") or "").strip()
    command = text.split()[0].split("@", 1)[0] if text else ""
    if command not in {"/start", "/app"}:
        return
    if config.WEB_APP_URL:
        api.send_message(
            chat_id,
            "🛡️ <b>Telegram Security Bot</b>\n\n"
            "Open the project information and, if you are authorized, your security dashboard.",
            reply_markup={"inline_keyboard": [[{"text": "🛡️ Open Security Mini App", "web_app": {"url": config.WEB_APP_URL}}]]},
        )
    else:
        api.send_message(chat_id, "WEB_APP_URL is not configured yet.")


def process_update(api: TelegramAPI, update: dict) -> None:
    message = update.get("message") or update.get("edited_message")
    if not message:
        return

    sender = message.get("from") or {}
    if sender.get("is_bot"):
        return

    chat = message.get("chat", {})
    chat_id = chat.get("id", 0)
    chat_type = chat.get("type", "")
    msg_id = message.get("message_id", 0)

    if chat_type == "private":
        _handle_private_chat(api, chat_id, message)
        return

    if config.ALLOWED_GROUP_IDS and chat_id not in config.ALLOWED_GROUP_IDS:
        logger.info("Unauthorized group %d — ignored", chat_id)
        return

    user_display = get_user_display(sender)
    chat_title = chat.get("title", str(chat_id))

    content = (message.get("text") or "") + " " + (message.get("caption") or "")
    urls = extract_urls(content)

    doc = message.get("document") or {}
    filename = doc.get("file_name", "")
    file_id = doc.get("file_id", "")
    filesize = doc.get("file_size", 0)
    mime_type = doc.get("mime_type", "")
    has_file = bool(file_id)

    has_scannable_url = any(not is_whitelisted(u) for u in urls)
    if not has_scannable_url and not has_file:
        return

    notice_id = api.send_message(chat_id, MSG_SCANNING)

    def delete_notice() -> None:
        if notice_id:
            api.delete_message(chat_id, notice_id)

    # ── URL scanning ─────────────────────────────────────────────────────
    for url in urls:
        domain = extract_domain(url)

        if is_whitelisted(url):
            logger.info("Whitelisted | domain=%s", domain)
            continue

        logger.info("Scanning URL | domain=%s | user=%s", domain, user_display)
        result = vt_scan_url(url)

        if "error" in result:
            logger.error("URL scan error | domain=%s | %s", domain, result["error"])
            record_report(chat_id, chat_title, "errors")
            continue

        malicious = result.get("malicious", 0)
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
            warn_id = api.send_message(
                chat_id, MSG_SUSPICIOUS.format(user=user_display, domain=mask_domain(domain), count=suspicious)
            )
            logger.info("Suspicious URL | domain=%s | suspicious=%d", domain, suspicious)
            if warn_id:
                time.sleep(15)
                api.delete_message(chat_id, warn_id)
            return

        delete_notice()
        deleted = api.delete_message(chat_id, msg_id)
        if deleted:
            record_report(chat_id, chat_title, "deleted")
        _send_threat_alert(api, chat_id, user_display, mask_domain(domain), malicious, deleted)
        logger.warning("URL THREAT | domain=%s | malicious=%d | deleted=%s", domain, malicious, deleted)
        return

    # ── File scanning ────────────────────────────────────────────────────
    if not has_file:
        delete_notice()
        return

    logger.info("Scanning file | %s | user=%s", filename, user_display)
    decision = fetch_and_validate(api, file_id, filename, filesize, mime_type)

    if decision.oversize:
        record_report(chat_id, chat_title, "oversize")
        delete_notice()
        api.send_message(chat_id, MSG_TOO_LARGE.format(user=user_display, filename=filename, size_mb=decision.size_mb))
        return

    if not decision.ok:
        delete_notice()
        return

    result = vt_scan_file(decision.file_bytes, filename)
    if "error" in result:
        logger.error("File scan error | %s | %s", filename, result["error"])
        record_report(chat_id, chat_title, "errors")
        delete_notice()
        return

    malicious = result.get("malicious", 0)
    suspicious = result.get("suspicious", 0)
    record_report(chat_id, chat_title, "scanned")
    record_report(chat_id, chat_title, "files")
    if malicious > 0:
        record_report(chat_id, chat_title, "malicious")
    if suspicious > 0:
        record_report(chat_id, chat_title, "suspicious")

    if malicious >= config.VT_MALICIOUS_THRESHOLD:
        delete_notice()
        deleted = api.delete_message(chat_id, msg_id)
        if deleted:
            record_report(chat_id, chat_title, "deleted")
        _send_threat_alert(api, chat_id, user_display, filename, malicious, deleted)
        logger.warning("FILE THREAT | %s | malicious=%d | suspicious=%d | deleted=%s", filename, malicious, suspicious, deleted)
        return

    if suspicious >= config.VT_SUSPICIOUS_THRESHOLD:
        # Suspicious-only results are warned about but not auto-deleted;
        # VirusTotal can produce occasional false positives at this level.
        delete_notice()
        api.send_message(chat_id, MSG_SUSPICIOUS_FILE.format(user=user_display, filename=filename, count=suspicious))
        logger.warning("FILE SUSPICIOUS | %s | malicious=%d | suspicious=%d", filename, malicious, suspicious)
        return

    logger.info("File clean | %s | malicious=%d | suspicious=%d", filename, malicious, suspicious)
    delete_notice()
