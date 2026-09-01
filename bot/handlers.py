"""
Core update-processing logic — bilingual (Khmer + English) security bot.

- Scanning feedback & 10-second safe message auto-cleanup
- Friendly, non-technical threat & suspicious explanations
- Admin private chat configuration (language & safe message timer)
- In-group language commands (/lang, /kh, /en) and inline buttons
- Suspicious URLs & files: warning sent, wait, then deleted
- Malicious: delete message + clear non-technical threat alert
- Optional private admin alert
"""
from __future__ import annotations

import hashlib
import logging
import time
from typing import Optional

from bot import config
from bot.file_handler import fetch_and_validate
from bot.redis_client import (
    add_strike,
    add_allowed_group,
    add_group_handler,
    clear_pending,
    get_group_lang,
    get_group_settings,
    get_known_groups,
    get_pending,
    get_plan_catalog,
    get_scan_usage,
    get_daily_scan_usage,
    get_join_time,
    get_strikes,
    get_subscription,
    get_user_lang,
    increment_daily_scan_usage,
    increment_scan_usage,
    is_file_whitelisted,
    kv_delete,
    kv_get,
    kv_set,
    plan_scan_limit_runtime,
    record_first_seen,
    record_join_time,
    record_known_group,
    set_group_lang,
    set_group_settings,
    set_pending,
    set_user_lang,
    whitelist_file,
)
from bot.reports import record_report
from bot.scanner import vt_scan_file, vt_scan_url
from bot.telegram_api import TelegramAPI
from bot.utils import (
    compute_trust,
    esc,
    extract_domain,
    extract_urls,
    get_allowed_groups,
    get_managed_groups_for_user,
    get_user_display,
    is_super_admin,
    is_whitelisted,
    mask_domain,
    resolve_redirect,
    whitelist_user_ids,
)

logger = logging.getLogger("BeydaBot.handlers")


# ── Multilingual & Non-Technical Message Templates ──────────────────────────

def get_msg_scanning(lang: str = "both") -> str:
    if lang == "kh":
        return (
            "🔍 កំពុងត្រួតពិនិត្យសុវត្ថិភាព...\n\n"
            "⏳ សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងវិភាគមាតិកា...\n"
            "⚠️ សូមកុំទាន់ចុច ឬបើកឯកសារ/តំណភ្ជាប់នេះ រហូតដល់ការស្កេនចប់សព្វគ្រប់!"
        )
    if lang == "en":
        return (
            "🔍 Security Scan in Progress...\n\n"
            "⏳ Please wait, the system is analyzing the content...\n"
            "⚠️ Please DO NOT click or open this link/file until the security scan completes!"
        )
    return (
        "🔍 កំពុងត្រួតពិនិត្យសុវត្ថិភាព | Security Scan in Progress...\n\n"
        "⏳ សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងវិភាគមាតិកា...\n"
        "⚠️ សូមកុំទាន់ចុច ឬបើកឯកសារ/តំណភ្ជាប់នេះ រហូតដល់ការស្កេនចប់សព្វគ្រប់!\n"
        "(Please DO NOT click or open this link/file until the security scan completes!)"
    )


def get_msg_safe(lang: str, user: str, target: str, timeout: int) -> str:
    if lang == "kh":
        return (
            "✅ <b>មាតិកាមានសុវត្ថិភាព</b>\n\n"
            f"🔹 <b>អ្នកផ្ញើរ :</b> {user}\n"
            f"🔹 <b>មាតិកា :</b> <code>{target}</code>\n"
            "🛡️ <b>លទ្ធផល :</b> មិនមានមេរោគ ឬតំណភ្ជាប់ក្លែងបន្លំឡើយ\n"
            f"⏳ <i>សារនេះនឹងបាត់ដោយស្វ័យប្រវត្តិក្នុ​ង {timeout} វិនាទី</i>"
        )
    if lang == "en":
        return (
            "✅ <b>Content Verified Safe</b>\n\n"
            f"🔹 <b>Sender :</b> {user}\n"
            f"🔹 <b>Target :</b> <code>{target}</code>\n"
            "🛡️ <b>Result :</b> Clean & verified (No threats detected)\n"
            f"⏳ <i>This message will auto-remove in {timeout}s</i>"
        )
    return (
        "✅ <b>មាតិកាមានសុវត្ថិភាព | Content Verified Safe</b>\n\n"
        f"🔹 <b>អ្នកផ្ញើរ (Sender) :</b> {user}\n"
        f"🔹 <b>មាតិកា (Target) :</b> <code>{target}</code>\n"
        "🛡️ <b>លទ្ធផល (Result) :</b> មិនមានមេរោគ ឬតំណភ្ជាប់ក្លែងបន្លំឡើយ (No threats detected)\n"
        f"⏳ <i>សារនេះនឹងបាត់ក្នុង {timeout} វិនាទី (Auto-removes in {timeout}s)</i>"
    )


def get_msg_threat(lang: str, user: str, flag: str, action_kh: str, action_en: str) -> str:
    if lang == "kh":
        return (
            "🚨 <b>រកឃើញមាតិកាគ្រោះថ្នាក់ (Dangerous Threat)</b>\n\n"
            f"🔹 <b>អ្នកផ្ញើរ :</b> {user}\n"
            f"🔹 <b>គោលដៅ :</b> <code>{flag}</code>\n"
            f"🔹 <b>សកម្មភាព :</b> {action_kh}\n\n"
            "🤔 <b>តើនេះជាអ្វី?</b>\n"
            "• នេះជាតំណភ្ជាប់បោកប្រាស់ (Phishing) ឬឯកសារផ្ទុកមេរោគ ដែលប៉ុនប៉ងលួចគណនី Telegram ឬទិន្នន័យផ្ទាល់ខ្លួនរបស់អ្នក។\n\n"
            "🛑 <b>អ្វីដែលអ្នកត្រូវធ្វើ៖</b>\n"
            "❌ <b>ហាមចុចលើតំណភ្ជាប់ ឬបើកឯកសារនេះដាច់ខាត</b>\n"
            "❌ ហាមផ្ដល់លេខសម្ងាត់ ឬលេខកូដ OTP ទៅកាន់អ្នកដទៃ\n\n"
            "💡 <b>ប្រសិនបើអ្នកបានចុច ឬបើកវាហើយ៖</b>\n"
            "1️⃣ ចូល <b>Settings > Privacy & Security > Active Sessions</b> ហើយចុច <b>Terminate all other sessions</b>\n"
            "2️⃣ បើក ឬប្តូរពាក្យសម្ងាត់ <b>Two-Step Verification (ពាក្យសម្ងាត់ ២ ជាន់)</b> ភ្លាមៗ"
        )
    if lang == "en":
        return (
            "🚨 <b>Dangerous Threat Detected!</b>\n\n"
            f"🔹 <b>Sender :</b> {user}\n"
            f"🔹 <b>Target :</b> <code>{flag}</code>\n"
            f"🔹 <b>Action :</b> {action_en}\n\n"
            "🤔 <b>What is this?</b>\n"
            "• This is a phishing scam or malware attempting to steal your Telegram account, passwords, or harm your device.\n\n"
            "🛑 <b>What you should do:</b>\n"
            "❌ <b>Do NOT click the link or open the file</b>\n"
            "❌ Never share your Telegram verification code or OTP with anyone\n\n"
            "💡 <b>If you already clicked or opened it:</b>\n"
            "1️⃣ Go to <b>Settings > Privacy & Security > Active Sessions</b> and tap <b>Terminate all other sessions</b>\n"
            "2️⃣ Change your <b>Two-Step Verification password</b> immediately"
        )
    return (
        "🚨 <b>រកឃើញមាតិកាគ្រោះថ្នាក់ | Threat Detection</b>\n\n"
        f"🔹 <b>អ្នកផ្ញើរ (Sender) :</b> {user}\n"
        f"🔹 <b>គោលដៅ (Target) :</b> <code>{flag}</code>\n"
        f"🔹 <b>សកម្មភាព (Action) :</b> {action_kh} ({action_en})\n\n"
        "🤔 <b>តើនេះជាអ្វី? | What is this?</b>\n"
        "• នេះជាតំណភ្ជាប់បោកប្រាស់ ឬមេរោគ ដែលប៉ុនប៉ងលួចគណនី ឬទិន្នន័យ (Phishing scam or malware attempting to steal account/passwords).\n\n"
        "🛑 <b>អ្វីដែលត្រូវធ្វើ | What to do:</b>\n"
        "❌ <b>ហាមចុច ឬបើកឯកសារ (Do NOT click or open)</b>\n"
        "❌ ហាមផ្ដល់លេខកូដ OTP (Never share OTP codes)\n\n"
        "💡 <b>បើបានចុចរួចហើយ | If already clicked:</b>\n"
        "1️⃣ ចូល <b>Settings > Privacy & Security > Active Sessions</b> រួចចុច <b>Terminate other sessions</b>\n"
        "2️⃣ ប្តូរពាក្យសម្ងាត់ <b>Two-Step Verification</b> ជាបន្ទាន់"
    )


