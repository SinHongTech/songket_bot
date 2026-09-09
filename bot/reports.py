"""Persist and read daily per-group scan statistics.

The same Upstash Redis account is shared with the Vercel Mini App
(`api/dashboard.py`), which reads the `report:{date}:{group_id}` keys
written here to render the security dashboard.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from typing import Optional

from bot import config
from bot.redis_client import kv_get, kv_json_get, kv_json_set, kv_set

logger = logging.getLogger("BeydaBot.reports")

REPORT_METRICS = (
    "scanned", "files", "urls", "malicious", "deleted", "suspicious", "errors", "oversize",
)

DEFAULT_REPORT_TIME = "07:00"


def local_date() -> str:
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo(config.REPORT_TIMEZONE)).date().isoformat()
    except Exception:
        return datetime.utcnow().date().isoformat()


def local_time_str() -> str:
    """Return current local time in HH:MM format in Cambodia timezone."""
    try:
        from zoneinfo import ZoneInfo

        return datetime.now(ZoneInfo(config.REPORT_TIMEZONE)).strftime("%H:%M")
    except Exception:
        return datetime.utcnow().strftime("%H:%M")


def record_report(chat_id: int, chat_title: str, metric: str, amount: int = 1) -> None:
    """Persist one daily metric for a Telegram group.

    Reports are keyed by group, not by admin, so one group is counted once
    no matter how many admins are watching its dashboard.
    """
    day = local_date()
    key = f"report:{day}:{chat_id}"
    report = kv_json_get(key) or {
        "date": day,
        "group_id": chat_id,
        "group_title": chat_title or str(chat_id),
        **{m: 0 for m in REPORT_METRICS},
    }
    report["group_title"] = chat_title or report.get("group_title") or str(chat_id)
    report[metric] = int(report.get(metric, 0)) + amount
    kv_json_set(key, report, ttl=config.REPORT_TTL_SECONDS)


def get_report(chat_id: int, day: str) -> dict:
    return kv_json_get(f"report:{day}:{chat_id}") or {"date": day, "group_id": chat_id, **{m: 0 for m in REPORT_METRICS}}


# ── User Daily DM Report Settings ─────────────────────────────────────────────

def get_user_daily_report_settings(user_id: int) -> dict:
    """Return user daily DM report configuration (defaults to enabled at 07:00 AM)."""
    data = kv_json_get(f"settings:user:{user_id}") or {}
    if not isinstance(data, dict):
        data = {}
    en = bool(data.get("daily_report_enabled", True))
    t_val = str(data.get("daily_report_time", DEFAULT_REPORT_TIME))
    return {
        "daily_report_enabled": en,
        "daily_report_time": t_val,
        "enabled": en,
        "time": t_val,
        "lang": str(data.get("lang", "both")),
    }


def set_user_daily_report_settings(
    user_id: int,
    enabled: Optional[bool] = None,
    time_str: Optional[str] = None,
) -> bool:
    """Update user daily DM report schedule and toggle."""
    data = kv_json_get(f"settings:user:{user_id}") or {}
    if not isinstance(data, dict):
        data = {}

    if enabled is not None:
        data["daily_report_enabled"] = bool(enabled)

    if time_str is not None:
        clean_time = time_str.strip()
        # Validate HH:MM (00:00 to 23:59)
        if re.match(r"^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$", clean_time):
            parts = clean_time.split(":")
            formatted = f"{int(parts[0]):02d}:{int(parts[1]):02d}"
            data["daily_report_time"] = formatted
        else:
            return False

    return kv_json_set(f"settings:user:{user_id}", data)


# ── Daily DM Report Formatter ────────────────────────────────────────────────

def format_daily_dm_report(
    api,
    user_id: int,
    target_date: Optional[str] = None,
) -> Optional[str]:
    """Build a rich daily summary DM report for the user's monitored groups."""
    from bot.utils import get_managed_groups_for_user

    date_str = target_date or local_date()

    managed = get_managed_groups_for_user(api, user_id)
    if not managed:
        return None

    settings = get_user_daily_report_settings(user_id)
    lang = settings.get("lang", "both")

    total_scanned = 0
    total_files = 0
    total_urls = 0
    total_malicious = 0
    total_suspicious = 0
    total_deleted = 0

    group_blocks = []
    for g in managed:
        gid = g["id"]
        title = g["title"]
        rep = get_report(gid, date_str)

        scanned = rep.get("scanned", 0)
        files = rep.get("files", 0)
        urls = rep.get("urls", 0)
        malicious = rep.get("malicious", 0)
        suspicious = rep.get("suspicious", 0)
        deleted = rep.get("deleted", 0)

        total_scanned += scanned
        total_files += files
        total_urls += urls
        total_malicious += malicious
        total_suspicious += suspicious
        total_deleted += deleted

        status_emoji = "🟢" if malicious == 0 and suspicious == 0 else "🔴"
        threat_text = ""
        if malicious > 0:
            threat_text += f"\n   🚨 <b>Malicious:</b> {malicious} (Auto-deleted: {deleted})"
        if suspicious > 0:
            threat_text += f"\n   ⚠️ <b>Suspicious:</b> {suspicious}"
        if malicious == 0 and suspicious == 0:
            threat_text = "\n   ✨ <i>100% Clean & Protected</i>"

        group_blocks.append(
            f"{status_emoji} <b>{title}</b>\n"
            f"   🔍 Scans: <b>{scanned}</b> (📁 {files} files · 🔗 {urls} links){threat_text}"
        )

    groups_summary = "\n\n".join(group_blocks)
    today_time = local_time_str()

    if lang == "kh":
        header = f"📊 <b>របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ</b> (Daily Security Report)"
        date_line = f"📅 <b>កាលបរិច្ឆេទ:</b> <code>{date_str}</code> (ម៉ោង {today_time})"
        summary_title = "📈 <b>សរុបសកម្មភាពស្កេនទាំងអស់ (Overall Summary):</b>"
        summary_body = (
            f"• 🔍 ស្កេនសរុប: <b>{total_scanned}</b> (📁 {total_files} ឯកសារ · 🔗 {total_urls} តំណ)\n"
            f"• 🚨 មេរោគគ្រោះថ្នាក់: <b>{total_malicious}</b> (លុបស្វ័យប្រវត្តិ: {total_deleted})\n"
            f"• ⚠️ គួរឱ្យសង្ស័យ: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>ក្រុមដែលកំពុងការពារ ({len(managed)} ក្រុម):</b>"
        footer = "🛡️ <i>Songket Security AI ការពារក្រុមរបស់អ្នក 24/7</i>\n⚙️ ផ្លាស់ប្តូរម៉ោងផ្ញើ៖ /daily"
    elif lang == "en":
        header = f"📊 <b>Daily Security Summary Report</b>"
        date_line = f"📅 <b>Date:</b> <code>{date_str}</code> (Generated at {today_time})"
        summary_title = "📈 <b>Overall Threat & Scan Statistics:</b>"
        summary_body = (
            f"• 🔍 Total Scans: <b>{total_scanned}</b> (📁 {total_files} files · 🔗 {total_urls} links)\n"
            f"• 🚨 Malicious Threats: <b>{total_malicious}</b> (Auto-deleted: {total_deleted})\n"
            f"• ⚠️ Suspicious Items: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>Monitored Groups ({len(managed)} active):</b>"
        footer = "🛡️ <i>Songket Security AI is protecting your groups 24/7</i>\n⚙️ Change report schedule: /daily"
    else:  # bilingual
        header = f"📊 <b>របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ | Daily Security Report</b>"
        date_line = f"📅 <b>Date / កាលបរិច្ឆេទ:</b> <code>{date_str}</code> (Asia/Phnom_Penh {today_time})"
        summary_title = "📈 <b>សរុបស្ថិតិស្កេន (Security Overview):</b>"
        summary_body = (
            f"• 🔍 Total Scans: <b>{total_scanned}</b> (📁 {total_files} files · 🔗 {total_urls} links)\n"
            f"• 🚨 Malicious / មេរោគ: <b>{total_malicious}</b> (Auto-deleted: {total_deleted})\n"
            f"• ⚠️ Suspicious / សង្ស័យ: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>ក្រុមដែលកំពុងការពារ | Monitored Groups ({len(managed)}):</b>"
        footer = "🛡️ <i>Songket Security AI is protecting your groups 24/7</i>\n⚙️ កំណត់ម៉ោងផ្ញើ / Schedule: /daily"

    return (
        f"{header}\n"
        f"{date_line}\n\n"
        f"{summary_title}\n"
        f"{summary_body}\n\n"
        f"{groups_title}\n\n"
        f"{groups_summary}\n\n"
        f"{footer}"
    )
