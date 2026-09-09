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


# ── Period Dates & Multi-Range Calculator ───────────────────────────────────

def _get_dates_for_period(period: str = "daily", end_date_str: Optional[str] = None) -> tuple[list[str], str, str]:
    """Return (date_list, start_date_str, end_date_str) for period ('daily' | 'weekly' | 'monthly')."""
    end_str = end_date_str or local_date()
    try:
        end_d = datetime.strptime(end_str, "%Y-%m-%d").date()
    except Exception:
        end_d = datetime.utcnow().date()
        end_str = end_d.isoformat()

    period_clean = (period or "daily").lower().strip()
    if period_clean == "weekly":
        start_d = end_d - timedelta(days=6)
        dates = [(start_d + timedelta(days=i)).isoformat() for i in range(7)]
        return dates, start_d.isoformat(), end_str
    elif period_clean == "monthly":
        start_d = end_d - timedelta(days=29)
        dates = [(start_d + timedelta(days=i)).isoformat() for i in range(30)]
        return dates, start_d.isoformat(), end_str
    else:  # daily
        return [end_str], end_str, end_str


# ── User Daily / Periodic DM Report Settings ──────────────────────────────────

def get_user_daily_report_settings(user_id: int) -> dict:
    """Return user DM report configuration (defaults to enabled daily at 07:00 AM in both languages)."""
    data = kv_json_get(f"settings:user:{user_id}") or {}
    if not isinstance(data, dict):
        data = {}
    en = bool(data.get("daily_report_enabled", True))
    t_val = str(data.get("daily_report_time", DEFAULT_REPORT_TIME))
    freq = str(data.get("report_frequency", "daily")).lower().strip()
    if freq not in {"daily", "weekly", "monthly"}:
        freq = "daily"
    rlang = str(data.get("report_lang", data.get("lang", "both"))).lower().strip()
    if rlang not in {"both", "kh", "en"}:
        rlang = "both"
    return {
        "daily_report_enabled": en,
        "daily_report_time": t_val,
        "report_frequency": freq,
        "report_lang": rlang,
        "enabled": en,
        "time": t_val,
        "frequency": freq,
        "lang": rlang,
    }


def set_user_daily_report_settings(
    user_id: int,
    enabled: Optional[bool] = None,
    time_str: Optional[str] = None,
    frequency: Optional[str] = None,
    lang: Optional[str] = None,
) -> bool:
    """Update user DM report schedule, frequency ('daily'|'weekly'|'monthly'), and language ('both'|'kh'|'en')."""
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

    if frequency is not None:
        clean_freq = frequency.strip().lower()
        if clean_freq in {"daily", "weekly", "monthly"}:
            data["report_frequency"] = clean_freq

    if lang is not None:
        clean_lang = lang.strip().lower()
        if clean_lang in {"both", "kh", "en"}:
            data["report_lang"] = clean_lang
            data["lang"] = clean_lang

    return kv_json_set(f"settings:user:{user_id}", data)


# ── Periodic DM Report Formatter ──────────────────────────────────────────────