def get_msg_suspicious_url(lang: str, user: str, domain: str, timeout: int = 15) -> str:
    if lang == "kh":
        return (
            "⚠️ <b>រកឃើញតំណភ្ជាប់គួរឱ្យសង្ស័យ</b>\n\n"
            f"🔹 <b>អ្នកផ្ញើរ :</b> {user}\n"
            f"🔹 <b>តំណភ្ជាប់ :</b> <code>{domain}</code>\n\n"
            "⚠️ <b>ការណែនាំសុវត្ថិភាព៖</b>\n"
            "• តំណភ្ជាប់នេះមិនទាន់មានទំនុកចិត្តច្បាស់លាស់ ឬអាចជាគេហទំព័រក្លែងបន្លំ។\n"
            "• សូមកុំបំពេញព័ត៌មានផ្ទាល់ខ្លួន ឬទាញយកឯកសារអ្វីពីតំណនេះឡើយ។\n"
            f"⏳ <i>សារព្រមាននេះនឹងលុបដោយស្វ័យប្រវត្តិក្នុ​ង {timeout} វិនាទី</i>"
        )
    if lang == "en":
        return (
            "⚠️ <b>Suspicious Link Detected</b>\n\n"
            f"🔹 <b>Sender :</b> {user}\n"
            f"🔹 <b>Link :</b> <code>{domain}</code>\n\n"
            "⚠️ <b>Safety Notice:</b>\n"
            "• This link is unverified or potentially risky.\n"
            "• Do not enter personal details, passwords, or download unknown apps.\n"
            f"⏳ <i>This warning will auto-delete in {timeout}s</i>"
        )
    return (
        "⚠️ <b>រកឃើញតំណភ្ជាប់គួរឱ្យសង្ស័យ | Suspicious Link Detected</b>\n\n"
        f"🔹 <b>អ្នកផ្ញើរ (Sender) :</b> {user}\n"
        f"🔹 <b>តំណភ្ជាប់ (Link) :</b> <code>{domain}</code>\n\n"
        "⚠️ <b>ការណែនាំ | Safety Notice:</b>\n"
        "• តំណភ្ជាប់នេះគួរឱ្យសង្ស័យ សូមកុំបំពេញលេខសម្ងាត់ ឬទាញយកអ្វីទាំងអស់ (Unverified link, do not enter credentials).\n"
        f"⏳ <i>សារនេះនឹងលុបដោយស្វ័យប្រវត្តិក្នុង {timeout} វិនាទី (Auto-removes in {timeout}s)</i>"
    )


def get_msg_suspicious_file(lang: str, user: str, filename: str) -> str:
    if lang == "kh":
        return (
            "⚠️ <b>ឯកសារគួរឱ្យសង្ស័យ (Suspicious File)</b>\n\n"
            f"🔹 <b>អ្នកផ្ញើរ :</b> {user}\n"
            f"🔹 <b>ឯកសារ :</b> <code>{filename}</code>\n\n"
            "⚠️ <b>ការណែនាំសុវត្ថិភាព៖</b>\n"
            "• ឯកសារនេះអាចផ្ទុកកម្មវិធីបង្កគ្រោះថ្នាក់ ឬមេរោគ។\n"
            "• ❌ <b>សូមកុំបើក ឬពន្លា (Extract/Run) ឯកសារនេះឡើយ!</b>"
        )
    if lang == "en":
        return (
            "⚠️ <b>Suspicious File Detected</b>\n\n"
            f"🔹 <b>Sender :</b> {user}\n"
            f"🔹 <b>File :</b> <code>{filename}</code>\n\n"
            "⚠️ <b>Safety Notice:</b>\n"
            "• This file may contain malware, scripts, or unwanted software.\n"
            "• ❌ <b>Do NOT open, extract, or run this file!</b>"
        )
    return (
        "⚠️ <b>ឯកសារគួរឱ្យសង្ស័យ | Suspicious File Detected</b>\n\n"
        f"🔹 <b>អ្នកផ្ញើរ (Sender) :</b> {user}\n"
        f"🔹 <b>ឯកសារ (File) :</b> <code>{filename}</code>\n\n"
        "⚠️ <b>ការណែនាំ | Safety Notice:</b>\n"
        "• ឯកសារនេះអាចមានមេរោគ សូមកុំបើក ឬ Run ដាច់ខាត (May contain malware, do not open or run)."
    )


