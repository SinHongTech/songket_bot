"""
Background scheduler for sending automated Daily Security DM Reports to admins.

Checks every 30 seconds against the user's configured report time (default: 07:00 AM
in Asia/Phnom_Penh timezone) and delivers a rich security summary directly to their DM.
"""
from __future__ import annotations

import logging
import threading
import time

from bot import config
from bot.redis_client import kv_get, kv_set
from bot.reports import (
    format_security_dm_report,
    generate_security_pdf_report,
    get_user_daily_report_settings,
    local_date,
    local_time_str,
)
from bot.telegram_api import TelegramAPI
from bot.utils import is_super_admin, super_admin_ids, whitelist_user_ids

logger = logging.getLogger("BeydaBot.scheduler")

_scheduler_running = False
_scheduler_thread: threading.Thread | None = None


def _should_send_on_date(freq: str, cur_date_str: str) -> bool:
    """Determine if a report of given frequency should fire on the current date."""
    if freq == "daily":
        return True
    try:
        from zoneinfo import ZoneInfo
        from datetime import datetime
        dt = datetime.now(ZoneInfo(config.REPORT_TIMEZONE))
    except Exception:
        from datetime import datetime
        dt = datetime.utcnow()

    if freq == "weekly":
        # Fires on Mondays (weekday == 0)
        return dt.weekday() == 0
    elif freq == "monthly":
        # Fires on the 1st of each month (day == 1)
        return dt.day == 1
    return True


def _check_and_send_daily_reports(api: TelegramAPI) -> None:
    cur_time = local_time_str()  # "HH:MM"
    cur_date = local_date()      # "YYYY-MM-DD"

    # All candidate admins who can receive reports
    all_users = whitelist_user_ids() | super_admin_ids()

    for uid in all_users:
        try:
            settings = get_user_daily_report_settings(uid)
            if not settings.get("enabled", True):
                continue

            target_time = settings.get("time", "07:00")
            if target_time != cur_time:
                continue

            freq = settings.get("report_frequency", "daily")
            rlang = settings.get("report_lang", "both")

            if not _should_send_on_date(freq, cur_date):
                continue

            sent_key = f"report_sent:{freq}:{cur_date}:{uid}"
            if kv_get(sent_key):
                continue

            logger.info("Generating %s DM report (%s) for user %d at %s...", freq, rlang, uid, cur_time)
            report_text = format_security_dm_report(
                api, uid, period=freq, lang=rlang, target_date=cur_date
            )
            if report_text:
                api.send_message(uid, report_text, parse_mode="HTML")
                pdf_data = generate_security_pdf_report(
                    api, uid, period=freq, lang=rlang, target_date=cur_date
                )
                if pdf_data:
                    period_title = {
                        "weekly": "Weekly",
                        "monthly": "Monthly",
                        "daily": "Daily",
                    }.get(freq, "Daily")
                    api.send_document(
                        uid,
                        pdf_data,
                        caption=f"📄 <b>Songket Security {period_title} Report (Beta version)</b>",
                        filename=f"Songket_Security_{period_title}_Report_{cur_date}.pdf",
                    )
                logger.info("✓ %s DM report & PDF sent successfully to user %d", freq, uid)
            else:
                logger.debug("No active monitored groups to report for user %d", uid)

            # Mark sent for today with 48h TTL
            kv_set(sent_key, "1", ttl=86400 * 2)
        except Exception as exc:
            logger.warning("Failed to deliver DM report to user %d: %s", uid, exc)


def _scheduler_loop(api: TelegramAPI) -> None:
    logger.info("Daily report background scheduler started (checks every 30s in %s)...", config.REPORT_TIMEZONE)
    while _scheduler_running:
        try:
            _check_and_send_daily_reports(api)
        except Exception as exc:
            logger.error("Error in scheduler loop: %s", exc)
        time.sleep(30)


def start_daily_report_scheduler(api: TelegramAPI) -> None:
    global _scheduler_running, _scheduler_thread
    if _scheduler_running:
        return
    _scheduler_running = True
    _scheduler_thread = threading.Thread(
        target=_scheduler_loop,
        args=(api,),
        name="DailyReportScheduler",
        daemon=True,
    )
    _scheduler_thread.start()


def stop_daily_report_scheduler() -> None:
    global _scheduler_running
    _scheduler_running = False