def format_security_dm_report(
    api,
    user_id: int,
    period: str = "daily",
    lang: Optional[str] = None,
    target_date: Optional[str] = None,
) -> Optional[str]:
    """Build a rich DM summary report for daily, weekly, or monthly periods in user's selected language."""
    from bot.utils import get_managed_groups_for_user

    period_clean = (period or "daily").lower().strip()
    if period_clean not in {"daily", "weekly", "monthly"}:
        period_clean = "daily"

    date_list, start_str, end_str = _get_dates_for_period(period_clean, target_date)

    managed = get_managed_groups_for_user(api, user_id)
    if not managed:
        return None

    settings = get_user_daily_report_settings(user_id)
    selected_lang = lang or settings.get("report_lang", "both")

    # Deduplicate and consolidate metrics by group title
    group_map: dict[str, dict] = {}
    for g in managed:
        gid = g["id"]
        title = (g.get("title") or "Protected Group").strip()

        scanned = 0
        files = 0
        urls = 0
        malicious = 0
        suspicious = 0
        deleted = 0

        for d in date_list:
            rep = get_report(gid, d)
            scanned += int(rep.get("scanned", 0))
            files += int(rep.get("files", 0))
            urls += int(rep.get("urls", 0))
            malicious += int(rep.get("malicious", 0))
            suspicious += int(rep.get("suspicious", 0))
            deleted += int(rep.get("deleted", 0))

        if title not in group_map:
            group_map[title] = {
                "title": title,
                "id": gid,
                "scanned": scanned,
                "files": files,
                "urls": urls,
                "malicious": malicious,
                "suspicious": suspicious,
                "deleted": deleted,
            }
        else:
            group_map[title]["scanned"] += scanned
            group_map[title]["files"] += files
            group_map[title]["urls"] += urls
            group_map[title]["malicious"] += malicious
            group_map[title]["suspicious"] += suspicious
            group_map[title]["deleted"] += deleted
            if str(gid).startswith("-100"):
                group_map[title]["id"] = gid

    group_rows = list(group_map.values())

    total_scanned = 0
    total_files = 0
    total_urls = 0
    total_malicious = 0
    total_suspicious = 0
    total_deleted = 0

    group_blocks = []
    for row in group_rows:
        title = row["title"]
        scanned = row["scanned"]
        files = row["files"]
        urls = row["urls"]
        malicious = row["malicious"]
        suspicious = row["suspicious"]
        deleted = row["deleted"]

        total_scanned += scanned
        total_files += files
        total_urls += urls
        total_malicious += malicious
        total_suspicious += suspicious
        total_deleted += deleted

        status_emoji = "🟢" if malicious == 0 and suspicious == 0 else "🔴"
        threat_text = ""

        if selected_lang == "kh":
            if malicious > 0:
                threat_text += f"\n   🚨 <b>មេរោគ:</b> {malicious} (លុបស្វ័យប្រវត្តិ: {deleted})"
            if suspicious > 0:
                threat_text += f"\n   ⚠️ <b>សង្ស័យ:</b> {suspicious}"
            if malicious == 0 and suspicious == 0:
                threat_text = "\n   ✨ <i>100% ស្អាត និងមានសុវត្ថិភាព</i>"
            group_blocks.append(
                f"{status_emoji} <b>{title}</b>\n"
                f"   🔍 ស្កេន: <b>{scanned}</b> (📁 {files} ឯកសារ · 🔗 {urls} តំណ){threat_text}"
            )
        elif selected_lang == "en":
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
        else:  # bilingual
            if malicious > 0:
                threat_text += f"\n   🚨 <b>Malicious / មេរោគ:</b> {malicious} (Auto-deleted: {deleted})"
            if suspicious > 0:
                threat_text += f"\n   ⚠️ <b>Suspicious / សង្ស័យ:</b> {suspicious}"
            if malicious == 0 and suspicious == 0:
                threat_text = "\n   ✨ <i>100% Clean & Protected</i>"
            group_blocks.append(
                f"{status_emoji} <b>{title}</b>\n"
                f"   🔍 Scans: <b>{scanned}</b> (📁 {files} files · 🔗 {urls} links){threat_text}"
            )

    groups_summary = "\n\n".join(group_blocks)

    today_time = local_time_str()

    # Titles and date headers per period
    if period_clean == "weekly":
        title_kh = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំសប្តាហ៍</b> (Songket Security Weekly Report)"
        title_en = "📊 <b>Songket Security Weekly Report</b>"
        title_both = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំសប្តាហ៍ | Songket Security Weekly Report</b>"
        date_kh = f"📅 <b>រយៈពេល (៧ ថ្ងៃ):</b> <code>{start_str}</code> ដល់ <code>{end_str}</code> (ម៉ោង {today_time})"
        date_en = f"📅 <b>Period (7 Days):</b> <code>{start_str}</code> to <code>{end_str}</code> (Generated at {today_time})"
        date_both = f"📅 <b>Period / រយៈពេល:</b> <code>{start_str}</code> ដល់ <code>{end_str}</code> (7 Days · {today_time})"
    elif period_clean == "monthly":
        title_kh = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំខែ</b> (Songket Security Monthly Report)"
        title_en = "📊 <b>Songket Security Monthly Report</b>"
        title_both = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំខែ | Songket Security Monthly Report</b>"
        date_kh = f"📅 <b>រយៈពេល (៣០ ថ្ងៃ):</b> <code>{start_str}</code> ដល់ <code>{end_str}</code> (ម៉ោង {today_time})"
        date_en = f"📅 <b>Period (30 Days):</b> <code>{start_str}</code> to <code>{end_str}</code> (Generated at {today_time})"
        date_both = f"📅 <b>Period / រយៈពេល:</b> <code>{start_str}</code> ដល់ <code>{end_str}</code> (30 Days · {today_time})"
    else:  # daily
        title_kh = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ</b> (Songket Security Daily Report)"
        title_en = "📊 <b>Songket Security Daily Report</b>"
        title_both = "📊 <b>របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ | Songket Security Daily Report</b>"
        date_kh = f"📅 <b>កាលបរិច្ឆេទ:</b> <code>{end_str}</code> (ម៉ោង {today_time})"
        date_en = f"📅 <b>Date:</b> <code>{end_str}</code> (Generated at {today_time})"
        date_both = f"📅 <b>Date / កាលបរិច្ឆេទ:</b> <code>{end_str}</code> (Asia/Phnom_Penh {today_time})"

    if selected_lang == "kh":
        header = title_kh
        date_line = date_kh
        summary_title = "📈 <b>សរុបសកម្មភាពស្កេនទាំងអស់ (Overall Summary):</b>"
        summary_body = (
            f"• 🔍 ស្កេនសរុប: <b>{total_scanned}</b> (📁 {total_files} ឯកសារ · 🔗 {total_urls} តំណ)\n"
            f"• 🚨 មេរោគគ្រោះថ្នាក់: <b>{total_malicious}</b> (លុបស្វ័យប្រវត្តិ: {total_deleted})\n"
            f"• ⚠️ គួរឱ្យសង្ស័យ: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>ក្រុមដែលកំពុងការពារ ({len(managed)} ក្រុម):</b>"
        footer = "🛡️ <i>Songket Security Bot ការពារក្រុមរបស់អ្នក 24/7</i>\n⚙️ ផ្លាស់ប្តូរការកំណត់របាយការណ៍៖ /daily ឬ /report"
    elif selected_lang == "en":
        header = title_en
        date_line = date_en
        summary_title = "📈 <b>Overall Threat & Scan Statistics:</b>"
        summary_body = (
            f"• 🔍 Total Scans: <b>{total_scanned}</b> (📁 {total_files} files · 🔗 {total_urls} links)\n"
            f"• 🚨 Malicious Threats: <b>{total_malicious}</b> (Auto-deleted: {total_deleted})\n"
            f"• ⚠️ Suspicious Items: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>Monitored Groups ({len(managed)} active):</b>"
        footer = "🛡️ <i>Songket Security Bot is protecting your groups 24/7</i>\n⚙️ Change report schedule: /daily or /report"
    else:  # bilingual
        header = title_both
        date_line = date_both
        summary_title = "📈 <b>សរុបស្ថិតិស្កេន (Security Overview):</b>"
        summary_body = (
            f"• 🔍 Total Scans: <b>{total_scanned}</b> (📁 {total_files} files · 🔗 {total_urls} links)\n"
            f"• 🚨 Malicious / មេរោគ: <b>{total_malicious}</b> (Auto-deleted: {total_deleted})\n"
            f"• ⚠️ Suspicious / សង្ស័យ: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>ក្រុមដែលកំពុងការពារ | Monitored Groups ({len(managed)}):</b>"
        footer = "🛡️ <i>Songket Security Bot is protecting your groups 24/7</i>\n⚙️ កំណត់ម៉ោងផ្ញើ / Schedule: /daily ឬ /report"

    return (
        f"{header}\n"
        f"{date_line}\n\n"
        f"{summary_title}\n"
        f"{summary_body}\n\n"
        f"{groups_title}\n\n"
        f"{groups_summary}\n\n"
        f"{footer}"
    )


def format_daily_dm_report(
    api,
    user_id: int,
    target_date: Optional[str] = None,
) -> Optional[str]:
    """Backward-compatible helper for daily DM report."""
    settings = get_user_daily_report_settings(user_id)
    return format_security_dm_report(
        api,
        user_id,
        period="daily",
        lang=settings.get("report_lang", "both"),
        target_date=target_date,
    )


def _get_font_base64(filename: str) -> str:
    import base64
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "assets", "fonts", filename),
        os.path.join(base_dir, "assets", filename),
        os.path.join(os.path.dirname(base_dir), "bot", "assets", "fonts", filename),
        os.path.join(os.path.dirname(base_dir), "bot", "assets", filename),
        os.path.join(os.path.dirname(base_dir), "api", "assets", filename),
        os.path.join(os.path.dirname(base_dir), "miniapp", "api", "assets", filename),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "rb") as f:
                    return base64.b64encode(f.read()).decode("ascii")
            except Exception:
                pass
    return ""


def _get_logo_base64() -> str:
    import base64
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "assets", "logo.png"),
        os.path.join(os.path.dirname(base_dir), "bot", "assets", "logo.png"),
        os.path.join(os.path.dirname(base_dir), "api", "assets", "logo.png"),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "rb") as f:
                    return f"data:image/png;base64,{base64.b64encode(f.read()).decode('ascii')}"
            except Exception:
                pass
    return ""