MSG_TOO_LARGE = (
    "🚨 <b>ព្រមាន! ឯកសារអាចមានគ្រោះថ្នាក់ | SECURITY ALERT</b>\n\n"
    "🫣 <b>អ្នកផ្ញើរ :</b> {user}\n"
    "👾 <b>ឯកសារ :</b> <code>{filename}</code>\n"
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


def engine_consensus(result: dict) -> str:
    """Engine-agreement breakdown for suspicious verdicts (percentage + raw count)."""
    total = sum(result.get(k, 0) for k in ("malicious", "suspicious", "harmless", "undetected")) or 1
    safe = result.get("harmless", 0)
    susp = result.get("suspicious", 0)
    undet = result.get("undetected", 0)
    pct = lambda n: round(100 * n / total)
    return (
        f"🟢 Safe = {pct(safe)}% ({safe}/{total})\n"
        f"🟡 Suspicious = {pct(susp)}% ({susp}/{total})\n"
        f"⚪ Undetected = {pct(undet)}% ({undet}/{total})"
    )


def classify_verdict(malicious: int, suspicious: int) -> str:
    """Dual-band detection (doc 2.1/2.2): critical / suspicious / clean."""
    if malicious >= config.VT_CRITICAL_THRESHOLD:
        return "critical"
    if malicious >= config.VT_MALICIOUS_THRESHOLD or suspicious >= config.VT_SUSPICIOUS_THRESHOLD:
        return "suspicious"
    return "clean"


def apply_strike(api: TelegramAPI, chat_id: int, user_id: int, user_display: str) -> int:
    """Increment a user's strike count; mute when a threshold is reached (doc section 3)."""
    strikes = add_strike(chat_id, user_id)
    duration = config.STRIKE_MUTE_RULES.get(strikes)
    if duration:
        hours = duration // 3600
        api.restrict_chat_member(
            chat_id, user_id, can_send_messages=False, until_date=int(time.time()) + duration
        )
        api.send_message(
            chat_id,
            f"📢 <b>{user_display}</b> is restricted for {hours}h due to {strikes} threat violations.",
        )
    return strikes


def trust_label(chat_id: int, user_id: int, settings: dict) -> str:
    if not (config.TRUST_SCORE_ENABLED and settings.get("trust_score", True)):
        return ""
    first = record_first_seen(user_id)
    join = get_join_time(chat_id, user_id)
    return " " + compute_trust(chat_id, user_id, first, join)["label"]


def _personal_allowed(user_id: int) -> tuple[bool, str]:
    if not config.QUOTA_ENABLED:
        return True, ""
    sub = get_subscription(user_id)
    plan = sub.get("plan", "personal_free")
    expiry = int(sub.get("expiry", 0) or 0)
    if plan in ("personal_pro", "personal_premium") and (not expiry or expiry > time.time()):
        limit = plan_scan_limit_runtime(plan)
        used = get_scan_usage(user_id)
        if used >= limit:
            return False, f"Monthly scan limit reached ({used}/{limit}). Upgrade to continue."
        return True, ""
    used_today = get_daily_scan_usage(user_id)
    if used_today >= 3:
        return False, "Free limit reached (3 scans/day). Upgrade to Pro/Premium."
    return True, ""


def _record_personal_usage(user_id: int) -> None:
    increment_scan_usage(user_id)
    increment_daily_scan_usage(user_id)


def _handle_personal_scan(api: TelegramAPI, chat_id: int, message: dict, user_id: int) -> None:
    content = (message.get("text") or "") + " " + (message.get("caption") or "")
    urls = extract_urls(content)
    doc = message.get("document") or {}
    file_id = doc.get("file_id", "")
    has_file = bool(file_id)

    allowed, reason = _personal_allowed(user_id)
    if not allowed:
        api.send_message(chat_id, f"⛔ {reason}")
        return

    results = []
    scanned = 0

    for url in urls:
        if is_whitelisted(url):
            continue
        results.append(("link", extract_domain(url), vt_scan_url(url)))
        scanned += 1

    if has_file:
        filename = doc.get("file_name", "")
        filesize = doc.get("file_size", 0)
        mime = doc.get("mime_type", "")
        decision = fetch_and_validate(api, file_id, filename, filesize, mime)
        if decision.oversize:
            results.append(("file", filename, {"error": "File too large to scan"}))
        elif decision.ok:
            results.append(("file", filename, vt_scan_file(decision.file_bytes, filename)))
        else:
            results.append(("file", filename, {"error": "File skipped (safe prefilter)"}))
        scanned += 1

    if scanned:
        _record_personal_usage(user_id)

    if not results:
        api.send_message(chat_id, "🔍 Send me a link or file and I'll scan it for threats.")
        return

    lang = get_user_lang(user_id)
    headers = {
        "threat": {"kh": "🚨 <b>រកឃើញគ្រោះថ្នាក់</b>", "en": "🚨 <b>Threat detected</b>", "both": "🚨 <b>រកឃើញគ្រោះថ្នាក់ | Threat detected</b>"},
        "suspicious": {"kh": "⚠️ <b>សង្ស័យ</b>", "en": "⚠️ <b>Suspicious</b>", "both": "⚠️ <b>សង្ស័យ | Suspicious</b>"},
        "clean": {"kh": "✅ <b>សុវត្ថិភាព</b>", "en": "✅ <b>Clean</b>", "both": "✅ <b>សុវត្ថិភាព | Clean</b>"},
    }
    target_label = {"kh": "គោលដៅ", "en": "Target", "both": "គោលដៅ/Target"}[lang]

    for kind, target, r in results:
        if "error" in r:
            api.send_message(chat_id, f"⚠️ Could not scan <code>{target}</code>: {r['error']}")
            continue
        mal = r.get("malicious", 0)
        susp = r.get("suspicious", 0)
        display = mask_domain(target) if kind == "link" else esc(target)
        if mal >= config.VT_MALICIOUS_THRESHOLD:
            header = headers["threat"][lang]
        elif susp >= config.VT_SUSPICIOUS_THRESHOLD:
            header = headers["suspicious"][lang]
        else:
            header = headers["clean"][lang]
        api.send_message(chat_id, f"{header}\n{target_label}: <code>{display}</code>\n{engine_consensus(r)}")


def _handle_new_members(api: TelegramAPI, chat_id: int, new_members: list, settings: dict) -> None:
    for member in new_members:
        uid = int(member.get("id", 0) or 0)
        if not uid or member.get("is_bot"):
            continue
        record_join_time(chat_id, uid)
        record_first_seen(uid)
        if settings.get("verify_mode"):
            _gate_new_member(api, chat_id, uid)


def _gate_new_member(api: TelegramAPI, chat_id: int, uid: int) -> None:
    if config.VERIFY_METHOD == "age":
        return  # account age is not exposed by the Bot API; can't auto-pass
    api.restrict_chat_member(chat_id, uid)
    if config.VERIFY_METHOD == "approve":
        api.send_message(chat_id, f"👤 New member <code>{uid}</code> restricted — admin approval required.")
    else:  # button
        kb = {"inline_keyboard": [[{"text": "✅ Verify — I'm human", "callback_data": f"verify:{chat_id}:{uid}"}]]}
        api.send_message(chat_id, f"👤 New member <code>{uid}</code> — tap to verify and unlock chat.", reply_markup=kb)


def _send_threat_alert(
    api: TelegramAPI,
    chat_id: int,
    user_display: str,
    flag: str,
    deleted: bool,
    lang: str = "both",
    extra: str = "",
) -> None:
    action_kh = "សារត្រូវបានលុបចោលភ្លាមៗ" if deleted else "មិនអាចលុបសារ, ពិនិត្យសិទ្ធិ Admin របស់ Bot"
    action_en = "Message deleted immediately" if deleted else "Could not delete message, check Bot admin rights"
    text = get_msg_threat(lang, user_display, flag, action_kh, action_en) + extra

    reply_markup = {
        "inline_keyboard": [
            [{"text": "💡 ការពន្យល់សុវត្ថិភាព | Security Guide", "callback_data": "explain_threat"}]
        ]
    }
    api.send_message(chat_id, text, reply_markup=reply_markup)

    if config.ADMIN_CHAT_ID:
        try:
            for admin_id_str in config.ADMIN_CHAT_ID.split(","):
                admin_id_str = admin_id_str.strip()
                if admin_id_str:
                    api.send_message(int(admin_id_str), text)
        except Exception as exc:
            logger.error("Admin alert failed: %s", exc)


# ── Admin Private Chat Control Panel ────────────────────────────────────────

def _build_admin_menu_keyboard(managed_groups: list[dict]) -> dict:
    keyboard = []
    for grp in managed_groups:
        keyboard.append([{"text": f"👥 {grp['title']}", "callback_data": f"adm_grp:{grp['id']}"}])

    if config.WEB_APP_DASHBOARD_URL:
        keyboard.append([{"text": "🛡️ Open Security Mini App", "web_app": {"url": config.WEB_APP_DASHBOARD_URL}}])

    return {"inline_keyboard": keyboard}


def _resolve_chat_id_and_info(api: TelegramAPI, gid: int) -> tuple[int, dict]:
    candidates = []
    if str(gid).startswith("-100"):
        candidates.append(gid)
        try:
            candidates.append(int(str(gid)[4:]))
        except ValueError:
            pass
    elif gid > 0:
        try:
            candidates.append(-int(f"100{gid}"))
        except ValueError:
            pass
        candidates.append(-gid)
        candidates.append(gid)
    else:  # negative but not starting with -100 (e.g. -5328393805)
        try:
            candidates.append(-int(f"100{abs(gid)}"))
        except ValueError:
            pass
        candidates.append(gid)
        candidates.append(abs(gid))

    # Check cache first
    known = get_known_groups()
    for try_id in candidates:
        try:
            cached_title = kv_get(f"cache:chat_title:{try_id}")
            if cached_title:
                return try_id, {"id": try_id, "title": str(cached_title)}
        except Exception:
            pass
        if str(try_id) in known:
            return try_id, {"id": try_id, "title": known[str(try_id)]}

    for try_id in candidates:
        info = api.get_chat(try_id)
        if info and info.get("title"):
            try:
                kv_set(f"cache:chat_title:{gid}", info["title"], ttl=86400)
                kv_set(f"cache:chat_title:{try_id}", info["title"], ttl=86400)
            except Exception:
                pass
            return try_id, info

    best_id = candidates[0] if candidates else gid
    return best_id, {}


def _prompt_select_group(api: TelegramAPI, chat_id: int, user_id: int) -> None:
    whitelisted = user_id in whitelist_user_ids() or is_super_admin(user_id)
    lang = get_user_lang(user_id)
    if not whitelisted:
        unauth_msg = {
            "kh": "⛔ <b>គ្មានសិទ្ធិអនុញ្ញាត (Unauthorized)</b>\nសូមទាក់ទង Super Admin (@Sin_Hong) ដើម្បីទទួលបានសិទ្ធិភ្ជាប់ក្រុម។",
            "en": "⛔ <b>Unauthorized</b>\nPlease contact the Super Admin (@Sin_Hong) to request group protection access.",
            "both": "⛔ <b>គ្មានសិទ្ធិអនុញ្ញាត | Unauthorized</b>\nសូមទាក់ទង Super Admin (@Sin_Hong) ដើម្បីទទួលបានសិទ្ធិភ្ជាប់ក្រុម (Please contact @Sin_Hong for access)."
        }.get(lang, "⛔ <b>Unauthorized</b>")
        api.send_message(chat_id, unauth_msg)
        return

    # Check plan group limit
    sub = get_subscription(user_id)
    plan_id = sub.get("plan", "personal_free") if sub else "personal_free"
    catalog = get_plan_catalog()
    plan_info = catalog.get(plan_id, {})
    max_groups = plan_info.get("groups", 10 if is_super_admin(user_id) else 1)

    current_groups = get_managed_groups_for_user(api, user_id)
    if len(current_groups) >= max_groups and not is_super_admin(user_id):
        limit_msg = {
            "kh": f"⚠️ <b>ដល់កម្រិតកំណត់ក្រុមហើយ (Group Limit Reached)</b>\nគម្រោងរបស់អ្នកអនុញ្ញាតឱ្យភ្ជាប់បានត្រឹមតែ {max_groups} ក្រុមប៉ុណ្ណោះ ({len(current_groups)}/{max_groups})。\nសូម Upgrade គម្រោងដើម្បីភ្ជាប់ក្រុមបន្ថែម。",
            "en": f"⚠️ <b>Group Limit Reached</b>\nYour current plan allows up to {max_groups} groups ({len(current_groups)}/{max_groups}).\nPlease upgrade your plan to protect more groups.",
            "both": f"⚠️ <b>ដល់កម្រិតកំណត់ក្រុមហើយ | Group Limit Reached</b>\nគម្រោងរបស់អ្នកអនុញ្ញាតឱ្យភ្ជាប់បាន {max_groups} ក្រុម ({len(current_groups)}/{max_groups})。\nសូម Upgrade គម្រោងដើម្បីភ្ជាប់ក្រុមបន្ថែម (Please upgrade plan)."
        }.get(lang, "⚠️ Group limit reached.")
        api.send_message(chat_id, limit_msg)
        return

    button_label = {
        "kh": "👥 ជ្រើសរើសក្រុមពី Telegram",
        "en": "👥 Select Group from Telegram",
        "both": "👥 ជ្រើសរើសក្រុម | Select Group"
    }.get(lang, "👥 Select Group")

    cancel_label = {
        "kh": "❌ បោះបង់",
        "en": "❌ Cancel",
        "both": "❌ បោះបង់ | Cancel"
    }.get(lang, "❌ Cancel")

    select_kb = {
        "keyboard": [
            [
                {
                    "text": button_label,
                    "request_chat": {
                        "request_id": 101,
                        "chat_is_channel": False,
                    }
                }
            ],
            [
                {"text": cancel_label}
            ]
        ],
        "resize_keyboard": True,
        "one_time_keyboard": True
    }

    known = get_known_groups()
    allowed = get_allowed_groups()
    candidates = [(int(gid), title) for gid, title in known.items() if int(gid) not in allowed]

    candidate_buttons = []
    if candidates:
        for gid, title in candidates[:6]:
            candidate_buttons.append([{"text": f"👥 {title or gid}", "callback_data": f"link_choose:{gid}"}])

    inline_markup = {"inline_keyboard": candidate_buttons} if candidate_buttons else None

    prompt_text = {
        "kh": (
            "👥 <b>ភ្ជាប់ក្រុមថ្មីដើម្បីការពារ</b>\n\n"
            "1️⃣ សូមចុចប៊ូតុង <b>[ 👥 ជ្រើសរើសក្រុមពី Telegram ]</b> ខាងក្រោម\n"
            "2️⃣ ជ្រើសរើសក្រុមដែលអ្នកជា Admin ហើយបាន Add Bot រួច\n"
            "3️⃣ Bot នឹងចាប់យកក្រុមដោយស្វ័យប្រវត្ត (មិនបាច់ Copy ID ឡើយ!)"
        ),
        "en": (
            "👥 <b>Link & Protect New Group</b>\n\n"
            "1️⃣ Tap <b>[ 👥 Select Group from Telegram ]</b> below\n"
            "2️⃣ Select a group where you are Admin and Bot is added\n"
            "3️⃣ The bot will link the group automatically (No ID needed!)"
        ),
        "both": (
            "👥 <b>ភ្ជាប់ក្រុមថ្មីដើម្បីការពារ | Link & Protect Group</b>\n\n"
            "1️⃣ សូមចុចប៊ូតុង <b>[ 👥 ជ្រើសរើសក្រុម | Select Group ]</b> ខាងក្រោម\n"
            "2️⃣ ជ្រើសរើសក្រុមដែលអ្នកជា Admin ហើយបាន Add Bot រួច\n"
            "3️⃣ Bot នឹងចាប់យកក្រុមដោយស្វ័យប្រវត្ត (Automated zero-ID linking!)"
        )
    }.get(lang, "Link & Protect Group")

    api.send_message(chat_id, prompt_text, reply_markup=select_kb)

    if inline_markup:
        cand_text = {
            "kh": "💡 ឬជ្រើសរើសពីក្រុមដែល Bot បានរកឃើញស្រាប់៖",
            "en": "💡 Or select from detected groups:",
            "both": "💡 ឬជ្រើសរើសពីក្រុមស្រាប់ | Or select from known groups:"
        }.get(lang, "Detected groups:")
        api.send_message(chat_id, cand_text, reply_markup=inline_markup)


def _handle_group_selected_for_linking(api: TelegramAPI, chat_id: int, user_id: int, group_id: int) -> None:
    whitelisted = user_id in whitelist_user_ids() or is_super_admin(user_id)
    lang = get_user_lang(user_id)
    menu_kb = _menu_keyboard(whitelisted, lang)

    if not whitelisted:
        api.send_message(chat_id, UNAUTHORIZED_TEXT, reply_markup=menu_kb)
        return

    real_gid, chat_info = _resolve_chat_id_and_info(api, group_id)
    title = (chat_info or {}).get("title")
    username = (chat_info or {}).get("username")

    # Send temporary acknowledgment to clear the reply keyboard, and track its ID for cleanup
    ack_text = {
        "kh": "⏳ កំពុងដំណើរការ...",
        "en": "⏳ Processing...",
        "both": "⏳ កំពុងដំណើរការ | Processing..."
    }.get(lang, "⏳ Processing...")

    ack_mid = api.send_message(chat_id, ack_text, reply_markup={"remove_keyboard": True})
    if ack_mid:
        kv_set(f"temp_link_msg:{chat_id}", str(ack_mid), ttl=300)

    # If the bot is not yet added to the group and get_chat could not find it:
    if not title:
        temp_id = kv_get(f"temp_link_msg:{chat_id}")
        if temp_id:
            api.delete_message(chat_id, int(temp_id))
            kv_delete(f"temp_link_msg:{chat_id}")

        not_in_group_msg = {
            "kh": (
                "⚠️ <b>Bot មិនទាន់ត្រូវបាន Add ចូលក្នុងក្រុមនេះនៅឡើយទេ!</b>\n\n"
                "📌 <b>របៀបបើកដំណើរការ៖</b>\n"
                "1. សូម Add Bot ចូលក្នុងក្រុមរបស់អ្នក\n"
                "2. ផ្តល់សិទ្ធិជា <b>Administrator</b> (Delete Messages & Restrict Members)\n"
                "3. បន្ទាប់មកចុច [ ➕ ភ្ជាប់ក្រុម ] ម្តងទៀត!"
            ),
            "en": (
                "⚠️ <b>Bot is not yet in this group!</b>\n\n"
                "📌 <b>How to activate:</b>\n"
                "1. Add the Bot to your Telegram group\n"
                "2. Promote it as an <b>Administrator</b> (Delete Messages & Restrict Members)\n"
                "3. Then tap [ ➕ Link Group ] again!"
            ),
            "both": (
                "⚠️ <b>Bot មិនទាន់ត្រូវបាន Add ចូលក្នុងក្រុមនៅឡើយទេ | Bot not in group yet</b>\n\n"
                "📌 <b>ជំហានបន្ទាប់ (Next Steps):</b>\n"
                "1. សូម Add Bot ចូលក្នុងក្រុមរបស់អ្នក (Add Bot to your group)\n"
                "2. ផ្តល់សិទ្ធិជា <b>Administrator</b> ដល់ Bot\n"
                "3. បន្ទាប់មកចុច [ ➕ Link Group ] ម្តងទៀត!"
            )
        }.get(lang, "Bot is not in this group yet. Please add Bot as Admin first.")

        api.send_message(chat_id, not_in_group_msg, reply_markup=menu_kb)
        return

    confirm_btn = {
        "kh": "✅ បញ្ជាក់ & បើកការការពារ",
        "en": "✅ Confirm & Protect",
        "both": "✅ បញ្ជាក់ & បើកការការពារ | Confirm"
    }.get(lang, "✅ Confirm & Protect")

    cancel_btn = {
        "kh": "❌ បោះបង់",
        "en": "❌ Cancel",
        "both": "❌ បោះបង់ | Cancel"
    }.get(lang, "❌ Cancel")

    confirm_kb = {
        "inline_keyboard": [
            [
                {"text": confirm_btn, "callback_data": f"link_confirm:{real_gid}"},
                {"text": cancel_btn, "callback_data": "link_cancel"}
            ]
        ]
    }

    group_label = f"<b>{esc(title)}</b>"
    if username:
        group_label += f" (@{esc(username)})"

    confirm_prompt = {
        "kh": (
            f"🛡️ <b>បញ្ជាក់ការភ្ជាប់ក្រុម</b>\n\n"
            f"👥 ក្រុម : {group_label}\n\n"
            f"តើអ្នកពិតជាចង់បើកការការពារ ២៤/៧ សម្រាប់ក្រុមនេះមែនទេ?"
        ),
        "en": (
            f"🛡️ <b>Confirm Group Protection</b>\n\n"
            f"👥 Group : {group_label}\n\n"
            f"Are you sure you want to activate 24/7 protection for this group?"
        ),
        "both": (
            f"🛡️ <b>បញ្ជាក់ការភ្ជាប់ក្រុម | Confirm Group Protection</b>\n\n"
            f"👥 ក្រុម (Group) : {group_label}\n\n"
            f"តើអ្នកពិតជាចង់បើកការការពារ ២៤/៧ សម្រាប់ក្រុមនេះមែនទេ?\n"
            f"<i>(Are you sure you want to activate 24/7 protection for this group?)</i>"
        )
    }.get(lang, "Confirm Group Protection")

    api.send_message(chat_id, confirm_prompt, reply_markup=confirm_kb)


def _build_group_settings_view(api: TelegramAPI, group_id: int) -> tuple[str, dict]:
    real_gid, chat = _resolve_chat_id_and_info(api, group_id)
    title = (chat or {}).get("title") or "ក្រុម (Group)"

    settings = get_group_settings(group_id)
    lang = settings.get("lang", config.DEFAULT_LANGUAGE)
    timer = settings.get("safe_timeout", config.DEFAULT_SAFE_TIMEOUT)
    show_safe = settings.get("show_safe", config.ENABLE_SAFE_MESSAGES) and timer > 0

    lang_labels = {
        "both": "🌐 ទាំងពីរ (Bilingual KH + EN)",
        "kh": "🇰🇭 ភាសាខ្មែរ (Khmer Only)",
        "en": "🇬🇧 English (English Only)",
    }
    lang_display = lang_labels.get(lang, "🌐 ទាំងពីរ (Bilingual)")
    timer_display = f"{timer} វិនាទី (seconds)" if show_safe else "❌ បិទ (Disabled)"

    text = (
        f"⚙️ <b>ការកំណត់សុវត្ថិភាពសម្រាប់ក្រុម / Group Settings:</b>\n"
        f"📌 <b>{title}</b>\n"
        f"🔹 <b>ភាសា (Language):</b> {lang_display}\n"
        f"🔹 <b>សារសុវត្ថិភាព (Safe Message):</b> {timer_display}\n"
        f"<i>ចុចប៊ូតុងខាងក្រោមដើម្បីកែប្រែការកំណត់ភ្លាមៗ៖</i>"
    )

    keyboard = [
        [
            {"text": f"{'Selected · ' if lang == 'both' else ''}🌐 ទាំងពីរ (Both)", "callback_data": f"adm_lang:{group_id}:both"},
            {"text": f"{'Selected · ' if lang == 'kh' else ''}🇰🇭 ខ្មែរ", "callback_data": f"adm_lang:{group_id}:kh"},
            {"text": f"{'Selected · ' if lang == 'en' else ''}🇬🇧 English", "callback_data": f"adm_lang:{group_id}:en"},
        ],
        [
            {"text": f"{'✅ ' if show_safe and timer == 10 else ''}⏱️ 10s", "callback_data": f"adm_timer:{group_id}:10"},
            {"text": f"{'✅ ' if show_safe and timer == 5 else ''}⏱️ 5s", "callback_data": f"adm_timer:{group_id}:5"},
            {"text": f"{'✅ ' if show_safe and timer == 15 else ''}⏱️ 15s", "callback_data": f"adm_timer:{group_id}:15"},
            {"text": f"{'✅ ' if not show_safe or timer == 0 else ''}❌ Off", "callback_data": f"adm_timer:{group_id}:0"},
        ],
        [
            {"text": "🔙 ត្រឡប់ទៅបញ្ជីក្រុម (Back to Groups)", "callback_data": "adm_list_groups"}
        ],
    ]

    return text, {"inline_keyboard": keyboard}


ADMIN_COMMANDS = [
    {"command": "app", "description": "Open Mini App"},
    {"command": "settings", "description": "Bot Settings"},
    {"command": "guide", "description": "How to use"},
    {"command": "lang", "description": "My chat language"},
    {"command": "help", "description": "Safety guide"},
    {"command": "privacy", "description": "Privacy Policy"},
    {"command": "terms", "description": "Terms of Service"},
]

INFO_TEXTS = {
    "terms": {
        "both": (
            "📜 <b>លក្ខខណ្ឌនៃការប្រើប្រាស់ | Terms of Service</b>\n\n"
            "សូមស្វាគមន៍មកកាន់ Songket (សង្កេត)។ ការប្រើប្រាស់ Bot នេះមានន័យថាអ្នកបានយល់ព្រមលើលក្ខខណ្ឌដូចខាងក្រោម៖\n"
            "1️⃣ គោលបំណង (Purpose):\n"
            "• Songket គឺជាជំនួយការស្វ័យប្រវត្តសម្រាប់ត្រួតពិនិត្យ និងវិភាគសុវត្ថិភាពតំណភ្ជាប់ (Links) និងឯកសារ (Files) ក្នុង Telegram។\n"
            "2️⃣ ការកំណត់ការទទួលខុសត្រូវ (Disclaimer):\n"
            "• គ្មានប្រព័ន្ធណាអាចធានាសុវត្ថិភាព ១០០% លើមេរោគថ្មី (Zero-Day) ឡើយ។ ក្រុមការងារមិនទទួលខុសត្រូវចំពោះការខូចខាត ឬការបាត់បង់ទិន្នន័យឡើយ។\n"
            "3️⃣ ការការពារទិន្នន័យ (Data Privacy):\n"
            "• ឯកសារទាំងអស់ដំណើរការជាបណ្ដោះអាសន្នក្នុង RAM និងលុបចេញភ្លាមៗ។ គ្មានឯកសារណារក្សាទុកជាអចិន្ត្រៃយ៍ឡើយ។\n"
            "4️⃣ បម្រាម (Prohibited Use):\n"
            "• ហាមឃាត់ការប្រើប្រាស់សម្រាប់ធ្វើតេស្តគេចវេះមេរោគ (Evasion Testing) ឬសកម្មភាពបំពានច្បាប់។\n\n"
            "🤖 Songket Security Team | ក្រុមការងារសង្កេត"
        ),
        "kh": (
            "📜 <b>លក្ខខណ្ឌនៃការប្រើប្រាស់</b>\n\n"
            "សូមស្វាគមន៍មកកាន់ Songket (សង្កេត)។ ការប្រើប្រាស់ Bot នេះមានន័យថាអ្នកបានយល់ព្រមលើលក្ខខណ្ឌដូចខាងក្រោម៖\n"
            "1️⃣ គោលបំណង: Songket ជួយត្រួតពិនិត្យ និងវិភាគសុវត្ថិភាពតំណភ្ជាប់ និងឯកសារក្នុង Telegram។\n"
            "2️⃣ ការកំណត់ការទទួលខុសត្រូវ: គ្មានប្រព័ន្ធណាធានាសុវត្ថិភាព ១០០% បានឡើយ។\n"
            "3️⃣ ការការពារទិន្នន័យ: ឯកសារដំណើរការជាបណ្ដោះអាសន្នក្នុង RAM ហើយលុបចេញភ្លាមៗ។\n"
            "4️⃣ បម្រាម: ហាមប្រើសម្រាប់ធ្វើតេស្តគេចវេះមេរោគ ឬបំពានច្បាប់។\n\n"
            "🤖 Songket Security Team | ក្រុមការងារសង្កេត"
        ),
        "en": (
            "📜 <b>Terms of Service</b>\n\n"
            "Welcome to Songket. By using this bot you agree to:\n"
            "1️⃣ Purpose: Songket is an automated assistant that scans links and files in Telegram.\n"
            "2️⃣ Disclaimer: No system guarantees 100% protection against new (zero-day) threats. We are not liable for damages or data loss.\n"
            "3️⃣ Data Privacy: Files are processed temporarily in RAM and deleted immediately. Nothing is stored permanently.\n"
            "4️⃣ Prohibited Use: Evasion testing or illegal abuse is forbidden.\n\n"
            "🤖 Songket Security Team"
        ),
    },
    "privacy": {
        "both": (
            "🔒 <b>គោលការណ៍ភាពឯកជន | Privacy Policy</b>\n\n"
            "ការការពារភាពឯកជនរបស់អ្នកគឺជាអាទិភាពចម្បងរបស់យើង៖\n"
            "🛡️ 1. ដំណើរការបណ្ដោះអាសន្ន (Ephemeral Processing):\n"
            "• ឯកសារ/តំណភ្ជាប់ត្រូវបានអានក្នុង RAM តែពេលស្កេន ហើយលុបភ្លាមៗក្រោយស្កេនចប់។\n"
            "🚫 2. គ្មានការរក្សាទុកឯកសារ (Zero Permanent Storage):\n"
            "• យើងមិនរក្សាទុកឯកសារ ឬខ្លឹមសារសាររបស់អ្នកឡើយ។\n"
            "📊 3. ទិន្នន័យស្ថិតិ (Anonymous Statistics):\n"
            "• កត់ត្រាតែចំនួនស្កេន, ចំនួនមេរោគទប់ស្កាត់, និង SHA-256 Hash សម្រាប់ Cache។\n"
            "🔐 4. ការសម្ងាត់គណនី (Identity Protection):\n"
            "• Telegram ID មិនបង្ហាញជាសាធារណៈទេ (បង្ហាញតែ @username)។\n\n"
            "🤖 Songket Security Team | ក្រុមការងារសង្កេត"
        ),
        "kh": (
            "🔒 <b>គោលការណ៍ភាពឯកជន</b>\n\n"
            "1️⃣ ដំណើរការបណ្ដោះអាសន្ន: ឯកសារ/តំណភ្ជាប់អានក្នុង RAM តែពេលស្កេន រួចលុបភ្លាមៗ។\n"
            "2️⃣ គ្មានការរក្សាទុកឯកសារ: យើងមិនរក្សាទុកឯកសារ ឬសាររបស់អ្នកឡើយ។\n"
            "3️⃣ ទិន្នន័យស្ថិតិ: កត់ត្រាតែចំនួនស្កេន និង SHA-256 Hash សម្រាប់ Cache។\n"
            "4️⃣ ការសម្ងាត់គណនី: Telegram ID មិនបង្ហាញជាសាធារណៈទេ។\n\n"
            "🤖 Songket Security Team | ក្រុមការងារសង្កេត"
        ),
        "en": (
            "🔒 <b>Privacy Policy</b>\n\n"
            "Your privacy is our priority:\n"
            "1️⃣ Ephemeral Processing: Files/links are read in RAM only during scanning, then deleted.\n"
            "2️⃣ Zero Permanent Storage: We never store your files or messages.\n"
            "3️⃣ Anonymous Statistics: Only scan counts and SHA-256 hashes (for cache) are kept.\n"
            "4️⃣ Identity Protection: Your Telegram ID is never shown publicly (only @username).\n\n"
            "🤖 Songket Security Team"
        ),
    },
    "help": {
        "both": (
            "💡 <b>មគ្គុទ្ទេសក៍សុវត្ថិភាពសាយប័រ | Cyber Safety Guide</b>\n\n"
            "អនុសាសន៍ដើម្បីការពារខ្លួនពីការវាយប្រហារតាម Telegram៖\n"
            "⚠️ 1. ឯកសារ (File Safety):\n"
            "• កុំបើកឯកសារសង្ស័យ .exe, .bat, .scr, .zip, .rar, .apk, .js, .docm។\n"
            "🌐 2. តំណភ្ជាប់ (Link / Phishing Safety):\n"
            "• កុំបំពេញ Password, OTP លើតំណមិនស្គាល់។\n"
            "🚨 3. បើបានចុចរួចហើយ (Incident Response):\n"
            "1️⃣ ផ្ដាច់ Internet ភ្លាមៗ\n"
            "2️⃣ ប្តូរពាក្យសម្ងាត់ពីឧបករណ៍ផ្សេង\n"
            "3️⃣ Scan ដោយ Antivirus\n\n"
            "🤖 Songket Security Team | ក្រុមការងារសង្កេត"
        ),
        "kh": (
            "💡 <b>មគ្គុទ្ទេសក៍សុវត្ថិភាពសាយប័រ</b>\n\n"
            "1️⃣ ឯកសារ: កុំបើកឯកសារសង្ស័យ .exe, .bat, .zip, .apk, .docm។\n"
            "2️⃣ តំណភ្ជាប់: កុំបំពេញ Password, OTP លើតំណមិនស្គាល់។\n"
            "3️⃣ បើបានចុចរួច: ផ្ដាច់ Internet, ប្តូរពាក្យសម្ងាត់, Scan ដោយ Antivirus។\n\n"
            "🤖 Songket Security Team | ក្រុមការងារសង្កេត"
        ),
        "en": (
            "💡 <b>Cyber Safety Guide</b>\n\n"
            "Protect yourself from Telegram attacks:\n"
            "1️⃣ Files: Don't open suspicious .exe, .bat, .zip, .apk, .docm.\n"
            "2️⃣ Links: Never enter passwords or OTP on unknown links.\n"
            "3️⃣ If you clicked: Disconnect internet, change passwords from another device, scan with antivirus.\n\n"
            "🤖 Songket Security Team"
        ),
    },
    "guide": {
        "both": (
            "📖 <b>មគ្គុទ្ទេសក៍ប្រើប្រាស់ | User Guide</b>\n\n"
            "👤 <b>ផ្ទាល់ខ្លួន (Personal)</b>:\n"
            "1️⃣ ស្កេនតំណភ្ជាប់ (Scan Links): Forward/Copy link ផ្ញើមក bot។\n"
            "2️⃣ ស្កេនឯកសារ (Scan Files): ផ្ញើ file មុន Download/Run។\n"
            "3️⃣ ភាពឯកជន (Privacy First): ស្កេនផ្ទាល់ខ្លួនរក្សាការសម្ងាត់ ១០០%។\n\n"
            "👥 <b>ក្រុម (Group)</b>:\n"
            "1️⃣ បន្ថែម bot ជា Admin (Add bot as admin)។\n"
            "2️⃣ ផ្ដល់សិទ្ធិ Delete Messages + Restrict Users។\n"
            "3️⃣ Link & Protect Group តាម /settings។\n"
            "4️⃣ Approve/Delete ឯកសារសង្ស័យតាមប៊ូតុង។\n\n"
            "🤖 Songket Security Team | ក្រុមការងារសង្កេត"
        ),
        "kh": (
            "📖 <b>មគ្គុទ្ទេសក៍ប្រើប្រាស់</b>\n\n"
            "👤 <b>ផ្ទាល់ខ្លួន</b>:\n"
            "1️⃣ ស្កេនតំណភ្ជាប់: Forward/Copy link ផ្ញើមក bot។\n"
            "2️⃣ ស្កេនឯកសារ: ផ្ញើ file មុន Download/Run។\n"
            "3️⃣ ភាពឯកជន: ស្កេនផ្ទាល់ខ្លួនរក្សាការសម្ងាត់ ១០០%។\n\n"
            "👥 <b>ក្រុម</b>:\n"
            "1️⃣ បន្ថែម bot ជា Admin។\n"
            "2️⃣ ផ្ដល់សិទ្ធិ Delete Messages + Restrict Users។\n"
            "3️⃣ Link & Protect Group តាម /settings។\n"
            "4️⃣ Approve/Delete ឯកសារសង្ស័យតាមប៊ូតុង។\n\n"
            "🤖 Songket Security Team | ក្រុមការងារសង្កេត"
        ),
        "en": (
            "📖 <b>User Guide</b>\n\n"
            "👤 <b>Personal</b>:\n"
            "1️⃣ Scan Links: forward/copy a link to the bot.\n"
            "2️⃣ Scan Files: send a file before download/run.\n"
            "3️⃣ Privacy First: private scans stay 100% confidential.\n\n"
            "👥 <b>Group</b>:\n"
            "1️⃣ Add the bot as admin.\n"
            "2️⃣ Grant Delete Messages + Restrict Users.\n"
            "3️⃣ Link & Protect Group via /settings.\n"
            "4️⃣ Approve/Delete suspicious files via buttons.\n\n"
            "🤖 Songket Security Team"
        ),
    },
    "settings_intro": {
        "both": (
            "⚙️ <b>Settings | ការកំណត់</b>\n\n"
            "Select a group to configure its language and safe-message timer:\n"
            "ជ្រើសរើសក្រុមដើម្បីកំណត់ភាសា និងកម្មវិធីកំណត់សារសុវត្ថិភាព៖"
        ),
        "kh": (
            "⚙️ <b>ការកំណត់</b>\n\n"
            "ជ្រើសរើសក្រុមដើម្បីកំណត់ភាសា និងកម្មវិធីកំណត់សារសុវត្ថិភាព៖"
        ),
        "en": (
            "⚙️ <b>Settings</b>\n\n"
            "Select a group to configure its language and safe-message timer:"
        ),
    },
}

UNAUTHORIZED_TEXT = (
    "🔒 <b>Unauthorized | គ្មានសិទ្ធិ</b>\n"
    "You are not whitelisted. Contact the admin to get access."
)


def _info(kind: str, lang: str) -> str:
    return INFO_TEXTS.get(kind, {}).get(lang) or INFO_TEXTS.get(kind, {}).get("both", "")


MENU_ALIASES = {
    "📖 Guide": "guide",
    "📖 មគ្គុទ្ទេសក៍": "guide",
    "🔒 Privacy": "privacy",
    "🔒 ភាពឯកជន": "privacy",
    "📜 Terms": "terms",
    "📜 លក្ខខណ្ឌ": "terms",
    "🌐 Lang": "lang",
    "🌐 Language": "lang",
    "🌐 ភាសា": "lang",
    "⚙️ Settings": "settings",
    "⚙️ ការកំណត់": "settings",
    "➕ Link Group": "addgroup",
    "➕ ភ្ជាប់ក្រុម": "addgroup",
    "👥 Link Group": "addgroup",
    "👥 ភ្ជាប់ក្រុម": "addgroup",
}


def _menu_keyboard(whitelisted: bool, lang: str = "both") -> dict:
    rows = []
    if config.WEB_APP_URL:
        rows.append([{"text": "🛡️ Mini App", "web_app": {"url": config.WEB_APP_DASHBOARD_URL}}])

    if lang == "kh":
        rows.append([{"text": "📖 មគ្គុទ្ទេសក៍"}, {"text": "🔒 ភាពឯកជន"}])
        rows.append([{"text": "📜 លក្ខខណ្ឌ"}, {"text": "🌐 ភាសា"}])
        if whitelisted:
            rows.append([{"text": "➕ ភ្ជាប់ក្រុម"}, {"text": "⚙️ ការកំណត់"}])
    elif lang == "en":
        rows.append([{"text": "📖 Guide"}, {"text": "🔒 Privacy"}])
        rows.append([{"text": "📜 Terms"}, {"text": "🌐 Language"}])
        if whitelisted:
            rows.append([{"text": "➕ Link Group"}, {"text": "⚙️ Settings"}])
    else:
        rows.append([{"text": "📖 Guide"}, {"text": "🔒 Privacy"}])
        rows.append([{"text": "📜 Terms"}, {"text": "🌐 Lang"}])
        if whitelisted:
            rows.append([{"text": "➕ Link Group"}, {"text": "⚙️ Settings"}])
    return {"keyboard": rows, "resize_keyboard": True}


def _handle_private_chat(api: TelegramAPI, chat_id: int, message: dict) -> None:
    user_id = (message.get("from") or {}).get("id", 0)
    text = (message.get("text") or "").strip()
    command = text.split()[0].split("@", 1)[0] if text else ""
    whitelisted = user_id in whitelist_user_ids() or is_super_admin(user_id)
    lang = get_user_lang(user_id)

    # 1. Telegram Native Chat Shared event (when user selects a group via request_chat button)
    chat_shared = message.get("chat_shared")
    if chat_shared:
        selected_gid = int(chat_shared.get("chat_id", 0))
        if selected_gid:
            _handle_group_selected_for_linking(api, chat_id, user_id, selected_gid)
            return

    # 2. Cancel action
    if text in {"❌ បោះបង់ | Cancel", "❌ បោះបង់", "❌ Cancel", "Cancel", "/cancel"}:
        temp_id = kv_get(f"temp_link_msg:{chat_id}")
        if temp_id:
            api.delete_message(chat_id, int(temp_id))
            kv_delete(f"temp_link_msg:{chat_id}")

        cancel_msg = {
            "kh": "❌ បានបោះបង់",
            "en": "❌ Cancelled",
            "both": "❌ បានបោះបង់ (Cancelled)"
        }.get(lang, "❌ Cancelled")
        api.send_message(
            chat_id,
            cancel_msg,
            reply_markup=_menu_keyboard(whitelisted, lang)
        )
        return

    # Menu keyboard button taps (text buttons -> commands)
    if text in MENU_ALIASES:
        command = "/" + MENU_ALIASES[text]

    menu_kb = _menu_keyboard(whitelisted, lang)

    if command:
        # Whitelisted users get the admin commands scoped to their private chat.
        if whitelisted:
            api.set_my_commands(ADMIN_COMMANDS, scope={"type": "chat", "chat_id": chat_id})

        if command in {"/addgroup", "/linkgroup", "/link"}:
            _prompt_select_group(api, chat_id, user_id)
            return
        if command == "/privacy":
            api.send_message(chat_id, _info("privacy", lang), reply_markup=menu_kb)
            return
        if command == "/help":
            api.send_message(chat_id, _info("help", lang), reply_markup=menu_kb)
            return
        if command == "/guide":
            api.send_message(chat_id, _info("guide", lang), reply_markup=menu_kb)
            return
        if command == "/terms":
            api.send_message(chat_id, _info("terms", lang), reply_markup=menu_kb)
            return
        if command == "/app":
            if config.WEB_APP_URL:
                kb = {"inline_keyboard": [[{"text": "🛡️ Open Mini App", "web_app": {"url": config.WEB_APP_DASHBOARD_URL}}]]}
                api.send_message(chat_id, "បើក Mini App (Open the Mini App):", reply_markup=kb)
            else:
                api.send_message(chat_id, "Mini App URL not configured.")
            return
        if command in {"/lang", "/language"}:
            current = lang
            kb = {
                "inline_keyboard": [
                    [
                        {"text": f"{'Selected · ' if current == 'both' else ''}🌐 Both", "callback_data": f"usrlang:{user_id}:both"},
                        {"text": f"{'Selected · ' if current == 'kh' else ''}🇰🇭 ខ្មែរ", "callback_data": f"usrlang:{user_id}:kh"},
                        {"text": f"{'Selected · ' if current == 'en' else ''}🇬🇧 English", "callback_data": f"usrlang:{user_id}:en"},
                    ]
                ]
            }
            api.send_message(chat_id, "🌐 <b>ជ្រើសរើសភាសា | Select your chat language:</b>", reply_markup=kb)
            return
        if command == "/settings":
            if not whitelisted:
                api.send_message(chat_id, UNAUTHORIZED_TEXT, reply_markup=menu_kb)
                return
            managed_groups = get_managed_groups_for_user(api, user_id)
            if not managed_groups:
                no_grp_msg = {
                    "kh": "មិនទាន់មានក្រុមចាត់តាំងនៅឡើយទេ។\nសូមចុចប៊ូតុង [ ➕ ភ្ជាប់ក្រុម ] លើ Menu ខាងក្រោមដើម្បីភ្ជាប់ក្រុមថ្មី។",
                    "en": "No groups assigned yet.\nPlease tap [ ➕ Link Group ] on the menu below to link a new group.",
                    "both": "មិនទាន់មានក្រុមចាត់តាំង (No groups assigned yet).\nសូមចុចប៊ូតុង [ ➕ Link Group ] លើ Menu ខាងក្រោមដើម្បីភ្ជាប់ក្រុមថ្មី។"
                }.get(lang, "No groups assigned yet.")
                api.send_message(chat_id, no_grp_msg, reply_markup=menu_kb)
                return
            api.send_message(
                chat_id,
                _info("settings_intro", lang),
                reply_markup=_build_admin_menu_keyboard(managed_groups),
            )
            return

    # Personal scanning — any link or file sent privately
    content = (message.get("text") or "") + " " + (message.get("caption") or "")
    if extract_urls(content) or (message.get("document") or {}).get("file_id"):
        _handle_personal_scan(api, chat_id, message, user_id)
        return

    # Plain text -> show the menu keyboard
    greeting_text = {
        "kh": "🤖 សូមជ្រើសរើសមុខងារខាងក្រោម៖",
        "en": "🤖 Please choose an option below:",
        "both": "🤖 សូមជ្រើសរើសមុខងារ (Choose an option below):"
    }.get(lang, "🤖 Choose an option below:")
    api.send_message(
        chat_id,
        greeting_text,
        reply_markup=menu_kb,
    )


# ── In-Group Command Handling ───────────────────────────────────────────────

def _handle_group_commands(api: TelegramAPI, chat_id: int, message: dict, sender_id: int) -> bool:
    text = (message.get("text") or "").strip()
    if not text.startswith("/"):
        return False

    command_part = text.split()[0].lower().split("@", 1)[0]
    args = text.split()[1:] if len(text.split()) > 1 else []

    if command_part == "/whois":
        target_id = sender_id
        reply = message.get("reply_to_message")
        if reply and (reply.get("from") or {}).get("id"):
            target_id = reply["from"]["id"]
        elif args:
            try:
                target_id = int(args[0].lstrip("@"))
            except ValueError:
                pass
        if not (is_super_admin(sender_id) or api.is_group_admin(sender_id, chat_id) or target_id == sender_id):
            return True
        settings = get_group_settings(chat_id)
        strikes = get_strikes(chat_id, target_id)
        label = trust_label(chat_id, target_id, settings)
        member = api.get_chat_member(chat_id, target_id)
        user = (member or {}).get("user") or {"first_name": str(target_id)}
        api.send_message(
            chat_id,
            f"👤 <b>{get_user_display(user)}</b>{label}\n"
            f"🆔 ID: <code>{target_id}</code>\n"
            f"⚖️ Strikes: {strikes}",
        )
        return True

    return False


# ── Callback Query Handling (Interactive Buttons) ───────────────────────────

def process_callback_query(api: TelegramAPI, query: dict) -> None:
    query_id = query.get("id", "")
    from_user = query.get("from", {})
    user_id = from_user.get("id", 0)
    data = query.get("data", "")
    msg = query.get("message", {})
    chat = msg.get("chat", {})
    chat_id = chat.get("id", 0)
    msg_id = msg.get("message_id", 0)

    # 0. New-member verification button
    if data.startswith("verify:"):
        parts = data.split(":")
        if len(parts) == 3:
            gid = int(parts[1])
            uid = int(parts[2])
            if user_id == uid or is_super_admin(user_id) or api.is_group_admin(user_id, gid):
                api.unrestrict_chat_member(gid, uid)
                api.answer_callback_query(query_id, text="✅ Verified — chat unlocked.")
            else:
                api.answer_callback_query(query_id, text="❌ You cannot verify someone else.", show_alert=True)
            return

    # 0.5 Private chat language switch
    if data.startswith("usrlang:"):
        parts = data.split(":")
        if len(parts) == 3:
            target_uid = int(parts[1])
            new_lang = parts[2]
            if user_id != target_uid:
                api.answer_callback_query(query_id, text="❌ Not yours.", show_alert=True)
                return
            set_user_lang(target_uid, new_lang)
            whitelisted = user_id in whitelist_user_ids() or is_super_admin(user_id)
            api.answer_callback_query(query_id, text=f"✅ Language set to {new_lang.upper()}")

            lang_ack = {
                "kh": "✅ ភាសាត្រូវបានប្តូរទៅជា <b>ភាសាខ្មែរ</b>",
                "en": "✅ Language changed to <b>English</b>",
                "both": "✅ ភាសាត្រូវបានប្តូរ | Language set to <b>Bilingual (KH + EN)</b>"
            }.get(new_lang, f"✅ Language set to {new_lang.upper()}")

            api.send_message(chat_id, lang_ack, reply_markup=_menu_keyboard(whitelisted, new_lang))
            return

    # 0.6 File whitelist approval (doc section 4)
    if data.startswith("approve_file:"):
        parts = data.split(":")
        if len(parts) == 3:
            gid = int(parts[1])
            sha = parts[2]
            if not (is_super_admin(user_id) or api.is_group_admin(user_id, gid)):
                api.answer_callback_query(query_id, text="❌ Admin only.", show_alert=True)
                return
            whitelist_file(gid, sha)
            api.answer_callback_query(query_id, text="✅ File approved for this group.")
            api.edit_message_reply_markup(chat_id, msg_id, reply_markup=None)
            return

    if data.startswith("delete_file:"):
        parts = data.split(":")
        if len(parts) == 3:
            gid = int(parts[1])
            mid = int(parts[2])
            if not (is_super_admin(user_id) or api.is_group_admin(user_id, gid)):
                api.answer_callback_query(query_id, text="❌ Admin only.", show_alert=True)
                return
            api.delete_message(gid, mid)
            api.answer_callback_query(query_id, text="🗑️ File deleted.")
            return

    # 0.7 Link & Protect Group (doc section 5)
    if data == "link_group":
        api.answer_callback_query(query_id)
        _prompt_select_group(api, chat_id, user_id)
        return

    if data.startswith("link_choose:"):
        try:
            gid = int(data.split(":")[1])
        except (IndexError, ValueError):
            api.answer_callback_query(query_id)
            return
        api.answer_callback_query(query_id)
        _handle_group_selected_for_linking(api, chat_id, user_id, gid)
        return

    if data.startswith("link_confirm:"):
        try:
            gid = int(data.split(":")[1])
        except (IndexError, ValueError):
            api.answer_callback_query(query_id)
            return
        whitelisted = user_id in whitelist_user_ids() or is_super_admin(user_id)
        lang = get_user_lang(user_id)
        menu_kb = _menu_keyboard(whitelisted, lang)
        if not whitelisted:
            api.answer_callback_query(query_id, text="❌ Unauthorized", show_alert=True)
            return

        # 1. Delete the confirmation message immediately
        api.delete_message(chat_id, msg_id)

        # 2. Delete the temp acknowledgment message if present
        temp_id = kv_get(f"temp_link_msg:{chat_id}")
        if temp_id:
            api.delete_message(chat_id, int(temp_id))
            kv_delete(f"temp_link_msg:{chat_id}")

        # 3. Register group
        add_allowed_group(gid)
        add_group_handler(user_id, gid)

        # 4. Cache group title
        real_gid, chat_info = _resolve_chat_id_and_info(api, gid)
        title = (chat_info or {}).get("title") or "Selected Group"
        username = (chat_info or {}).get("username")
        record_known_group(real_gid, title)

        group_label = f"<b>{esc(title)}</b>"
        if username:
            group_label += f" (@{esc(username)})"

        ans_text = {
            "kh": "✅ ក្រុមត្រូវបានភ្ជាប់ និងការពារជោគជ័យ!",
            "en": "✅ Group linked & protected successfully!",
            "both": "✅ ក្រុមត្រូវបានការពារជោគជ័យ | Group protected!"
        }.get(lang, "✅ Group linked & protected!")

        success_msg = {
            "kh": (
                f"✅ <b>ជោគជ័យ! ការការពារត្រូវបានបើកដំណើរការ</b>\n\n"
                f"👥 ក្រុម {group_label} ត្រូវបានភ្ជាប់ និងការពារ ២៤/៧ ដោយស្វ័យប្រវត្ត។"
            ),
            "en": (
                f"✅ <b>Success! Protection Activated</b>\n\n"
                f"👥 Group {group_label} is now linked and protected 24/7."
            ),
            "both": (
                f"✅ <b>ជោគជ័យ! ការការពារត្រូវបានបើកដំណើរការ</b>\n\n"
                f"👥 ក្រុម {group_label} ត្រូវបានភ្ជាប់ និងការពារ ២៤/៧ ដោយស្វ័យប្រវត្ត (Protected 24/7)."
            )
        }.get(lang, "Success! Protection Activated")

        api.answer_callback_query(query_id, text=ans_text)
        api.send_message(chat_id, success_msg, reply_markup=menu_kb)
        return

    if data == "link_cancel":
        whitelisted = user_id in whitelist_user_ids() or is_super_admin(user_id)
        lang = get_user_lang(user_id)
        menu_kb = _menu_keyboard(whitelisted, lang)

        # 1. Delete the confirmation message immediately
        api.delete_message(chat_id, msg_id)

        # 2. Delete the temp acknowledgment message if present
        temp_id = kv_get(f"temp_link_msg:{chat_id}")
        if temp_id:
            api.delete_message(chat_id, int(temp_id))
            kv_delete(f"temp_link_msg:{chat_id}")

        ans_cancel = {
            "kh": "❌ បានបោះបង់",
            "en": "❌ Cancelled",
            "both": "❌ បានបោះបង់ (Cancelled)"
        }.get(lang, "❌ Cancelled")

        cancel_msg = {
            "kh": "❌ ការភ្ជាប់ក្រុមត្រូវបានបោះបង់។",
            "en": "❌ Group linking cancelled.",
            "both": "❌ ការភ្ជាប់ក្រុមត្រូវបានបោះបង់ (Group linking cancelled)."
        }.get(lang, "❌ Cancelled.")

        api.answer_callback_query(query_id, text=ans_cancel)
        api.send_message(chat_id, cancel_msg, reply_markup=menu_kb)
        return

    # 1. Non-technical explanation modal
    if data in {"explain_threat", "explain_suspicious"}:
        lang = get_group_lang(chat_id)
        if lang == "kh":
            explain_text = (
                "🛡️ ការណែនាំសុវត្ថិភាព៖\n"
                "1. ហាមចុច link ឬបើកឯកសារនេះ\n"
                "2. Telegram មិនដែលសួរលេខកូដ OTP ឡើយ\n"
                "3. បើបានចុច៖ ចូល Settings > Privacy > Active Sessions ហើយលុប Session ផ្សេងៗភ្លាម!"
            )
        elif lang == "en":
            explain_text = (
                "🛡️ Security Guide:\n"
                "1. Do NOT click the link or open the file\n"
                "2. Telegram never asks for your OTP code\n"
                "3. If clicked: Settings > Privacy > Active Sessions and Terminate other sessions!"
            )
        else:
            explain_text = (
                "🛡️ ការណែនាំសុវត្ថិភាព | Security Guide:\n"
                "1. ហាមចុច link/file (Do not click)\n"
                "2. ហាមផ្ដល់ OTP (Never share OTP)\n"
                "3. បើបានចុច: Settings > Privacy > Active Sessions > Terminate other sessions!"
            )
        api.answer_callback_query(query_id, text=explain_text, show_alert=True)
        return

    # 2. In-group language switch button
    if data.startswith("grp_lang:"):
        parts = data.split(":")
        if len(parts) == 3:
            target_gid = int(parts[1])
            new_lang = parts[2]
            if not (is_super_admin(user_id) or api.is_group_admin(user_id, target_gid)):
                api.answer_callback_query(query_id, text="❌ អ្នកមិនមានសិទ្ធិកែប្រែការកំណត់ក្រុមនេះទេ (Admin only)", show_alert=True)
                return
            set_group_lang(target_gid, new_lang)
            api.answer_callback_query(query_id, text=f"✅ Language set to {new_lang.upper()}")
            new_keyboard = {
                "inline_keyboard": [
                    [
                        {"text": f"{'Selected · ' if new_lang == 'both' else ''}🌐 ទាំងពីរ (Both)", "callback_data": f"grp_lang:{target_gid}:both"},
                        {"text": f"{'Selected · ' if new_lang == 'kh' else ''}🇰🇭 ខ្មែរ", "callback_data": f"grp_lang:{target_gid}:kh"},
                        {"text": f"{'Selected · ' if new_lang == 'en' else ''}🇬🇧 English", "callback_data": f"grp_lang:{target_gid}:en"},
                    ]
                ]
            }
            api.edit_message_reply_markup(chat_id, msg_id, reply_markup=new_keyboard)
            return

    # 3. Admin Private Chat: Open Group Settings
    if data.startswith("adm_grp:"):
        target_gid = int(data.split(":")[1])
        managed_groups = get_managed_groups_for_user(api, user_id)
        if not any(g["id"] == target_gid for g in managed_groups):
            api.answer_callback_query(query_id, text="❌ Unauthorized", show_alert=True)
            return
        text, markup = _build_group_settings_view(api, target_gid)
        api.edit_message_text(chat_id, msg_id, text, reply_markup=markup)
        api.answer_callback_query(query_id)
        return

    # 4. Admin Private Chat: Set Language
    if data.startswith("adm_lang:"):
        parts = data.split(":")
        target_gid = int(parts[1])
        new_lang = parts[2]
        managed_groups = get_managed_groups_for_user(api, user_id)
        if not any(g["id"] == target_gid for g in managed_groups):
            api.answer_callback_query(query_id, text="❌ Unauthorized", show_alert=True)
            return
        set_group_lang(target_gid, new_lang)
        api.answer_callback_query(query_id, text=f"✅ ភាសាត្រូវបានប្តូរទៅ {new_lang.upper()}")
        text, markup = _build_group_settings_view(api, target_gid)
        api.edit_message_text(chat_id, msg_id, text, reply_markup=markup)
        return

    # 5. Admin Private Chat: Set Safe Message Timer
    if data.startswith("adm_timer:"):
        parts = data.split(":")
        target_gid = int(parts[1])
        new_timer = int(parts[2])
        managed_groups = get_managed_groups_for_user(api, user_id)
        if not any(g["id"] == target_gid for g in managed_groups):
            api.answer_callback_query(query_id, text="❌ Unauthorized", show_alert=True)
            return
        set_group_settings(target_gid, {"safe_timeout": new_timer, "show_safe": new_timer > 0})
        toast = f"✅ សារសុវត្ថិភាព: {new_timer}s" if new_timer > 0 else "✅ បានបិទសារសុវត្ថិភាព (Off)"
        api.answer_callback_query(query_id, text=toast)
        text, markup = _build_group_settings_view(api, target_gid)
        api.edit_message_text(chat_id, msg_id, text, reply_markup=markup)
        return

    # 6. Admin Private Chat: Back to Group List
    if data == "adm_list_groups":
        managed_groups = get_managed_groups_for_user(api, user_id)
        admin_text = (
            "⚙️ <b>ផ្ទាំងគ្រប់គ្រងរចនាសម្ព័ន្ធសុវត្ថិភាព | Admin Control Panel</b>\n\n"
            "សូមជ្រើសរើសក្រុមដែលអ្នកគ្រប់គ្រងដើម្បីកំណត់ <b>ភាសា (Language)</b> និង <b>សារសុវត្ថិភាព (Safe Message Timer)</b>៖\n"
            "<i>(Select a managed group below to configure):</i>"
        )
        markup = _build_admin_menu_keyboard(managed_groups)
        api.edit_message_text(chat_id, msg_id, admin_text, reply_markup=markup)
        api.answer_callback_query(query_id)
        return

    api.answer_callback_query(query_id)


# ── Main Update Router ──────────────────────────────────────────────────────

def process_update(api: TelegramAPI, update: dict) -> None:
    # 0. Bot added to / removed from a chat (track groups for Link & Protect)
    if "my_chat_member" in update:
        cm = update["my_chat_member"]
        chat = cm.get("chat", {})
        new_status = (cm.get("new_chat_member") or {}).get("status", "")
        if chat.get("type") in ("group", "supergroup") and new_status in ("member", "administrator"):
            record_known_group(chat.get("id", 0), chat.get("title", "") or "")
        return

    # 1. Handle Callback Queries (Button clicks)
    if "callback_query" in update:
        process_callback_query(api, update["callback_query"])
        return

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
    sender_id = sender.get("id", 0)

    # 2. Handle Private Chats (Mini App & Admin settings)
    if chat_type == "private":
        _handle_private_chat(api, chat_id, message)
        return

    # 3. Check Group Authorization
    allowed_groups = get_allowed_groups()
    if allowed_groups and chat_id not in allowed_groups:
        logger.info("Unauthorized group %d — ignored", chat_id)
        return

    # 3.5 New members (verification gate + join tracking)
    new_members = message.get("new_chat_members") or []
    if new_members:
        _handle_new_members(api, chat_id, new_members, get_group_settings(chat_id))

    # 4. Handle In-Group Admin Commands
    if _handle_group_commands(api, chat_id, message, sender_id):
        return

    # 5. Extract Content
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

    # Group Settings
    group_settings = get_group_settings(chat_id)
    lang = group_settings.get("lang", config.DEFAULT_LANGUAGE)
    safe_timeout = group_settings.get("safe_timeout", config.DEFAULT_SAFE_TIMEOUT)
    show_safe = group_settings.get("show_safe", config.ENABLE_SAFE_MESSAGES) and safe_timeout > 0
    sender_label = user_display + trust_label(chat_id, sender_id, group_settings)

    notice_id = api.send_message(chat_id, get_msg_scanning(lang))

    def delete_notice() -> None:
        if notice_id:
            api.delete_message(chat_id, notice_id)

    def display_safe_feedback(target_name: str) -> None:
        if show_safe and notice_id:
            safe_text = get_msg_safe(lang, sender_label, target_name, safe_timeout)
            api.edit_message_text(chat_id, notice_id, safe_text)
            time.sleep(safe_timeout)
            api.delete_message(chat_id, notice_id)
        else:
            delete_notice()

    # ── URL scanning ─────────────────────────────────────────────────────
    scanned_clean_targets = []
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
        verdict = classify_verdict(malicious, suspicious)
        record_report(chat_id, chat_title, "scanned")
        record_report(chat_id, chat_title, "urls")
        if malicious >= config.VT_MALICIOUS_THRESHOLD:
            record_report(chat_id, chat_title, "malicious")
        if suspicious >= config.VT_SUSPICIOUS_THRESHOLD:
            record_report(chat_id, chat_title, "suspicious")

        if verdict == "clean":
            logger.info("URL clean | domain=%s", domain)
            scanned_clean_targets.append(domain)
            continue

        sender_label = user_display + trust_label(chat_id, sender_id, group_settings)

        redirect_note = ""
        if config.LINK_PREVIEW_ENABLED and group_settings.get("link_preview", True):
            final_domain = extract_domain(resolve_redirect(url))
            if final_domain and final_domain != domain:
                redirect_note = f"\n🔀 Real destination: {mask_domain(final_domain)}"

        consensus = "\n\n" + engine_consensus(result)

        if verdict == "suspicious":
            delete_notice()
            warn_text = (
                get_msg_suspicious_url(lang, sender_label, mask_domain(domain), timeout=15)
                + redirect_note
                + consensus
            )
            warn_id = api.send_message(chat_id, warn_text)
            logger.info("Suspicious URL | domain=%s | suspicious=%d", domain, suspicious)
            if warn_id:
                time.sleep(15)
                api.delete_message(chat_id, warn_id)
            return

        delete_notice()
        deleted = api.delete_message(chat_id, msg_id)
        if deleted:
            record_report(chat_id, chat_title, "deleted")
        _send_threat_alert(
            api, chat_id, sender_label, mask_domain(domain), deleted, lang=lang,
            extra=redirect_note + consensus,
        )
        apply_strike(api, chat_id, sender_id, user_display)
        logger.warning("URL THREAT | domain=%s | malicious=%d | deleted=%s", domain, malicious, deleted)
        return

    # ── File scanning ────────────────────────────────────────────────────
    if not has_file:
        if scanned_clean_targets:
            display_safe_feedback(", ".join(scanned_clean_targets))
        else:
            delete_notice()
        return

    logger.info("Scanning file | %s | user=%s", filename, user_display)
    decision = fetch_and_validate(api, file_id, filename, filesize, mime_type)

    if decision.oversize:
        record_report(chat_id, chat_title, "oversize")
        delete_notice()
        api.send_message(chat_id, MSG_TOO_LARGE.format(user=sender_label, filename=esc(filename), size_mb=decision.size_mb))
        return

    if not decision.ok:
        if scanned_clean_targets:
            display_safe_feedback(", ".join(scanned_clean_targets))
        else:
            delete_notice()
        return

    # Group-isolated whitelist (doc section 4): approved hash skips re-scan
    sha256 = hashlib.sha256(decision.file_bytes).hexdigest()
    if is_file_whitelisted(chat_id, sha256):
        record_report(chat_id, chat_title, "scanned")
        record_report(chat_id, chat_title, "files")
        delete_notice()
        api.send_message(chat_id, f"✅ <b>{esc(filename)}</b> — approved earlier by admin, skipped.")
        return

    result = vt_scan_file(decision.file_bytes, filename)
    if "error" in result:
        logger.error("File scan error | %s | %s", filename, result["error"])
        record_report(chat_id, chat_title, "errors")
        delete_notice()
        return

    malicious = result.get("malicious", 0)
    suspicious = result.get("suspicious", 0)
    verdict = classify_verdict(malicious, suspicious)
    record_report(chat_id, chat_title, "scanned")
    record_report(chat_id, chat_title, "files")
    if malicious >= config.VT_MALICIOUS_THRESHOLD:
        record_report(chat_id, chat_title, "malicious")
    if suspicious >= config.VT_SUSPICIOUS_THRESHOLD:
        record_report(chat_id, chat_title, "suspicious")

    if verdict == "critical":
        delete_notice()
        deleted = api.delete_message(chat_id, msg_id)
        if deleted:
            record_report(chat_id, chat_title, "deleted")
        _send_threat_alert(
            api, chat_id, sender_label, esc(filename), deleted, lang=lang,
            extra="\n\n" + engine_consensus(result),
        )
        apply_strike(api, chat_id, sender_id, user_display)
        logger.warning("FILE THREAT | %s | malicious=%d | suspicious=%d | deleted=%s", filename, malicious, suspicious, deleted)
        return

    if verdict == "suspicious":
        delete_notice()
        warn_text = get_msg_suspicious_file(lang, sender_label, esc(filename)) + "\n\n" + engine_consensus(result)
        kb = {
            "inline_keyboard": [
                [
                    {"text": "🛡️ Approve for Group", "callback_data": f"approve_file:{chat_id}:{sha256}"},
                    {"text": "🗑️ Delete File", "callback_data": f"delete_file:{chat_id}:{msg_id}"},
                ]
            ]
        }
        api.send_message(chat_id, warn_text, reply_markup=kb)
        logger.warning("FILE SUSPICIOUS | %s | malicious=%d | suspicious=%d", filename, malicious, suspicious)
        return

    logger.info("File clean | %s | malicious=%d | suspicious=%d", filename, malicious, suspicious)
    all_clean = scanned_clean_targets + [filename]
    display_safe_feedback(", ".join(all_clean))
