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

import logging
import time
from typing import Optional

from bot import config
from bot.file_handler import fetch_and_validate
from bot.redis_client import (
    get_group_lang,
    get_group_settings,
    get_plan_catalog,
    get_scan_usage,
    get_daily_scan_usage,
    get_strikes,
    get_subscription,
    increment_daily_scan_usage,
    increment_scan_usage,
    plan_scan_limit_runtime,
    record_first_seen,
    record_join_time,
    set_group_lang,
    set_group_settings,
    set_subscription,
)
from bot.reports import record_report
from bot.scanner import vt_scan_file, vt_scan_url
from bot.telegram_api import TelegramAPI
from bot.utils import (
    compute_trust,
    extract_domain,
    extract_urls,
    get_allowed_groups,
    get_managed_groups_for_user,
    get_user_display,
    is_super_admin,
    is_whitelisted,
    mask_domain,
    resolve_redirect,
)

logger = logging.getLogger("BeydaBot.handlers")


# ── Multilingual & Non-Technical Message Templates ──────────────────────────

def get_msg_scanning(lang: str = "both") -> str:
    if lang == "kh":
        return "🔍 <i>កំពុងស្កែនមាតិកា សូមរង់ចាំ...</i>"
    if lang == "en":
        return "🔍 <i>Scanning content, please wait...</i>"
    return "🔍 <i>កំពុងស្កែនមាតិកា សូមរង់ចាំ... | Scanning content...</i>"


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


def trust_label(chat_id: int, user_id: int, settings: dict) -> str:
    if not (config.TRUST_SCORE_ENABLED and settings.get("trust_score", True)):
        return ""
    first = record_first_seen(user_id)
    join = record_join_time(chat_id, user_id)
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

    for kind, target, r in results:
        if "error" in r:
            api.send_message(chat_id, f"⚠️ Could not scan <code>{target}</code>: {r['error']}")
            continue
        mal = r.get("malicious", 0)
        susp = r.get("suspicious", 0)
        display = mask_domain(target) if kind == "link" else target
        if mal >= config.VT_MALICIOUS_THRESHOLD:
            api.send_message(chat_id, f"🚨 <b>Threat detected</b>\nTarget: <code>{display}</code>\n{engine_consensus(r)}")
        elif susp >= config.VT_SUSPICIOUS_THRESHOLD:
            api.send_message(chat_id, f"⚠️ <b>Suspicious</b>\nTarget: <code>{display}</code>\n{engine_consensus(r)}")
        else:
            api.send_message(chat_id, f"✅ <b>Clean</b>\nTarget: <code>{display}</code>\n{engine_consensus(r)}")


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

    if config.WEB_APP_URL:
        keyboard.append([{"text": "🛡️ Open Security Mini App", "web_app": {"url": config.WEB_APP_URL}}])

    return {"inline_keyboard": keyboard}