def _html_to_pdf(html_content: str) -> Optional[bytes]:
    """Render HTML to PDF using Chromium headless with full OpenType Khmer complex script shaping."""
    import os
    import shutil
    import subprocess
    import tempfile

    chromium_path = shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
    if not chromium_path:
        return None

    with tempfile.NamedTemporaryFile(suffix=".html", delete=False, mode="w", encoding="utf-8") as hf:
        hf.write(html_content)
        html_file = hf.name

    pdf_file = html_file.replace(".html", ".pdf")
    try:
        cmd = [
            chromium_path,
            "--headless",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_file}",
            f"file://{html_file}",
        ]
        res = subprocess.run(cmd, capture_output=True, timeout=20)
        if os.path.exists(pdf_file) and os.path.getsize(pdf_file) > 0:
            with open(pdf_file, "rb") as f:
                return f.read()
    except Exception as e:
        logger.warning("Chromium HTML to PDF failed: %s", e)
    finally:
        for p in [html_file, pdf_file]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
    return None


def _register_report_fonts() -> tuple[str, str]:
    """Register NotoSansKhmer fonts if available for Khmer and Latin rendering."""
    import os
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base_dir, "assets"),
        os.path.join(os.path.dirname(base_dir), "bot", "assets"),
        os.path.join(os.path.dirname(base_dir), "api", "assets"),
        "/usr/share/fonts/truetype/noto",
    ]
    for d in candidates:
        r_p = os.path.join(d, "NotoSansKhmer-Regular.ttf")
        b_p = os.path.join(d, "NotoSansKhmer-Bold.ttf")
        if os.path.exists(r_p) and os.path.exists(b_p):
            try:
                pdfmetrics.registerFont(TTFont("SongketKhmer", r_p))
                pdfmetrics.registerFont(TTFont("SongketKhmer-Bold", b_p))
                return "SongketKhmer", "SongketKhmer-Bold"
            except Exception as e:
                logger.warning("Failed to register SongketKhmer font from %s: %s", d, e)
    return "Helvetica", "Helvetica-Bold"


# ── PDF Security Report Generator (Daily, Weekly, Monthly) ─────────────────────

