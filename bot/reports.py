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
        header = f"📊 <b>របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ</b> (Songket Security Daily Report)"
        date_line = f"📅 <b>កាលបរិច្ឆេទ:</b> <code>{date_str}</code> (ម៉ោង {today_time})"
        summary_title = "📈 <b>សរុបសកម្មភាពស្កេនទាំងអស់ (Overall Summary):</b>"
        summary_body = (
            f"• 🔍 ស្កេនសរុប: <b>{total_scanned}</b> (📁 {total_files} ឯកសារ · 🔗 {total_urls} តំណ)\n"
            f"• 🚨 មេរោគគ្រោះថ្នាក់: <b>{total_malicious}</b> (លុបស្វ័យប្រវត្តិ: {total_deleted})\n"
            f"• ⚠️ គួរឱ្យសង្ស័យ: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>ក្រុមដែលកំពុងការពារ ({len(managed)} ក្រុម):</b>"
        footer = "🛡️ <i>Songket Security Bot ការពារក្រុមរបស់អ្នក 24/7</i>\n⚙️ ផ្លាស់ប្តូរម៉ោងផ្ញើ៖ /daily"
    elif lang == "en":
        header = f"📊 <b>Songket Security Daily Report</b>"
        date_line = f"📅 <b>Date:</b> <code>{date_str}</code> (Generated at {today_time})"
        summary_title = "📈 <b>Overall Threat & Scan Statistics:</b>"
        summary_body = (
            f"• 🔍 Total Scans: <b>{total_scanned}</b> (📁 {total_files} files · 🔗 {total_urls} links)\n"
            f"• 🚨 Malicious Threats: <b>{total_malicious}</b> (Auto-deleted: {total_deleted})\n"
            f"• ⚠️ Suspicious Items: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>Monitored Groups ({len(managed)} active):</b>"
        footer = "🛡️ <i>Songket Security Bot is protecting your groups 24/7</i>\n⚙️ Change report schedule: /daily"
    else:  # bilingual
        header = f"📊 <b>របាយការណ៍សន្តិសុខប្រចាំថ្ងៃ | Songket Security Daily Report</b>"
        date_line = f"📅 <b>Date / កាលបរិច្ឆេទ:</b> <code>{date_str}</code> (Asia/Phnom_Penh {today_time})"
        summary_title = "📈 <b>សរុបស្ថិតិស្កេន (Security Overview):</b>"
        summary_body = (
            f"• 🔍 Total Scans: <b>{total_scanned}</b> (📁 {total_files} files · 🔗 {total_urls} links)\n"
            f"• 🚨 Malicious / មេរោគ: <b>{total_malicious}</b> (Auto-deleted: {total_deleted})\n"
            f"• ⚠️ Suspicious / សង្ស័យ: <b>{total_suspicious}</b>"
        )
        groups_title = f"👥 <b>ក្រុមដែលកំពុងការពារ | Monitored Groups ({len(managed)}):</b>"
        footer = "🛡️ <i>Songket Security Bot is protecting your groups 24/7</i>\n⚙️ កំណត់ម៉ោងផ្ញើ / Schedule: /daily"

    return (
        f"{header}\n"
        f"{date_line}\n\n"
        f"{summary_title}\n"
        f"{summary_body}\n\n"
        f"{groups_title}\n\n"
        f"{groups_summary}\n\n"
        f"{footer}"
    )


def generate_daily_pdf_report(
    api,
    user_id: int,
    target_date: Optional[str] = None,
) -> Optional[bytes]:
    """Generate a detailed PDF security audit report for the user's managed groups."""
    import io
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from bot.utils import get_managed_groups_for_user

    date_str = target_date or local_date()
    managed = get_managed_groups_for_user(api, user_id)
    if not managed:
        return None

    today_time = local_time_str()

    total_scanned = 0
    total_files = 0
    total_urls = 0
    total_malicious = 0
    total_suspicious = 0
    total_deleted = 0

    group_rows = []
    for g in managed:
        gid = g["id"]
        title = g.get("title") or "Protected Group"
        rep = get_report(gid, date_str)

        scanned = int(rep.get("scanned", 0))
        files = int(rep.get("files", 0))
        urls = int(rep.get("urls", 0))
        malicious = int(rep.get("malicious", 0))
        suspicious = int(rep.get("suspicious", 0))
        deleted = int(rep.get("deleted", 0))

        total_scanned += scanned
        total_files += files
        total_urls += urls
        total_malicious += malicious
        total_suspicious += suspicious
        total_deleted += deleted

        group_rows.append({
            "title": title,
            "id": str(gid),
            "scanned": scanned,
            "files": files,
            "urls": urls,
            "malicious": malicious,
            "suspicious": suspicious,
            "deleted": deleted,
        })

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0F172A'),
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#64748B'),
    )

    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=10,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
    )

    bold_body_style = ParagraphStyle(
        'DocBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold',
    )

    story = []

    # Header Table
    header_data = [
        [
            Paragraph("🛡️ <b>SONGKET SECURITY BOT</b>", title_style),
            Paragraph("<b>CONFIDENTIAL</b><br/>Songket Security Daily Report", ParagraphStyle('Conf', parent=subtitle_style, alignment=2, fontName='Helvetica-Bold', textColor=colors.HexColor('#2563EB')))
        ],
        [
            Paragraph("Songket Security Daily Report &bull; Beta version", subtitle_style),
            Paragraph(f"Date: <b>{date_str}</b> ({today_time} Asia/Phnom_Penh)", ParagraphStyle('GenTime', parent=subtitle_style, alignment=2))
        ]
    ]
    header_table = Table(header_data, colWidths=[340, 200])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2563EB'), spaceBefore=2, spaceAfter=10))

    # Executive Summary Card
    story.append(Paragraph("Executive Summary & Protection Metrics", section_style))

    health_status = "100% SECURE" if total_malicious == 0 and total_suspicious == 0 else f"{total_malicious} MITIGATED"
    health_color = "#059669" if total_malicious == 0 else "#DC2626"

    kpi_data = [
        [
            Paragraph(f"<b>Total Scans</b><br/><font size=13 color='#2563EB'><b>{total_scanned}</b></font><br/><font size=7 color='#64748B'>{total_files} Files &bull; {total_urls} Links</font>", body_style),
            Paragraph(f"<b>Malicious Threats</b><br/><font size=13 color='{health_color}'><b>{total_malicious}</b></font><br/><font size=7 color='#64748B'>Auto-deleted: {total_deleted}</font>", body_style),
            Paragraph(f"<b>Suspicious Items</b><br/><font size=13 color='#D97706'><b>{total_suspicious}</b></font><br/><font size=7 color='#64748B'>Flagged warnings: {total_suspicious}</font>", body_style),
            Paragraph(f"<b>Security Health</b><br/><font size=13 color='{health_color}'><b>{health_status}</b></font><br/><font size=7 color='#64748B'>{len(managed)} Groups Protected</font>", body_style),
        ]
    ]
    kpi_table = Table(kpi_data, colWidths=[135, 135, 135, 135])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 10))

    # Monitored Groups Breakdown Table (No IDs shown, includes Deleted column)
    story.append(Paragraph(f"Monitored Groups Activity Breakdown ({len(managed)} Active Groups)", section_style))

    table_header = [
        Paragraph("<b>Group Name</b>", bold_body_style),
        Paragraph("<b>Scans</b>", bold_body_style),
        Paragraph("<b>Files</b>", bold_body_style),
        Paragraph("<b>URLs</b>", bold_body_style),
        Paragraph("<b>Threats</b>", bold_body_style),
        Paragraph("<b>Deleted</b>", bold_body_style),
        Paragraph("<b>Status</b>", bold_body_style),
    ]

    groups_data = [table_header]
    for row in group_rows:
        mal = row["malicious"]
        susp = row["suspicious"]
        del_count = row["deleted"]
        if mal == 0 and susp == 0:
            status_html = "<font color='#059669'><b>CLEAN</b></font>"
        elif mal > 0:
            status_html = f"<font color='#DC2626'><b>{mal} BLOCKED</b></font>"
        else:
            status_html = f"<font color='#D97706'><b>{susp} SUSPICIOUS</b></font>"

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
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))
    story.append(group_table)
    story.append(Spacer(1, 10))

    # Security Policies & Threat Intelligence Summary
    story.append(Paragraph("Threat Mitigation & Security Policies", section_style))
    policies = (
        "&bull; <b>Real-Time Antivirus & Phishing Filter:</b> Active inspection on all Telegram messages, media, APKs, documents, and URLs.<br/>"
        "&bull; <b>Dual-Engine Intelligence:</b> Powered by VirusTotal Intelligence and Google Safe Browsing API v5.<br/>"
        "&bull; <b>Zero-Trust Auto Quarantine:</b> Detected malware and dangerous phishing links are automatically purged with warnings.<br/>"
        "&bull; <b>Isolated Admin Routing:</b> Threat notifications and daily audits are strictly sent to handling administrators."
    )
    policy_table = Table([[Paragraph(policies, body_style)]], colWidths=[540])
    policy_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#BFDBFE')),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 9),
        ('RIGHTPADDING', (0,0), (-1,-1), 9),
    ]))
    story.append(policy_table)

    story.append(Spacer(1, 16))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#94A3B8'), spaceBefore=2, spaceAfter=6))

    footer_text = f"Songket Security Bot &bull; Beta version &bull; Songket Security Daily Report &bull; Generated {date_str} {today_time}"
    story.append(Paragraph(f"<font color='#94A3B8' size=7.5>{footer_text}</font>", ParagraphStyle('Footer', parent=body_style, alignment=1)))

    try:
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return pdf_bytes
    except Exception as exc:
        logger.error("Failed to generate PDF daily report for user %d: %s", user_id, exc)
        return None