def _build_group_settings_view(api: TelegramAPI, group_id: int) -> tuple[str, dict]:
    chat = api.get_chat(group_id)
    title = (chat or {}).get("title") or f"Group {group_id}"

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
        f"📌 <b>{title}</b>\n\n"
        f"🔹 <b>ភាសា (Language):</b> {lang_display}\n"
        f"🔹 <b>សារសុវត្ថិភាព (Safe Message):</b> {timer_display}\n\n"
        f"<i>ចុចប៊ូតុងខាងក្រោមដើម្បីកែប្រែការកំណត់ភ្លាមៗ៖</i>"
    )

    keyboard = [
        [
            {"text": f"{'✅ ' if lang == 'both' else ''}🌐 ទាំងពីរ (Both)", "callback_data": f"adm_lang:{group_id}:both"},
            {"text": f"{'✅ ' if lang == 'kh' else ''}🇰🇭 ខ្មែរ", "callback_data": f"adm_lang:{group_id}:kh"},
            {"text": f"{'✅ ' if lang == 'en' else ''}🇬🇧 English", "callback_data": f"adm_lang:{group_id}:en"},
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


def _handle_private_chat(api: TelegramAPI, chat_id: int, message: dict) -> None:
    text = (message.get("text") or "").strip()
    command = text.split()[0].split("@", 1)[0] if text else ""
    user_id = (message.get("from") or {}).get("id", 0)
    args = text.split()[1:] if len(text.split()) > 1 else []

    # Super admin: assign a plan manually
    if command == "/plan":
        if not is_super_admin(user_id):
            return
        catalog = get_plan_catalog()
        if len(args) < 2:
            plan_list = "\n".join(f"• {k} — {v.get('name', k)} (${v.get('price', 0)})" for k, v in catalog.items())
            api.send_message(chat_id, f"Usage: /plan &lt;user_id&gt; &lt;plan_key&gt;\n\nPlans:\n{plan_list}")
            return
        try:
            target = int(args[0])
        except ValueError:
            api.send_message(chat_id, "Invalid user_id.")
            return
        plan_key = args[1].lower()
        if plan_key not in catalog:
            api.send_message(chat_id, "Unknown plan key.")
            return
        expiry = int(time.time()) + config.PLAN_EXPIRY_DAYS * 86400
        set_subscription(target, plan_key, expiry)
        plan = catalog[plan_key]
        api.send_message(
            chat_id,
            f"✅ Assigned <b>{plan.get('name', plan_key)}</b> to user <code>{target}</code> (expires in {config.PLAN_EXPIRY_DAYS} days).",
        )
        return

    if command == "/sub":
        if not is_super_admin(user_id):
            return
        if not args:
            api.send_message(chat_id, "Usage: /sub &lt;user_id&gt;")
            return
        try:
            target = int(args[0])
        except ValueError:
            return
        sub = get_subscription(target)
        api.send_message(chat_id, f"User <code>{target}</code> — plan: {sub.get('plan')}, expiry: {sub.get('expiry')}")
        return

    if command in {"/start", "/settings", "/config", "/app", "/help", "/lang"}:
        managed_groups = get_managed_groups_for_user(api, user_id)

        # 1. Non-admin / Regular users -> Welcome & Mini App preview
        if not managed_groups:
            welcome_text = (
                "🛡️ <b>ប្រព័ន្ធសុវត្ថិភាព Telegram | Telegram Security Bot</b>\n\n"
                "ប្រព័ន្ធស្កែន និងការពារសុវត្ថិភាពដោយស្វ័យប្រវត្តិសម្រាប់ក្រុម Telegram "
                "(Automated security bot protecting groups against malicious links, phishing scams, and infected files).\n\n"
                "ផ្ញើ link ឬ file មក bot ដើម្បីស្កេន (Send a link or file to scan)."
            )
            markup = None
            if config.WEB_APP_URL:
                markup = {
                    "inline_keyboard": [
                        [{"text": "🛡️ Open Security Mini App", "web_app": {"url": config.WEB_APP_URL}}]
                    ]
                }
            api.send_message(chat_id, welcome_text, reply_markup=markup)
            return

        # 2. Authorized Group Handlers / Admins -> Group Management Panel
        admin_text = (
            "⚙️ <b>ផ្ទាំងគ្រប់គ្រងរចនាសម្ព័ន្ធសុវត្ថិភាព | Admin Control Panel</b>\n\n"
            "សូមជ្រើសរើសក្រុមដែលអ្នកគ្រប់គ្រងដើម្បីកំណត់ <b>ភាសា (Language)</b> និង <b>សារសុវត្ថិភាព (Safe Message Timer)</b>៖\n"
            "<i>(Select a managed group below to configure):</i>"
        )
        markup = _build_admin_menu_keyboard(managed_groups)
        api.send_message(chat_id, admin_text, reply_markup=markup)
        return

    # 3. Personal scanning — any link or file sent privately
    content = (message.get("text") or "") + " " + (message.get("caption") or "")
    if extract_urls(content) or (message.get("document") or {}).get("file_id"):
        _handle_personal_scan(api, chat_id, message, user_id)


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
                        {"text": f"{'✅ ' if new_lang == 'both' else ''}🌐 ទាំងពីរ (Both)", "callback_data": f"grp_lang:{target_gid}:both"},
                        {"text": f"{'✅ ' if new_lang == 'kh' else ''}🇰🇭 ខ្មែរ", "callback_data": f"grp_lang:{target_gid}:kh"},
                        {"text": f"{'✅ ' if new_lang == 'en' else ''}🇬🇧 English", "callback_data": f"grp_lang:{target_gid}:en"},
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

    notice_id = api.send_message(chat_id, get_msg_scanning(lang))

    def delete_notice() -> None:
        if notice_id:
            api.delete_message(chat_id, notice_id)

    def display_safe_feedback(target_name: str) -> None:
        if show_safe and notice_id:
            safe_text = get_msg_safe(lang, user_display, target_name, safe_timeout)
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
        record_report(chat_id, chat_title, "scanned")
        record_report(chat_id, chat_title, "urls")
        if malicious >= config.VT_MALICIOUS_THRESHOLD:
            record_report(chat_id, chat_title, "malicious")
        if suspicious >= config.VT_SUSPICIOUS_THRESHOLD:
            record_report(chat_id, chat_title, "suspicious")

        if malicious < config.VT_MALICIOUS_THRESHOLD and suspicious < config.VT_SUSPICIOUS_THRESHOLD:
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

        if malicious < config.VT_MALICIOUS_THRESHOLD and suspicious >= config.VT_SUSPICIOUS_THRESHOLD:
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
        api.send_message(chat_id, MSG_TOO_LARGE.format(user=user_display, filename=filename, size_mb=decision.size_mb))
        return

    if not decision.ok:
        if scanned_clean_targets:
            display_safe_feedback(", ".join(scanned_clean_targets))
        else:
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
    if malicious >= config.VT_MALICIOUS_THRESHOLD:
        record_report(chat_id, chat_title, "malicious")
    if suspicious >= config.VT_SUSPICIOUS_THRESHOLD:
        record_report(chat_id, chat_title, "suspicious")

    if malicious >= config.VT_MALICIOUS_THRESHOLD:
        delete_notice()
        deleted = api.delete_message(chat_id, msg_id)
        if deleted:
            record_report(chat_id, chat_title, "deleted")
        sender_label = user_display + trust_label(chat_id, sender_id, group_settings)
        _send_threat_alert(
            api, chat_id, sender_label, filename, deleted, lang=lang,
            extra="\n\n" + engine_consensus(result),
        )
        logger.warning("FILE THREAT | %s | malicious=%d | suspicious=%d | deleted=%s", filename, malicious, suspicious, deleted)
        return

    if suspicious >= config.VT_SUSPICIOUS_THRESHOLD:
        delete_notice()
        sender_label = user_display + trust_label(chat_id, sender_id, group_settings)
        warn_text = get_msg_suspicious_file(lang, sender_label, filename) + "\n\n" + engine_consensus(result)
        api.send_message(chat_id, warn_text)
        logger.warning("FILE SUSPICIOUS | %s | malicious=%d | suspicious=%d", filename, malicious, suspicious)
        return

    logger.info("File clean | %s | malicious=%d | suspicious=%d", filename, malicious, suspicious)
    all_clean = scanned_clean_targets + [filename]
    display_safe_feedback(", ".join(all_clean))