def generate_security_pdf_report(
    api,
    user_id: int,
    period: str = "daily",
    lang: Optional[str] = None,
    target_date: Optional[str] = None,
) -> Optional[bytes]:
    """Generate a detailed PDF security audit report for daily, weekly, or monthly periods."""
    from bot.utils import get_managed_groups_for_user

    period_clean = (period or "daily").lower().strip()
    if period_clean not in {"daily", "weekly", "monthly"}:
        period_clean = "daily"

    date_list, start_str, end_str = _get_dates_for_period(period_clean, target_date)
    managed = get_managed_groups_for_user(api, user_id)
    if not managed:
        return None

    settings = get_user_daily_report_settings(user_id)
    selected_lang = (lang or settings.get("report_lang", "both")).lower().strip()
    if selected_lang not in {"kh", "en", "both"}:
        selected_lang = "both"

    today_time = local_time_str()

    # Deduplicate and consolidate metrics by group title
    group_map: dict[str, dict] = {}
    for g in managed:
        gid = g["id"]
        title = (g.get("title") or "Protected Group").strip()

        scanned = 0
        files = 0
        urls = 0
        malicious = 0
        suspicious = 0
        deleted = 0

        for d in date_list:
            rep = get_report(gid, d)
            scanned += int(rep.get("scanned", 0))
            files += int(rep.get("files", 0))
            urls += int(rep.get("urls", 0))
            malicious += int(rep.get("malicious", 0))
            suspicious += int(rep.get("suspicious", 0))
            deleted += int(rep.get("deleted", 0))

        if title not in group_map:
            group_map[title] = {
                "title": title,
                "id": str(gid),
                "scanned": scanned,
                "files": files,
                "urls": urls,
                "malicious": malicious,
                "suspicious": suspicious,
                "deleted": deleted,
            }
        else:
            group_map[title]["scanned"] += scanned
            group_map[title]["files"] += files
            group_map[title]["urls"] += urls
            group_map[title]["malicious"] += malicious
            group_map[title]["suspicious"] += suspicious
            group_map[title]["deleted"] += deleted
            if str(gid).startswith("-100"):
                group_map[title]["id"] = str(gid)

    group_rows = list(group_map.values())

    total_scanned = 0
    total_files = 0
    total_urls = 0
    total_malicious = 0
    total_suspicious = 0
    total_deleted = 0

    for row in group_rows:
        total_scanned += row["scanned"]
        total_files += row["files"]
        total_urls += row["urls"]
        total_malicious += row["malicious"]
        total_suspicious += row["suspicious"]
        total_deleted += row["deleted"]

    # Multilingual Strings Setup
    if selected_lang == "kh":
        if period_clean == "weekly":
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំសប្តាហ៍"
            sub_title = "Songket Security Bot • កំណែ Beta"
            conf = "សម្ងាត់ (CONFIDENTIAL)"
            badge = "របាយការណ៍សវនកម្មសន្តិសុខ"
            date_lbl = f"រយៈពេល (៧ ថ្ងៃ)៖ <b>{start_str} ដល់ {end_str}</b>"
        elif period_clean == "monthly":
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំខែ"
            sub_title = "Songket Security Bot • កំណែ Beta"
            conf = "សម្ងាត់ (CONFIDENTIAL)"
            badge = "របាយការណ៍សវនកម្មសន្តិសុខ"
            date_lbl = f"រយៈពេល (៣០ ថ្ងៃ)៖ <b>{start_str} ដល់ {end_str}</b>"
        else:
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ"
            sub_title = "Songket Security Bot • កំណែ Beta"
            conf = "សម្ងាត់ (CONFIDENTIAL)"
            badge = "របាយការណ៍សវនកម្មសន្តិសុខ"
            date_lbl = f"កាលបរិច្ឆេទ៖ <b>{end_str}</b> ({today_time} Asia/Phnom_Penh)"
        exec_heading = "សេចក្តីសង្ខេបប្រតិបត្តិ និងស្ថិតិការពារ"
        kpi1_lbl = "ចំនួនស្កេនសរុប"
        kpi1_sub = f"ឯកសារ {total_files} • តំណភ្ជាប់ {total_urls}"
        kpi2_lbl = "ការគំរាមកំហែងមេរោគ"
        kpi2_sub = f"បានលុបស្វ័យប្រវត្តិ: {total_deleted}"
        kpi3_lbl = "ធាតុគួរឱ្យសង្ស័យ"
        kpi3_sub = f"ការព្រមាន: {total_suspicious}"
        kpi4_lbl = "ស្ថានភាពសុវត្ថិភាព"
        kpi4_val = "សុវត្ថិភាព 100%" if total_malicious == 0 and total_suspicious == 0 else f"បានទប់ស្កាត់ {total_malicious}"
        kpi4_sub = f"ការពារ {len(group_rows)} ក្រុម"
        groups_heading = f"ព័ត៌មានលម្អិតសកម្មភាពតាមក្រុម (ក្រុមសកម្មចំនួន {len(group_rows)})"
        th_grp = "ឈ្មោះក្រុម"
        th_scan = "ស្កេន"
        th_files = "ឯកសារ"
        th_urls = "តំណភ្ជាប់"
        th_mal = "មេរោគ"
        th_del = "បានលុប"
        th_stat = "ស្ថានភាព"
        stat_clean = '<span style="color:#059669; font-weight:700;">សុវត្ថិភាព</span>'
        stat_blocked = lambda m: f'<span style="color:#dc2626; font-weight:700;">បានទប់ស្កាត់ {m}</span>'
        stat_susp = lambda s: f'<span style="color:#d97706; font-weight:700;">គួរឱ្យសង្ស័យ {s}</span>'
        policy_heading = "គោលការណ៍កាត់បន្ថយការគំរាមកំហែង និងសុវត្ថិភាព"
        policies = """
          <li><b>ប្រព័ន្ធការពារមេរោគ និងតំណភ្ជាប់បោកបញ្ឆោត (Phishing) ក្នុងពេលជាក់ស្តែង៖</b> ស្កេនសារ Telegram, មេឌា, ឯកសារ APK, ឯកសារ និង URLs ទាំងអស់។</li>
          <li><b>បញ្ញាសិប្បនិម្មិតម៉ាស៊ីនពីរ (Dual-Engine)៖</b> ដំណើរការដោយ VirusTotal Intelligence និង Google Safe Browsing API v5។</li>
          <li><b>ការដាក់ឱ្យនៅដាច់ដោយស្វ័យប្រវត្តិ (Zero-Trust)៖</b> មេរោគ និងតំណភ្ជាប់បោកប្រាស់ដែលត្រូវបានរកឃើញ នឹងត្រូវលុបដោយស្វ័យប្រវត្តិជាមួយការព្រមាន។</li>
          <li><b>ការកំណត់ទិសដៅជូនដំណឹងអ្នកគ្រប់គ្រងដាច់ដោយឡែក៖</b> ការជូនដំណឹងអំពីការគំរាមកំហែង និងរបាយការណ៍សវនកម្មត្រូវបានផ្ញើជូនតែអ្នកគ្រប់គ្រងដែលទទួលបន្ទុកប៉ុណ្ណោះ។</li>
        """
        footer = f"Songket Security Bot • កំណែ Beta • {doc_title} • បានបង្កើតនៅ {end_str} {today_time}"
    elif selected_lang == "en":
        if period_clean == "weekly":
            doc_title = "SONGKET SECURITY WEEKLY REPORT"
            sub_title = "Songket Security Bot • Beta version"
            conf = "CONFIDENTIAL"
            badge = "Weekly Security Audit Report"
            date_lbl = f"Period: <b>{start_str} to {end_str}</b> (7 Days)"
        elif period_clean == "monthly":
            doc_title = "SONGKET SECURITY MONTHLY REPORT"
            sub_title = "Songket Security Bot • Beta version"
            conf = "CONFIDENTIAL"
            badge = "Monthly Security Audit Report"
            date_lbl = f"Period: <b>{start_str} to {end_str}</b> (30 Days)"
        else:
            doc_title = "SONGKET SECURITY DAILY REPORT"
            sub_title = "Songket Security Bot • Beta version"
            conf = "CONFIDENTIAL"
            badge = "Daily Security Audit Report"
            date_lbl = f"Date: <b>{end_str}</b> ({today_time} Asia/Phnom_Penh)"
        exec_heading = "Executive Summary & Protection Metrics"
        kpi1_lbl = "Total Scans"
        kpi1_sub = f"{total_files} Files • {total_urls} Links"
        kpi2_lbl = "Malicious Threats"
        kpi2_sub = f"Auto-deleted: {total_deleted}"
        kpi3_lbl = "Suspicious Items"
        kpi3_sub = f"Flagged warnings: {total_suspicious}"
        kpi4_lbl = "Security Health"
        kpi4_val = "100% SECURE" if total_malicious == 0 and total_suspicious == 0 else f"{total_malicious} MITIGATED"
        kpi4_sub = f"{len(group_rows)} Groups Protected"
        groups_heading = f"Monitored Groups Activity Breakdown ({len(group_rows)} Active Groups)"
        th_grp = "Group Name"
        th_scan = "Scans"
        th_files = "Files"
        th_urls = "URLs"
        th_mal = "Threats"
        th_del = "Deleted"
        th_stat = "Status"
        stat_clean = '<span style="color:#059669; font-weight:700;">CLEAN</span>'
        stat_blocked = lambda m: f'<span style="color:#dc2626; font-weight:700;">{m} BLOCKED</span>'
        stat_susp = lambda s: f'<span style="color:#d97706; font-weight:700;">{s} SUSPICIOUS</span>'
        policy_heading = "Threat Mitigation & Security Policies"
        policies = """
          <li><b>Real-Time Antivirus & Phishing Filter:</b> Active inspection on all Telegram messages, media, APKs, documents, and URLs.</li>
          <li><b>Dual-Engine Intelligence:</b> Powered by VirusTotal Intelligence and Google Safe Browsing API v5.</li>
          <li><b>Zero-Trust Auto Quarantine:</b> Detected malware and dangerous phishing links are automatically purged with warnings.</li>
          <li><b>Isolated Admin Routing:</b> Threat notifications and security audits are strictly sent to handling administrators.</li>
        """
        footer = f"Songket Security Bot • Beta version • {doc_title} • Generated {end_str} {today_time}"
    else:  # bilingual
        if period_clean == "weekly":
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំសប្តាហ៍ | WEEKLY REPORT"
            sub_title = "Songket Security Bot • Beta version (កំណែសាកល្បង)"
            conf = "សម្ងាត់ / CONFIDENTIAL"
            badge = "Weekly Security Audit Report"
            date_lbl = f"Period/រយៈពេល: <b>{start_str} ដល់ {end_str}</b> (7 Days)"
        elif period_clean == "monthly":
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំខែ | MONTHLY REPORT"
            sub_title = "Songket Security Bot • Beta version (កំណែសាកល្បង)"
            conf = "សម្ងាត់ / CONFIDENTIAL"
            badge = "Monthly Security Audit Report"
            date_lbl = f"Period/រយៈពេល: <b>{start_str} ដល់ {end_str}</b> (30 Days)"
        else:
            doc_title = "របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ | DAILY REPORT"
            sub_title = "Songket Security Bot • Beta version (កំណែសាកល្បង)"
            conf = "សម្ងាត់ / CONFIDENTIAL"
            badge = "Daily Security Audit Report"
            date_lbl = f"Date/កាលបរិច្ឆេទ: <b>{end_str}</b> ({today_time} Asia/Phnom_Penh)"
        exec_heading = "សេចក្តីសង្ខេបប្រតិបត្តិ | Executive Summary"
        kpi1_lbl = "ស្កេនសរុប (Total Scans)"
        kpi1_sub = f"{total_files} Files • {total_urls} Links"
        kpi2_lbl = "មេរោគ (Malicious)"
        kpi2_sub = f"Auto-deleted: {total_deleted}"
        kpi3_lbl = "សង្ស័យ (Suspicious)"
        kpi3_sub = f"Flagged warnings: {total_suspicious}"
        kpi4_lbl = "ស្ថានភាព (Health)"
        kpi4_val = "100% SECURE" if total_malicious == 0 and total_suspicious == 0 else f"{total_malicious} MITIGATED"
        kpi4_sub = f"{len(group_rows)} Groups Protected"
        groups_heading = f"ព័ត៌មានលម្អិតតាមក្រុម | Monitored Groups ({len(group_rows)})"
        th_grp = "Group / ឈ្មោះក្រុម"
        th_scan = "Scans"
        th_files = "Files"
        th_urls = "URLs"
        th_mal = "Threats"
        th_del = "Deleted"
        th_stat = "Status / ស្ថានភាព"
        stat_clean = '<span style="color:#059669; font-weight:700;">CLEAN (សុវត្ថិភាព)</span>'
        stat_blocked = lambda m: f'<span style="color:#dc2626; font-weight:700;">{m} BLOCKED</span>'
        stat_susp = lambda s: f'<span style="color:#d97706; font-weight:700;">{s} SUSPICIOUS</span>'
        policy_heading = "គោលការណ៍សុវត្ថិភាព | Threat Mitigation & Policies"
        policies = """
          <li><b>Real-Time Antivirus & Phishing Filter:</b> ស្កេនមេរោគ និង Phishing ក្នុងពេលជាក់ស្តែងលើសារ, ឯកសារ APK, មេឌា និង URLs ទាំងអស់។</li>
          <li><b>Dual-Engine Intelligence:</b> ដំណើរការដោយ VirusTotal Intelligence និង Google Safe Browsing API v5។</li>
          <li><b>Zero-Trust Auto Quarantine:</b> Detected malware and malicious links are automatically purged (លុបមេរោគស្វ័យប្រវត្តិ)។</li>
          <li><b>Isolated Admin Routing:</b> Threat notifications and audits are strictly sent to handling admins (ផ្ញើជូនតែ Admin ទទួលបន្ទុក)។</li>
        """
        footer = f"Songket Security Bot • Beta version • {doc_title} • Generated {end_str} {today_time}"

    # Build Table Rows HTML
    rows_html = []
    for row in group_rows:
        mal = row["malicious"]
        susp = row["suspicious"]
        del_count = row["deleted"]
        if mal == 0 and susp == 0:
            status_html = stat_clean
        elif mal > 0:
            status_html = stat_blocked(mal)
        else:
            status_html = stat_susp(susp)

        clean_title = (row["title"][:32] + "...") if len(row["title"]) > 34 else row["title"]
        rows_html.append(f"""
        <tr>
          <td><b>{clean_title}</b></td>
          <td style="text-align: center; font-weight: 700;">{row['scanned']}</td>
          <td style="text-align: center;">{row['files']}</td>
          <td style="text-align: center;">{row['urls']}</td>
          <td style="text-align: center;">{mal}</td>
          <td style="text-align: center;">{del_count}</td>
          <td style="text-align: center;">{status_html}</td>
        </tr>
        """)
    table_rows_str = "\n".join(rows_html)

    # Base64 Fonts & Logo
    battambang_reg_b64 = _get_font_base64("Battambang-Regular.ttf")
    battambang_bold_b64 = _get_font_base64("Battambang-Bold.ttf")
    logo_b64 = _get_logo_base64()

    font_css = ""
    if battambang_reg_b64 and battambang_bold_b64:
        font_css = f"""
        @font-face {{
          font-family: 'SongketFont';
          src: url(data:font/ttf;charset=utf-8;base64,{battambang_reg_b64}) format('truetype');
          font-weight: 400;
          font-style: normal;
        }}
        @font-face {{
          font-family: 'SongketFont';
          src: url(data:font/ttf;charset=utf-8;base64,{battambang_bold_b64}) format('truetype');
          font-weight: 700;
          font-style: normal;
        }}
        body {{ font-family: 'SongketFont', 'Outfit', sans-serif; }}
        """
    else:
        font_css = "body { font-family: 'Battambang', 'Noto Sans Khmer', sans-serif; }"

    health_color = "#059669" if total_malicious == 0 else "#DC2626"

    html_content = f"""<!DOCTYPE html>
<html lang="km">
<head>
<meta charset="UTF-8">
<style>
  {font_css}
  @page {{
    size: letter;
    margin: 12mm 14mm 10mm;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    color: #1e293b;
    margin: 0;
    padding: 0;
    font-size: 9.5pt;
    line-height: 1.65;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}
  .header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 10px;
    margin-bottom: 12px;
  }}
  .brand {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  .logo {{
    width: 44px;
    height: 44px;
    border-radius: 10px;
    object-fit: cover;
  }}
  .brand-text h1 {{
    margin: 0;
    font-size: 14pt;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.3;
  }}
  .brand-text .sub {{
    font-size: 8.5pt;
    color: #64748b;
    margin-top: 2px;
  }}
  .meta {{
    text-align: right;
  }}
  .meta .conf {{
    color: #2563eb;
    font-weight: 700;
    font-size: 8.5pt;
    letter-spacing: 0.05em;
  }}
  .meta .badge {{
    color: #334155;
    font-weight: 600;
    font-size: 8.5pt;
    margin-top: 2px;
  }}
  .meta .date {{
    color: #64748b;
    font-size: 7.8pt;
    margin-top: 2px;
  }}
  .section-title {{
    font-size: 10.5pt;
    font-weight: 700;
    color: #1e293b;
    margin: 12px 0 6px;
  }}
  .kpi-grid {{
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
  }}
  .kpi-card {{
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 10px;
    text-align: center;
  }}
  .kpi-card .lbl {{
    font-size: 8.2pt;
    color: #475569;
    font-weight: 600;
    margin-bottom: 2px;
    line-height: 1.3;
  }}
  .kpi-card .val {{
    font-size: 14.5pt;
    font-weight: 700;
    line-height: 1.25;
  }}
  .kpi-card .sub {{
    font-size: 7.5pt;
    color: #64748b;
    margin-top: 2px;
    line-height: 1.3;
  }}
  table.data-table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 8.8pt;
    margin-bottom: 12px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
  }}
  table.data-table th {{
    background: #f1f5f9;
    color: #1e293b;
    font-weight: 700;
    padding: 7px 8px;
    text-align: left;
    border: 1px solid #cbd5e1;
  }}
  table.data-table td {{
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    color: #334155;
  }}
  table.data-table tr:nth-child(even) {{ background: #f8fafc; }}
  table.data-table tr:nth-child(odd) {{ background: #ffffff; }}
  .policy-box {{
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 8.4pt;
    color: #1e3a8a;
  }}
  .policy-box ul {{
    margin: 0;
    padding-left: 14px;
  }}
  .policy-box li {{
    margin-bottom: 5px;
    line-height: 1.55;
  }}
  .policy-box li:last-child {{ margin-bottom: 0; }}
  .footer {{
    margin-top: 14px;
    padding-top: 6px;
    border-top: 0.5px solid #94a3b8;
    text-align: center;
    font-size: 7.5pt;
    color: #94a3b8;
  }}
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      {'<img src="' + logo_b64 + '" class="logo" />' if logo_b64 else ''}
      <div class="brand-text">
        <h1>{doc_title}</h1>
        <div class="sub">{sub_title}</div>
      </div>
    </div>
    <div class="meta">
      <div class="conf">{conf}</div>
      <div class="badge">{badge}</div>
      <div class="date">{date_lbl}</div>
    </div>
  </div>

  <div class="section-title">{exec_heading}</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="lbl">{kpi1_lbl}</div>
      <div class="val" style="color:#2563eb;">{total_scanned}</div>
      <div class="sub">{kpi1_sub}</div>
    </div>
    <div class="kpi-card">
      <div class="lbl">{kpi2_lbl}</div>
      <div class="val" style="color:{health_color};">{total_malicious}</div>
      <div class="sub">{kpi2_sub}</div>
    </div>
    <div class="kpi-card">
      <div class="lbl">{kpi3_lbl}</div>
      <div class="val" style="color:#d97706;">{total_suspicious}</div>
      <div class="sub">{kpi3_sub}</div>
    </div>
    <div class="kpi-card">
      <div class="lbl">{kpi4_lbl}</div>
      <div class="val" style="color:{health_color};">{kpi4_val}</div>
      <div class="sub">{kpi4_sub}</div>
    </div>
  </div>

  <div class="section-title">{groups_heading}</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 32%;">{th_grp}</th>
        <th style="width: 11%; text-align: center;">{th_scan}</th>
        <th style="width: 11%; text-align: center;">{th_files}</th>
        <th style="width: 11%; text-align: center;">{th_urls}</th>
        <th style="width: 11%; text-align: center;">{th_mal}</th>
        <th style="width: 11%; text-align: center;">{th_del}</th>
        <th style="width: 13%; text-align: center;">{th_stat}</th>
      </tr>
    </thead>
    <tbody>
      {table_rows_str}
    </tbody>
  </table>

  <div class="section-title">{policy_heading}</div>
  <div class="policy-box">
    <ul>
      {policies}
    </ul>
  </div>

  <div class="footer">
    {footer}
  </div>
</body>
</html>"""

    # 1. Try High-Definition Chromium engine (with native OpenType HarfBuzz shaping)
    pdf_bytes = _html_to_pdf(html_content)
    if pdf_bytes:
        return pdf_bytes

    # 2. Graceful Fallback to ReportLab if Chromium is unavailable
    try:
        import io
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image as RLImage
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        font_reg, font_bold = _register_report_fonts()
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Normal'],
            fontName=font_bold,
            fontSize=17,
            leading=21,
            textColor=colors.HexColor('#0F172A'),
        )

        subtitle_style = ParagraphStyle(
            'DocSubTitle',
            parent=styles['Normal'],
            fontName=font_reg,
            fontSize=8.5,
            leading=12,
            textColor=colors.HexColor('#64748B'),
        )

        section_style = ParagraphStyle(
            'SectionHeading',
            parent=styles['Normal'],
            fontName=font_bold,
            fontSize=11.5,
            leading=15,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=9,
            spaceAfter=5,
        )

        body_style = ParagraphStyle(
            'DocBody',
            parent=styles['Normal'],
            fontName=font_reg,
            fontSize=8.5,
            leading=12.5,
            textColor=colors.HexColor('#334155'),
        )

        bold_body_style = ParagraphStyle(
            'DocBodyBold',
            parent=body_style,
            fontName=font_bold,
        )

        story = []
        logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "logo.png")

        if os.path.exists(logo_path):
            logo_img = RLImage(logo_path, width=40, height=40)
            brand_cell = Table(
                [[
                    logo_img,
                    Paragraph(f"<b>{doc_title}</b><br/><font size=8.0 color='#64748B'>{sub_title}</font>", title_style)
                ]],
                colWidths=[48, 290]
            )
            brand_cell.setStyle(TableStyle([
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('LEFTPADDING', (0,0), (-1,-1), 0),
                ('RIGHTPADDING', (0,0), (-1,-1), 0),
                ('TOPPADDING', (0,0), (-1,-1), 0),
                ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ]))
        else:
            brand_cell = Paragraph(f"<b>{doc_title}</b><br/><font size=8.0 color='#64748B'>{sub_title}</font>", title_style)

        header_data = [
            [
                brand_cell,
                Paragraph(f"<b>{conf}</b><br/>{badge}<br/><font size=7.8 color='#64748B'>{date_lbl}</font>", ParagraphStyle('Conf', parent=subtitle_style, alignment=2, fontName=font_bold, textColor=colors.HexColor('#2563EB')))
            ]
        ]
        header_table = Table(header_data, colWidths=[335, 205])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2563EB'), spaceBefore=2, spaceAfter=8))

        story.append(Paragraph(exec_heading, section_style))
        kpi_data = [
            [
                Paragraph(f"<b>{kpi1_lbl}</b><br/><font size=13 color='#2563EB'><b>{total_scanned}</b></font><br/><font size=7 color='#64748B'>{kpi1_sub}</font>", body_style),
                Paragraph(f"<b>{kpi2_lbl}</b><br/><font size=13 color='{health_color}'><b>{total_malicious}</b></font><br/><font size=7 color='#64748B'>{kpi2_sub}</font>", body_style),
                Paragraph(f"<b>{kpi3_lbl}</b><br/><font size=13 color='#D97706'><b>{total_suspicious}</b></font><br/><font size=7 color='#64748B'>{kpi3_sub}</font>", body_style),
                Paragraph(f"<b>{kpi4_lbl}</b><br/><font size=13 color='{health_color}'><b>{kpi4_val}</b></font><br/><font size=7 color='#64748B'>{kpi4_sub}</font>", body_style),
            ]
        ]
        kpi_table = Table(kpi_data, colWidths=[135, 135, 135, 135])
        kpi_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(kpi_table)
        story.append(Spacer(1, 8))

        story.append(Paragraph(groups_heading, section_style))
        table_header = [
            Paragraph(f"<b>{th_grp}</b>", bold_body_style),
            Paragraph(f"<b>{th_scan}</b>", bold_body_style),
            Paragraph(f"<b>{th_files}</b>", bold_body_style),
            Paragraph(f"<b>{th_urls}</b>", bold_body_style),
            Paragraph(f"<b>{th_mal}</b>", bold_body_style),
            Paragraph(f"<b>{th_del}</b>", bold_body_style),
            Paragraph(f"<b>{th_stat}</b>", bold_body_style),
        ]
        groups_data = [table_header]
        for row in group_rows:
            mal = row["malicious"]
            susp = row["suspicious"]
            del_count = row["deleted"]
            if mal == 0 and susp == 0:
                status_html = stat_clean
            elif mal > 0:
                status_html = stat_blocked(mal)
            else:
                status_html = stat_susp(susp)
            clean_title = (row["title"][:32] + "...") if len(row["title"]) > 34 else row["title"]
            groups_data.append([
                Paragraph(f"<b>{clean_title}</b>", body_style),
                Paragraph(str(row["scanned"]), body_style),
                Paragraph(str(row["files"]), body_style),
                Paragraph(str(row["urls"]), body_style),
                Paragraph(str(mal), body_style),
                Paragraph(str(del_count), body_style),
                Paragraph(status_html, body_style),
            ])
        group_table = Table(groups_data, colWidths=[190, 55, 55, 55, 55, 55, 75])
        group_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#F1F5F9')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor('#1E293B')),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4.5),
            ('TOPPADDING', (0,0), (-1,-1), 4.5),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
        ]))
        story.append(group_table)
        story.append(Spacer(1, 8))

        story.append(Paragraph(policy_heading, section_style))
        policy_table = Table([[Paragraph(policies.replace("<li>", "&bull; ").replace("</li>", "<br/>"), body_style)]], colWidths=[540])
        policy_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#BFDBFE')),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(policy_table)
        story.append(Spacer(1, 14))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94A3B8'), spaceBefore=2, spaceAfter=5))
        story.append(Paragraph(f"<font color='#94A3B8' size=7.5>{footer}</font>", ParagraphStyle('Footer', parent=body_style, alignment=1)))

        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
    except Exception as exc:
        logger.error("Failed to generate PDF %s report for user %d: %s", period_clean, user_id, exc)
        return None


def generate_daily_pdf_report(
    api,
    user_id: int,
    target_date: Optional[str] = None,
) -> Optional[bytes]:
    """Backward-compatible helper for daily PDF report."""
    settings = get_user_daily_report_settings(user_id)
    return generate_security_pdf_report(
        api,
        user_id,
        period="daily",
        lang=settings.get("report_lang", "both"),
        target_date=target_date,
    )

